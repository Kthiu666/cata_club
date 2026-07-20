/**
 * BFF proxy — POST /api/ranking/niveles/:id/cerrar-mes
 *
 * Closes out the ranking month for a nivel (`:id` is a real
 * `nivel_ranking_id`, the same one used by /groups) — an irreversible
 * action per the product spec; the UI must confirm before calling this.
 * Proxies to FastAPI's `POST /ranking/niveles/{nivel_id}/cerrar-mes`, which
 * requires `anio`/`mes` as query params (not body) — this route translates
 * the camelCase `{ anio, mes }` JSON body into that query string, mirroring
 * the translation pattern in ../../../groups/assign/route.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getBackendApiUrl } from "@/lib/server/auth";

const BACKEND_TIMEOUT_MS = 10_000;

interface CerrarMesRequestBody {
  anio?: unknown;
  mes?: unknown;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
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

  const body = rawBody as CerrarMesRequestBody;
  if (typeof body.anio !== "number" || typeof body.mes !== "number") {
    return NextResponse.json(
      { message: "anio y mes son obligatorios y deben ser numéricos." },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);
  try {
    const query = new URLSearchParams({ anio: String(body.anio), mes: String(body.mes) });
    const response = await fetch(
      `${getBackendApiUrl()}/ranking/niveles/${encodeURIComponent(params.id)}/cerrar-mes?${query}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
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
