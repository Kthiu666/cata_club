/**
 * GET /api/student?personaId=<id> — aggregates the logged-in persona's own
 * profile and their `representados` (dependents) into a `StudentPortalView`
 * (see src/lib/server/student-adapter.ts for the DTO translation and the two
 * backend gaps found while building this — membership/payment data is never
 * fetched, since no endpoint lets a student/representante read it).
 *
 * `personaId` is supplied by the client from its own session (`useAuth()`
 * already trusts that value everywhere else — e.g. src/app/student/enroll's
 * confirmation screen). Trusting it here introduces no new exposure: every
 * backend call below runs with the CALLER's own bearer token, and the
 * backend endpoints involved are already either ownership-checked
 * server-side (`/ranking/{id}/perfil`) or intentionally open to any
 * authenticated caller (`/personas/{id}`, `/personas/{id}/representados`,
 * `/asistencias/persona/{id}`) — see the router doc comments cited in
 * student-adapter.ts. This route cannot grant access the backend itself
 * wouldn't already allow.
 */

import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/server/auth";
import { backendFetchAuthed, passthroughBackendError } from "@/lib/server/backend-client";
import type { BackendPersonaFull } from "@/lib/server/members-adapter";
import type { BackendAsistencia, BackendHorario } from "@/lib/server/attendance-adapter";
import {
  buildMembershipPlans,
  buildRankingView,
  buildRecentSessions,
  buildStudentProfileView,
  type BackendMembresiaPropia,
  type BackendPerfilRanking,
  type BackendTipoMembresiaCatalogo,
  type StudentPortalView,
  type StudentProfileView,
  type StudentRankingView,
} from "@/lib/server/student-adapter";

async function fetchRanking(request: NextRequest, personaId: number): Promise<StudentRankingView> {
  const result = await backendFetchAuthed(request, `/ranking/${personaId}/perfil`);
  if (!result.ok) return { status: "unavailable", reason: "error" };
  if (result.response.status === 403) return { status: "unavailable", reason: "forbidden" };
  if (!result.response.ok) return { status: "unavailable", reason: "error" };
  const body = (await result.response.json()) as BackendPerfilRanking;
  return buildRankingView(body);
}

async function fetchProfile(
  request: NextRequest,
  personaId: number,
  horariosById: Map<number, BackendHorario>,
): Promise<StudentProfileView | null> {
  const [personaResult, rankingView, historialResult] = await Promise.all([
    backendFetchAuthed(request, `/personas/${personaId}`),
    fetchRanking(request, personaId),
    backendFetchAuthed(request, `/asistencias/persona/${personaId}`),
  ]);

  if (!personaResult.ok || !personaResult.response.ok) return null;
  const persona = (await personaResult.response.json()) as BackendPersonaFull;

  const historial: BackendAsistencia[] =
    historialResult.ok && historialResult.response.ok ? await historialResult.response.json() : [];
  const recentSessions = buildRecentSessions(historial, horariosById);

  return buildStudentProfileView(persona, rankingView, recentSessions);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const personaIdParam = request.nextUrl.searchParams.get("personaId");
  const personaId = personaIdParam !== null ? Number(personaIdParam) : NaN;
  if (!Number.isInteger(personaId) || personaId <= 0) {
    return NextResponse.json({ message: "personaId inválido." }, { status: 400 });
  }

  const [representadosResult, horariosResult, tiposResult] = await Promise.all([
    backendFetchAuthed(request, `/personas/${personaId}/representados`),
    backendFetchAuthed(request, "/asistencias/horarios"),
    backendFetchAuthed(request, "/membresias/tipos"),
  ]);

  if (!representadosResult.ok) {
    return NextResponse.json({ message: "No se pudo cargar la cuenta." }, { status: representadosResult.status });
  }
  if (!representadosResult.response.ok) {
    return passthroughBackendError(representadosResult.response, "No se pudo cargar la cuenta.");
  }
  const representadosPersonas = (await representadosResult.response.json()) as BackendPersonaFull[];

  const horarios: BackendHorario[] =
    horariosResult.ok && horariosResult.response.ok ? await horariosResult.response.json() : [];
  const horariosById = new Map(horarios.map((horario) => [horario.id, horario]));

  const tipos: BackendTipoMembresiaCatalogo[] =
    tiposResult.ok && tiposResult.response.ok ? await tiposResult.response.json() : [];

  // `/membresias/mias` defaults to the caller's OWN persona_id — it never
  // returns a dependent's memberships unless explicitly asked via
  // `?persona_id=`. Fetch it once per persona (self + every representado) so
  // `MembershipCard` has real data for whichever profile is selected, not
  // just the representante's own.
  const membershipTargets = [personaId, ...representadosPersonas.map((persona) => persona.id)];
  const membresiasResults = await Promise.all(
    membershipTargets.map((id) => backendFetchAuthed(request, `/membresias/mias?persona_id=${id}`)),
  );
  const membershipsByTarget = await Promise.all(
    membresiasResults.map((result) =>
      result.ok && result.response.ok
        ? (result.response.json() as Promise<BackendMembresiaPropia[]>)
        : Promise.resolve<BackendMembresiaPropia[]>([]),
    ),
  );
  const memberships: BackendMembresiaPropia[] = membershipsByTarget.flat();

  const [self, ...representados] = await Promise.all([
    fetchProfile(request, personaId, horariosById),
    ...representadosPersonas.map((persona) => fetchProfile(request, persona.id, horariosById)),
  ]);

  const portal: StudentPortalView = {
    self,
    representados: representados.filter((profile): profile is StudentProfileView => profile !== null),
    membershipPlans: buildMembershipPlans(tipos),
    memberships,
  };

  const response = NextResponse.json(portal);
  if (representadosResult.refreshedAccessToken) {
    setAuthCookies(response, { accessToken: representadosResult.refreshedAccessToken });
  }
  return response;
}
