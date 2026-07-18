/**
 * Pure utility functions for the Trainer Attendance flow.
 *
 * Extracted from page.tsx for testability — no React dependencies.
 *
 * Domain (Fase 3): the wizard now selects a real Horario
 * (`GET /api/attendance/schedules`) and a real NivelRanking/"Grupo" roster
 * (`GET /api/ranking/niveles` + `GET /api/ranking/niveles/:id/tabla`)
 * *independently*, instead of deriving a single combined "session" from
 * Grupo.estudiantesIds like the old mock-backed AVAILABLE_SESSIONS did.
 *
 * That's not a UI preference — it's forced by a real backend gap: neither
 * `HorarioResponseDTO` nor `NivelRankingResponseDTO` exposes the
 * `nivel_ranking_id` link that exists on the `HorarioEntrenamiento` model,
 * so there is currently no way, through the API, to know which nivel a
 * horario belongs to (see src/lib/server/attendance-adapter.ts for the full
 * writeup). Asking the trainer to pick both explicitly is the honest
 * adaptation until that link is exposed.
 */

import type { EstadoAsistencia } from "@/types/domain";
import type { TablaRankingItem } from "@/services/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SessionStudent {
  id: string;
  name: string;
  attendance: EstadoAsistencia;
}

// ---------------------------------------------------------------------------
// Attendance helpers
// ---------------------------------------------------------------------------

/** Human-readable labels for each attendance state, in Spanish. */
export const ATTENDANCE_LABELS: Record<EstadoAsistencia, string> = {
  present: "Presente",
  absent: "Ausente",
  late: "Tardanza",
  justified: "Justificado",
};

// Badge/status color tokens for each attendance state come from the shared
// `getAttendanceBadgeTokens` in `@/app/attendance/attendance-utils` (Fase 3b
// — B4), imported directly by page.tsx. This keeps trainer attendance's
// badge/status colors byte-identical to the admin attendance view instead of
// maintaining a second, drifting color-mapping Record here.

/** All possible attendance states for the toggle. */
export const ATTENDANCE_STATES: EstadoAsistencia[] = [
  "present",
  "absent",
  "late",
  "justified",
];

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Cycle to the next attendance state in a defined order:
 * absent → present → late → justified → absent → ...
 *
 * This provides a predictable toggle sequence for the UI.
 */
export function nextAttendanceState(
  current: EstadoAsistencia,
): EstadoAsistencia {
  const order: EstadoAsistencia[] = ["absent", "present", "late", "justified"];
  const idx = order.indexOf(current);
  if (idx === -1 || idx === order.length - 1) return order[0];
  return order[idx + 1];
}

/**
 * Count how many students have a given attendance state.
 */
export function countByState(
  students: SessionStudent[],
  state: EstadoAsistencia,
): number {
  return students.filter((s) => s.attendance === state).length;
}

/**
 * Build a human-readable summary of attendance counts.
 * e.g. "5 presente • 2 ausente • 1 tardanza • 0 justificado"
 */
export function buildAttendanceSummary(students: SessionStudent[]): string {
  const parts = ATTENDANCE_STATES.map((state) => {
    const count = countByState(students, state);
    const label = ATTENDANCE_LABELS[state].toLowerCase();
    return `${count} ${label}`;
  });
  return parts.join(" • ");
}

/**
 * Build the roster to mark attendance for from a nivel's real ranking table
 * (`GET /ranking/niveles/:id/tabla`), defaulting every student to "absent"
 * — the trainer marks who was actually present from there. Replaces the old
 * mock-derived AVAILABLE_SESSIONS roster.
 */
export function buildRosterFromTabla(items: TablaRankingItem[]): SessionStudent[] {
  return items.map((item) => ({
    id: String(item.personaId),
    name: item.personaNombreCompleto,
    attendance: "absent" as EstadoAsistencia,
  }));
}
