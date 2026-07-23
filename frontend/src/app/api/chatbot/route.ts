/**
 * POST /api/chatbot — BFF proxy to the backend's public (no auth),
 * rate-limited (15/min) `POST /chatbot/consultar`. Static-FAQ helper for
 * navigating the app — no personal/sensitive data involved, so this proxy
 * uses the unauthenticated `backendFetch` (not `backendFetchAuthed`).
 */

import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/server/auth";
import { passthroughBackendError } from "@/lib/server/backend-client";

interface ChatbotRequestBody {
  mensaje: string;
  historial?: Array<{ rol: "usuario" | "asistente"; texto: string }>;
}

interface BackendChatbotResponse {
  respuesta: string;
}

function isChatbotRequestBody(value: unknown): value is ChatbotRequestBody {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.mensaje !== "string" || v.mensaje.trim().length === 0) return false;
  if (v.historial === undefined) return true;
  if (!Array.isArray(v.historial)) return false;
  return v.historial.every(
    (turno) =>
      typeof turno === "object" &&
      turno !== null &&
      (turno as Record<string, unknown>).rol !== undefined &&
      typeof (turno as Record<string, unknown>).texto === "string",
  );
}

function isBackendChatbotResponse(value: unknown): value is BackendChatbotResponse {
  return typeof value === "object" && value !== null && typeof (value as Record<string, unknown>).respuesta === "string";
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "El cuerpo de la solicitud no es válido." }, { status: 400 });
  }

  if (!isChatbotRequestBody(body)) {
    return NextResponse.json({ message: "El mensaje del chat es inválido o está vacío." }, { status: 400 });
  }

  const result = await backendFetch("/chatbot/consultar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mensaje: body.mensaje, historial: body.historial }),
  });

  if (!result.ok) {
    const status = result.error.code === "timeout" ? 504 : 503;
    return NextResponse.json({ message: result.error.message }, { status });
  }

  const response = result.data;
  if (!response.ok) {
    return passthroughBackendError(response, "No se pudo contactar al asistente.");
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return NextResponse.json({ message: "Respuesta del asistente inválida." }, { status: 502 });
  }
  if (!isBackendChatbotResponse(json)) {
    return NextResponse.json({ message: "Respuesta del asistente con forma inesperada." }, { status: 502 });
  }

  return NextResponse.json({ reply: json.respuesta });
}
