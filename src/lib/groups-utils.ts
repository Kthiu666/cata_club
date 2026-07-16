/**
 * Group management pure helpers for Cata Club.
 *
 * These are the canonical helpers for group assignment, student-group mapping,
 * capacity checks, and building UI card data. They reconcile data across
 * multiple mock sources (members-utils, attendance-utils) and produce
 * derived views for the /groups admin page, /attendance, and trainer flow.
 *
 * No React dependencies — pure functions for testability.
 */

import type { Grupo, NivelTecnico, EstadoAsistencia } from "@/types/domain";
import type { ScheduleSlot } from "@/app/attendance/attendance-utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Result of an assignment operation. */
export interface AssignmentResult {
  updatedGrupos: Grupo[];
  success: boolean;
  message: string;
}

/** A lightweight student reference for group operations. */
export interface StudentRef {
  id: string;
  nombres: string;
  apellidos: string;
  grupoId: string | null;
  activo: boolean;
}

/** A student in a trainer session roster. */
export interface SessionStudent {
  id: string;
  name: string;
  attendance: EstadoAsistencia;
}

/** A training session for attendance registration, derived from schedule + group. */
export interface DerivedTrainingSession {
  id: string;
  groupName: string;
  time: string;
  court: string;
  level: string;
  studentCount: number;
  students: SessionStudent[];
}

/** Group card data for the admin UI. */
export interface GroupCardData {
  id: string;
  name: string;
  level: NivelTecnico;
  levelLabel: string;
  studentCount: number;
  capacity: number;
  capacityPercent: number;
  scheduleCount: number;
  scheduleLabels: string[];
}

// ---------------------------------------------------------------------------
// Label helpers
// ---------------------------------------------------------------------------

const DIA_SEMANA_LABELS: Record<string, string> = {
  lun: "Lunes",
  mar: "Martes",
  mie: "Miércoles",
  jue: "Jueves",
  vie: "Viernes",
  sab: "Sábado",
};

const NIVEL_LABELS: Record<NivelTecnico, string> = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Get human-readable label for a technical level. */
export function getLevelLabel(nivel: NivelTecnico): string {
  return NIVEL_LABELS[nivel] ?? capitalize(nivel);
}

// ---------------------------------------------------------------------------
// Level badge color tokens (Fase 4 — trainer light-theme migration)
// ---------------------------------------------------------------------------

/**
 * Light-theme badge color tokens for a technical-level label.
 *
 * Keyed by the human-readable label (as returned by `getLevelLabel`) since
 * callers (e.g. the trainer session roster) commonly work with the derived
 * label rather than the raw `NivelTecnico` enum once sessions are built.
 * Mirrors the `cata-*`-only palette established by `groups-page-utils.ts`'s
 * `LEVEL_BADGE` (B3 fix) — `principiante` uses the `state-ok` success token,
 * `intermedio` reuses `cata-navy` (no dedicated "warning" hue exists in the
 * brand namespace), `avanzado` reuses the brand red. Keep these two maps in
 * sync; do not reintroduce plain Tailwind `green-*`/`amber-*` here.
 */
const NIVEL_BADGE_TOKENS: Record<string, string> = {
  Principiante: "bg-cata-state-ok/10 text-cata-state-ok",
  Intermedio: "bg-cata-navy/10 text-cata-navy",
  Avanzado: "bg-cata-red/15 text-cata-red",
};

/** Neutral fallback token for an unrecognized level label at runtime. */
const FALLBACK_NIVEL_BADGE_TOKENS = "bg-cata-border/40 text-cata-text/65";

/**
 * Get the light-theme badge color classes for a technical-level label.
 *
 * Returns a neutral fallback for unknown/unexpected labels — never throws,
 * avoids rendering an unstyled badge for bad runtime data.
 */
