/**
 * BFF proxy — GET/POST /api/groups/horarios
 *
 * GET: lists training schedules (optionally filtered by `?categoria=`).
 *      Proxies to FastAPI's GET /asistencias/horarios.
 * POST: creates a new training schedule. Proxies to FastAPI's
 *       POST /asistencias/horarios.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  extractAccessToken,
  parseJsonBody,
  proxyToBackend,
  unauthorizedResponse,
  badRequestResponse,
} from "@/lib/server/bff-helpers";

interface CrearHorarioBody {
  dia_semana?: unknown;
  hora_inicio?: unknown;
  hora_fin?: unknown;
  entrenador_id?: unknown;
  nivel_ranking_id?: unknown;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const accessToken = extractAccessToken(request);
  if (!accessToken) return unauthorizedResponse();

  const categoria = request.nextUrl.searchParams.get("categoria");
  const query = categoria ? `?categoria=${encodeURIComponent(categoria)}` : "";

  return proxyToBackend(`/asistencias/horarios${query}`, { method: "GET", accessToken });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const accessToken = extractAccessToken(request);
  if (!accessToken) return unauthorizedResponse();

  const [rawBody, bodyError] = await parseJsonBody(request);
  if (bodyError) return bodyError;

  const body = rawBody as CrearHorarioBody;
  if (
    typeof body.dia_semana !== "string" ||
    typeof body.hora_inicio !== "string" ||
    typeof body.hora_fin !== "string" ||
    typeof body.entrenador_id !== "number"
  ) {
    return badRequestResponse("dia_semana, hora_inicio, hora_fin y entrenador_id son obligatorios.");
  }

  return proxyToBackend("/asistencias/horarios", {
    method: "POST",
    accessToken,
    successStatus: 201,
    body: {
      dia_semana: body.dia_semana,
      hora_inicio: body.hora_inicio,
      hora_fin: body.hora_fin,
      entrenador_id: body.entrenador_id,
      nivel_ranking_id: body.nivel_ranking_id ?? null,
    },
  });
}
