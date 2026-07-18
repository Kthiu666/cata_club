/**
 * Unit tests for the student portal's pure helpers — no React dependencies.
 */

import { describe, it, expect } from "vitest";
import { derivePortalMode, isRepresentative, buildAccountLabel, describeRanking } from "../student-utils";
import type { StudentRankingSummary } from "@/services/api";

// ---------------------------------------------------------------------------
// derivePortalMode / isRepresentative / buildAccountLabel
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

describe("buildAccountLabel", () => {
  it("labels a pending account", () => {
    expect(buildAccountLabel(false, 0)).toBe("Pendiente de Matrícula");
  });

  it("labels a self-managed student with no dependents", () => {
    expect(buildAccountLabel(true, 0)).toBe("Estudiante");
  });

  it("labels a representative managing dependents", () => {
    expect(buildAccountLabel(false, 2)).toBe("Representante");
    expect(buildAccountLabel(true, 2)).toBe("Representante");
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
      posicionActual: null,
      puntajeAcumulado: 0,
      nivelNombre: null,
      estaEnRanking: false,
    };
    const result = describeRanking(ranking);
    expect(result.label).toBe("Sin nivel asignado");
    expect(result.badgeClass).toBe("badge-warning");
  });

  it("describes an available ranking with a position", () => {
    const ranking: StudentRankingSummary = {
      status: "available",
      posicionActual: 3,
      puntajeAcumulado: 120,
      nivelNombre: "Intermedios",
      estaEnRanking: true,
    };
    const result = describeRanking(ranking);
    expect(result.label).toBe("Intermedios");
    expect(result.detail).toBe("Posición #3 · 120 pts");
    expect(result.badgeClass).toBe("badge-success");
  });

  it("describes an available ranking with no position yet", () => {
    const ranking: StudentRankingSummary = {
      status: "available",
      posicionActual: null,
      puntajeAcumulado: 10,
      nivelNombre: "Principiantes",
      estaEnRanking: true,
    };
    const result = describeRanking(ranking);
    expect(result.detail).toBe("Sin posición aún · 10 pts");
  });
});
