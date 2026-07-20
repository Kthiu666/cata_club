/**
 * Unit tests for the Ranking trainer page's pure utility functions.
 * No React dependencies required.
 */

import { describe, it, expect } from "vitest";
import {
  isValidCategoria,
  isValidPeriodo,
  currentPeriodo,
  buildRankingStudents,
  CATEGORIA_OPTIONS,
  CATEGORIA_MIN,
  CATEGORIA_MAX,
} from "../ranking-utils";

describe("isValidCategoria", () => {
  it("accepts every integer from 1 to 10", () => {
    for (let i = 1; i <= 10; i++) {
      expect(isValidCategoria(i)).toBe(true);
    }
  });

  it("rejects 0 and 11 (out of range)", () => {
    expect(isValidCategoria(0)).toBe(false);
    expect(isValidCategoria(11)).toBe(false);
  });

  it("rejects non-integers", () => {
    expect(isValidCategoria(3.5)).toBe(false);
  });

  it("rejects negative numbers and NaN", () => {
    expect(isValidCategoria(-1)).toBe(false);
    expect(isValidCategoria(NaN)).toBe(false);
  });
});

describe("CATEGORIA_OPTIONS", () => {
  it("contains exactly 1 through 10, in order", () => {
    expect(CATEGORIA_OPTIONS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("matches CATEGORIA_MIN/CATEGORIA_MAX bounds", () => {
    expect(CATEGORIA_OPTIONS[0]).toBe(CATEGORIA_MIN);
    expect(CATEGORIA_OPTIONS[CATEGORIA_OPTIONS.length - 1]).toBe(CATEGORIA_MAX);
  });
});

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

describe("buildRankingStudents", () => {
  const accounts = [
    {
      estudiantes: [
        { id: "stu-001", nombres: "Sofía", apellidos: "Martínez", activo: true },
        { id: "stu-002", nombres: "Mateo", apellidos: "Martínez", activo: false },
      ],
    },
    {
      estudiantes: [{ id: "stu-003", nombres: "Ana", apellidos: "López", activo: true }],
    },
  ];

  it("flattens all students across accounts", () => {
    const result = buildRankingStudents(accounts, {});
    expect(result).toHaveLength(3);
    expect(result.map((s) => s.id)).toEqual(["stu-001", "stu-002", "stu-003"]);
  });

  it("joins each student with its assigned category, defaulting to null", () => {
    const result = buildRankingStudents(accounts, { "stu-001": 4 });
    expect(result.find((s) => s.id === "stu-001")?.categoria).toBe(4);
    expect(result.find((s) => s.id === "stu-002")?.categoria).toBeNull();
  });

  it("preserves each student's activo flag", () => {
    const result = buildRankingStudents(accounts, {});
    expect(result.find((s) => s.id === "stu-002")?.activo).toBe(false);
  });
});
