/**
 * BFF proxy — GET /api/groups/horarios/[id]/alumnos
 *
 * Lists the students directly assigned to a training schedule. Proxies to
 * FastAPI's GET /asistencias/horarios/{horario_id}/alumnos.
 */

import { NextRequest, NextResponse } from "next/server";
import { extractAccessToken, proxyToBackend, unauthorizedResponse } from "@/lib/server/bff-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const accessToken = extractAccessToken(request);
  if (!accessToken) return unauthorizedResponse();

  return proxyToBackend(`/asistencias/horarios/${encodeURIComponent(params.id)}/alumnos`, {
    method: "GET",
    accessToken,
  });
}
