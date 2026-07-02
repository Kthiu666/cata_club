/**
 * Pure utility functions and mock data for the admin Horarios y Asistencia page.
 *
 * Admin overview: available schedules (Horario) and recent attendance records
 * (Asistencia). This is separate from the trainer attendance flow
 * (src/app/trainer/attendance/) which is for marking attendance per session.
 *
 * No React dependencies — pure functions for testability.
 */

import type { DiaSemana, NivelTecnico, EstadoAsistencia } from "@/types/domain";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A training schedule slot, displayed in the admin overview. */
export interface ScheduleSlot {
  id: string;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
  nivel: NivelTecnico;
  cancha: string;
  cupoMaximo: number;
  activo: boolean;
}

/** A recent attendance record, enriched with student/trainer names. */
export interface AttendanceRecord {
  id: string;
  fecha: string;
  horario: string;
  alumno: string;
  estado: EstadoAsistencia;
  entrenador: string;
}

/** Aggregate counts for today's attendance overview. */
export interface AttendanceDayStats {
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalJustified: number;
  /** Count of records with an unknown/unexpected estado value. */
  totalUnknown: number;
  totalStudents: number;
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const DIA_SEMANA_LABELS: Record<DiaSemana, string> = {
  lun: "Lunes",
  mar: "Martes",
  mie: "Miércoles",
  jue: "Jueves",
  vie: "Viernes",
  sab: "Sábado",
};

export const NIVEL_LABELS: Record<NivelTecnico, string> = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

/** Human-readable labels for each attendance state, in Spanish. */
export const ATTENDANCE_LABELS: Record<EstadoAsistencia, string> = {
  present: "Presente",
  absent: "Ausente",
  late: "Tardanza",
  justified: "Justificado",
};

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

export const MOCK_SCHEDULES: ScheduleSlot[] = [
  {
    id: "hor-001",
    diaSemana: "lun",
    horaInicio: "15:00",
    horaFin: "16:30",
    nivel: "principiante",
    cancha: "Cancha 1",
    cupoMaximo: 12,
    activo: true,
  },
  {
    id: "hor-002",
    diaSemana: "lun",
    horaInicio: "16:45",
    horaFin: "18:15",
    nivel: "intermedio",
    cancha: "Cancha 2",
    cupoMaximo: 10,
    activo: true,
  },
  {
    id: "hor-003",
    diaSemana: "lun",
    horaInicio: "18:30",
    horaFin: "20:00",
    nivel: "avanzado",
    cancha: "Cancha 1 y 3",
    cupoMaximo: 8,
    activo: true,
  },
  {
    id: "hor-004",
    diaSemana: "mie",
    horaInicio: "15:00",
    horaFin: "16:30",
    nivel: "principiante",
    cancha: "Cancha 1",
    cupoMaximo: 12,
    activo: true,
  },
  {
    id: "hor-005",
    diaSemana: "mie",
    horaInicio: "16:45",
    horaFin: "18:15",
    nivel: "intermedio",
    cancha: "Cancha 2",
    cupoMaximo: 10,
    activo: false,
  },
  {
    id: "hor-006",
    diaSemana: "mie",
    horaInicio: "18:30",
    horaFin: "20:00",
    nivel: "avanzado",
    cancha: "Cancha 1 y 3",
    cupoMaximo: 8,
    activo: true,
  },
  {
    id: "hor-007",
    diaSemana: "vie",
    horaInicio: "15:00",
    horaFin: "16:30",
    nivel: "principiante",
    cancha: "Cancha 1",
    cupoMaximo: 12,
    activo: true,
  },
  {
    id: "hor-008",
    diaSemana: "sab",
    horaInicio: "09:00",
    horaFin: "12:00",
    nivel: "principiante",
    cancha: "Cancha 1 y 2",
    cupoMaximo: 16,
    activo: true,
  },
];

export const MOCK_ATTENDANCE_RECORDS: AttendanceRecord[] = [
  {
    id: "att-001",
    fecha: "2026-06-29",
    horario: "Principiantes 15:00 — Cancha 1",
    alumno: "Sofía Martínez",
    estado: "present",
    entrenador: "Carlos Entrenador",
  },
  {
    id: "att-002",
    fecha: "2026-06-29",
    horario: "Principiantes 15:00 — Cancha 1",
    alumno: "Mateo Rodríguez",
    estado: "absent",
    entrenador: "Carlos Entrenador",
  },
  {
    id: "att-003",
    fecha: "2026-06-29",
    horario: "Principiantes 15:00 — Cancha 1",
    alumno: "Valentina López",
    estado: "present",
    entrenador: "Carlos Entrenador",
  },
  {
    id: "att-004",
    fecha: "2026-06-29",
    horario: "Intermedios 16:45 — Cancha 2",
    alumno: "Nicolás Acosta",
    estado: "late",
    entrenador: "Carlos Entrenador",
  },
  {
    id: "att-005",
    fecha: "2026-06-30",
    horario: "Avanzados 18:30 — Cancha 1 y 3",
    alumno: "Alejandro Padilla",
    estado: "present",
    entrenador: "María Torres",
  },
  {
    id: "att-006",
    fecha: "2026-06-30",
    horario: "Avanzados 18:30 — Cancha 1 y 3",
    alumno: "Carolina Méndez",
    estado: "justified",
    entrenador: "María Torres",
  },
];

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Compute attendance statistics from a list of records.
 * Counts each attendance state and returns an aggregate summary.
 * Does NOT filter by date — the caller should pre-filter records if needed.
 * Returns zero-initialized stats when records is empty.
 */
export function buildAttendanceStats(
  records: AttendanceRecord[],
): AttendanceDayStats {
  let totalPresent = 0;
  let totalAbsent = 0;
  let totalLate = 0;
  let totalJustified = 0;
  let totalUnknown = 0;

  for (const record of records) {
    switch (record.estado) {
      case "present":
        totalPresent++;
        break;
      case "absent":
        totalAbsent++;
        break;
      case "late":
        totalLate++;
        break;
      case "justified":
        totalJustified++;
        break;
      default:
        totalUnknown++;
        break;
    }
  }

  return {
    totalPresent,
    totalAbsent,
    totalLate,
    totalJustified,
    totalUnknown,
    totalStudents: records.length,
  };
}

/**
 * Format a DiaSemana value into a human-readable Spanish day name.
 *
 * Returns a fallback string when the value is not a known day.
 * Safety: never returns undefined — avoids rendering "undefined" in the UI.
 */
export function formatDay(dia: DiaSemana): string {
  return DIA_SEMANA_LABELS[dia] ?? `Día desconocido: ${dia}`;
}

/**
 * Get a human-readable label for a technical level.
 *
 * Returns a fallback string when the value is not a known level.
 * Safety: never returns undefined — avoids rendering "undefined" in the UI.
 */
export function formatNivel(nivel: NivelTecnico): string {
  return NIVEL_LABELS[nivel] ?? `Nivel desconocido: ${nivel}`;
}

/**
 * Count active schedules from a list.
 */
export function countActiveSchedules(schedules: ScheduleSlot[]): number {
  return schedules.filter((s) => s.activo).length;
}
