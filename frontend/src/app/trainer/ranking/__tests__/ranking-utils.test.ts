/**
 * Unit tests for the Ranking trainer page's pure utility functions.
 * No React dependencies required.
 */

import { describe, it, expect } from "vitest";
import {
  isValidPeriodo,
  currentPeriodo,
  parsePeriodo,
  buildRankingStudents,
} from "../ranking-utils";

describe("isValidPeriodo", () => {
  it("accepts a well-formed YYYY-MM period", () => {
    expect(isValidPeriodo("2026-07")).toBe(true);
    expect(isValidPeriodo("2026-01")).toBe(true);
    expect(isValidPeriodo("2026-12")).toBe(true);
  });

  it("rejects month 00 and month 13", () => {
    expect(isValidPeriodo("2026-00")).toBe(false);
    expect(isValidPeriodo("2026-13")).toBe(false);
  });

  it("rejects malformed strings", () => {
    expect(isValidPeriodo("2026/07")).toBe(false);
    expect(isValidPeriodo("26-07")).toBe(false);
    expect(isValidPeriodo("")).toBe(false);
  });
});

describe("currentPeriodo", () => {
  it("formats a given date as YYYY-MM", () => {
    expect(currentPeriodo(new Date(2026, 6, 15))).toBe("2026-07");
  });

  it("pads single-digit months", () => {
    expect(currentPeriodo(new Date(2026, 0, 1))).toBe("2026-01");
  });
});

describe("parsePeriodo", () => {
  it("splits a YYYY-MM period into numeric anio/mes", () => {
    expect(parsePeriodo("2026-07")).toEqual({ anio: 2026, mes: 7 });
  });

  it("does not zero-pad the parsed mes", () => {
    expect(parsePeriodo("2026-01").mes).toBe(1);
  });
});

describe("buildRankingStudents", () => {
  const accounts = [
    {
      estudiantes: [
        { id: "stu-001", nombres: "Sofía", apellidos: "Martínez", activo: true, grupoId: "4" },
        { id: "stu-002", nombres: "Mateo", apellidos: "Martínez", activo: false, grupoId: null },
      ],
    },
    {
      estudiantes: [{ id: "stu-003", nombres: "Ana", apellidos: "López", activo: true, grupoId: null }],
    },
  ];

  it("flattens all students across accounts", () => {
    const result = buildRankingStudents(accounts);
    expect(result).toHaveLength(3);
    expect(result.map((s) => s.id)).toEqual(["stu-001", "stu-002", "stu-003"]);
  });

  it("derives nivelRankingId from grupoId, defaulting to null", () => {
    const result = buildRankingStudents(accounts);
    expect(result.find((s) => s.id === "stu-001")?.nivelRankingId).toBe(4);
    expect(result.find((s) => s.id === "stu-002")?.nivelRankingId).toBeNull();
  });

  it("preserves each student's activo flag", () => {
    const result = buildRankingStudents(accounts);
    expect(result.find((s) => s.id === "stu-002")?.activo).toBe(false);
  });
});
