/**
 * Pure utility functions and mock data for the Trainer Attendance flow.
 *
 * Extracted from page.tsx for testability — no React dependencies.
 *
 * Domain (2026-07): Session rosters are now DERIVED from Grupo.alumnosIds
 * via the shared buildTrainingSessions() helper in groups-utils.ts. The old
 * hardcoded AVAILABLE_SESSIONS is replaced by DERIVED_SESSIONS, which
 * reconciles mock data from src/mocks/members (MOCK_GRUPOS, MOCK_MEMBER_ACCOUNTS)
 * and src/mocks/attendance (MOCK_SCHEDULES) so the Grupo → schedule → student
 * relationship is explicit and tested.
 */

import type { EstadoAsistencia } from "@/types/domain";
import {
  MOCK_MEMBER_ACCOUNTS,
  MOCK_GRUPOS,
} from "@/mocks/members";
import { MOCK_SCHEDULES } from "@/mocks/attendance";
import { buildTrainingSessions } from "@/lib/groups-utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SessionStudent {
  id: string;
  name: string;
  attendance: EstadoAsistencia;
}

export interface TrainingSession {
  id: string;
  groupName: string;
  time: string;
  court: string;
  level: string;
  studentCount: number;
  students: SessionStudent[];
}

// ---------------------------------------------------------------------------
// Derive training sessions from canonical mock data
//
// Domain rule: sessions are NOT owned by one trainer. Any trainer may register
// attendance in any available session. The roster comes from Grupo.alumnosIds
// so it stays consistent with group membership changes.
// ---------------------------------------------------------------------------

/**
 * Build a map of studentId → "Nombres Apellidos" from MOCK_MEMBER_ACCOUNTS.
 */
function buildStudentNameMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const account of MOCK_MEMBER_ACCOUNTS) {
    for (const alumno of account.alumnos) {
      map[alumno.id] = `${alumno.nombres} ${alumno.apellidos}`;
    }
  }
  return map;
}

const DERIVED_STUDENT_NAME_MAP = buildStudentNameMap();

/**
 * Training sessions derived from Grupo + Horario data.
 * This replaces the old hardcoded AVAILABLE_SESSIONS.
 */
export const AVAILABLE_SESSIONS: TrainingSession[] = buildTrainingSessions(
  MOCK_GRUPOS,
  MOCK_SCHEDULES,
  DERIVED_STUDENT_NAME_MAP,
);

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

/** CSS badge styles per state. */
export const ATTENDANCE_BADGE_STYLES: Record<EstadoAsistencia, string> = {
  present: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  absent: "bg-red-50 text-red-700 ring-1 ring-red-200",
  late: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  justified: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
};

/** CSS background for the selector card per state. */
export const ATTENDANCE_CARD_STYLES: Record<EstadoAsistencia, string> = {
  present: "border-emerald-300 bg-emerald-50 text-emerald-800",
  absent: "border-red-300 bg-red-50 text-red-800",
  late: "border-amber-300 bg-amber-50 text-amber-800",
  justified: "border-blue-300 bg-blue-50 text-blue-800",
};

/** Default (unselected) card style. */
export const ATTENDANCE_CARD_DEFAULT = "border-cata-stone/60 bg-white text-cata-gray hover:border-cata-stone hover:shadow-soft";

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
 * e.g. "5 Presentes • 2 Ausentes • 1 Tardanza • 0 Justificados"
 */
export function buildAttendanceSummary(students: SessionStudent[]): string {
  const parts = ATTENDANCE_STATES.map((state) => {
    const count = countByState(students, state);
    const label = ATTENDANCE_LABELS[state].toLowerCase();
    return `${count} ${label}`;
  });
  return parts.join(" • ");
}
