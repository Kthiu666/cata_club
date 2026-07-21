/**
 * GET /api/ranking/:id/justificativos — proxies FastAPI's
 * `/ranking/{persona_id}/justificativos` (E04-RF012 ampliado). Returns a
 * persona's own justificativo history, any status — including RECHAZADO
 * with its `motivoRechazo` — so a student can see why theirs was rejected.
 * Dueño-or-representante authorization is enforced backend-side
 * (`listar_justificativos_de_persona` in ranking_servicio.py), not here.
 * Response is already camelCase and frontend-shaped
 * (`JustificativoResponseDTO`), so this handler passes it through
 * unmodified — same pattern as ../../justificativos/pendientes/route.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/server/auth";
import { backendFetchAuthed, passthroughBackendError } from "@/lib/server/backend-client";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const result = await backendFetchAuthed(request, `/ranking/${encodeURIComponent(params.id)}/justificativos`);
  if (!result.ok) {
    return NextResponse.json(
      { message: "No se pudieron cargar tus justificativos." },
      { status: result.status },
    );
  }
  if (!result.response.ok) {
    return passthroughBackendError(result.response, "No se pudieron cargar tus justificativos.");
  }

  const body = await result.response.json();
  const response = NextResponse.json(body);
  if (result.refreshedAccessToken) {
    setAuthCookies(response, { accessToken: result.refreshedAccessToken });
  }
  return response;
}
