/**
 * BFF proxy — GET/POST /api/ranking/seleccion-oficial
 *
 * GET: lists the persisted official-selection roster from the backend.
 * POST: translates the frontend's per-student DTO into the backend's batch
 * DTO and maps the backend's RankingResponseDTO array back into the
 * SeleccionOficial shape the UI expects.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  extractAccessToken,
  parseJsonBody,
  parseJsonResponse,
  extractBackendErrorMessage,
  handleProxyError,
  backendTimeout,
  backendUrl,
  unauthorizedResponse,
  badRequestResponse,
} from "@/lib/server/bff-helpers";

interface FrontendBody {
  estudianteId: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const accessToken = extractAccessToken(request);
  if (!accessToken) return unauthorizedResponse();

  const [controller, done] = backendTimeout();
  try {
    const response = await fetch(backendUrl("/ranking/seleccion-oficial"), {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });

    const data = await parseJsonResponse(response);

    if (!response.ok) {
      return NextResponse.json(
        { message: extractBackendErrorMessage(data, response.status) },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    return handleProxyError(error);
  } finally {
    done();
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const accessToken = extractAccessToken(request);
  if (!accessToken) return unauthorizedResponse();

  const [body, bodyError] = await parseJsonBody(request);
  if (bodyError) return bodyError;

  const { estudianteId } = body as FrontendBody;

  if (!estudianteId) {
    return badRequestResponse("estudianteId es obligatorio.");
  }

  const personaId = Number(estudianteId);
  if (Number.isNaN(personaId)) {
    return badRequestResponse("estudianteId debe ser un número válido.");
  }

  const backendPayload = {
    persona_ids: [personaId],
    anio: new Date().getFullYear(),
  };

  const [controller, done] = backendTimeout();
  try {
    const response = await fetch(backendUrl("/ranking/seleccion-oficial"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(backendPayload),
      signal: controller.signal,
    });

    const data = await parseJsonResponse(response);

    if (!response.ok) {
      return NextResponse.json(
        { message: extractBackendErrorMessage(data, response.status) },
        { status: response.status },
      );
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
    return handleProxyError(error);
  } finally {
    done();
  }
}
