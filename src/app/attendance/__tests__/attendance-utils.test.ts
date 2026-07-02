/**
 * Unit tests for the admin attendance utilities.
 *
 * Pure functions — no React dependencies, easy to test.
 */

import { describe, it, expect } from "vitest";
import {
  buildAttendanceStats,
  formatDay,
  formatNivel,
  countActiveSchedules,
  MOCK_ATTENDANCE_RECORDS,
  MOCK_SCHEDULES,
  type AttendanceRecord,
} from "../attendance-utils";
import type { EstadoAsistencia } from "@/types/domain";

// ---------------------------------------------------------------------------
// buildAttendanceStats
// ---------------------------------------------------------------------------

describe("buildAttendanceStats", () => {
  it("returns zero stats for an empty list", () => {
    const stats = buildAttendanceStats([]);
    expect(stats).toEqual({
      totalPresent: 0,
      totalAbsent: 0,
      totalLate: 0,
      totalJustified: 0,
      totalUnknown: 0,
      totalStudents: 0,
    });
  });

  it("counts attendance states from mock records", () => {
    const stats = buildAttendanceStats(MOCK_ATTENDANCE_RECORDS);
    expect(stats.totalStudents).toBe(6);
    expect(stats.totalPresent).toBe(3);
    expect(stats.totalAbsent).toBe(1);
    expect(stats.totalLate).toBe(1);
    expect(stats.totalJustified).toBe(1);
    expect(stats.totalUnknown).toBe(0);
  });

  it("counts correctly when all students have the same state", () => {
    const records: AttendanceRecord[] = [
      {
        id: "a1",
        fecha: "2026-07-01",
        horario: "Test",
        alumno: "Student A",
        estado: "present",
        entrenador: "Trainer X",
      },
      {
        id: "a2",
        fecha: "2026-07-01",
        horario: "Test",
        alumno: "Student B",
        estado: "present",
        entrenador: "Trainer X",
      },
    ];
    const stats = buildAttendanceStats(records);
    expect(stats.totalPresent).toBe(2);
    expect(stats.totalAbsent).toBe(0);
    expect(stats.totalStudents).toBe(2);
  });

  it("handles mixed states correctly", () => {
    const records: AttendanceRecord[] = [
      { id: "a1", fecha: "2026-07-01", horario: "T1", alumno: "S1", estado: "present", entrenador: "T" },
      { id: "a2", fecha: "2026-07-01", horario: "T1", alumno: "S2", estado: "absent", entrenador: "T" },
      { id: "a3", fecha: "2026-07-01", horario: "T1", alumno: "S3", estado: "late", entrenador: "T" },
      { id: "a4", fecha: "2026-07-01", horario: "T1", alumno: "S4", estado: "justified", entrenador: "T" },
    ];
    const stats = buildAttendanceStats(records);
    expect(stats.totalPresent).toBe(1);
    expect(stats.totalAbsent).toBe(1);
    expect(stats.totalLate).toBe(1);
    expect(stats.totalJustified).toBe(1);
    expect(stats.totalUnknown).toBe(0);
    expect(stats.totalStudents).toBe(4);
  });

  it("counts unknown estados separately — defensive against bad runtime data", () => {
    const records: AttendanceRecord[] = [
      { id: "u1", fecha: "2026-07-01", horario: "T1", alumno: "S1", estado: "present" as EstadoAsistencia, entrenador: "T" },
      { id: "u2", fecha: "2026-07-01", horario: "T1", alumno: "S2", estado: "unknown_value" as EstadoAsistencia, entrenador: "T" },
      { id: "u3", fecha: "2026-07-01", horario: "T1", alumno: "S3", estado: "" as EstadoAsistencia, entrenador: "T" },
    ];
    const stats = buildAttendanceStats(records);
    expect(stats.totalPresent).toBe(1);
    expect(stats.totalUnknown).toBe(2);
    expect(stats.totalStudents).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// formatDay
// ---------------------------------------------------------------------------

describe("formatDay", () => {
  it('returns "Lunes" for lun', () => {
    expect(formatDay("lun")).toBe("Lunes");
  });

  it('returns "Sábado" for sab', () => {
    expect(formatDay("sab")).toBe("Sábado");
  });

  it("returns a label for every known day", () => {
    const days = ["lun", "mar", "mie", "jue", "vie", "sab"] as const;
    for (const day of days) {
      expect(formatDay(day).length).toBeGreaterThan(0);
    }
  });

  it("returns fallback for unexpected day value at runtime", () => {
    // @ts-expect-error — testing runtime resilience with unexpected value
    const result = formatDay("dom");
    expect(result).toContain("Día desconocido");
    expect(result).toContain("dom");
  });

  it("never returns undefined", () => {
    // @ts-expect-error — testing runtime resilience with unexpected value
    expect(formatDay(undefined)).toBe("Día desconocido: undefined");
  });
});

// ---------------------------------------------------------------------------
// formatNivel
// ---------------------------------------------------------------------------

describe("formatNivel", () => {
  it('returns "Principiante" for principiante', () => {
    expect(formatNivel("principiante")).toBe("Principiante");
  });

  it('returns "Intermedio" for intermedio', () => {
    expect(formatNivel("intermedio")).toBe("Intermedio");
  });

  it('returns "Avanzado" for avanzado', () => {
    expect(formatNivel("avanzado")).toBe("Avanzado");
  });

  it("returns fallback for unexpected nivel value at runtime", () => {
    // @ts-expect-error — testing runtime resilience with unexpected value
    const result = formatNivel("profesional");
    expect(result).toContain("Nivel desconocido");
    expect(result).toContain("profesional");
  });

  it("never returns undefined for unknown nivel", () => {
    // @ts-expect-error — testing runtime resilience with unexpected value
    expect(formatNivel(undefined)).toBe("Nivel desconocido: undefined");
  });
});

// ---------------------------------------------------------------------------
// countActiveSchedules
// ---------------------------------------------------------------------------

describe("countActiveSchedules", () => {
  it("counts active schedules from mock data", () => {
    // 7 are active, 1 is inactive (hor-005)
    expect(countActiveSchedules(MOCK_SCHEDULES)).toBe(7);
  });

  it("returns 0 for empty list", () => {
    expect(countActiveSchedules([])).toBe(0);
  });

  it("returns 0 when all are inactive", () => {
    const allInactive = MOCK_SCHEDULES.map((s) => ({ ...s, activo: false }));
    expect(countActiveSchedules(allInactive)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Mock data integrity
// ---------------------------------------------------------------------------

describe("MOCK_SCHEDULES", () => {
  it("has at least one schedule", () => {
    expect(MOCK_SCHEDULES.length).toBeGreaterThan(0);
  });

  it("every schedule has required fields", () => {
    for (const s of MOCK_SCHEDULES) {
      expect(s.id).toBeTruthy();
      expect(s.diaSemana).toBeTruthy();
      expect(s.horaInicio).toBeTruthy();
      expect(s.horaFin).toBeTruthy();
      expect(s.cancha).toBeTruthy();
      expect(s.cupoMaximo).toBeGreaterThan(0);
    }
  });
});

describe("MOCK_ATTENDANCE_RECORDS", () => {
  it("has at least one record", () => {
    expect(MOCK_ATTENDANCE_RECORDS.length).toBeGreaterThan(0);
  });

  it("every record has required fields", () => {
    for (const r of MOCK_ATTENDANCE_RECORDS) {
      expect(r.id).toBeTruthy();
      expect(r.fecha).toBeTruthy();
      expect(r.horario).toBeTruthy();
      expect(r.alumno).toBeTruthy();
      expect(r.entrenador).toBeTruthy();
      expect(["present", "absent", "late", "justified"] as const).toContain(r.estado);
    }
  });

  it("includes records from different trainers (not trainer-owned)", () => {
    const trainers = new Set(MOCK_ATTENDANCE_RECORDS.map((r) => r.entrenador));
    expect(trainers.size).toBeGreaterThan(1);
  });
});
