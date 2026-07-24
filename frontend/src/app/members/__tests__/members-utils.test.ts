/**
 * Unit tests for the Gestionar Miembros pure helpers.
 *
 * Pure functions — no React dependencies, easy to test.
 * Pattern follows attendance-utils.test.ts and proof-utils.test.ts.
 */

import { describe, it, expect } from "vitest";
import {
  MOCK_MEMBER_ACCOUNTS,
  MOCK_GRUPOS,
} from "@/mocks/members";
import {
  buildMemberStats,
  formatMembershipPeriod,
  getPayerTypeLabel,
  countActiveStudents,
  filterAccounts,
  getAccountStatusBadge,
  getGrupoById,
  getNivelLabelFromGrupo,
  normalizeText,
  accountMatchesFlag,
  countAccountsMatchingFlag,
  paginateAccounts,
  getTotalPages,
  MEMBERS_AGGREGATE_LIMIT,
  MEMBERS_PAGE_SIZE,
  MEMBERSHIP_TYPE_LABELS,
  type MemberAccount,
} from "../members-utils";
import { formatCurrency, formatDate } from "../../../lib/format-utils";

// ---------------------------------------------------------------------------
// buildMemberStats
// ---------------------------------------------------------------------------

describe("buildMemberStats", () => {
  it("returns zero stats for an empty list", () => {
    const stats = buildMemberStats([]);
    expect(stats).toEqual({
      totalAccounts: 0,
      totalStudents: 0,
      activeMemberships: 0,
      pendingPayments: 0,
    });
  });

  it("computes correct stats from mock data", () => {
    const stats = buildMemberStats(MOCK_MEMBER_ACCOUNTS);
    expect(stats.totalAccounts).toBe(6);
    expect(stats.totalStudents).toBeGreaterThan(0);
    // Validate counts are consistent: every student is counted once
    const expectedStudents = MOCK_MEMBER_ACCOUNTS.reduce(
      (acc, a) => acc + a.estudiantes.length,
      0,
    );
    expect(stats.totalStudents).toBe(expectedStudents);
  });

  it("counts active memberships correctly", () => {
    // Memberships known to be active: Sofia (rp-001 stu-001),
    // Mateo (rp-001 stu-002), Valentina (rp-002 stu-004),
    // Nicolas (rp-004 stu-006)
    const stats = buildMemberStats(MOCK_MEMBER_ACCOUNTS);
    expect(stats.activeMemberships).toBe(4);
  });

  it("counts pending payments correctly", () => {
    // Pending payments: Mateo (rp-001 stu-002), Emilia (rp-001 stu-003),
    // Santiago (rp-005 stu-007)
    const stats = buildMemberStats(MOCK_MEMBER_ACCOUNTS);
    expect(stats.pendingPayments).toBe(3);
  });

  it("handles accounts with empty estudiantes arrays", () => {
    const accounts: MemberAccount[] = [
      {
        id: "rp-empty-students",
        role: "representante",
        nombres: "Test",
        apellidos: "User",
        email: "test@test.com",
        telefono: "+593 00 000 0000",
        estudiantes: [],
      },
      ...MOCK_MEMBER_ACCOUNTS,
    ];
    const stats = buildMemberStats(accounts);
    expect(stats.totalAccounts).toBe(7);
    expect(stats.totalStudents).toBe(9); // original 9 students
    expect(stats.activeMemberships).toBe(4);
  });
});

