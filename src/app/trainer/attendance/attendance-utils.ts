/**
 * Pure utility functions and mock data for the Trainer Attendance flow.
 *
 * Extracted from page.tsx for testability — no React dependencies.
 */

import type { EstadoAsistencia } from "@/types/domain";

// ---------------------------------------------------------------------------
// Types (duplicated from trainer/page.tsx to keep this module self-contained)
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
// Mock data — training sessions available today for attendance registration.
// Domain rule: sessions are NOT owned by one trainer. Any trainer may register
// attendance in any available session.
// ---------------------------------------------------------------------------

export const AVAILABLE_SESSIONS: TrainingSession[] = [
  {
    id: "s1",
    groupName: "Principiantes — Lun/Mié",
    time: "15:00 — 16:30",
    court: "Cancha 1",
    level: "Principiante",
    studentCount: 8,
    students: [
      { id: "alumno-s1-001", name: "Sofia Martinez", attendance: "absent" },
      { id: "alumno-s1-002", name: "Mateo Rodriguez", attendance: "absent" },
      { id: "alumno-s1-003", name: "Valentina Lopez", attendance: "absent" },
      { id: "alumno-s1-004", name: "Benjamin Torres", attendance: "absent" },
      { id: "alumno-s1-005", name: "Camila Flores", attendance: "absent" },
      { id: "alumno-s1-006", name: "Emilia Castillo", attendance: "absent" },
      { id: "alumno-s1-007", name: "Santiago Ramirez", attendance: "absent" },
      { id: "alumno-s1-008", name: "Isabella Morales", attendance: "absent" },
    ],
  },
  {
    id: "s2",
    groupName: "Intermedios — Lun/Mié",
    time: "16:45 — 18:15",
    court: "Cancha 2",
    level: "Intermedio",
    studentCount: 6,
    students: [
      { id: "alumno-s2-001", name: "Nicolas Acosta", attendance: "absent" },
      { id: "alumno-s2-002", name: "Valeria Gomez", attendance: "absent" },
      { id: "alumno-s2-003", name: "Diego Herrera", attendance: "absent" },
      { id: "alumno-s2-004", name: "Luciana Paz", attendance: "absent" },
      { id: "alumno-s2-005", name: "Tomas Rivas", attendance: "absent" },
      { id: "alumno-s2-006", name: "Gabriela Silva", attendance: "absent" },
    ],
  },
  {
    id: "s3",
    groupName: "Avanzados — Lun/Mié",
    time: "18:30 — 20:00",
    court: "Cancha 1 y 3",
    level: "Avanzado",
    studentCount: 4,
    students: [
      { id: "alumno-s3-001", name: "Alejandro Padilla", attendance: "absent" },
      { id: "alumno-s3-002", name: "Carolina Mendez", attendance: "absent" },
      { id: "alumno-s3-003", name: "Felipe Ortega", attendance: "absent" },
      { id: "alumno-s3-004", name: "Mariana Rios", attendance: "absent" },
    ],
  },
];

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
