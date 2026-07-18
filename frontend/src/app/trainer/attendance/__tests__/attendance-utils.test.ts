/**
 * Unit tests for Trainer Attendance utilities.
 *
 * Pure functions — no React dependencies, easy to test.
 */

import { describe, it, expect } from "vitest";
import {
  nextAttendanceState,
  countByState,
  buildAttendanceSummary,
  buildRosterFromTabla,
  type SessionStudent,
} from "../attendance-utils";
import type { TablaRankingItem } from "@/services/api";

describe("nextAttendanceState", () => {
  it("cycles absent → present", () => {
    expect(nextAttendanceState("absent")).toBe("present");
  });

  it("cycles present → late", () => {
    expect(nextAttendanceState("present")).toBe("late");
  });

  it("cycles late → justified", () => {
    expect(nextAttendanceState("late")).toBe("justified");
  });

  it("cycles justified → absent (wraps around)", () => {
    expect(nextAttendanceState("justified")).toBe("absent");
  });

  it("handles unknown state by returning absent", () => {
    // @ts-expect-error — testing runtime resilience with unexpected value
    expect(nextAttendanceState("unknown")).toBe("absent");
  });
});

describe("countByState", () => {
  const students: SessionStudent[] = [
    { id: "a", name: "A", attendance: "present" },
    { id: "b", name: "B", attendance: "present" },
    { id: "c", name: "C", attendance: "absent" },
    { id: "d", name: "D", attendance: "late" },
    { id: "e", name: "E", attendance: "justified" },
    { id: "f", name: "F", attendance: "present" },
  ];

  it("counts present correctly", () => {
    expect(countByState(students, "present")).toBe(3);
  });

  it("counts absent correctly", () => {
    expect(countByState(students, "absent")).toBe(1);
  });

  it("counts late correctly", () => {
    expect(countByState(students, "late")).toBe(1);
  });

  it("counts justified correctly", () => {
    expect(countByState(students, "justified")).toBe(1);
  });

  it("returns 0 when no student has the given state", () => {
    expect(countByState(students, "justified")).toBe(1);
    const empty: SessionStudent[] = [];
    expect(countByState(empty, "present")).toBe(0);
  });
});

describe("buildAttendanceSummary", () => {
  it("builds summary for mixed states", () => {
    const students: SessionStudent[] = [
      { id: "a", name: "A", attendance: "present" },
      { id: "b", name: "B", attendance: "present" },
      { id: "c", name: "C", attendance: "absent" },
      { id: "d", name: "D", attendance: "late" },
    ];
    const summary = buildAttendanceSummary(students);
    expect(summary).toContain("2 presente");
    expect(summary).toContain("1 ausente");
    expect(summary).toContain("1 tardanza");
    expect(summary).toContain("0 justificado");
  });

  it("handles empty roster", () => {
    expect(buildAttendanceSummary([])).toBe("0 presente • 0 ausente • 0 tardanza • 0 justificado");
  });

  it("handles all present", () => {
    const students: SessionStudent[] = [
      { id: "a", name: "A", attendance: "present" },
      { id: "b", name: "B", attendance: "present" },
    ];
    const summary = buildAttendanceSummary(students);
    expect(summary).toContain("2 presente");
    expect(summary).toContain("0 ausente");
  });
});

describe("buildRosterFromTabla", () => {
  const tabla: TablaRankingItem[] = [
    { personaId: 3, personaNombreCompleto: "Sofia Alumna", posicionActual: null, puntajeAcumulado: 0, estaEnRanking: true },
    { personaId: 7, personaNombreCompleto: "Mateo Rodríguez", posicionActual: 2, puntajeAcumulado: 40, estaEnRanking: true },
  ];

  it("maps each roster row to a SessionStudent defaulted to absent", () => {
    const roster = buildRosterFromTabla(tabla);
    expect(roster).toEqual([
      { id: "3", name: "Sofia Alumna", attendance: "absent" },
      { id: "7", name: "Mateo Rodríguez", attendance: "absent" },
    ]);
  });

  it("returns an empty roster for an empty tabla", () => {
    expect(buildRosterFromTabla([])).toEqual([]);
  });

  it("stringifies personaId for use as a stable React key / POST payload id", () => {
    const roster = buildRosterFromTabla(tabla);
    expect(roster.every((s) => typeof s.id === "string")).toBe(true);
  });
});