describe("MEMBERS_AGGREGATE_LIMIT", () => {
  it("defines the shared upstream aggregate limit as 200", () => {
    expect(MEMBERS_AGGREGATE_LIMIT).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// formatCurrency
// ---------------------------------------------------------------------------

describe("formatCurrency", () => {
  it("formats whole dollars with two decimal places", () => {
    // es-EC locale formats with $ prefix and comma as decimal separator.
    // The helper normalizes ICU literal parts, so output is consistently $X,XX.
    expect(formatCurrency(85)).toMatch(/^\$\d+,\d{2}$/);
  });

  it("formats cents correctly", () => {
    expect(formatCurrency(240.5)).toMatch(/^\$\d+,\d{2}$/);
    expect(formatCurrency(720)).toMatch(/^\$\d+,\d{2}$/);
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0,00");
  });

  it("handles NaN gracefully", () => {
    expect(formatCurrency(NaN)).toBe("$0,00");
  });

  it("handles Infinity and -Infinity gracefully", () => {
    expect(formatCurrency(Infinity)).toBe("$0,00");
    expect(formatCurrency(-Infinity)).toBe("$0,00");
  });
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------

describe("formatDate", () => {
  it("renders a date deterministically in Ecuador timezone", () => {
    // "2026-07-01T12:00:00Z" is 07:00 in Guayaquil — same calendar day
    const result = formatDate("2026-07-01T12:00:00.000Z");
    expect(result).toContain("2026");
    // es-EC locale: month short is "jul" for July
    expect(result).toMatch(/jul/i);
    expect(result).toMatch(/\d+/);
  });

  it("handles different months", () => {
    const jan = formatDate("2026-01-15T12:00:00.000Z");
    expect(jan).toContain("2026");
    expect(jan).toMatch(/ene/i);

    const dec = formatDate("2026-12-25T12:00:00.000Z");
    expect(dec).toContain("2026");
    expect(dec).toMatch(/dic/i);
  });

  it("renders a date-only string as the correct calendar day — no UTC offset shift", () => {
    // "2014-03-15" parsed as UTC midnight → 14 Mar in Guayaquil (UTC-5).
    // Our fix interprets it as local calendar date → 15 Mar.
    const result = formatDate("2014-03-15");
    expect(result).toContain("15");
    expect(result).toMatch(/mar/i);
    expect(result).toContain("2014");
  });

  it("renders end-of-month date-only strings correctly", () => {
    expect(formatDate("2026-01-31")).toContain("31");
    expect(formatDate("2026-12-31")).toContain("31");
    expect(formatDate("2026-02-28")).toContain("28");
  });

  it("renders first-of-month date-only strings correctly", () => {
    const januaryFirst = formatDate("2026-01-01");
    expect(januaryFirst).toContain("1");
    expect(januaryFirst).toMatch(/ene/i);

    const juneFirst = formatDate("2026-06-01");
    expect(juneFirst).toContain("1");
    expect(juneFirst).toMatch(/jun/i);
  });

  it("accepts valid leap-day date-only strings", () => {
    expect(formatDate("2020-02-29")).toContain("29");
  });

  it("returns empty string for an empty date string", () => {
    expect(formatDate("")).toBe("");
  });

  it("returns empty string for an invalid date string", () => {
    expect(formatDate("not-a-date")).toBe("");
    expect(formatDate("2026-13-01")).toBe("");
    expect(formatDate("2021-02-29")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// formatMembershipPeriod
// ---------------------------------------------------------------------------

describe("formatMembershipPeriod", () => {
  it("formats a monthly period using the separator", () => {
    const result = formatMembershipPeriod("2026-07-01", "2026-07-31");
    expect(result).toContain("—");
    expect(result.length).toBeGreaterThan(5);
  });

  it("formats a cross-month period using the separator", () => {
    const result = formatMembershipPeriod("2026-07-01", "2026-09-30");
    expect(result).toContain("—");
    expect(result.length).toBeGreaterThan(5);
  });

  it("returns empty string for invalid dates", () => {
    expect(formatMembershipPeriod("", "2026-07-31")).toBe("");
    expect(formatMembershipPeriod("2026-07-01", "")).toBe("");
    expect(formatMembershipPeriod("bad-date", "also-bad")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// getPayerTypeLabel
// ---------------------------------------------------------------------------

describe("getPayerTypeLabel", () => {
  it('returns "Representante" for representante', () => {
    expect(getPayerTypeLabel("representante")).toBe("Representante");
  });

  it('returns "Estudiante" for estudiante', () => {
    expect(getPayerTypeLabel("estudiante")).toBe("Estudiante");
  });
});

// ---------------------------------------------------------------------------
// MEMBERSHIP_TYPE_LABELS
// ---------------------------------------------------------------------------

describe("MEMBERSHIP_TYPE_LABELS", () => {
  it('returns "Mensual" for mensual', () => {
    expect(MEMBERSHIP_TYPE_LABELS["mensual"]).toBe("Mensual");
  });

  it('returns "Trimestral" for trimestral', () => {
    expect(MEMBERSHIP_TYPE_LABELS["trimestral"]).toBe("Trimestral");
  });

  it('returns "Semestral" for semestral', () => {
    expect(MEMBERSHIP_TYPE_LABELS["semestral"]).toBe("Semestral");
  });

  it('returns "Anual" for anual', () => {
    expect(MEMBERSHIP_TYPE_LABELS["anual"]).toBe("Anual");
  });
});

// ---------------------------------------------------------------------------
// countActiveStudents
// ---------------------------------------------------------------------------

describe("countActiveStudents", () => {
  it("counts active memberships for an account", () => {
    // rp-001 (Carlos Martinez): Sofia (activa), Mateo (activa), Emilia (vencida)
    const account = MOCK_MEMBER_ACCOUNTS.find((a) => a.id === "rp-001")!;
    expect(countActiveStudents(account)).toBe(2);
  });

  it("returns 0 when no students have active membership", () => {
    // rp-005 (Carlos Ramirez): both students have vencida
    const account = MOCK_MEMBER_ACCOUNTS.find((a) => a.id === "rp-005")!;
    expect(countActiveStudents(account)).toBe(0);
  });

  it("returns 0 for an account with no students", () => {
    const emptyAccount: MemberAccount = {
      id: "rp-empty",
      role: "representante",
      nombres: "Empty",
      apellidos: "Account",
      email: "empty@test.com",
      telefono: "+593 00 000 0000",
      estudiantes: [],
    };
    expect(countActiveStudents(emptyAccount)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getAccountStatusBadge
// ---------------------------------------------------------------------------

describe("getAccountStatusBadge", () => {
  it('returns "Activo" + "badge-success" when account has active students', () => {
    const account = MOCK_MEMBER_ACCOUNTS.find((a) => a.id === "rp-001")!;
    expect(getAccountStatusBadge(account)).toEqual({
      label: "Activo",
      className: "badge-success",
    });
  });

  it('returns "Pago pendiente de validación" + "badge-warning" when no active memberships but pending validation', () => {
    // rp-005 (Carlos Ramirez): both students have vencida memberships,
    // but Santiago (stu-007) has pendiente_validacion payment
    const account = MOCK_MEMBER_ACCOUNTS.find((a) => a.id === "rp-005")!;
    expect(getAccountStatusBadge(account)).toEqual({
      label: "Pago pendiente de validación",
      className: "badge-warning",
    });
  });

  it('returns "Membresía vencida" + "badge-error" when no active and no pending validation but expired', () => {
    // rp-003 (Diego Flores): Camila has vencida membership, no payments at all
    const account = MOCK_MEMBER_ACCOUNTS.find((a) => a.id === "rp-003")!;
    expect(getAccountStatusBadge(account)).toEqual({
      label: "Membresía vencida",
      className: "badge-error",
    });
  });

  it("handles accounts with empty estudiantes", () => {
    const emptyAccount: MemberAccount = {
      id: "rp-empty",
      role: "representante",
      nombres: "Empty",
      apellidos: "Account",
      email: "empty@test.com",
      telefono: "+593 00 000 0000",
      estudiantes: [],
    };
    expect(getAccountStatusBadge(emptyAccount)).toEqual({
      label: "Sin membresía activa",
      className: "badge-error",
    });
  });
});

// ---------------------------------------------------------------------------
// normalizeText
// ---------------------------------------------------------------------------

describe("normalizeText", () => {
  it("removes acute accents", () => {
    expect(normalizeText("Martínez")).toBe("martinez");
    expect(normalizeText("Álvarez")).toBe("alvarez");
    expect(normalizeText("Pérez")).toBe("perez");
  });

  it("lowercases all characters", () => {
    expect(normalizeText("CARLOS")).toBe("carlos");
    expect(normalizeText("López")).toBe("lopez");
  });

  it("handles mixed accents and casing", () => {
    expect(normalizeText("José María")).toBe("jose maria");
    expect(normalizeText("María José")).toBe("maria jose");
  });

  it("handles empty string", () => {
    expect(normalizeText("")).toBe("");
  });

  it("trims whitespace-only strings to empty", () => {
    expect(normalizeText("   ")).toBe("");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeText("  Pérez  ")).toBe("perez");
    expect(normalizeText("\tMartínez\n")).toBe("martinez");
  });

  it("ñ is preserved (not an accent)", () => {
    expect(normalizeText("Muñoz")).toBe("muñoz");
  });

  it("handles strings without accents", () => {
    expect(normalizeText("hello world")).toBe("hello world");
  });
});

// ---------------------------------------------------------------------------
// filterAccounts
// ---------------------------------------------------------------------------

describe("filterAccounts", () => {
  it("returns all accounts when search term is empty", () => {
    expect(filterAccounts(MOCK_MEMBER_ACCOUNTS, "")).toHaveLength(6);
  });

  it("returns a new array reference on empty search (immutable)", () => {
    const result = filterAccounts(MOCK_MEMBER_ACCOUNTS, "");
    expect(result).not.toBe(MOCK_MEMBER_ACCOUNTS);
  });

  it("returns all accounts when search term is only whitespace", () => {
    expect(filterAccounts(MOCK_MEMBER_ACCOUNTS, "   ")).toHaveLength(6);
  });

  it("filters by account name (case-insensitive)", () => {
    const result = filterAccounts(MOCK_MEMBER_ACCOUNTS, "Carlos");
    expect(result).toHaveLength(2); // Carlos Martínez (rp-001), Carlos Ramírez (rp-005)
  });

  it("filters by email", () => {
    const result = filterAccounts(MOCK_MEMBER_ACCOUNTS, "ana.lopez");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("rp-002");
  });

  it("filters by student name", () => {
    const result = filterAccounts(MOCK_MEMBER_ACCOUNTS, "Sofía");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("rp-001");
  });

  it("returns empty array when no match is found", () => {
    const result = filterAccounts(MOCK_MEMBER_ACCOUNTS, "zzzzz_no_match");
    expect(result).toHaveLength(0);
  });

  it("handles empty accounts array", () => {
    const result = filterAccounts([], "Carlos");
    expect(result).toHaveLength(0);
  });

  it("matches accent-insensitively — typed 'Martinez' finds 'Martínez'", () => {
    // Mock data has "Carlos Martínez" (rp-001)
    const result = filterAccounts(MOCK_MEMBER_ACCOUNTS, "Martinez");
    expect(result.some((a) => a.id === "rp-001")).toBe(true);
  });

  it("matches accent-insensitively — typed 'Lopez' finds 'López'", () => {
    // Mock data has "Ana López" (rp-002)
    const result = filterAccounts(MOCK_MEMBER_ACCOUNTS, "Lopez");
    expect(result.some((a) => a.id === "rp-002")).toBe(true);
  });

  it("matches accent-insensitively — typed 'Flores' finds 'Flores' (no accent needed)", () => {
    const result = filterAccounts(MOCK_MEMBER_ACCOUNTS, "flores");
    expect(result.some((a) => a.id === "rp-003")).toBe(true);
  });

  it("matches accent-insensitively — typed 'RAMIREZ' finds 'Ramírez'", () => {
    const result = filterAccounts(MOCK_MEMBER_ACCOUNTS, "RAMIREZ");
    expect(result.some((a) => a.id === "rp-005")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Mock data integrity
// ---------------------------------------------------------------------------

describe("MOCK_MEMBER_ACCOUNTS", () => {
  it("has at least one account", () => {
    expect(MOCK_MEMBER_ACCOUNTS.length).toBeGreaterThan(0);
  });

  it("every account has required fields", () => {
    for (const account of MOCK_MEMBER_ACCOUNTS) {
      expect(account.id).toBeTruthy();
      expect(account.nombres).toBeTruthy();
      expect(account.apellidos).toBeTruthy();
      expect(account.email).toBeTruthy();
      expect(account.telefono).toBeTruthy();
      expect(["representante", "estudiante"] as const).toContain(account.role);
    }
  });

  it("every student has required fields", () => {
    for (const account of MOCK_MEMBER_ACCOUNTS) {
      for (const estudiante of account.estudiantes) {
        expect(estudiante.id).toBeTruthy();
        expect(estudiante.nombres).toBeTruthy();
        expect(estudiante.apellidos).toBeTruthy();
        // grupoId is either a valid group reference or null (unassigned)
        expect(estudiante.grupoId).toBeDefined();
        if (estudiante.grupoId !== null) {
          expect(typeof estudiante.grupoId).toBe("string");
          expect(estudiante.grupoId.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("every account has at least one student", () => {
    for (const account of MOCK_MEMBER_ACCOUNTS) {
      expect(account.estudiantes.length).toBeGreaterThan(0);
    }
  });

  it("students do not own nivel directly — nivel comes from group context", () => {
    for (const account of MOCK_MEMBER_ACCOUNTS) {
      for (const estudiante of account.estudiantes) {
        // The MemberStudentSummary type uses grupoId, not nivel
        expect("nivel" in estudiante).toBe(false);
      }
    }
  });

  it("every grupoId references a known group", () => {
    const knownIds = new Set(MOCK_GRUPOS.map((g) => g.id));
    for (const account of MOCK_MEMBER_ACCOUNTS) {
      for (const estudiante of account.estudiantes) {
        if (estudiante.grupoId !== null) {
          expect(knownIds.has(estudiante.grupoId)).toBe(true);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// MOCK_GRUPOS
// ---------------------------------------------------------------------------

describe("MOCK_GRUPOS", () => {
  it("has at least one group", () => {
    expect(MOCK_GRUPOS.length).toBeGreaterThan(0);
  });

  it("each group has required fields", () => {
    for (const grupo of MOCK_GRUPOS) {
      expect(grupo.id).toBeTruthy();
      expect(grupo.nombre).toBeTruthy();
      expect(["principiante", "intermedio", "avanzado"] as const).toContain(
        grupo.nivel,
      );
      expect(grupo.estudiantesIds.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// getGrupoById
// ---------------------------------------------------------------------------

describe("getGrupoById", () => {
  it("returns the grupo for a valid grupoId", () => {
    const grupo = getGrupoById("grupo-001", MOCK_GRUPOS);
    expect(grupo).toBeDefined();
    expect(grupo?.nombre).toBe("Principiantes");
  });

  it("returns undefined for null input", () => {
    expect(getGrupoById(null, MOCK_GRUPOS)).toBeUndefined();
  });

  it("returns undefined for unknown grupoId", () => {
    expect(getGrupoById("grupo-unknown", MOCK_GRUPOS)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getNivelLabelFromGrupo
// ---------------------------------------------------------------------------

describe("getNivelLabelFromGrupo", () => {
  it("returns capitalized nivel for known groups", () => {
    expect(getNivelLabelFromGrupo("grupo-001", MOCK_GRUPOS)).toBe("Principiante");
    expect(getNivelLabelFromGrupo("grupo-002", MOCK_GRUPOS)).toBe("Intermedio");
    expect(getNivelLabelFromGrupo("grupo-003", MOCK_GRUPOS)).toBe("Avanzado");
  });

  it("returns null for null grupoId", () => {
    expect(getNivelLabelFromGrupo(null, MOCK_GRUPOS)).toBeNull();
  });

  it("returns null for unknown grupoId", () => {
    expect(getNivelLabelFromGrupo("grupo-unknown", MOCK_GRUPOS)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Unassigned student (no group)
// ---------------------------------------------------------------------------

describe("unassigned student (grupoId: null)", () => {
  const NULL_GRUPO_STUDENT = {
    id: "stu-null-grupo",
    nombres: "Nueva",
    apellidos: "Alumna",
    grupoId: null,
    activo: true,
    membresia: null,
    ultimoPago: null,
  };

  it("fixture has null grupoId", () => {
    expect(NULL_GRUPO_STUDENT.grupoId).toBeNull();
  });

  it("getNivelLabelFromGrupo returns null for null grupoId", () => {
    const nivelDisplay = getNivelLabelFromGrupo(
      NULL_GRUPO_STUDENT.grupoId,
      MOCK_GRUPOS,
    );
    expect(nivelDisplay).toBeNull();
  });

  it("null nivelDisplay triggers 'Sin grupo asignado' rendering (mimics StudentRow)", () => {
    const nivelDisplay = getNivelLabelFromGrupo(
      NULL_GRUPO_STUDENT.grupoId,
      MOCK_GRUPOS,
    );
    // This mirrors the ternary in StudentRow (page.tsx line 133):
    //   {nivelDisplay ? <span>{nivelDisplay}</span> : <span>Sin grupo asignado</span>}
    const rendered = nivelDisplay ?? "Sin grupo asignado";
    expect(rendered).toBe("Sin grupo asignado");
  });
});

// ---------------------------------------------------------------------------
// accountMatchesFlag / countAccountsMatchingFlag
// ---------------------------------------------------------------------------

describe("accountMatchesFlag", () => {
  it('"all" matches every account', () => {
    for (const account of MOCK_MEMBER_ACCOUNTS) {
      expect(accountMatchesFlag(account, "all")).toBe(true);
    }
  });

  it('"vencida" only matches accounts with at least one vencida membership', () => {
    const account: MemberAccount = {
      ...MOCK_MEMBER_ACCOUNTS[0],
      estudiantes: [
        {
          ...MOCK_MEMBER_ACCOUNTS[0].estudiantes[0],
          membresia: {
            tipo: "mensual",
            estado: "vencida",
            fechaInicio: "2026-01-01",
            fechaFin: "2026-02-01",
            monto: 85,
            id: 42,
          },
        },
      ],
    };
    expect(accountMatchesFlag(account, "vencida")).toBe(true);

    const noVencida: MemberAccount = {
      ...account,
      estudiantes: [{ ...account.estudiantes[0], membresia: null }],
    };
    expect(accountMatchesFlag(noVencida, "vencida")).toBe(false);
  });

  it('"pendiente" only matches accounts with at least one pending payment', () => {
    const account: MemberAccount = {
      ...MOCK_MEMBER_ACCOUNTS[0],
      estudiantes: [
        {
          ...MOCK_MEMBER_ACCOUNTS[0].estudiantes[0],
          ultimoPago: {
            estado: "pendiente_validacion",
            fechaPago: "2026-07-01",
            monto: 85,
            periodo: "Julio 2026",
          },
        },
      ],
    };
    expect(accountMatchesFlag(account, "pendiente")).toBe(true);

    const noPending: MemberAccount = {
      ...account,
      estudiantes: [{ ...account.estudiantes[0], ultimoPago: null }],
    };
    expect(accountMatchesFlag(noPending, "pendiente")).toBe(false);
  });

  it('"sin-grupo" only matches accounts with at least one student without a grupoId', () => {
    const account: MemberAccount = {
      ...MOCK_MEMBER_ACCOUNTS[0],
      estudiantes: [{ ...MOCK_MEMBER_ACCOUNTS[0].estudiantes[0], grupoId: null }],
    };
    expect(accountMatchesFlag(account, "sin-grupo")).toBe(true);

    const withGrupo: MemberAccount = {
      ...account,
      estudiantes: [{ ...account.estudiantes[0], grupoId: "grupo-1" }],
    };
    expect(accountMatchesFlag(withGrupo, "sin-grupo")).toBe(false);
  });
});

describe("countAccountsMatchingFlag", () => {
  it('"all" count equals the full account list length', () => {
    expect(countAccountsMatchingFlag(MOCK_MEMBER_ACCOUNTS, "all")).toBe(
      MOCK_MEMBER_ACCOUNTS.length,
    );
  });

  it("returns 0 for an empty account list", () => {
    expect(countAccountsMatchingFlag([], "vencida")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// paginateAccounts / getTotalPages (client-side members pagination)
// ---------------------------------------------------------------------------

function buildAccounts(count: number): MemberAccount[] {
  return Array.from({ length: count }, (_, i) => ({
    ...MOCK_MEMBER_ACCOUNTS[0],
    id: `acc-${i}`,
  }));
}

describe("paginateAccounts", () => {
  it("slices accounts to MEMBERS_PAGE_SIZE for page 1, and the remainder for a later page", () => {
    expect(MEMBERS_PAGE_SIZE).toBe(10);
    const accounts = buildAccounts(25);
    const page1 = paginateAccounts(accounts, 1);
    expect(page1).toHaveLength(10);
    expect(page1[0].id).toBe("acc-0");
    expect(page1[9].id).toBe("acc-9");
    const page3 = paginateAccounts(accounts, 3);
    expect(page3).toHaveLength(5);
    expect(page3[0].id).toBe("acc-20");
  });

  it("returns an empty array for a page beyond the data", () => {
    expect(paginateAccounts(buildAccounts(4), 5)).toEqual([]);
  });

  it("reflects a filtered subset, not the unfiltered total", () => {
    const accounts = buildAccounts(115);
    const filtered = accounts.filter((a) => a.id === "acc-0" || a.id === "acc-1");
    expect(paginateAccounts(filtered, 1)).toEqual(filtered);
    expect(getTotalPages(filtered.length, MEMBERS_PAGE_SIZE)).toBe(1);
  });
});

describe("getTotalPages", () => {
  it("rounds up to a whole page count, floored at 1 (never 0 pages)", () => {
    expect(getTotalPages(115, MEMBERS_PAGE_SIZE)).toBe(12);
    expect(getTotalPages(11, MEMBERS_PAGE_SIZE)).toBe(2);
    expect(getTotalPages(10, MEMBERS_PAGE_SIZE)).toBe(1);
    expect(getTotalPages(0, MEMBERS_PAGE_SIZE)).toBe(1);
  });
});
