/**
 * BFF proxy — POST /api/ranking/niveles/:id/cerrar-mes
 *
 * Frontend sends:  { periodo: "YYYY-MM" }
 * Backend expects: POST /ranking/niveles/:id/cerrar-mes?anio=X&mes=Y
 *
 * Translates the JSON body into the query-parameter format the backend
 * expects, and extracts :id as the nivel_ranking_id (the frontend sends
 * the nivel ID, not numero_nivel, in this call).
 */

import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getBackendApiUrl } from "@/lib/server/auth";

const BACKEND_TIMEOUT_MS = 10_000;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ message: "No autenticado." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "JSON inválido en el cuerpo de la solicitud." },
      { status: 400 },
    );
  }

  const periodo = (body as Record<string, unknown>)?.periodo;
  if (!periodo || typeof periodo !== "string") {
    return NextResponse.json(
      { message: "Falta campo 'periodo' (formato YYYY-MM)." },
      { status: 400 },
    );
  }

  const parts = periodo.split("-");
  if (parts.length !== 2) {
    return NextResponse.json(
      { message: "El periodo debe tener formato YYYY-MM." },
      { status: 400 },
    );
  }

  const anio = Number(parts[0]);
  const mes = Number(parts[1]);
  if (!Number.isInteger(anio) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
    return NextResponse.json(
      { message: "Período inválido." },
      { status: 400 },
    );
  }

  const nivelId = params.id;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);
  try {
    const qs = new URLSearchParams({ anio: String(anio), mes: String(mes) });
    const response = await fetch(
      `${getBackendApiUrl()}/ranking/niveles/${encodeURIComponent(nivelId)}/cerrar-mes?${qs.toString()}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
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
