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
  parseJsonResponse,
  extractBackendErrorMessage,
  handleProxyError,
  backendTimeout,
  backendUrl,
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

  const [controller, done] = backendTimeout();
  try {
    const response = await fetch(backendUrl("/asistencias/asignar-alumno"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        persona_id: body.persona_id,
        horario_id: body.horario_id,
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
