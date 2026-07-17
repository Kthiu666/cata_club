/**
 * Unit tests for the Gestion de Grupos page-level pure helpers.
 *
 * Pure functions — no React dependencies, easy to test.
 * Pattern follows members-utils.test.ts and attendance-utils.test.ts.
 */

import { describe, it, expect } from "vitest";
import { MOCK_GRUPOS, MOCK_MEMBER_ACCOUNTS } from "@/mocks/members";
import type { Grupo } from "@/types/domain";
import type { StudentRef } from "@/lib/groups-utils";
import {
  findStudentGroupId,
  buildStudentRefs,
  LEVEL_BADGE,
  getLevelBadgeClass,
  getCapacityBarColor,
} from "../groups-page-utils";

// ---------------------------------------------------------------------------
// findStudentGroupId
// ---------------------------------------------------------------------------

describe("findStudentGroupId", () => {
  it("returns the group id when a student belongs to a group", () => {
    // stu-001 (Sofia Martinez) is in grupo-001 (Principiantes)
    const result = findStudentGroupId("stu-001", MOCK_GRUPOS);
    expect(result).toBe("grupo-001");
  });

  it("returns null when a student is not in any group", () => {
    const result = findStudentGroupId("stu-nonexistent", MOCK_GRUPOS);
    expect(result).toBeNull();
  });

  it("returns null for empty grupos array", () => {
    const result = findStudentGroupId("stu-001", []);
    expect(result).toBeNull();
  });

  it("searches across all groups", () => {
    // stu-004 (Valentina Lopez) is in grupo-003 (Avanzados)
    const result = findStudentGroupId("stu-004", MOCK_GRUPOS);
    expect(result).toBe("grupo-003");
  });

  it("returns the correct group for grupo-002 members", () => {
    // stu-002 (Mateo Martinez) is in grupo-002 (Intermedios)
    const result = findStudentGroupId("stu-002", MOCK_GRUPOS);
    expect(result).toBe("grupo-002");
  });

  it("returns null for a student with no group assignment", () => {
    // stu-009 (Joaquin Mendoza) has grupoId: null in mock data
    const result = findStudentGroupId("stu-009", MOCK_GRUPOS);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildStudentRefs
// ---------------------------------------------------------------------------

describe("buildStudentRefs", () => {
  it("builds a flat list of all students from member accounts", () => {
    const refs = buildStudentRefs(MOCK_GRUPOS, MOCK_MEMBER_ACCOUNTS);
    const expectedCount = MOCK_MEMBER_ACCOUNTS.reduce(
      (acc, a) => acc + a.estudiantes.length,
      0,
    );
    expect(refs).toHaveLength(expectedCount);
  });

  it("each ref has the correct shape", () => {
    const refs = buildStudentRefs(MOCK_GRUPOS, MOCK_MEMBER_ACCOUNTS);
    for (const ref of refs) {
      expect(ref).toHaveProperty("id");
      expect(ref).toHaveProperty("nombres");
      expect(ref).toHaveProperty("apellidos");
      expect(ref).toHaveProperty("grupoId");
      expect(ref).toHaveProperty("activo");
    }
  });

  it("resolves grupoId from current grupos state (not static)", () => {
    // stu-001 is in grupo-001
    const refs = buildStudentRefs(MOCK_GRUPOS, MOCK_MEMBER_ACCOUNTS);
    const sofia = refs.find((r) => r.id === "stu-001");
    expect(sofia?.grupoId).toBe("grupo-001");
  });

  it("returns grupoId null for a student not in any group", () => {
    const refs = buildStudentRefs(MOCK_GRUPOS, MOCK_MEMBER_ACCOUNTS);
    // stu-009 (Joaquin Mendoza) has grupoId: null in mock data and is not in any group
    const joaquin = refs.find((r) => r.id === "stu-009");
    expect(joaquin?.grupoId).toBeNull();
  });

  it("returns empty array when there are no member accounts", () => {
    const refs = buildStudentRefs(MOCK_GRUPOS, []);
    expect(refs).toHaveLength(0);
  });

  it("re-derives grupoId when grupos change — reflects new assignment", () => {
    // Simulate moving stu-001 from grupo-001 to grupo-002
    const modifiedGrupos: Grupo[] = MOCK_GRUPOS.map((g) => {
      if (g.id === "grupo-001") {
        return { ...g, estudiantesIds: g.estudiantesIds.filter((id) => id !== "stu-001") };
      }
      if (g.id === "grupo-002") {
        return { ...g, estudiantesIds: [...g.estudiantesIds, "stu-001"] };
      }
      return g;
    });
    const refs = buildStudentRefs(modifiedGrupos, MOCK_MEMBER_ACCOUNTS);
    const sofia = refs.find((r) => r.id === "stu-001");
    expect(sofia?.grupoId).toBe("grupo-002");
  });

  it("re-derives grupoId when student is removed from all groups", () => {
    const modifiedGrupos: Grupo[] = MOCK_GRUPOS.map((g) => ({
      ...g,
      estudiantesIds: g.estudiantesIds.filter((id) => id !== "stu-001"),
    }));
    const refs = buildStudentRefs(modifiedGrupos, MOCK_MEMBER_ACCOUNTS);
    const sofia = refs.find((r) => r.id === "stu-001");
    expect(sofia?.grupoId).toBeNull();
  });

  it("preserves activo flag from member accounts", () => {
    const refs = buildStudentRefs(MOCK_GRUPOS, MOCK_MEMBER_ACCOUNTS);
    for (const account of MOCK_MEMBER_ACCOUNTS) {
      for (const estudiante of account.estudiantes) {
        const ref = refs.find((r) => r.id === estudiante.id);
        expect(ref?.activo).toBe(estudiante.activo);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// LEVEL_BADGE config
// ---------------------------------------------------------------------------

describe("LEVEL_BADGE", () => {
  it("defines a class for each known technical level", () => {
    const knownLevels = ["principiante", "intermedio", "avanzado"];
    for (const level of knownLevels) {
      expect(LEVEL_BADGE[level]).toBeTruthy();
      expect(LEVEL_BADGE[level]).toContain("bg-");
    }
  });
});

// ---------------------------------------------------------------------------
// getLevelBadgeClass
// ---------------------------------------------------------------------------

describe("getLevelBadgeClass", () => {
  it('returns a cata-* token class for "principiante" (B3 — no hardcoded hex/rgba)', () => {
    const result = getLevelBadgeClass("principiante");
    expect(result).toContain("cata-state-ok");
    expect(result).toContain("bg-");
    expect(result).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(result).not.toContain("rgba(");
  });

  it('returns a cata-* token class for "intermedio" (B3 — no hardcoded hex/rgba)', () => {
    const result = getLevelBadgeClass("intermedio");
    expect(result).toContain("cata-navy");
    expect(result).toContain("bg-");
    expect(result).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(result).not.toContain("rgba(");
  });

  it('returns a cata-* token class for "avanzado" (B3 — no hardcoded hex/rgba)', () => {
    const result = getLevelBadgeClass("avanzado");
    expect(result).toContain("cata-red");
    expect(result).toContain("bg-");
    expect(result).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(result).not.toContain("rgba(");
  });

  it("returns fallback class for unknown level", () => {
    const result = getLevelBadgeClass("unknown_level");
    expect(result).toBe("bg-cata-warm text-cata-gray");
  });

  it("returns fallback class for empty string", () => {
    const result = getLevelBadgeClass("");
    expect(result).toBe("bg-cata-warm text-cata-gray");
  });
});

// ---------------------------------------------------------------------------
// getCapacityBarColor
// ---------------------------------------------------------------------------

describe("getCapacityBarColor — B3 regression guard (Fase 2 light-theme migration)", () => {
  it("byte-identical thresholds/colors across the full domain — MUST NOT change while groups/page.tsx and LEVEL_BADGE are migrated to light tokens in this phase", () => {
    // Approval test: captures the exact current contract of getCapacityBarColor.
    // Capacity-bar colors are explicitly OUT OF SCOPE for the B3 fix (theme-agnostic
    // red/amber/emerald severity signal) — this asserts the same fixture table used
    // by the granular tests below, in one place, so any accidental touch to
    // CAPACITY_THRESHOLDS during the LEVEL_BADGE edit is caught immediately.
    const fixtures: Array<[number, string]> = [
      [100, "bg-red-500"],
      [95, "bg-red-500"],
      [90, "bg-red-500"],
      [89, "bg-amber-500"],
      [75, "bg-amber-500"],
      [70, "bg-amber-500"],
      [69, "bg-emerald-500"],
      [40, "bg-emerald-500"],
      [0, "bg-emerald-500"],
      [-5, "bg-emerald-500"],
    ];
    for (const [percent, expectedColor] of fixtures) {
      expect(getCapacityBarColor(percent)).toBe(expectedColor);
    }
  });
});

describe("getCapacityBarColor", () => {
  it('returns red for 100%', () => {
    expect(getCapacityBarColor(100)).toBe("bg-red-500");
  });

  it('returns red for 90%', () => {
    expect(getCapacityBarColor(90)).toBe("bg-red-500");
  });

  it('returns amber for 89%', () => {
    expect(getCapacityBarColor(89)).toBe("bg-amber-500");
  });

  it('returns amber for 70%', () => {
    expect(getCapacityBarColor(70)).toBe("bg-amber-500");
  });

  it('returns emerald for 69%', () => {
    expect(getCapacityBarColor(69)).toBe("bg-emerald-500");
  });

  it('returns emerald for 0%', () => {
    expect(getCapacityBarColor(0)).toBe("bg-emerald-500");
  });

  it('returns emerald for negative values (edge case)', () => {
    expect(getCapacityBarColor(-5)).toBe("bg-emerald-500");
  });
});
