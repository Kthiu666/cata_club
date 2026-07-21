/**
 * GET /api/ranking/justificativos/pendientes — proxies FastAPI's
 * `/ranking/justificativos/pendientes` (E03-RF006b, admin-only, matches
 * `evaluar_justificativo`'s own admin restriction). Response is already
 * camelCase and frontend-shaped (`JustificativoResponseDTO`), so this
 * handler passes it through unmodified — no adapter needed, same pattern as
 * ../niveles/route.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/server/auth";
import { backendFetchAuthed, passthroughBackendError } from "@/lib/server/backend-client";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const result = await backendFetchAuthed(request, "/ranking/justificativos/pendientes");
  if (!result.ok) {
    return NextResponse.json(
      { message: "No se pudieron cargar los justificativos pendientes." },
      { status: result.status },
    );
  }
  if (!result.response.ok) {
    return passthroughBackendError(result.response, "No se pudieron cargar los justificativos pendientes.");
  }

  const body = await result.response.json();
  const response = NextResponse.json(body);
  if (result.refreshedAccessToken) {
    setAuthCookies(response, { accessToken: result.refreshedAccessToken });
  }
  return response;
}
