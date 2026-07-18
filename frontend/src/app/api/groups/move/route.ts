/**
 * PATCH /api/groups/move — proxies FastAPI's
 * `PATCH /ranking/{persona_id}/mover-de-nivel?nuevo_nivel_id=X`.
 *
 * For a student who is already on a Ranking row (already assigned to a
 * nivel/group once), this moves them to a different one. Allowed for both
 * ADMINISTRADOR and ENTRENADOR (`GestorPermisos(ROL_ADMIN_O_ENTRENADOR)`) —
 * unlike the initial assignment (see `POST /api/groups/assign`'s doc
 * comment for that gap), this one works for the admin-only `/groups` page.
 *
 * There is no backend endpoint to *unassign* a student (remove them from
 * every nivel without moving them to another one) — `mover-de-nivel`
 * requires a target nivel, and no DELETE/PATCH on Ranking clears
 * `nivel_ranking_id`. `/groups/page.tsx` reflects this real gap by
 * disabling that specific action rather than faking it locally.
 */

import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/server/auth";
import { backendFetchAuthed, passthroughBackendError } from "@/lib/server/backend-client";

interface MoveRequestBody {
  personaId?: unknown;
  nivelRankingId?: unknown;
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido en el cuerpo de la solicitud" }, { status: 400 });
  }

  const body = rawBody as MoveRequestBody;
  if (typeof body.personaId !== "number" || typeof body.nivelRankingId !== "number") {
    return NextResponse.json({ message: "personaId y nivelRankingId son obligatorios y deben ser numéricos." }, { status: 400 });
  }

  const result = await backendFetchAuthed(
    request,
    `/ranking/${body.personaId}/mover-de-nivel?nuevo_nivel_id=${body.nivelRankingId}`,
    { method: "PATCH" },
  );
  if (!result.ok) {
    return NextResponse.json({ message: "No se pudo mover al estudiante de grupo." }, { status: result.status });
  }
  if (!result.response.ok) {
    return passthroughBackendError(result.response, "No se pudo mover al estudiante de grupo.");
  }

  const item = await result.response.json();
  const response = NextResponse.json(item);
  if (result.refreshedAccessToken) {
    setAuthCookies(response, { accessToken: result.refreshedAccessToken });
  }
  return response;
}
