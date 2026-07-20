/**
 * GET /api/personas/reportes — admin-only BFF proxy.
 *
 * Proxies FastAPI's `/personas/reportes` with optional query filters
 * (prioridad_municipal, becado).
 */

import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/server/auth";
import { backendFetchAuthed, passthroughBackendError } from "@/lib/server/backend-client";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const qs = new URLSearchParams();
  const prioridad = searchParams.get("prioridad_municipal");
  const becado = searchParams.get("becado");
  if (prioridad !== null) qs.set("prioridad_municipal", prioridad);
  if (becado !== null) qs.set("becado", becado);
  const query = qs.toString();

  const result = await backendFetchAuthed(request, `/personas/reportes${query ? `?${query}` : ""}`);
  if (!result.ok) {
    return NextResponse.json({ message: "No se pudieron cargar los reportes." }, { status: result.status });
  }
  if (!result.response.ok) {
    return passthroughBackendError(result.response, "No se pudieron cargar los reportes.");
  }

  const body = await result.response.json();
  const response = NextResponse.json(body);
  if (result.refreshedAccessToken) {
    setAuthCookies(response, { accessToken: result.refreshedAccessToken });
  }
  return response;
}