export function getLevelBadgeTokens(levelLabel: string): string {
  return NIVEL_BADGE_TOKENS[levelLabel] ?? FALLBACK_NIVEL_BADGE_TOKENS;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Assign a student to a group.
 *
 * If the student was assigned to a different group, they are removed from it
 * first. Returns the updated grupos array (immutable — no mutation).
 */
export function assignStudentToGroup(
  alumnoId: string,
  targetGrupoId: string,
  grupos: Grupo[],
): AssignmentResult {
  const targetIdx = grupos.findIndex((g) => g.id === targetGrupoId);
  if (targetIdx === -1) {
    return {
      updatedGrupos: grupos,
      success: false,
      message: `Grupo "${targetGrupoId}" no encontrado.`,
    };
  }

  // Student already in target?
  if (grupos[targetIdx].alumnosIds.includes(alumnoId)) {
    return {
      updatedGrupos: grupos,
      success: false,
      message: "El alumno ya pertenece a este grupo.",
    };
  }

  // Remove from all groups, add to target (immutable)
  const working = grupos.map((g) => ({
    ...g,
    alumnosIds: g.alumnosIds.filter((id) => id !== alumnoId),
  }));

  const updatedGrupos = working.map((g) =>
    g.id === targetGrupoId
      ? { ...g, alumnosIds: [...g.alumnosIds, alumnoId] }
      : g,
  );

  return {
    updatedGrupos,
    success: true,
    message: "Alumno asignado al grupo correctamente.",
  };
}

/**
 * Remove a student from all groups.
 * Returns the updated grupos array (immutable).
 */
export function removeStudentFromAllGroups(
  alumnoId: string,
  grupos: Grupo[],
): Grupo[] {
  return grupos.map((g) => ({
    ...g,
    alumnosIds: g.alumnosIds.filter((id) => id !== alumnoId),
  }));
}

/**
 * Get all student references that belong to a specific group.
 */
export function getStudentsByGroup(
  grupo: Grupo,
  allStudents: StudentRef[],
): StudentRef[] {
  return allStudents.filter((s) => grupo.alumnosIds.includes(s.id));
}

/**
 * Get all schedules linked to a group via horariosIds.
 */
export function getSchedulesByGroup(
  grupo: Grupo,
  schedules: ScheduleSlot[],
): ScheduleSlot[] {
  if (!grupo.horariosIds || grupo.horariosIds.length === 0) return [];
  return schedules.filter((s) => grupo.horariosIds!.includes(s.id));
}

/**
 * Find students not assigned to any group.
 *
 * NOTE: This function does NOT filter by `activo`. Inactive students ARE
 * included in the returned pool. If the caller wants to exclude inactive
 * students from assignment pools, they should pre-filter `allStudents`.
 */
export function getUnassignedStudents(
  allStudents: StudentRef[],
): StudentRef[] {
  return allStudents.filter((s) => !s.grupoId);
}

/**
 * Find students who ARE assigned to at least one group.
 *
 * NOTE: This function does NOT filter by `activo`. Inactive students with
 * a grupoId ARE included in the returned pool.
 */
export function getAssignedStudents(
  allStudents: StudentRef[],
): StudentRef[] {
  return allStudents.filter((s) => s.grupoId);
}

/**
 * Check capacity for a group using the minimum linked ACTIVE schedule cupoMaximo.
 *
 * A group roster attends EVERY linked schedule session (same students attend
 * all sessions), so effective capacity is the MINIMUM cupoMaximo across
 * linked ACTIVE schedules — not the sum. Inactive schedule slots should not
 * cap capacity because the group does not attend them.
 *
 * Returns { available, total, percent } where available < 0 means overbooked.
 */
export function getGroupCapacity(
  grupo: Grupo,
  schedules: ScheduleSlot[],
): { total: number; available: number; percent: number } {
  const groupSchedules = getSchedulesByGroup(grupo, schedules).filter(
    (s) => s.activo,
  );
  const total =
    groupSchedules.length > 0
      ? Math.min(...groupSchedules.map((s) => s.cupoMaximo))
      : 0;
  const assigned = grupo.alumnosIds.length;
  const available = total - assigned;
  const percent = total > 0 ? Math.round((assigned / total) * 100) : 0;
  return { total, available, percent };
}

/**
 * Build group card data from raw data for the admin UI.
 */
export function buildGroupCards(
  grupos: Grupo[],
  schedules: ScheduleSlot[],
): GroupCardData[] {
  return grupos.map((grupo) => {
    const groupSchedules = getSchedulesByGroup(grupo, schedules);
    const { total, available, percent } = getGroupCapacity(grupo, schedules);

    return {
      id: grupo.id,
      name: grupo.nombre,
      level: grupo.nivel,
      levelLabel: getLevelLabel(grupo.nivel),
      studentCount: grupo.alumnosIds.length,
      capacity: total,
      capacityPercent: percent,
      scheduleCount: groupSchedules.length,
      scheduleLabels: groupSchedules.map(
        (s) =>
          `${DIA_SEMANA_LABELS[s.diaSemana] ?? s.diaSemana} ${s.horaInicio} — ${s.horaFin}`,
      ),
    };
  });
}

/**
 * Derive training sessions from group + schedule data.
 *
 * This replaces the hardcoded AVAILABLE_SESSIONS in the trainer attendance
 * flow, tying session rosters to Grupo.alumnosIds so the relationship is
 * explicit and tested.
 *
 * @param grupos — All groups with alumnosIds linking them to students.
 * @param schedules — All schedule slots (Horario), keyed by id.
 * @param studentNameMap — A map of studentId → display name, built from
 *   the mock member accounts or any student list.
 * @param groupScheduleMap — A map of groupId → scheduleId[] if not using
 *   Grupo.horariosIds directly. When omitted, uses Grupo.horariosIds.
 * @returns Derived training sessions, one per (group, schedule) pair.
 */
export function buildTrainingSessions(
  grupos: Grupo[],
  schedules: ScheduleSlot[],
  studentNameMap: Record<string, string>,
  groupScheduleMap?: Record<string, string[]>,
): DerivedTrainingSession[] {
  const sessions: DerivedTrainingSession[] = [];
  let sessionCounter = 0;

  for (const grupo of grupos) {
    const scheduleIds =
      groupScheduleMap?.[grupo.id] ??
      grupo.horariosIds ??
      [];

    // Group schedules by (diaSemana, approximate time range) to create
    // meaningful session names. For mock simplicity, group by schedule.
    for (const horarioId of scheduleIds) {
      const schedule = schedules.find((s) => s.id === horarioId);
      if (!schedule || !schedule.activo) continue;

      sessionCounter++;
      const diaLabel = DIA_SEMANA_LABELS[schedule.diaSemana] ?? schedule.diaSemana;
      const shortDia = diaLabel.slice(0, 3); // "Lun", "Mar", etc.

      // Derive roster from grupo.alumnosIds
      const students: SessionStudent[] = grupo.alumnosIds.map((alumnoId) => ({
        id: alumnoId,
        name: studentNameMap[alumnoId] ?? `Alumno ${alumnoId}`,
        attendance: "absent" as EstadoAsistencia,
      }));

      sessions.push({
        id: `s${sessionCounter}`,
        groupName: `${grupo.nombre} — ${shortDia}/${diaLabel}`,
        time: `${schedule.horaInicio} — ${schedule.horaFin}`,
        court: schedule.cancha,
        level: getLevelLabel(grupo.nivel),
        studentCount: students.length,
        students,
      });
    }
  }

  return sessions;
}
