/** GET /api/membresias/mias — JWT-derived membership read proxy. */

import { NextRequest, NextResponse } from "next/server";
import { proxyBackendGet } from "@/lib/server/backend-client";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const personaId = request.nextUrl.searchParams.get("persona_id");
  const query = personaId === null ? "" : `?persona_id=${encodeURIComponent(personaId)}`;
  return proxyBackendGet(request, `/membresias/mias${query}`, "No se pudieron cargar las membresías.");
}
