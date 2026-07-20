/**
 * BFF proxy — PATCH /api/ranking/justificativos/:id/evaluar
 *
 * Admin-only: approves or rejects a pending justificativo. Proxies to
 * FastAPI's `PATCH /ranking/justificativos/{id}/evaluar`
 * (`JustificativoEvaluarDTO`: estado, motivo_rechazo? — confirmed live in
 * ranking_router.py / ranking_schemas.py) — translates the camelCase
 * `{ estado, motivoRechazo? }` body into that shape. `estado` is restricted
 * to APROBADO/RECHAZADO here (not the full `EstadoJustificativoRanking`
 * enum) since the backend service rejects re-evaluating an already-decided
 * justificativo and PENDIENTE is never a valid *decision*.
 */

import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getBackendApiUrl } from "@/lib/server/auth";

const BACKEND_TIMEOUT_MS = 10_000;

const VALID_DECISIONES = new Set(["APROBADO", "RECHAZADO"]);

interface EvaluarJustificativoRequestBody {
  estado?: unknown;
  motivoRechazo?: unknown;
}

export async function PATCH(
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

  const body = rawBody as EvaluarJustificativoRequestBody;
  if (
    typeof body.estado !== "string" ||
    !VALID_DECISIONES.has(body.estado) ||
    (body.motivoRechazo !== undefined && typeof body.motivoRechazo !== "string")
  ) {
    return NextResponse.json(
      { message: "estado debe ser APROBADO o RECHAZADO." },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);
  try {
    const response = await fetch(
      `${getBackendApiUrl()}/ranking/justificativos/${encodeURIComponent(params.id)}/evaluar`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          estado: body.estado,
          motivo_rechazo: body.motivoRechazo,
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
