/**
 * BFF proxy — GET /api/groups/horarios/[id]/alumnos
 *
 * Lists the students directly assigned to a training schedule. Proxies to
 * FastAPI's GET /asistencias/horarios/{horario_id}/alumnos.
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
} from "@/lib/server/bff-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const accessToken = extractAccessToken(request);
  if (!accessToken) return unauthorizedResponse();

  const [controller, done] = backendTimeout();
  try {
    const response = await fetch(
      backendUrl(`/asistencias/horarios/${encodeURIComponent(params.id)}/alumnos`),
      {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      },
    );

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
