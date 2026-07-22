/**
 * BFF proxy — POST /api/groups/asignar-alumno
 *
 * Directly assigns a student to a training schedule (no nivel/ranking
 * involved). Proxies to FastAPI's POST /asistencias/asignar-alumno.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  extractAccessToken,
  parseJsonBody,
  proxyToBackend,
  unauthorizedResponse,
  badRequestResponse,
} from "@/lib/server/bff-helpers";

interface AsignarAlumnoBody {
  persona_id?: unknown;
  horario_id?: unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const accessToken = extractAccessToken(request);
  if (!accessToken) return unauthorizedResponse();

  const [rawBody, bodyError] = await parseJsonBody(request);
  if (bodyError) return bodyError;

  const body = rawBody as AsignarAlumnoBody;
  if (typeof body.persona_id !== "number" || typeof body.horario_id !== "number") {
    return badRequestResponse("persona_id y horario_id son obligatorios y deben ser numéricos.");
  }

  return proxyToBackend("/asistencias/asignar-alumno", {
    method: "POST",
    accessToken,
    successStatus: 201,
    body: { persona_id: body.persona_id, horario_id: body.horario_id },
  });
}
