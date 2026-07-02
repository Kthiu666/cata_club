/**
 * Unit tests for group management pure helpers.
 *
 * Pure functions — no React dependencies, easy to test.
 * Follows the same pattern as members-utils.test.ts and attendance-utils.test.ts.
 */

import { describe, it, expect } from "vitest";
import type { Grupo, NivelTecnico } from "@/types/domain";
import type { ScheduleSlot } from "@/app/attendance/attendance-utils";
import {
  assignStudentToGroup,
  removeStudentFromAllGroups,
  getStudentsByGroup,
  getSchedulesByGroup,
  getUnassignedStudents,
  getAssignedStudents,
  getGroupCapacity,
  buildGroupCards,
  buildTrainingSessions,
  getLevelLabel,
  type StudentRef,
} from "../groups-utils";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_GRUPOS: Grupo[] = [
  {
    id: "grupo-001",
    nombre: "Principiantes",
    nivel: "principiante",
    alumnosIds: ["stu-001", "stu-002"],
    horariosIds: ["hor-001", "hor-004"],
    activo: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "grupo-002",
    nombre: "Intermedios",
    nivel: "intermedio",
    alumnosIds: ["stu-003"],
    horariosIds: ["hor-002"],
    activo: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "grupo-003",
    nombre: "Avanzados",
    nivel: "avanzado",
    alumnosIds: [],
    horariosIds: [],
    activo: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
];

const MOCK_STUDENTS: StudentRef[] = [
  { id: "stu-001", nombres: "Sofia", apellidos: "Martinez", grupoId: "grupo-001", activo: true },
  { id: "stu-002", nombres: "Mateo", apellidos: "Rodriguez", grupoId: "grupo-001", activo: true },
  { id: "stu-003", nombres: "Valentina", apellidos: "Lopez", grupoId: "grupo-002", activo: true },
  { id: "stu-004", nombres: "Camila", apellidos: "Flores", grupoId: null, activo: true },
  { id: "stu-005", nombres: "Nicolas", apellidos: "Acosta", grupoId: null, activo: true },
];

const MOCK_SCHEDULES: ScheduleSlot[] = [
  { id: "hor-001", diaSemana: "lun", horaInicio: "15:00", horaFin: "16:30", nivel: "principiante", cancha: "Cancha 1", cupoMaximo: 12, activo: true },
  { id: "hor-002", diaSemana: "mie", horaInicio: "16:45", horaFin: "18:15", nivel: "intermedio", cancha: "Cancha 2", cupoMaximo: 10, activo: true },
  { id: "hor-003", diaSemana: "vie", horaInicio: "15:00", horaFin: "16:30", nivel: "principiante", cancha: "Cancha 1", cupoMaximo: 12, activo: false },
  { id: "hor-004", diaSemana: "vie", horaInicio: "15:00", horaFin: "16:30", nivel: "principiante", cancha: "Cancha 1", cupoMaximo: 12, activo: true },
];

// ---------------------------------------------------------------------------
// getLevelLabel
// ---------------------------------------------------------------------------

describe("getLevelLabel", () => {
  it("returns correct label for each level", () => {
    expect(getLevelLabel("principiante")).toBe("Principiante");
    expect(getLevelLabel("intermedio")).toBe("Intermedio");
    expect(getLevelLabel("avanzado")).toBe("Avanzado");
  });
});

// ---------------------------------------------------------------------------
// assignStudentToGroup
// ---------------------------------------------------------------------------

describe("assignStudentToGroup", () => {
  it("assigns an unassigned student to a group", () => {
    const result = assignStudentToGroup("stu-004", "grupo-001", MOCK_GRUPOS);
    expect(result.success).toBe(true);
    expect(result.message).toContain("asignado");

    const updated = result.updatedGrupos.find((g) => g.id === "grupo-001")!;
    expect(updated.alumnosIds).toContain("stu-004");
    expect(updated.alumnosIds).toContain("stu-001"); // existing kept
  });

  it("removes student from previous group when reassigning", () => {
    const result = assignStudentToGroup("stu-001", "grupo-002", MOCK_GRUPOS);
    expect(result.success).toBe(true);

    const grupo1 = result.updatedGrupos.find((g) => g.id === "grupo-001")!;
    const grupo2 = result.updatedGrupos.find((g) => g.id === "grupo-002")!;

    expect(grupo1.alumnosIds).not.toContain("stu-001");
    expect(grupo2.alumnosIds).toContain("stu-001");
  });

  it("returns success=false when target group does not exist", () => {
    const result = assignStudentToGroup("stu-004", "grupo-unknown", MOCK_GRUPOS);
    expect(result.success).toBe(false);
    expect(result.message).toContain("no encontrado");
  });

  it("returns success=false when student is already in target group", () => {
    const result = assignStudentToGroup("stu-001", "grupo-001", MOCK_GRUPOS);
    expect(result.success).toBe(false);
    expect(result.message).toContain("ya pertenece");
  });

  it("makes student appear in exactly one group's alumnosIds after assignment", () => {
    // Simulates the C1 fix: after assigning a student, they should appear
    // in exactly one group's alumnosIds, ensuring getUnassignedStudents
    // (which checks derived grupoId from grupos) would correctly exclude them.
    const result = assignStudentToGroup("stu-004", "grupo-001", MOCK_GRUPOS);
    expect(result.success).toBe(true);

    const groupsWithStudent = result.updatedGrupos.filter((g) =>
      g.alumnosIds.includes("stu-004"),
    );
    expect(groupsWithStudent).toHaveLength(1);
    expect(groupsWithStudent[0].id).toBe("grupo-001");
  });

  it("does not mutate the original grupos array", () => {
    const original = MOCK_GRUPOS.map((g) => ({ ...g, alumnosIds: [...g.alumnosIds] }));
    assignStudentToGroup("stu-004", "grupo-001", MOCK_GRUPOS);

    expect(MOCK_GRUPOS[0].alumnosIds).toEqual(["stu-001", "stu-002"]);
  });
});

// ---------------------------------------------------------------------------
// removeStudentFromAllGroups
// ---------------------------------------------------------------------------

describe("removeStudentFromAllGroups", () => {
  it("removes student from all groups", () => {
    const updated = removeStudentFromAllGroups("stu-001", MOCK_GRUPOS);
    expect(updated.every((g) => !g.alumnosIds.includes("stu-001"))).toBe(true);
  });

  it("does not mutate the original", () => {
    removeStudentFromAllGroups("stu-001", MOCK_GRUPOS);
    expect(MOCK_GRUPOS[0].alumnosIds).toContain("stu-001");
  });

  it("returns unchanged array when student is not in any group", () => {
    const updated = removeStudentFromAllGroups("stu-999", MOCK_GRUPOS);
    expect(updated).toEqual(MOCK_GRUPOS);
  });

  it("removed student is present in zero groups (C1 — unassigned consistency)", () => {
    const updated = removeStudentFromAllGroups("stu-001", MOCK_GRUPOS);
    const inAnyGroup = updated.some((g) =>
      g.alumnosIds.includes("stu-001"),
    );
    expect(inAnyGroup).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getStudentsByGroup
// ---------------------------------------------------------------------------

describe("getStudentsByGroup", () => {
  it("returns students that belong to the group", () => {
    const students = getStudentsByGroup(MOCK_GRUPOS[0], MOCK_STUDENTS);
    expect(students).toHaveLength(2);
    expect(students.map((s) => s.id)).toEqual(["stu-001", "stu-002"]);
  });

  it("returns empty array for a group with no students", () => {
    const students = getStudentsByGroup(MOCK_GRUPOS[2], MOCK_STUDENTS);
    expect(students).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getSchedulesByGroup
// ---------------------------------------------------------------------------

describe("getSchedulesByGroup", () => {
  it("returns schedules linked to the group", () => {
    const schedules = getSchedulesByGroup(MOCK_GRUPOS[0], MOCK_SCHEDULES);
    expect(schedules).toHaveLength(2);
    expect(schedules.map((s) => s.id)).toEqual(["hor-001", "hor-004"]);
  });

  it("returns empty array when group has no horariosIds", () => {
    const grupo: Grupo = {
      id: "g-empty",
      nombre: "Empty",
      nivel: "principiante",
      alumnosIds: [],
      activo: true,
      createdAt: "",
      updatedAt: "",
    };
    expect(getSchedulesByGroup(grupo, MOCK_SCHEDULES)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getUnassignedStudents / getAssignedStudents
// ---------------------------------------------------------------------------

describe("getUnassignedStudents", () => {
  it("finds students without a group", () => {
    const unassigned = getUnassignedStudents(MOCK_STUDENTS);
    expect(unassigned).toHaveLength(2);
    expect(unassigned.map((s) => s.id)).toEqual(["stu-004", "stu-005"]);
  });

  it("returns empty array when all students have groups", () => {
    const allAssigned = MOCK_STUDENTS.map((s) => ({
      ...s,
      grupoId: s.grupoId ?? "grupo-001",
    }));
    expect(getUnassignedStudents(allAssigned)).toHaveLength(0);
  });

  it("includes inactive unassigned students (does NOT filter by activo)", () => {
    const withInactive: StudentRef[] = [
      ...MOCK_STUDENTS,
      { id: "stu-inactive", nombres: "Inactive", apellidos: "Student", grupoId: null, activo: false },
    ];
    const unassigned = getUnassignedStudents(withInactive);
    expect(unassigned.find((s) => s.id === "stu-inactive")).toBeDefined();
    expect(unassigned.find((s) => s.id === "stu-inactive")!.activo).toBe(false);
  });
});

describe("getAssignedStudents", () => {
  it("finds students with a group", () => {
    const assigned = getAssignedStudents(MOCK_STUDENTS);
    expect(assigned).toHaveLength(3);
  });

  it("includes inactive assigned students (does NOT filter by activo)", () => {
    const withInactive: StudentRef[] = [
      ...MOCK_STUDENTS,
      { id: "stu-inactive", nombres: "Inactive", apellidos: "Assigned", grupoId: "grupo-001", activo: false },
    ];
    const assigned = getAssignedStudents(withInactive);
    expect(assigned.find((s) => s.id === "stu-inactive")).toBeDefined();
    expect(assigned.find((s) => s.id === "stu-inactive")!.activo).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getGroupCapacity
// ---------------------------------------------------------------------------

describe("getGroupCapacity", () => {
  it("calculates capacity from linked schedules (minimum cupoMaximo, not sum)", () => {
    // grupo-001 has hor-001 (cupo 12) + hor-004 (cupo 12) = min 12 total
    // Effective capacity is the minimum across linked schedules since the
    // group roster attends EVERY linked session with the same students.
    // It has 2 students
    const cap = getGroupCapacity(MOCK_GRUPOS[0], MOCK_SCHEDULES);
    expect(cap.total).toBe(12);
    expect(cap.available).toBe(10);
    expect(cap.percent).toBe(17); // 2/12 ≈ 17%
  });

  it("returns zero total when no schedules linked", () => {
    // grupo-003 has no horariosIds
    const cap = getGroupCapacity(MOCK_GRUPOS[2], MOCK_SCHEDULES);
    expect(cap.total).toBe(0);
    expect(cap.percent).toBe(0);
  });

  it("ignores inactive linked schedules when computing effective capacity (JDC2)", () => {
    // grupo with hor-001 (active, cupo=12) + custom inactive slot (cupo=3)
    // The inactive slot with lower cupo should be IGNORED — effective capacity should be 12
    const groupWithInactive: Grupo = {
      id: "grupo-cap-test",
      nombre: "Capacidad Test",
      nivel: "principiante",
      alumnosIds: ["stu-001"],
      horariosIds: ["hor-001", "inactive-low-cap"],
      activo: true,
      createdAt: "",
      updatedAt: "",
    };
    const schedulesWithInactive: ScheduleSlot[] = [
      ...MOCK_SCHEDULES,
      {
        id: "inactive-low-cap",
        diaSemana: "sab",
        horaInicio: "09:00",
        horaFin: "10:00",
        nivel: "principiante",
        cancha: "Cancha 1",
        cupoMaximo: 3,
        activo: false,
      },
    ];
    const cap = getGroupCapacity(groupWithInactive, schedulesWithInactive);
    // inactive-low-cap (cupo=3) is inactive, should not cap capacity
    // Only hor-001 (cupo=12, active) counts
    expect(cap.total).toBe(12);
    expect(cap.available).toBe(11); // 1 student
    expect(cap.percent).toBe(8); // 1/12 ≈ 8%
  });

  it("uses minimum cupoMaximo across active linked schedules (mixed fixture)", () => {
    // grupo with 2 active schedules: cupo=12 and cupo=8
    // Effective capacity should be min(12, 8) = 8
    const groupMixed: Grupo = {
      id: "grupo-mixed",
      nombre: "Mixed",
      nivel: "principiante",
      alumnosIds: ["stu-001", "stu-002"],
      horariosIds: ["hor-001", "lower-active"],
      activo: true,
      createdAt: "",
      updatedAt: "",
    };
    const schedulesMixed: ScheduleSlot[] = [
      ...MOCK_SCHEDULES,
      {
        id: "lower-active",
        diaSemana: "sab",
        horaInicio: "10:00",
        horaFin: "11:00",
        nivel: "principiante",
        cancha: "Cancha 2",
        cupoMaximo: 8,
        activo: true,
      },
    ];
    const cap = getGroupCapacity(groupMixed, schedulesMixed);
    expect(cap.total).toBe(8); // min(12, 8)
    expect(cap.available).toBe(6); // 2 students
    expect(cap.percent).toBe(25); // 2/8 = 25%
  });
});

// ---------------------------------------------------------------------------
// buildGroupCards
// ---------------------------------------------------------------------------

describe("buildGroupCards", () => {
  it("builds card data for all groups", () => {
    const cards = buildGroupCards(MOCK_GRUPOS, MOCK_SCHEDULES);
    expect(cards).toHaveLength(3);

    const principiantes = cards.find((c) => c.id === "grupo-001")!;
    expect(principiantes.name).toBe("Principiantes");
    expect(principiantes.levelLabel).toBe("Principiante");
    expect(principiantes.studentCount).toBe(2);
    expect(principiantes.scheduleCount).toBe(2);
    expect(principiantes.capacity).toBe(12);
    expect(principiantes.capacityPercent).toBe(17);
  });

  it("returns empty array when grupos is empty", () => {
    expect(buildGroupCards([], MOCK_SCHEDULES)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// buildTrainingSessions
// ---------------------------------------------------------------------------

describe("buildTrainingSessions", () => {
  const studentNameMap: Record<string, string> = {
    "stu-001": "Sofia Martinez",
    "stu-002": "Mateo Rodriguez",
    "stu-003": "Valentina Lopez",
  };

  it("builds sessions from groups and schedules", () => {
    const sessions = buildTrainingSessions(MOCK_GRUPOS, MOCK_SCHEDULES, studentNameMap);

    // Active schedules only: grupo-001 has hor-001 (lun, active) + hor-004 (vie, active) = 2
    // grupo-002 has hor-002 (mie, active) = 1
    // grupo-003 has no schedules = 0
    expect(sessions).toHaveLength(3);

    const first = sessions[0];
    expect(first.groupName).toContain("Principiantes");
    expect(first.students).toHaveLength(2);
    expect(first.students[0].name).toBe("Sofia Martinez");
    expect(first.students.every((s) => s.attendance === "absent")).toBe(true);
  });

  it("skips inactive schedules", () => {
    // hor-003 is inactive, should not appear in training sessions
    // Active sessions at "Cancha 1" "15:00—16:30": hor-001 (lun, linked to grupo-001)
    // and hor-004 (vie, linked to grupo-001) = exactly 2
    const sessions = buildTrainingSessions(MOCK_GRUPOS, MOCK_SCHEDULES, studentNameMap);
    const activeAtSlot = sessions.filter(
      (s) => s.court === "Cancha 1" && s.time === "15:00 — 16:30",
    );
    expect(activeAtSlot).toHaveLength(2);
    // Total sessions: 3 (hor-001, hor-004 for grupo-001, hor-002 for grupo-002)
    expect(sessions).toHaveLength(3);
  });

  it("handles empty inputs gracefully", () => {
    expect(buildTrainingSessions([], MOCK_SCHEDULES, {})).toHaveLength(0);
  });
});
