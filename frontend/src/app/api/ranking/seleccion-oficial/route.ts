/**
 * BFF proxy — GET/POST /api/ranking/seleccion-oficial
 *
 * GET: lists the persisted official-selection roster from the backend.
 * POST: translates the frontend's per-student DTO into the backend's batch
 * DTO and maps the backend's RankingResponseDTO array back into the
 * SeleccionOficial shape the UI expects.
 */

import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getBackendApiUrl } from "@/lib/server/auth";

const BACKEND_TIMEOUT_MS = 10_000;

interface FrontendBody {
  estudianteId: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ message: "No autenticado." }, { status: 401 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);
  try {
    const response = await fetch(`${getBackendApiUrl()}/ranking/seleccion-oficial`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
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

export async function POST(request: NextRequest): Promise<NextResponse> {
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

  const { estudianteId } = body as FrontendBody;

  if (!estudianteId) {
    return NextResponse.json(
      { message: "estudianteId es obligatorio." },
      { status: 400 },
    );
  }

  const personaId = Number(estudianteId);
  if (Number.isNaN(personaId)) {
    return NextResponse.json(
      { message: "estudianteId debe ser un número válido." },
      { status: 400 },
    );
  }

  const backendPayload = {
    persona_ids: [personaId],
    anio: new Date().getFullYear(),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);
  try {
    const response = await fetch(`${getBackendApiUrl()}/ranking/seleccion-oficial`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(backendPayload),
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

    const rankings = Array.isArray(data) ? data : [data];
    const first = (rankings[0] ?? {}) as Record<string, unknown>;

    const mapped = {
      id: String(first.id ?? ""),
      estudianteId,
      seleccionadoPor: "",
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(mapped, { status: 201 });
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
