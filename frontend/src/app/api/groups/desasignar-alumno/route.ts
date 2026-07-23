/**
 * BFF proxy — DELETE /api/groups/desasignar-alumno
 *
 * Unassigns a student from a training schedule. Proxies to FastAPI's
 * DELETE /asistencias/desasignar-alumno?persona_id=X&horario_id=Y.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  extractAccessToken,
  proxyToBackend,
  unauthorizedResponse,
  badRequestResponse,
} from "@/lib/server/bff-helpers";

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const accessToken = extractAccessToken(request);
  if (!accessToken) return unauthorizedResponse();

  const personaIdRaw = request.nextUrl.searchParams.get("persona_id");
  const horarioIdRaw = request.nextUrl.searchParams.get("horario_id");
  const personaId = personaIdRaw !== null ? Number(personaIdRaw) : NaN;
  const horarioId = horarioIdRaw !== null ? Number(horarioIdRaw) : NaN;

  if (!Number.isFinite(personaId) || !Number.isFinite(horarioId)) {
    return badRequestResponse("persona_id y horario_id son obligatorios y deben ser numéricos.");
  }

  return proxyToBackend(`/asistencias/desasignar-alumno?persona_id=${personaId}&horario_id=${horarioId}`, {
    method: "DELETE",
    accessToken,
    successStatus: 204,
  });
}
