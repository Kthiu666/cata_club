/**
 * BFF proxy — POST /api/groups/horarios
 *
 * Creates a new training schedule. Proxies to FastAPI's
 * POST /asistencias/horarios.
 */

import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getBackendApiUrl } from "@/lib/server/auth";

const BACKEND_TIMEOUT_MS = 10_000;

interface CrearHorarioBody {
  dia_semana?: unknown;
  hora_inicio?: unknown;
  hora_fin?: unknown;
  entrenador_id?: unknown;
  nivel_ranking_id?: unknown;
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

  const body = rawBody as CrearHorarioBody;
  if (
    typeof body.dia_semana !== "string" ||
    typeof body.hora_inicio !== "string" ||
    typeof body.hora_fin !== "string" ||
    typeof body.entrenador_id !== "number"
  ) {
    return NextResponse.json(
      { message: "dia_semana, hora_inicio, hora_fin y entrenador_id son obligatorios." },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);
  try {
    const response = await fetch(`${getBackendApiUrl()}/asistencias/horarios`, {
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

    return NextResponse.json(data, { status: 201 });
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
