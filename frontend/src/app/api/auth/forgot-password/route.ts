/**
 * POST /api/auth/forgot-password — public BFF proxy.
 *
 * Forwards the recovery request to FastAPI's `/auth/recuperar-contrasenia`.
 * No authentication required — this is a public endpoint.
 */

import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/server/auth";

interface ForgotPasswordBody {
  correo: string;
}

function isForgotPasswordBody(value: unknown): value is ForgotPasswordBody {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.correo === "string" && v.correo.length > 0;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "El cuerpo de la solicitud no es JSON válido." },
      { status: 400 },
    );
  }

  if (!isForgotPasswordBody(body)) {
    return NextResponse.json(
      { message: "El correo es obligatorio." },
      { status: 400 },
    );
  }

  const result = await backendFetch("/auth/recuperar-contrasenia", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correo: body.correo }),
  });

  if (!result.ok) {
    return NextResponse.json(
      { message: result.error.message },
      { status: result.error.code === "timeout" ? 503 : 500 },
    );
  }

  const response = result.data;
  if (!response.ok) {
    let message = "No se pudo procesar la solicitud.";
    try {
      const errorBody: unknown = await response.json();
      if (typeof errorBody === "object" && errorBody !== null) {
        const b = errorBody as Record<string, unknown>;
        message = (typeof b.message === "string" && b.message) || (typeof b.detail === "string" && b.detail) || message;
      }
    } catch { /* use fallback */ }
    return NextResponse.json({ message }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json(data, { status: 200 });
}
