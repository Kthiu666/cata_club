/**
 * BFF proxy — DELETE /api/ranking/seleccion-oficial/:personaId
 *
 * Removes a student from the official-selection roster.
 * Proxies to FastAPI's DELETE /ranking/seleccion-oficial/{persona_id}
 * which returns 204 No Content on success.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  extractAccessToken,
  parseJsonResponse,
  extractBackendErrorMessage,
  handleProxyError,
  backendTimeout,
  backendUrl,
  unauthorizedResponse,
  badRequestResponse,
} from "@/lib/server/bff-helpers";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { personaId: string } },
): Promise<NextResponse> {
  const accessToken = extractAccessToken(request);
  if (!accessToken) return unauthorizedResponse();

  const personaId = Number(params.personaId);
  if (Number.isNaN(personaId)) {
    return badRequestResponse("personaId debe ser un número válido.");
  }

  const [controller, done] = backendTimeout();
  try {
    const response = await fetch(
      backendUrl(`/ranking/seleccion-oficial/${encodeURIComponent(String(personaId))}`),
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      const data = await parseJsonResponse(response);
      return NextResponse.json(
        { message: extractBackendErrorMessage(data, response.status) },
        { status: response.status },
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    return handleProxyError(error);
  } finally {
    done();
  }
}
