/**
 * GET /api/membresias/tipos — list available membership type catalog.
 * Proxies to FastAPI's GET /membresias/tipos (any authenticated user).
 */

import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/server/auth";
import { backendFetchAuthed, passthroughBackendError } from "@/lib/server/backend-client";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const result = await backendFetchAuthed(request, "/membresias/tipos");

  if (!result.ok) {
    return NextResponse.json(
      { message: "No se pudieron cargar los tipos de membresía." },
      { status: result.status },
    );
  }
  if (!result.response.ok) {
    return passthroughBackendError(result.response, "No se pudieron cargar los tipos de membresía.");
  }

  const data = await result.response.json();
  const response = NextResponse.json(data);
  if (result.refreshedAccessToken) {
    setAuthCookies(response, { accessToken: result.refreshedAccessToken });
  }
  return response;
}
