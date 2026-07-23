/**
 * GET /api/student?personaId=<id> — aggregated portal for the logged-in persona.
 */
import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/server/auth";
import { backendFetchAuthed, passthroughBackendError } from "@/lib/server/backend-client";
import type { BackendPersonaFull } from "@/lib/server/members-adapter";
import type { BackendAsistencia, BackendHorario } from "@/lib/server/attendance-adapter";
import {
  buildMembershipPlans,
  buildMembershipView,
  buildRankingView,
  buildRecentSessions,
  buildStudentProfileView,
  type BackendMembresiaPropia,
  type BackendPerfilRanking,
  type BackendTipoMembresiaCatalogo,
  type MembershipView,
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

async function fetchMemberships(
  request: NextRequest,
  personaId: number,
): Promise<BackendMembresiaPropia[]> {
  const result = await backendFetchAuthed(request, `/membresias/mias?persona_id=${personaId}`);
  if (!result.ok || !result.response.ok) return [];
  return result.response.json() as Promise<BackendMembresiaPropia[]>;
}

/**
 * Fetch the persona's own pagos (any status) and find the latest APROBADO
 * pago's `fechaFin` for the given `membresiaId` — surfaces the real
 * expiration date to the student so they can proactively renew even
 * before the daily Celery task flips the Membresia.estado to VENCIDA.
 */
async function fetchLatestApprovedFechaFin(
  request: NextRequest,
  personaId: number,
  membresiaId: number,
): Promise<string | null> {
  const result = await backendFetchAuthed(request, `/membresias/pagos/persona/${personaId}`);
  if (!result.ok || !result.response.ok) return null;
  const pagos = (await result.response.json()) as Array<{
    estadoPago: string;
    fechaFin: string;
    membresiaId: number;
  }>;
  const approved = pagos
    .filter((p) => p.estadoPago === "APROBADO" && p.membresiaId === membresiaId)
    .map((p) => p.fechaFin)
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
  return approved[0] ?? null;
}

async function fetchProfile(
  request: NextRequest,
  personaId: number,
  horariosById: Map<number, BackendHorario>,
  tiposById: Map<number, BackendTipoMembresiaCatalogo>,
): Promise<StudentProfileView | null> {
  const [personaResult, rankingView, historialResult, memberships] = await Promise.all([
    backendFetchAuthed(request, `/personas/${personaId}`),
    fetchRanking(request, personaId),
    backendFetchAuthed(request, `/asistencias/persona/${personaId}`),
    fetchMemberships(request, personaId),
  ]);

  if (!personaResult.ok || !personaResult.response.ok) return null;
  const persona = (await personaResult.response.json()) as BackendPersonaFull;

  const historial: BackendAsistencia[] =
    historialResult.ok && historialResult.response.ok ? await historialResult.response.json() : [];
  const recentSessions = buildRecentSessions(historial, horariosById);

  const activeMembership = memberships.find((m) => m.estado === "ACTIVA" || m.estado === "VENCIDA") ?? memberships[0] ?? null;
  const membership = activeMembership
    ? buildMembershipView(
        activeMembership,
        tiposById,
        await fetchLatestApprovedFechaFin(request, personaId, activeMembership.id),
      )
    : null;

  return buildStudentProfileView(persona, rankingView, recentSessions, membership);
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
    return NextResponse.json({ message: "No autorizado" }, { status: representadosResult.status });
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
  const tiposById = new Map(tipos.map((tipo) => [tipo.id, tipo]));

  const [self, ...representados] = await Promise.all([
    fetchProfile(request, personaId, horariosById, tiposById),
    ...representadosPersonas.map((persona) => fetchProfile(request, persona.id, horariosById, tiposById)),
  ]);

  const validRepresentados = representados.filter((profile): profile is StudentProfileView => profile !== null);

  let representanteNombre: string | null = null;
  if (self?.representanteId) {
    const repResult = await backendFetchAuthed(request, `/personas/${self.representanteId}`);
    if (repResult.ok && repResult.response.ok) {
      const rep = (await repResult.response.json()) as { nombres: string; apellidos: string };
      representanteNombre = `${rep.nombres} ${rep.apellidos}`;
    }
  }

  const portal: StudentPortalView = {
    self,
    representados: validRepresentados,
    membershipPlans: buildMembershipPlans(tipos),
    representanteNombre,
  };

  const response = NextResponse.json(portal);
  if (representadosResult.refreshedAccessToken) {
    setAuthCookies(response, { accessToken: representadosResult.refreshedAccessToken });
  }
  return response;
}
