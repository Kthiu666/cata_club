/**
 * Unit tests for the trainer panel's shared pure helpers (recent-attendance
 * default date range, student search filtering, nivel-categoria resolution
 * for level-color badges). No React dependencies required.
 */

import { describe, it, expect } from "vitest";
import {
  recentDateRange,
  filterStudentsByQuery,
  resolveNivelCategoria,
} from "../trainer-panel-utils";

describe("recentDateRange", () => {
  it("defaults to a 7-day window ending on the reference date", () => {
    const result = recentDateRange(new Date(2026, 6, 22)); // 2026-07-22
    expect(result).toEqual({ fechaInicio: "2026-07-16", fechaFin: "2026-07-22" });
  });

  it("supports a custom window size", () => {
    const result = recentDateRange(new Date(2026, 6, 22), 14);
    expect(result).toEqual({ fechaInicio: "2026-07-09", fechaFin: "2026-07-22" });
  });
});

describe("filterStudentsByQuery", () => {
  const students = [
    { nombres: "Ana", apellidos: "López" },
    { nombres: "Carlos", apellidos: "Martínez" },
    { nombres: "Beatriz", apellidos: "Núñez" },
  ];

  it("returns the full list unchanged for an empty/whitespace query", () => {
    expect(filterStudentsByQuery(students, "")).toEqual(students);
    expect(filterStudentsByQuery(students, "   ")).toEqual(students);
  });

  it("filters by a case-insensitive substring match on nombres", () => {
    const result = filterStudentsByQuery(students, "ana");
    expect(result).toEqual([{ nombres: "Ana", apellidos: "López" }]);
  });

  it("filters by a case-insensitive substring match on apellidos", () => {
    const result = filterStudentsByQuery(students, "MARTÍ");
    expect(result).toEqual([{ nombres: "Carlos", apellidos: "Martínez" }]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterStudentsByQuery(students, "zzz")).toEqual([]);
  });
});

describe("resolveNivelCategoria", () => {
  const niveles = [
    { id: 1, nivelCategoria: "principiante" as const },
    { id: 2, nivelCategoria: "avanzado" as const },
  ];

  it("returns null when the student has no nivelRankingId", () => {
    expect(resolveNivelCategoria(null, niveles)).toBeNull();
  });

  it("resolves the matching nivel's categoria", () => {
    expect(resolveNivelCategoria(1, niveles)).toBe("principiante");
    expect(resolveNivelCategoria(2, niveles)).toBe("avanzado");
  });

  it("returns null when the nivelRankingId has no matching nivel", () => {
    expect(resolveNivelCategoria(999, niveles)).toBeNull();
  });
});
