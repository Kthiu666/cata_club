/**
 * GET /api/ranking/niveles/[id]/tabla — proxies FastAPI's
 * `/ranking/niveles/{id}/tabla` (E03-RF010: tabla de posiciones de un nivel).
 *
 * Any authenticated user may read it. Returns `TablaRankingItemDTO[]`
 * (personaId + personaNombreCompleto + ranking fields), already camelCase —
 * passed through unmodified. This is the closest real analog to a "session
 * roster": since no API exposes which Horario belongs to which NivelRanking
 * (see src/lib/server/attendance-adapter.ts's documented gap), the trainer
 * attendance wizard asks the trainer to pick the nivel explicitly instead of
 * deriving it from the selected horario.
 */

import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/server/auth";
import { backendFetchAuthed, passthroughBackendError } from "@/lib/server/backend-client";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const result = await backendFetchAuthed(request, `/ranking/niveles/${params.id}/tabla`);
  if (!result.ok) {
    return NextResponse.json({ message: "No se pudo cargar la tabla del nivel." }, { status: result.status });
  }
  if (!result.response.ok) {
    return passthroughBackendError(result.response, "No se pudo cargar la tabla del nivel.");
  }

  const body = await result.response.json();
  const response = NextResponse.json(body);
  if (result.refreshedAccessToken) {
    setAuthCookies(response, { accessToken: result.refreshedAccessToken });
  }
  return response;
}
