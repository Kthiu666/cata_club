/**
 * BFF proxy — GET /api/personas/entrenadores
 *
 * Lists real entrenadores (personas with rol ENTRENADOR) — feeds the
 * entrenador dropdown at `/groups` (Gestión de Horarios) so the field is a
 * real name-based choice instead of a raw ID or an arbitrary auto-fill.
 * Proxies to FastAPI's GET /personas/entrenadores.
 */

import { NextRequest, NextResponse } from "next/server";
import { extractAccessToken, proxyToBackend, unauthorizedResponse } from "@/lib/server/bff-helpers";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const accessToken = extractAccessToken(request);
  if (!accessToken) return unauthorizedResponse();

  return proxyToBackend("/personas/entrenadores", { method: "GET", accessToken });
}
