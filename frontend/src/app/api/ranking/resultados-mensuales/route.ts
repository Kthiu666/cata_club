/**
 * BFF proxy — POST /api/ranking/resultados-mensuales
 *
 * Registers a monthly ranking result (Resultado Mensual) for a student.
 * Proxies to FastAPI's `POST /ranking/resultados-mensuales`
 * (`ResultadoMensualRegistrarDTO`: persona_id, anio, mes, posicion?,
 * participo) — this route validates and translates the camelCase
 * `{ personaId, anio, mes, posicion?, participo }` body into that shape,
 * mirroring the translation pattern in ../groups/assign/route.ts. The
 * backend derives the student's current nivel_ranking_id itself; it is not
 * part of the request.
 */

import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getBackendApiUrl } from "@/lib/server/auth";

const BACKEND_TIMEOUT_MS = 10_000;

interface RegistrarResultadoRequestBody {
  personaId?: unknown;
  anio?: unknown;
  mes?: unknown;
  posicion?: unknown;
  participo?: unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ message: "No autenticado." }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { message: "JSON inválido en el cuerpo de la solicitud." },
      { status: 400 },
    );
  }

  const body = rawBody as RegistrarResultadoRequestBody;
  if (
    typeof body.personaId !== "number" ||
    typeof body.anio !== "number" ||
    typeof body.mes !== "number" ||
    typeof body.participo !== "boolean" ||
    (body.posicion !== undefined && typeof body.posicion !== "number")
  ) {
    return NextResponse.json(
      { message: "personaId, anio, mes y participo son obligatorios (posicion es opcional)." },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);
  try {
    const response = await fetch(`${getBackendApiUrl()}/ranking/resultados-mensuales`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        persona_id: body.personaId,
        anio: body.anio,
        mes: body.mes,
        posicion: body.posicion,
        participo: body.participo,
      }),
      signal: controller.signal,
    });

    return await forwardBackendResponse(response);
  } catch (error: unknown) {
    return backendFailureResponse(error);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function forwardBackendResponse(response: Response): Promise<NextResponse> {
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // Backend returned no/invalid JSON body — fall through with null data.
  }

  if (!response.ok) {
    const message = isMessageBody(data)
      ? data.message
      : `El servidor respondió con un error (${response.status}).`;
    return NextResponse.json({ message }, { status: response.status });
  }

  return NextResponse.json(data, { status: response.status });
}

function backendFailureResponse(error: unknown): NextResponse {
  if (error instanceof DOMException && error.name === "AbortError") {
    return NextResponse.json(
      { message: "La solicitud al servidor tardó demasiado." },
      { status: 504 },
    );
  }
  return NextResponse.json(
    { message: "No se pudo contactar al servidor." },
    { status: 503 },
  );
}

function isMessageBody(value: unknown): value is { message: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).message === "string"
  );
}
