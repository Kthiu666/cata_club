/**
 * BFF proxy — PUT/DELETE /api/groups/horarios/[id]
 *
 * PUT: updates a training schedule.
 * DELETE: removes a training schedule.
 * Proxies to FastAPI's PUT/DELETE /asistencias/horarios/{id}.
 */

import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getBackendApiUrl } from "@/lib/server/auth";

const BACKEND_TIMEOUT_MS = 10_000;

interface ActualizarHorarioBody {
  dia_semana?: unknown;
  hora_inicio?: unknown;
  hora_fin?: unknown;
  entrenador_id?: unknown;
  nivel_ranking_id?: unknown;
}

function extractToken(request: NextRequest): NextResponse | string {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ message: "No autenticado." }, { status: 401 });
  }
  return token;
}

function buildBackendUrl(id: string): string {
  return `${getBackendApiUrl()}/asistencias/horarios/${encodeURIComponent(id)}`;
}

function extractErrorMessage(data: unknown, status: number): string {
  if (
    typeof data === "object" &&
    data !== null &&
    typeof (data as Record<string, unknown>).message === "string"
  ) {
    return (data as { message: string }).message;
  }
  return `El servidor respondió con un error (${status}).`;
}

async function parseResponseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function handleAbortError(): NextResponse {
  return NextResponse.json(
    { message: "La solicitud al servidor tardó demasiado." },
    { status: 504 },
  );
}

function handleNetworkError(): NextResponse {
  return NextResponse.json(
    { message: "No se pudo contactar al servidor." },
    { status: 503 },
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const tokenOrResponse = extractToken(request);
  if (tokenOrResponse instanceof NextResponse) return tokenOrResponse;
  const accessToken = tokenOrResponse;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { message: "JSON inválido en el cuerpo de la solicitud." },
      { status: 400 },
    );
  }

  const body = rawBody as ActualizarHorarioBody;
  const UPDATABLE_FIELDS: Array<[keyof ActualizarHorarioBody, string]> = [
    ["dia_semana", "dia_semana"],
    ["hora_inicio", "hora_inicio"],
    ["hora_fin", "hora_fin"],
    ["entrenador_id", "entrenador_id"],
    ["nivel_ranking_id", "nivel_ranking_id"],
  ];
  const payload: Record<string, unknown> = {};
  for (const [key, field] of UPDATABLE_FIELDS) {
    if (body[key] !== undefined) payload[field] = body[key];
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json(
      { message: "No se proporcionaron campos para actualizar." },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);
  try {
    const response = await fetch(buildBackendUrl(params.id), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await parseResponseJson(response);

    if (!response.ok) {
      return NextResponse.json(
        { message: extractErrorMessage(data, response.status) },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return handleAbortError();
    }
    return handleNetworkError();
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const tokenOrResponse = extractToken(request);
  if (tokenOrResponse instanceof NextResponse) return tokenOrResponse;
  const accessToken = tokenOrResponse;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);
  try {
    const response = await fetch(buildBackendUrl(params.id), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });

    if (!response.ok) {
      const data = await parseResponseJson(response);
      return NextResponse.json(
        { message: extractErrorMessage(data, response.status) },
        { status: response.status },
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return handleAbortError();
    }
    return handleNetworkError();
  } finally {
    clearTimeout(timeoutId);
  }
}
