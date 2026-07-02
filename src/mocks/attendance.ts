/**
 * Centralized mock data for schedules and attendance records.
 *
 * Shared across pages (attendance, groups, trainer) and tests.
 * Moved from src/app/attendance/attendance-utils.ts to create a clear
 * mock-data boundary that makes the transition to a real backend easier.
 *
 * Do NOT add business logic here. This file is mock data only — pure
 * functions belong in src/lib/*-utils.ts or the respective *-utils.ts files.
 */

import type { ScheduleSlot, AttendanceRecord } from "@/app/attendance/attendance-utils";

// ---------------------------------------------------------------------------
// Mock schedules
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

// ---------------------------------------------------------------------------
// Mock attendance records
// ---------------------------------------------------------------------------

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
