/**
 * GET /api/members — aggregates FastAPI's `/personas`, `/membresias/pagos*`,
 * `/membresias/*` and `/ranking/niveles*` into the `MemberAccount[]` shape
 * src/app/members/page.tsx renders (see src/lib/server/members-adapter.ts
 * for the DTO translation and the backend gaps found while building it).
 * Mirrors src/app/api/payments/route.ts's aggregation style.
 *
 * `GET /membresias/pagos` and `GET /ranking/niveles/{id}/tabla` calls are
 * best-effort: this page's own protection (`allowedRoles={["admin"]}`)
 * covers the admin-only payments queue in practice, but if either fails
 * (e.g. a future non-admin caller) the response still renders — accounts
 * without resolvable membership/group data, not a hard failure.
 */

import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/server/auth";
import { backendFetchAuthed, passthroughBackendError } from "@/lib/server/backend-client";
import { buildMemberAccounts, type BackendPersonaFull } from "@/lib/server/members-adapter";
import type { BackendMembresia, BackendPagoListItem, BackendTipoMembresia } from "@/lib/server/payments-adapter";
import type { NivelConOcupacion, TablaRankingItem } from "@/services/api";

const PERSONAS_PAGE_LIMIT = 200;

interface PaginatedPersonas {
  items: BackendPersonaFull[];
  total: number;
}

interface PaginatedPagos {
  items: BackendPagoListItem[];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const personasResult = await backendFetchAuthed(request, `/personas/?limit=${PERSONAS_PAGE_LIMIT}`);
  if (!personasResult.ok) {
    return NextResponse.json({ message: "No se pudieron cargar las personas." }, { status: personasResult.status });
  }
  if (!personasResult.response.ok) {
    return passthroughBackendError(personasResult.response, "No se pudieron cargar las personas.");
  }
  const personasBody = (await personasResult.response.json()) as PaginatedPersonas;

  const [pagosResult, tiposResult, nivelesResult] = await Promise.all([
    backendFetchAuthed(request, "/membresias/pagos?limit=200"),
    backendFetchAuthed(request, "/membresias/tipos"),
    backendFetchAuthed(request, "/ranking/niveles"),
  ]);

  const pagos: BackendPagoListItem[] =
    pagosResult.ok && pagosResult.response.ok ? ((await pagosResult.response.json()) as PaginatedPagos).items : [];
  const tipos: BackendTipoMembresia[] =
    tiposResult.ok && tiposResult.response.ok ? await tiposResult.response.json() : [];
  const niveles: NivelConOcupacion[] =
    nivelesResult.ok && nivelesResult.response.ok ? await nivelesResult.response.json() : [];

  const latestPagoByPersona = new Map<number, BackendPagoListItem>();
  for (const pago of pagos) {
    const current = latestPagoByPersona.get(pago.personaId);
    if (!current || new Date(pago.fechaRegistro) > new Date(current.fechaRegistro)) {
      latestPagoByPersona.set(pago.personaId, pago);
    }
  }

  const uniqueMembresiaIds = [...new Set([...latestPagoByPersona.values()].map((pago) => pago.membresiaId))];
  const membresiasResult = await backendFetchAuthed(request, `/membresias/?limit=200`);
  const allMembresias: BackendMembresia[] =
    membresiasResult.ok && membresiasResult.response.ok
      ? ((await membresiasResult.response.json()) as { items: BackendMembresia[] }).items
      : [];
  const membresiaById = new Map<number, BackendMembresia>();
  for (const m of allMembresias) {
    if (uniqueMembresiaIds.includes(m.id)) {
      membresiaById.set(m.id, m);
    }
  }

  const tipoById = new Map(tipos.map((tipo) => [tipo.id, tipo]));

  const tablaEntries = await Promise.all(
    niveles.map(async (nivel) => {
      const result = await backendFetchAuthed(request, `/ranking/niveles/${nivel.id}/tabla`);
      const tabla: TablaRankingItem[] = result.ok && result.response.ok ? await result.response.json() : [];
      return tabla.map((item) => [item.personaId, nivel.id] as const);
    }),
  );
  const nivelIdByPersona = new Map(tablaEntries.flat());

  const accounts = buildMemberAccounts(personasBody.items, latestPagoByPersona, membresiaById, tipoById, nivelIdByPersona);

  const personasCapped = personasBody.total >= PERSONAS_PAGE_LIMIT;
  const response = NextResponse.json({ accounts, niveles, personasCapped });
  if (personasResult.refreshedAccessToken) {
    setAuthCookies(response, { accessToken: personasResult.refreshedAccessToken });
  }
  return response;
}
