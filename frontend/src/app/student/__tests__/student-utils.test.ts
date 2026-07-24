/**
 * Unit tests for the student portal's pure helpers — no React dependencies.
 */

import { describe, it, expect } from "vitest";
import { derivePortalMode, isRepresentative, isMinor, describeRanking } from "../student-utils";
import type { StudentRankingSummary } from "@/services/api";

// ---------------------------------------------------------------------------
// derivePortalMode / isRepresentative
// ---------------------------------------------------------------------------

describe("derivePortalMode", () => {
  it('returns "pending" when there is no ALUMNO role and no representados', () => {
    expect(derivePortalMode(false, 0)).toBe("pending");
  });

  it('returns "active" when there is an ALUMNO role, even with no representados', () => {
    expect(derivePortalMode(true, 0)).toBe("active");
  });

  it('returns "active" when there are representados, even with no ALUMNO role', () => {
    expect(derivePortalMode(false, 2)).toBe("active");
  });

  it('returns "active" when both an ALUMNO role and representados are present', () => {
    expect(derivePortalMode(true, 1)).toBe("active");
  });
});

describe("isRepresentative", () => {
  it("is false with zero representados", () => {
    expect(isRepresentative(0)).toBe(false);
  });

  it("is true with one or more representados", () => {
    expect(isRepresentative(1)).toBe(true);
    expect(isRepresentative(3)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isMinor
// ---------------------------------------------------------------------------

describe("isMinor", () => {
  it("returns true for a birth date younger than 18", () => {
    const today = new Date();
    const birthYear = today.getFullYear() - 15;
    expect(isMinor(`${birthYear}-06-15`)).toBe(true);
  });

  it("returns false for a birth date 18 or older", () => {
    const today = new Date();
    const birthYear = today.getFullYear() - 20;
    expect(isMinor(`${birthYear}-06-15`)).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(isMinor(null)).toBe(false);
    expect(isMinor(undefined)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isMinor("")).toBe(false);
  });

  it("returns false for invalid date format", () => {
    expect(isMinor("not-a-date")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// describeRanking
// ---------------------------------------------------------------------------

describe("describeRanking", () => {
  it("describes an unavailable/forbidden ranking", () => {
    const ranking: StudentRankingSummary = { status: "unavailable", reason: "forbidden" };
    const result = describeRanking(ranking);
    expect(result.label).toBe("No disponible");
    expect(result.badgeClass).toBe("badge-warning");
  });

  it("describes an unavailable/error ranking", () => {
    const ranking: StudentRankingSummary = { status: "unavailable", reason: "error" };
    expect(describeRanking(ranking).label).toBe("No disponible");
  });

  it("describes an available ranking with no nivel assigned yet", () => {
    const ranking: StudentRankingSummary = {
      status: "available",
      nivelNombre: null,
      estaEnRanking: false,
    };
    const result = describeRanking(ranking);
    expect(result.label).toBe("Sin nivel asignado");
    expect(result.badgeClass).toBe("badge-warning");
  });

  it("describes an active ranking without exposing position/points (removed — frozen data, no writer since cerrar_mes() removal)", () => {
    const ranking: StudentRankingSummary = {
      status: "available",
      nivelNombre: "Intermedios",
      estaEnRanking: true,
    };
    const result = describeRanking(ranking);
    expect(result.label).toBe("Intermedios");
    expect(result.detail).toBe("Activo en este nivel.");
    expect(result.detail).not.toMatch(/Posición|pts/);
    expect(result.badgeClass).toBe("badge-success");
  });
});
