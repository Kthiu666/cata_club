/**
 * Unit tests for the admin attendance utilities.
 *
 * Pure functions — no React dependencies, easy to test.
 */

import { describe, it, expect } from "vitest";
import {
  MOCK_ATTENDANCE_RECORDS,
  MOCK_SCHEDULES,
} from "@/mocks/attendance";
import {
  buildAttendanceStats,
  formatDay,
  formatNivel,
  countActiveSchedules,
  buildScheduleGroupMap,
  getScheduleLevelLabel,
  getAttendanceBadgeTokens,
  type AttendanceRecord,
} from "../attendance-utils";
import type { EstadoAsistencia, Grupo, NivelTecnico } from "@/types/domain";
import type { ScheduleSlot } from "../attendance-utils";

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
        estudiante: "Student A",
        estado: "present",
        entrenador: "Trainer X",
      },
      {
        id: "a2",
        fecha: "2026-07-01",
        horario: "Test",
        estudiante: "Student B",
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
      { id: "a1", fecha: "2026-07-01", horario: "T1", estudiante: "S1", estado: "present", entrenador: "T" },
      { id: "a2", fecha: "2026-07-01", horario: "T1", estudiante: "S2", estado: "absent", entrenador: "T" },
      { id: "a3", fecha: "2026-07-01", horario: "T1", estudiante: "S3", estado: "late", entrenador: "T" },
      { id: "a4", fecha: "2026-07-01", horario: "T1", estudiante: "S4", estado: "justified", entrenador: "T" },
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
      { id: "u1", fecha: "2026-07-01", horario: "T1", estudiante: "S1", estado: "present" as EstadoAsistencia, entrenador: "T" },
      { id: "u2", fecha: "2026-07-01", horario: "T1", estudiante: "S2", estado: "unknown_value" as EstadoAsistencia, entrenador: "T" },
      { id: "u3", fecha: "2026-07-01", horario: "T1", estudiante: "S3", estado: "" as EstadoAsistencia, entrenador: "T" },
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
      expect(r.estudiante).toBeTruthy();
      expect(r.entrenador).toBeTruthy();
      expect(["present", "absent", "late", "justified"] as const).toContain(r.estado);
    }
  });

  it("includes records from different trainers (not trainer-owned)", () => {
    const trainers = new Set(MOCK_ATTENDANCE_RECORDS.map((r) => r.entrenador));
    expect(trainers.size).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// buildScheduleGroupMap
// ---------------------------------------------------------------------------

describe("buildScheduleGroupMap", () => {
  const testGrupos: Grupo[] = [
    {
      id: "g-001",
      nombre: "Principiantes",
      nivel: "principiante" as NivelTecnico,
      estudiantesIds: [],
      horariosIds: ["hor-a", "hor-b"],
      activo: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "g-002",
      nombre: "Intermedios",
      nivel: "intermedio" as NivelTecnico,
      estudiantesIds: [],
      horariosIds: ["hor-b", "hor-c"],
      activo: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "g-003",
      nombre: "Sin Horarios",
      nivel: "principiante" as NivelTecnico,
      estudiantesIds: [],
      activo: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ];

  it("maps scheduleId to group names", () => {
    const map = buildScheduleGroupMap(testGrupos);
    expect(map["hor-a"]).toEqual(["Principiantes"]);
    expect(map["hor-b"]).toEqual(["Principiantes", "Intermedios"]);
    expect(map["hor-c"]).toEqual(["Intermedios"]);
  });

  it("excludes groups without horariosIds", () => {
    const map = buildScheduleGroupMap(testGrupos);
    expect(map["hor-a"]).toHaveLength(1);
    // Should not crash for the group with no horariosIds
  });

  it("returns empty object for empty grupos array", () => {
    expect(buildScheduleGroupMap([])).toEqual({});
  });

  it("returns empty object when grupos have undefined horariosIds", () => {
    const noSchedules = testGrupos.map((g) => ({
      ...g,
      horariosIds: undefined,
    }));
    const map = buildScheduleGroupMap(noSchedules);
    expect(map).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// getScheduleLevelLabel
// ---------------------------------------------------------------------------

describe("getScheduleLevelLabel", () => {
  const testGrupos: Grupo[] = [
    {
      id: "g-001",
      nombre: "Principiantes",
      nivel: "principiante" as NivelTecnico,
      estudiantesIds: [],
      horariosIds: ["sched-p1", "sched-shared"],
      activo: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "g-002",
      nombre: "Intermedios",
      nivel: "intermedio" as NivelTecnico,
      estudiantesIds: [],
      horariosIds: ["sched-shared"],
      activo: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ];

  const testSlots: ScheduleSlot[] = [
    { id: "sched-p1", diaSemana: "lun", horaInicio: "15:00", horaFin: "16:30", nivel: "principiante" as NivelTecnico, cancha: "C1", cupoMaximo: 12, activo: true },
    { id: "sched-shared", diaSemana: "mie", horaInicio: "16:00", horaFin: "17:30", nivel: "intermedio" as NivelTecnico, cancha: "C2", cupoMaximo: 10, activo: true },
    { id: "sched-unlinked", diaSemana: "vie", horaInicio: "15:00", horaFin: "16:30", nivel: "avanzado" as NivelTecnico, cancha: "C3", cupoMaximo: 8, activo: true },
  ];

  it("derives level label from the first linked group", () => {
    // sched-p1 is linked to g-001 (principiante)
    expect(getScheduleLevelLabel(testSlots[0], testGrupos)).toBe("Principiante");
  });

  it("falls back to slot.nivel when no group links to the schedule", () => {
    // sched-unlinked has no groups linked, uses slot.nivel (avanzado)
    expect(getScheduleLevelLabel(testSlots[2], testGrupos)).toBe("Avanzado");
  });

  it("returns fallback string for unknown slot nivel", () => {
    const badSlot: ScheduleSlot = { id: "bad", diaSemana: "lun", horaInicio: "00:00", horaFin: "01:00", nivel: "unknown" as NivelTecnico, cancha: "X", cupoMaximo: 5, activo: true };
    // No group links, falls back to formatNivel which handles unknown
    const result = getScheduleLevelLabel(badSlot, testGrupos);
    expect(result).toContain("Nivel desconocido");
  });

  describe("tie-breaking — multiple groups sharing a schedule", () => {
    it("when groups share a schedule with the SAME level, returns that level", () => {
      const sameLevelGrupos: Grupo[] = [
        { ...testGrupos[0], horariosIds: ["shared"] },
        { ...testGrupos[0], id: "g-copy", nombre: "Copy", horariosIds: ["shared"] },
      ];
      const slot: ScheduleSlot = { id: "shared", diaSemana: "lun", horaInicio: "10:00", horaFin: "11:00", nivel: "principiante" as NivelTecnico, cancha: "C1", cupoMaximo: 10, activo: true };
      expect(getScheduleLevelLabel(slot, sameLevelGrupos)).toBe("Principiante");
    });

    it("when groups share a schedule WITH MISMATCHED levels, uses the FIRST group's level (safe fallback)", () => {
      // g-001 is principiante, g-002 is intermedio, both link to sched-shared.
      // The first match (g-001) wins — the caller should ensure groups sharing
      // a schedule have consistent levels.
      const slot = testSlots[1]; // sched-shared
      expect(getScheduleLevelLabel(slot, testGrupos)).toBe("Principiante");
    });
  });
});

// ---------------------------------------------------------------------------
// getAttendanceBadgeTokens (Fase 3b — B4 light-theme badge tokens)
// ---------------------------------------------------------------------------

describe("getAttendanceBadgeTokens", () => {
  it("returns state-ok light tokens for present", () => {
    expect(getAttendanceBadgeTokens("present")).toEqual({
      badgeClass: "bg-cata-state-ok/10 text-cata-state-ok",
      iconClass: "text-cata-state-ok",
    });
  });

  it("returns red-50/red-700 light tokens for absent", () => {
    expect(getAttendanceBadgeTokens("absent")).toEqual({
      badgeClass: "bg-red-50 text-red-700",
      iconClass: "text-red-700",
    });
  });

  it("returns amber-50/amber-700 light tokens for late", () => {
    expect(getAttendanceBadgeTokens("late")).toEqual({
      badgeClass: "bg-amber-50 text-amber-700",
      iconClass: "text-amber-700",
    });
  });

  it("returns blue-50/blue-700 light tokens for justified", () => {
    expect(getAttendanceBadgeTokens("justified")).toEqual({
      badgeClass: "bg-blue-50 text-blue-700",
      iconClass: "text-blue-700",
    });
  });

  it("returns a neutral fallback for unknown estado values — never throws", () => {
    expect(getAttendanceBadgeTokens("unexpected_value")).toEqual({
      badgeClass: "bg-cata-border/40 text-cata-text/65",
      iconClass: "text-cata-text/65",
    });
  });

  it("never returns a dark-theme (rgba/900 or bare white) token — regression guard for B4", () => {
    for (const estado of ["present", "absent", "late", "justified", "unknown_value"]) {
      const tokens = getAttendanceBadgeTokens(estado);
      expect(tokens.badgeClass).not.toMatch(/900|text-white|bg-white/);
      expect(tokens.iconClass).not.toMatch(/900|text-white|bg-white/);
    }
  });
});
