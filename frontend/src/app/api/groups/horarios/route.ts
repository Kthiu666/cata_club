/**
 * BFF proxy — POST /api/groups/horarios
 *
 * Creates a new training schedule. Proxies to FastAPI's
 * POST /asistencias/horarios.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  extractAccessToken,
  parseJsonBody,
  parseJsonResponse,
  extractBackendErrorMessage,
  handleProxyError,
  backendTimeout,
  backendUrl,
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

  const [controller, done] = backendTimeout();
  try {
    const response = await fetch(backendUrl("/asistencias/horarios"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        dia_semana: body.dia_semana,
        hora_inicio: body.hora_inicio,
        hora_fin: body.hora_fin,
        entrenador_id: body.entrenador_id,
        nivel_ranking_id: body.nivel_ranking_id ?? null,
      }),
      signal: controller.signal,
    });

    const data = await parseJsonResponse(response);

    if (!response.ok) {
      return NextResponse.json(
        { message: extractBackendErrorMessage(data, response.status) },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: unknown) {
    return handleProxyError(error);
  } finally {
    done();
  }
}
