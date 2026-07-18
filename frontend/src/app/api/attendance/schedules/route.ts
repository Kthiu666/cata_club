/**
 * GET /api/attendance/schedules — proxies FastAPI's `/asistencias/horarios`.
 *
 * BFF Route Handler: any authenticated user may list schedules (backend only
 * requires a valid token, no role restriction). Enriches each Horario with
 * the titular trainer's display name (resolved once via `/personas`, see
 * src/lib/server/attendance-adapter.ts's N+1 note) since the DTO only
 * carries `entrenadorId`. Consumed by the admin `/attendance` overview and
 * the trainer session-selection step in `/trainer/attendance`.
 */

import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/server/auth";
import { backendFetchAuthed, passthroughBackendError } from "@/lib/server/backend-client";
import { buildTrainingSchedule, fetchPersonaNameMap, type BackendHorario } from "@/lib/server/attendance-adapter";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const horariosResult = await backendFetchAuthed(request, "/asistencias/horarios");
  if (!horariosResult.ok) {
    return NextResponse.json({ message: "No se pudieron cargar los horarios." }, { status: horariosResult.status });
  }
  if (!horariosResult.response.ok) {
    return passthroughBackendError(horariosResult.response, "No se pudieron cargar los horarios.");
  }

  const horarios = (await horariosResult.response.json()) as BackendHorario[];
  const personas = await fetchPersonaNameMap(request);

  const schedules = horarios.map((horario) => buildTrainingSchedule(horario, personas));

  const response = NextResponse.json(schedules);
  if (horariosResult.refreshedAccessToken) {
    setAuthCookies(response, { accessToken: horariosResult.refreshedAccessToken });
  }
  return response;
}
