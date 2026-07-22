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

export async function PUT(
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

  const body = rawBody as ActualizarHorarioBody;
  const payload: Record<string, unknown> = {};
  if (body.dia_semana !== undefined) payload.dia_semana = body.dia_semana;
  if (body.hora_inicio !== undefined) payload.hora_inicio = body.hora_inicio;
  if (body.hora_fin !== undefined) payload.hora_fin = body.hora_fin;
  if (body.entrenador_id !== undefined) payload.entrenador_id = body.entrenador_id;
  if (body.nivel_ranking_id !== undefined) payload.nivel_ranking_id = body.nivel_ranking_id;

  if (Object.keys(payload).length === 0) {
    return NextResponse.json(
      { message: "No se proporcionaron campos para actualizar." },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);
  try {
    const response = await fetch(
      `${getBackendApiUrl()}/asistencias/horarios/${encodeURIComponent(params.id)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      },
    );

    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      // no body
    }

    if (!response.ok) {
      const message =
        typeof data === "object" && data !== null && typeof (data as Record<string, unknown>).message === "string"
          ? (data as { message: string }).message
          : `El servidor respondió con un error (${response.status}).`;
      return NextResponse.json({ message }, { status: response.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
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
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ message: "No autenticado." }, { status: 401 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);
  try {
    const response = await fetch(
      `${getBackendApiUrl()}/asistencias/horarios/${encodeURIComponent(params.id)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      let data: unknown = null;
      try {
        data = await response.json();
      } catch {
        // no body
      }
      const message =
        typeof data === "object" && data !== null && typeof (data as Record<string, unknown>).message === "string"
          ? (data as { message: string }).message
          : `El servidor respondió con un error (${response.status}).`;
      return NextResponse.json({ message }, { status: response.status });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
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
  } finally {
    clearTimeout(timeoutId);
  }
}
