/**
 * Unit tests for the student portal's pure helpers — no React dependencies.
 */

import { describe, it, expect } from "vitest";
import {
  derivePortalMode,
  isRepresentative,
  isMinor,
  describeRanking,
  describeMembershipState,
  breakdownAttendance,
  daysUntil,
  formatLevelName,
  parseLevelNumber,
  personInitials,
  summarizeRecentAttendance,
  resolveCoverageEnd,
} from "../student-utils";
import type { PagoPersona, StudentRankingSummary, StudentSessionSummary } from "@/services/api";

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
    expect(result.tone).toBe("warn");
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
    expect(result.tone).toBe("warn");
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
    expect(result.tone).toBe("ok");
  });
});

// ---------------------------------------------------------------------------
// parseLevelNumber — the carnet's level chip
// ---------------------------------------------------------------------------

describe("parseLevelNumber", () => {
  it("reads the rung out of the backend's level name", () => {
    expect(parseLevelNumber("Nivel 9")).toBe(9);
    expect(parseLevelNumber("nivel 1")).toBe(1);
    expect(parseLevelNumber("10")).toBe(10);
  });

  it("returns null when there is no name at all", () => {
    expect(parseLevelNumber(null)).toBeNull();
    expect(parseLevelNumber("   ")).toBeNull();
  });

  it("returns null for a named level with no rung number — the chip must not invent one", () => {
    expect(parseLevelNumber("Intermedios")).toBeNull();
  });

  it("returns null for a rung outside the 1–10 ladder", () => {
    expect(parseLevelNumber("Nivel 0")).toBeNull();
    expect(parseLevelNumber("Nivel 11")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// personInitials — the avatar disc
// ---------------------------------------------------------------------------

describe("personInitials", () => {
  it("takes the first letter of the first given name and the first surname", () => {
    expect(personInitials("Ana Maria", "Garcia Lopez")).toBe("AG");
  });

  it("falls back to the given name alone when there is no surname", () => {
    expect(personInitials("Ana", "")).toBe("A");
  });

  it("returns an empty string when there is no name at all", () => {
    expect(personInitials("", "")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// summarizeRecentAttendance — the one real fact on the training panel
// ---------------------------------------------------------------------------

function session(estado: StudentSessionSummary["estado"], fecha: string): StudentSessionSummary {
  return { fecha, horario: "Lunes 15:00 — 16:00", estado };
}

describe("summarizeRecentAttendance", () => {
  it("returns null with no recorded sessions — there is no fact to state", () => {
    expect(summarizeRecentAttendance([])).toBeNull();
  });

  it("counts present and late as attended, absent and justified as missed", () => {
    const result = summarizeRecentAttendance([
      session("present", "2026-07-20"),
      session("late", "2026-07-18"),
      session("absent", "2026-07-15"),
      session("justified", "2026-07-13"),
    ]);
    expect(result).toEqual({ attended: 2, total: 4 });
  });

  it("reports a perfect record", () => {
    expect(summarizeRecentAttendance([session("present", "2026-07-20")])).toEqual({
      attended: 1,
      total: 1,
    });
  });
});

// ---------------------------------------------------------------------------
// resolveCoverageEnd
// ---------------------------------------------------------------------------

function pago(overrides: Partial<PagoPersona>): PagoPersona {
  return {
    id: 1,
    monto: "25.00",
    motivoRechazo: null,
    estadoPago: "PENDIENTE_VALIDACION",
    tipoPago: "TRANSFERENCIA",
    fechaRegistro: "2026-07-01T09:00:00Z",
    fechaValidacion: null,
    fechaInicio: "2026-07-01",
    fechaFin: "2026-07-31",
    personaId: 9,
    membresiaId: 3,
    voucherUrl: null,
    voucherFormato: null,
    ...overrides,
  };
}

describe("resolveCoverageEnd", () => {
  it("returns the furthest fechaFin among approved payments", () => {
    expect(
      resolveCoverageEnd([
        pago({ id: 1, estadoPago: "APROBADO", fechaFin: "2026-07-31" }),
        pago({ id: 2, estadoPago: "APROBADO", fechaFin: "2026-08-31" }),
      ]),
    ).toBe("2026-08-31");
  });

  it("ignores payments that are not approved — a pending one covers nothing yet", () => {
    expect(
      resolveCoverageEnd([
        pago({ id: 1, estadoPago: "APROBADO", fechaFin: "2026-07-31" }),
        pago({ id: 2, estadoPago: "PENDIENTE_VALIDACION", fechaFin: "2026-09-30" }),
        pago({ id: 3, estadoPago: "RECHAZADO", fechaFin: "2026-10-31" }),
      ]),
    ).toBe("2026-07-31");
  });

  it("returns null when nothing has been approved", () => {
    expect(resolveCoverageEnd([pago({ estadoPago: "PENDIENTE_VALIDACION" })])).toBeNull();
    expect(resolveCoverageEnd([])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// formatLevelName
// ---------------------------------------------------------------------------

describe("formatLevelName", () => {
  it("names a bare rung number, so it does not read as a count", () => {
    // The seed data stores one level as "3" and another as "Nivel 9"; printed
    // raw beside a student's name, a lone "3" is not recognisable as a rank.
    expect(formatLevelName("3")).toBe("Nivel 3");
  });

  it("leaves an already-named level alone", () => {
    expect(formatLevelName("Nivel 9")).toBe("Nivel 9");
  });

  it("keeps a free-text level name verbatim rather than guessing a rung", () => {
    expect(formatLevelName("1B")).toBe("1B");
    expect(formatLevelName("Intermedios")).toBe("Intermedios");
  });

  it("returns null when there is no level to name", () => {
    expect(formatLevelName(null)).toBeNull();
    expect(formatLevelName("   ")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// daysUntil
// ---------------------------------------------------------------------------

describe("daysUntil", () => {
  const today = new Date(2026, 6, 25); // 25 jul 2026, local

  it("counts the whole days left before a future date", () => {
    expect(daysUntil("2026-07-28", today)).toBe(3);
  });

  it("returns 0 on the day coverage ends, not -1", () => {
    // Both ends are compared at local midnight; comparing timestamps would
    // make a same-day expiry read as already past from 00:01 onwards.
    expect(daysUntil("2026-07-25", today)).toBe(0);
  });

  it("goes negative once the date is past", () => {
    expect(daysUntil("2026-07-20", today)).toBe(-5);
  });

  it("crosses a DST-free month boundary without drifting", () => {
    expect(daysUntil("2026-08-25", today)).toBe(31);
  });

  it("tolerates a full timestamp, not just a date-only string", () => {
    expect(daysUntil("2026-07-28T18:30:00", today)).toBe(3);
  });

  it("returns null for a missing or unparseable date", () => {
    expect(daysUntil(null, today)).toBeNull();
    expect(daysUntil("", today)).toBeNull();
    expect(daysUntil("pronto", today)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// describeMembershipState
// ---------------------------------------------------------------------------

describe("describeMembershipState", () => {
  it("reads an ACTIVA membership as active", () => {
    expect(describeMembershipState("ACTIVA")).toEqual({
      label: "Membresía activa",
      tone: "ok",
      active: true,
    });
  });

  it("reads an INACTIVA membership as pending, never as failed", () => {
    // A membership the club has not activated yet is waiting, not broken —
    // `bad` here would tell a parent something is wrong when nothing is.
    expect(describeMembershipState("INACTIVA")).toEqual({
      label: "Membresía pendiente",
      tone: "warn",
      active: false,
    });
  });

  it("reads a VENCIDA membership as expired", () => {
    expect(describeMembershipState("VENCIDA")).toEqual({
      label: "Membresía vencida",
      tone: "bad",
      active: false,
    });
  });

  it("reads the absence of a membership as neutral, not as a failure", () => {
    expect(describeMembershipState(null)).toEqual({
      label: "Sin membresía",
      tone: "neutral",
      active: false,
    });
  });

  it("falls back to 'vencida' for any other estado the backend may add", () => {
    // Same fallback the carnet has always used — an unknown estado is never
    // reported as active.
    expect(describeMembershipState("SUSPENDIDA").active).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// breakdownAttendance
// ---------------------------------------------------------------------------

describe("breakdownAttendance", () => {
  it("counts each of the four states separately", () => {
    expect(
      breakdownAttendance([
        session("present", "2026-07-20"),
        session("present", "2026-07-19"),
        session("late", "2026-07-18"),
        session("justified", "2026-07-17"),
        session("absent", "2026-07-16"),
      ]),
    ).toEqual({ present: 2, late: 1, justified: 1, absent: 1, total: 5 });
  });

  it("returns an all-zero breakdown for an empty history rather than null", () => {
    // The caller renders the tally beside a "no records yet" empty state, so
    // a zeroed object keeps that branch free of null checks.
    expect(breakdownAttendance([])).toEqual({
      present: 0,
      late: 0,
      justified: 0,
      absent: 0,
      total: 0,
    });
  });

  it("counts an unknown estado in the total without inventing a category for it", () => {
    const unknown = { fecha: "2026-07-15", horario: "Lunes 15:00 — 16:00", estado: "cancelled" };
    expect(
      breakdownAttendance([session("present", "2026-07-20"), unknown as StudentSessionSummary]),
    ).toEqual({ present: 1, late: 0, justified: 0, absent: 0, total: 2 });
  });
});
