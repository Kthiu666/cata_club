/**
 * POST /api/groups/assign — proxies FastAPI's `POST /ranking/asignar-nivel-inicial`
 * (E03-RF002: initial nivel/group assignment for a student with no Ranking
 * row yet).
 *
 * KNOWN PERMISSION GAP (report this — do not paper over it): the backend
 * restricts this endpoint to `ENTRENADOR` only (`GestorPermisos(["ENTRENADOR"])`
 * in ranking_router.py) — `ADMINISTRADOR` is NOT in the allowed roles, even
 * though `/groups` (this route's only caller) is an admin-only page
 * (`allowedRoles={["admin"]}`). Verified live: an admin token gets a real
 * 403 `{"detail":"Permisos insuficientes para esta operación"}` from
 * FastAPI. This handler does not work around that — it passes the backend's
 * real authorization decision straight through, so an admin user sees the
 * genuine permission error instead of a fabricated success. Moving an
 * *already-ranked* student between niveles works fine for admins (see
 * `PATCH /api/groups/move`, backed by `mover-de-nivel`, which allows both
 * ADMINISTRADOR and ENTRENADOR) — only the very first assignment is
 * restricted this way.
 */

import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/server/auth";
import { backendFetchAuthed, passthroughBackendError } from "@/lib/server/backend-client";

interface AssignRequestBody {
  personaId?: unknown;
  nivelRankingId?: unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido en el cuerpo de la solicitud" }, { status: 400 });
  }

  const body = rawBody as AssignRequestBody;
  if (typeof body.personaId !== "number" || typeof body.nivelRankingId !== "number") {
    return NextResponse.json({ message: "personaId y nivelRankingId son obligatorios y deben ser numéricos." }, { status: 400 });
  }

  const result = await backendFetchAuthed(request, "/ranking/asignar-nivel-inicial", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ persona_id: body.personaId, nivel_ranking_id: body.nivelRankingId }),
  });
  if (!result.ok) {
    return NextResponse.json({ message: "No se pudo asignar el estudiante al grupo." }, { status: result.status });
  }
  if (!result.response.ok) {
    return passthroughBackendError(result.response, "No se pudo asignar el estudiante al grupo.");
  }

  const item = await result.response.json();
  const response = NextResponse.json(item);
  if (result.refreshedAccessToken) {
    setAuthCookies(response, { accessToken: result.refreshedAccessToken });
  }
  return response;
}
