/**
 * GET /api/dashboard — aggregate counts for the admin overview (Fase 7).
 *
 * There is no backend aggregation endpoint (see the Fase 7 plan note), so
 * this composes counts directly from the same FastAPI resources the
 * `/members`, `/payments` and `/attendance` Route Handlers already proxy —
 * `/personas`, `/membresias/pagos*` and `/asistencias/horarios` — rather
 * than calling those other Route Handlers over HTTP.
 *
 * Counting decisions, since no `/membresias` list-all endpoint exists:
 *  - `totalPersonas` reads FastAPI's own `total` from the paginated
 *    `/personas/` response (accurate regardless of `limit`), not
 *    `items.length`.
 *  - `activeMemberships` resolves every distinct `membresiaId` referenced
 *    by any Pago (not just each persona's latest, unlike
 *    src/lib/server/members-adapter.ts's per-account view) and counts how
 *    many of those Membresia records are `ACTIVA` — the closest available
 *    proxy for "active memberships" given there's no direct listing.
 *  - `pendingPayments` reads `total` from `/membresias/pagos?estado_pago=
 *    PENDIENTE_VALIDACION` — the same raw queue FastAPI backs the /payments
 *    screen with (one row per Pago, not deduped per persona), so this
 *    number matches what the admin sees after clicking through.
 *  - `todaySchedules` filters `/asistencias/horarios` by today's weekday,
 *    computed in the club's canonical timezone (America/Guayaquil, already
 *    used by src/app/members/members-utils.ts) rather than the container's
 *    local time.
 */

import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/server/auth";
import { backendFetchAuthed, passthroughBackendError } from "@/lib/server/backend-client";
import type { BackendPagoListItem, BackendMembresia } from "@/lib/server/payments-adapter";
import type { BackendHorario, BackendDiaSemana } from "@/lib/server/attendance-adapter";

interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

export interface DashboardStats {
  totalPersonas: number;
  activeMemberships: number;
  pendingPayments: number;
  todaySchedules: number;
}

const WEEKDAY_TO_DIA_SEMANA: Record<string, BackendDiaSemana> = {
  Mon: "LUNES",
  Tue: "MARTES",
  Wed: "MIERCOLES",
  Thu: "JUEVES",
  Fri: "VIERNES",
  Sat: "SABADO",
  Sun: "DOMINGO",
};

function todayBackendDiaSemana(): BackendDiaSemana {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Guayaquil",
    weekday: "short",
  }).format(new Date());
  return WEEKDAY_TO_DIA_SEMANA[weekday] ?? "LUNES";
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const [personasResult, pagosResult, pendientesResult, horariosResult] = await Promise.all([
    backendFetchAuthed(request, "/personas/?limit=1"),
    backendFetchAuthed(request, "/membresias/pagos?limit=200"),
    backendFetchAuthed(request, "/membresias/pagos?estado_pago=PENDIENTE_VALIDACION&limit=1"),
    backendFetchAuthed(request, "/asistencias/horarios"),
  ]);

  if (!personasResult.ok) {
    return NextResponse.json({ message: "No se pudieron cargar las estadísticas del panel." }, { status: personasResult.status });
  }
  if (!personasResult.response.ok) {
    return passthroughBackendError(personasResult.response, "No se pudieron cargar las estadísticas del panel.");
  }
  const totalPersonas = ((await personasResult.response.json()) as PaginatedResponse<unknown>).total;

  const pagos: BackendPagoListItem[] =
    pagosResult.ok && pagosResult.response.ok
      ? ((await pagosResult.response.json()) as PaginatedResponse<BackendPagoListItem>).items
      : [];

  const uniqueMembresiaIds = [...new Set(pagos.map((pago) => pago.membresiaId))];
  const membresias = await Promise.all(
    uniqueMembresiaIds.map(async (membresiaId) => {
      const result = await backendFetchAuthed(request, `/membresias/${membresiaId}`);
      return result.ok && result.response.ok ? ((await result.response.json()) as BackendMembresia) : undefined;
    }),
  );
  const activeMemberships = membresias.filter((membresia) => membresia?.estado === "ACTIVA").length;

  const pendingPayments =
    pendientesResult.ok && pendientesResult.response.ok
      ? ((await pendientesResult.response.json()) as PaginatedResponse<BackendPagoListItem>).total
      : 0;

  const horarios: BackendHorario[] =
    horariosResult.ok && horariosResult.response.ok ? await horariosResult.response.json() : [];
  const today = todayBackendDiaSemana();
  const todaySchedules = horarios.filter((horario) => horario.diaSemana === today).length;

  const stats: DashboardStats = { totalPersonas, activeMemberships, pendingPayments, todaySchedules };

  const response = NextResponse.json(stats);
  if (personasResult.refreshedAccessToken) {
    setAuthCookies(response, { accessToken: personasResult.refreshedAccessToken });
  }
  return response;
}
