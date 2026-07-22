/** GET /api/membresias/mias — JWT-derived membership read proxy. */

import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/server/auth";
import { backendFetchAuthed, passthroughBackendError } from "@/lib/server/backend-client";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const personaId = request.nextUrl.searchParams.get("persona_id");
  const query = personaId === null ? "" : `?persona_id=${encodeURIComponent(personaId)}`;
  const result = await backendFetchAuthed(request, `/membresias/mias${query}`);
  if (!result.ok) {
    return NextResponse.json({ message: "No se pudieron cargar las membresías." }, { status: result.status });
  }
  if (!result.response.ok) {
    return passthroughBackendError(result.response, "No se pudieron cargar las membresías.");
  }
  const response = NextResponse.json(await result.response.json());
  if (result.refreshedAccessToken) setAuthCookies(response, { accessToken: result.refreshedAccessToken });
  return response;
}
