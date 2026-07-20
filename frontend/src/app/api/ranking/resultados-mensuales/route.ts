/**
 * BFF proxy — /api/ranking/resultados-mensuales
 *
 * GET:  returns monthly ranking results (optional filters: nivel_id, anio, mes)
 * POST: registers a monthly result — translates frontend shape to backend shape.
 *
 * POST translation:
 *   Frontend: { estudianteId, categoria, periodo, puntos, observacion? }
 *   Backend:  { persona_id, anio, mes, posicion?, participo }
 *     estudianteId → persona_id, periodo → anio+mes, puntos → posicion,
 *     participo = true (trainer registered = student participated)
 */

import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getBackendApiUrl } from "@/lib/server/auth";

const BACKEND_TIMEOUT_MS = 10_000;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ message: "No autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const qs = new URLSearchParams();
  const nivelId = searchParams.get("nivel_id");
  const anio = searchParams.get("anio");
  const mes = searchParams.get("mes");
  if (nivelId) qs.set("nivel_id", nivelId);
  if (anio) qs.set("anio", anio);
  if (mes) qs.set("mes", mes);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);
  try {
    const url = `${getBackendApiUrl()}/ranking/resultados-mensuales${qs.toString() ? `?${qs.toString()}` : ""}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });

    return await forwardBackendResponse(response);
  } catch (error: unknown) {
    return backendFailureResponse(error);
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

  const b = body as Record<string, unknown>;
  const estudianteId = b.estudianteId;
  const periodo = b.periodo as string | undefined;
  const puntos = b.puntos;

  if (!estudianteId || typeof estudianteId !== "string") {
    return NextResponse.json(
      { message: "Falta estudianteId válido." },
      { status: 400 },
    );
  }
  if (!periodo || typeof periodo !== "string") {
    return NextResponse.json(
      { message: "Falta periodo válido (YYYY-MM)." },
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

  const posicion = typeof puntos === "number" && Number.isFinite(puntos)
    ? Math.max(1, Math.round(puntos))
    : undefined;

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
        persona_id: Number(estudianteId),
        anio,
        mes,
        posicion,
        participo: posicion !== undefined,
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
