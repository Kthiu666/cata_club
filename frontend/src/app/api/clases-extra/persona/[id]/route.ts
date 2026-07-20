/**
 * GET /api/clases-extra/persona/[id] — list extra-class requests for a persona.
 *
 * BFF proxy to FastAPI's `GET /clases-extra/persona/{persona_id}`.
 * Authentication is required by the backend; no role restriction.
 */

import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/server/auth";
import { backendFetchAuthed, passthroughBackendError } from "@/lib/server/backend-client";
import type { SolicitudClaseExtra } from "@/types/domain";

interface RouteContext {
  params: { id: string };
}

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const personaId = Number(context.params.id);
  if (Number.isNaN(personaId)) {
    return NextResponse.json({ message: "El id de persona no es válido." }, { status: 400 });
  }

  const result = await backendFetchAuthed(request, `/clases-extra/persona/${personaId}`);

  if (!result.ok) {
    return NextResponse.json({ message: "No se pudo cargar el historial." }, { status: result.status });
  }
  if (!result.response.ok) {
    return passthroughBackendError(result.response, "No se pudo cargar el historial.");
  }

  const data = (await result.response.json()) as SolicitudClaseExtra[];
  const response = NextResponse.json(data);
  if (result.refreshedAccessToken) {
    setAuthCookies(response, { accessToken: result.refreshedAccessToken });
  }
  return response;
}
