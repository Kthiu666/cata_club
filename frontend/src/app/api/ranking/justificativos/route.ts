/**
 * BFF proxy — POST /api/ranking/justificativos
 *
 * Registers a justificativo (justification for a missed ranking month,
 * E03-RF006a) for a student. FastAPI models this as
 * `POST /ranking/{persona_id}/justificativos` — `persona_id` is a URL
 * segment, not a body field (confirmed live in ranking_router.py /
 * `crear_justificativo`) — so this route reads `personaId` from the JSON
 * body (same shape convention as the sibling ranking routes, e.g.
 * resultados-mensuales/route.ts) and builds the backend URL from it,
 * translating the rest of the camelCase body into `JustificativoCreateDTO`
 * (anio, mes, motivo, archivo_url).
 */

import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getBackendApiUrl } from "@/lib/server/auth";

const BACKEND_TIMEOUT_MS = 10_000;

interface CrearJustificativoRequestBody {
  personaId?: unknown;
  anio?: unknown;
  mes?: unknown;
  motivo?: unknown;
  archivoUrl?: unknown;
  observaciones?: unknown;
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

  const body = rawBody as CrearJustificativoRequestBody;
  if (
    typeof body.personaId !== "number" ||
    typeof body.anio !== "number" ||
    typeof body.mes !== "number" ||
    typeof body.motivo !== "string" ||
    body.motivo.trim().length === 0 ||
    (body.archivoUrl !== undefined && typeof body.archivoUrl !== "string")
  ) {
    return NextResponse.json(
      { message: "personaId, anio, mes y motivo son obligatorios (archivoUrl es opcional)." },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);
  try {
    const response = await fetch(
      `${getBackendApiUrl()}/ranking/${encodeURIComponent(String(body.personaId))}/justificativos`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          anio: body.anio,
          mes: body.mes,
          motivo: body.motivo,
          archivo_url: body.archivoUrl,
          observaciones: body.observaciones ?? null,
        }),
        signal: controller.signal,
      },
    );

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
