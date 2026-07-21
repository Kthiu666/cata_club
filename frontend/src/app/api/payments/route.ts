/**
 * GET /api/payments — proxies FastAPI's admin payment-validation queue.
 *
 * BFF Route Handler: reads the session cookie server-side, calls the real
 * backend (`GET /membresias/pagos`) with `Authorization: Bearer`, and
 * translates the response into the `PaymentValidationRequest` shape
 * `src/app/payments/page.tsx` already renders (see
 * src/lib/server/payments-adapter.ts). Role enforcement (admin-only) is the
 * backend's job via `GestorPermisos` — this handler just proxies whatever
 * status it returns.
 */

import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/server/auth";
import { backendFetchAuthed, passthroughBackendError } from "@/lib/server/backend-client";
import {
  buildPaymentValidationRequest,
  buildRepresentanteNameMap,
  type BackendMembresia,
  type BackendPagoListItem,
  type BackendPersonaWithRepresentante,
  type BackendTipoMembresia,
} from "@/lib/server/payments-adapter";

interface PaginatedPagos {
  items: BackendPagoListItem[];
}

interface PaginatedPersonas {
  items: BackendPersonaWithRepresentante[];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const pagosResult = await backendFetchAuthed(request, "/membresias/pagos?limit=200");
  if (!pagosResult.ok) {
    return NextResponse.json({ message: "No se pudo cargar la cola de pagos." }, { status: pagosResult.status });
  }
  if (!pagosResult.response.ok) {
    return passthroughBackendError(pagosResult.response, "No se pudo cargar la cola de pagos.");
  }

  const paginated = (await pagosResult.response.json()) as PaginatedPagos;

  // Resolve each payment's "responsable de pago" (payer) name — self-managed
  // vs represented — from the same bulk `/personas/` fetch members-adapter.ts
  // already uses. Degrades to an empty map (no name) if this call fails.
  const personasResult = await backendFetchAuthed(request, "/personas/?limit=200");
  const personas: BackendPersonaWithRepresentante[] =
    (personasResult.ok && personasResult.response.ok
      ? ((await personasResult.response.json()) as PaginatedPersonas).items
      : undefined) ?? [];
  const responsablePagoNameById = buildRepresentanteNameMap(personas);

  const tiposResult = await backendFetchAuthed(request, "/membresias/tipos");
  const tipos: BackendTipoMembresia[] =
    tiposResult.ok && tiposResult.response.ok ? await tiposResult.response.json() : [];
  const tiposById = new Map(tipos.map((tipo) => [tipo.id, tipo]));

  const uniqueMembresiaIds = [...new Set(paginated.items.map((pago) => pago.membresiaId))];
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

  const items = paginated.items.map((pago) => {
    const membresia: BackendMembresia =
      membresiaById.get(pago.membresiaId) ?? { id: pago.membresiaId, estado: "INACTIVA", tipoMembresiaId: 0 };
    return buildPaymentValidationRequest(
      pago,
      pago.personaNombreCompleto,
      membresia,
      tiposById.get(membresia.tipoMembresiaId),
      responsablePagoNameById.get(pago.personaId),
    );
  });

  const response = NextResponse.json(items);
  if (pagosResult.refreshedAccessToken) {
    setAuthCookies(response, { accessToken: pagosResult.refreshedAccessToken });
  }
  return response;
}
