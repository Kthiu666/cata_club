/**
 * POST /api/auth/reset-password — public BFF proxy.
 *
 * Forwards the password reset request to FastAPI's `/auth/restablecer-contrasenia`.
 * No authentication required — this uses the recovery token from the email.
 */

import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/server/auth";

interface ResetPasswordBody {
  token: string;
  nuevaContrasenia: string;
}

function isResetPasswordBody(value: unknown): value is ResetPasswordBody {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.token === "string" && v.token.length > 0
    && typeof v.nuevaContrasenia === "string" && v.nuevaContrasenia.length >= 8;
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

  if (!isResetPasswordBody(body)) {
    return NextResponse.json(
      { message: "Token y nueva contraseña son obligatorios (mínimo 8 caracteres)." },
      { status: 400 },
    );
  }

  const result = await backendFetch("/auth/restablecer-contrasenia", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: body.token, nueva_contrasenia: body.nuevaContrasenia }),
  });

  if (!result.ok) {
    return NextResponse.json(
      { message: result.error.message },
      { status: result.error.code === "timeout" ? 503 : 500 },
    );
  }

  const response = result.data;
  if (!response.ok) {
    let message = "No se pudo restablecer la contraseña.";
    try {
      const errorBody: unknown = await response.json();
      if (typeof errorBody === "object" && errorBody !== null) {
        const b = errorBody as Record<string, unknown>;
        message = (typeof b.message === "string" && b.message) || (typeof b.detail === "string" && b.detail) || message;
      }
    } catch { /* use fallback */ }
    return NextResponse.json({ message }, { status: response.status });
  }

  return new NextResponse(null, { status: 204 });
}
