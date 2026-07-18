/**
 * GET /api/ranking/niveles — proxies FastAPI's `/ranking/niveles`.
 *
 * `NivelRanking` IS the "Grupo" concept for the frontend (confirmed
 * domain mapping, see backend's ranking_schemas.py module docstring). Any
 * authenticated user may list niveles. Response is already camelCase and
 * frontend-shaped (`NivelRankingConOcupacionDTO` via `ResponseBase`), so
 * this handler passes it through unmodified — no adapter needed. Consumed
 * by the trainer attendance wizard to pick which nivel's roster to mark.
 */

import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/server/auth";
import { backendFetchAuthed, passthroughBackendError } from "@/lib/server/backend-client";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const result = await backendFetchAuthed(request, "/ranking/niveles");
  if (!result.ok) {
    return NextResponse.json({ message: "No se pudieron cargar los niveles." }, { status: result.status });
  }
  if (!result.response.ok) {
    return passthroughBackendError(result.response, "No se pudieron cargar los niveles.");
  }

  const body = await result.response.json();
  const response = NextResponse.json(body);
  if (result.refreshedAccessToken) {
    setAuthCookies(response, { accessToken: result.refreshedAccessToken });
  }
  return response;
}
