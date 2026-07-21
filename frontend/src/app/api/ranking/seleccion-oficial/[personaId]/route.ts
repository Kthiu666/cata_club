/**
 * BFF proxy — DELETE /api/ranking/seleccion-oficial/:personaId
 *
 * Removes a student from the official-selection roster.
 * Proxies to FastAPI's DELETE /ranking/seleccion-oficial/{persona_id}
 * which returns 204 No Content on success.
 */

import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getBackendApiUrl } from "@/lib/server/auth";

const BACKEND_TIMEOUT_MS = 10_000;

export async function DELETE(
  request: NextRequest,
  { params }: { params: { personaId: string } },
): Promise<NextResponse> {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ message: "No autenticado." }, { status: 401 });
  }

  const personaId = Number(params.personaId);
  if (Number.isNaN(personaId)) {
    return NextResponse.json(
      { message: "personaId debe ser un número válido." },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);
  try {
    const response = await fetch(
      `${getBackendApiUrl()}/ranking/seleccion-oficial/${encodeURIComponent(String(personaId))}`,
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
