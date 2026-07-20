/**
 * BFF proxy — PATCH /api/ranking/niveles/:id
 *
 * Frontend sends { estudianteId } where :id is the numero_nivel (1–10).
 * Backend expects POST /ranking/asignar-nivel-inicial with
 * { persona_id: int, nivel_ranking_id: int }.
 *
 * This route fetches the levels list from the backend to translate
 * numero_nivel → nivel_ranking_id, then forwards the assign request.
 */

import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getBackendApiUrl } from "@/lib/server/auth";

const BACKEND_TIMEOUT_MS = 10_000;

export async function PATCH(
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

  const estudianteId = (body as Record<string, unknown>)?.estudianteId;
  if (!estudianteId) {
    return NextResponse.json(
      { message: "Falta estudianteId en el cuerpo." },
      { status: 400 },
    );
  }

  const numeroNivel = Number(params.id);
  if (!Number.isInteger(numeroNivel) || numeroNivel < 1 || numeroNivel > 10) {
    return NextResponse.json(
      { message: "El id (número de nivel) debe ser un entero entre 1 y 10." },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);
  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    };

    // Step 1: fetch levels to translate numero_nivel → nivel_ranking_id
    const nivelesRes = await fetch(`${getBackendApiUrl()}/ranking/niveles`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });

    if (!nivelesRes.ok) {
      const msg = `Error al obtener niveles de ranking (${nivelesRes.status}).`;
      return NextResponse.json({ message: msg }, { status: nivelesRes.status });
    }

    const niveles = (await nivelesRes.json()) as Array<{
      id: number;
      numero_nivel: number;
    }>;
    const nivel = niveles.find((n) => n.numero_nivel === numeroNivel);
    if (!nivel) {
      clearTimeout(timeoutId);
      return NextResponse.json(
        { message: `No se encontró un nivel de ranking con número ${numeroNivel}.` },
        { status: 404 },
      );
    }

    // Step 2: assign via the real backend endpoint
    const response = await fetch(
      `${getBackendApiUrl()}/ranking/asignar-nivel-inicial`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          persona_id: Number(estudianteId),
          nivel_ranking_id: nivel.id,
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
