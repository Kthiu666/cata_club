/**
 * BFF proxy — PATCH /api/ranking/niveles/:id
 *
 * ⚠️ GAP-FILL, not part of the original ticket: the "Asignar Nivel" tab
 * needs an endpoint to actually assign a student to a ranking category, but
 * none was specified. Added here filling the obvious gap, following the
 * exact same `/ranking/niveles/:id` URL-shape convention as the sibling
 * `cerrar-mes` route (POST /ranking/niveles/:id/cerrar-mes). `:id` is the
 * target category (`CategoriaRanking`, 1–10) — the student being assigned
 * travels in the request body (`{ estudianteId }`), since no listing/GET
 * endpoint exists yet to resolve any other kind of resource id. The real
 * backend contract for "assign ranking category" should be confirmed and
 * this route adjusted (or replaced) accordingly.
 *
 * Proxies to the backend with the caller's access token, same pattern as
 * the sibling ranking routes (see ../../resultados-mensuales/route.ts for
 * the fuller doc comment on this proxy pattern).
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);
  try {
    const response = await fetch(
      `${getBackendApiUrl()}/ranking/niveles/${encodeURIComponent(params.id)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
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
