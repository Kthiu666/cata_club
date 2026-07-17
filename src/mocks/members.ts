/**
 * Centralized mock data for members and groups.
 *
 * Shared across pages (members, groups, attendance, trainer) and tests.
 * Moved from src/app/members/members-utils.ts to create a clear mock-data
 * boundary that makes the transition to a real backend easier.
 *
 * Do NOT add business logic here. This file is mock data only — pure
 * functions belong in src/lib/*-utils.ts or the respective *-utils.ts files.
 */

import type { Grupo } from "@/types/domain";
import type { MemberAccount } from "@/app/members/members-utils";

// ---------------------------------------------------------------------------
// Mock accounts
// ---------------------------------------------------------------------------

export const MOCK_MEMBER_ACCOUNTS: MemberAccount[] = [
  {
    id: "rp-001",
    role: "representante",
    nombres: "Carlos",
    apellidos: "Martínez",
    email: "carlos.martinez@email.com",
    telefono: "+593 99 123 4567",
    estudiantes: [
      {
        id: "stu-001",
        nombres: "Sofía",
        apellidos: "Martínez",
        email: "sofia.martinez@email.com",
        grupoId: "grupo-001",
        fechaNacimiento: "2014-03-15",
        activo: true,
        membresia: {
          tipo: "mensual",
          estado: "activa",
          fechaInicio: "2026-07-01",
          fechaFin: "2026-07-31",
          monto: 85,
        },
        ultimoPago: {
          estado: "aprobado",
          fechaPago: "2026-06-28",
          monto: 85,
          periodo: "Julio 2026",
        },
      },
      {
        id: "stu-002",
        nombres: "Mateo",
        apellidos: "Martínez",
        email: "mateo.martinez@email.com",
        grupoId: "grupo-002",
        fechaNacimiento: "2012-08-22",
        activo: true,
        membresia: {
          tipo: "mensual",
          estado: "activa",
          fechaInicio: "2026-07-01",
          fechaFin: "2026-07-31",
          monto: 85,
        },
        ultimoPago: {
          estado: "pendiente_validacion",
          fechaPago: "2026-06-27",
          monto: 85,
          periodo: "Julio 2026",
        },
      },
      {
        id: "stu-003",
        nombres: "Emilia",
        apellidos: "Martínez",
        email: "emilia.martinez@email.com",
        grupoId: "grupo-001",
        fechaNacimiento: "2016-11-05",
        activo: true,
        membresia: {
          tipo: "mensual",
          estado: "vencida",
          fechaInicio: "2026-06-01",
          fechaFin: "2026-06-30",
          monto: 85,
        },
        ultimoPago: {
          estado: "pendiente_validacion",
          fechaPago: "2026-06-29",
          monto: 85,
          periodo: "Agosto 2026",
        },
      },
    ],
  },
  {
    id: "rp-002",
    role: "representante",
    nombres: "Ana",
    apellidos: "López",
    email: "ana.lopez@email.com",
    telefono: "+593 98 765 4321",
    estudiantes: [
      {
        id: "stu-004",
        nombres: "Valentina",
        apellidos: "López",
        email: "valentina.lopez@email.com",
        grupoId: "grupo-003",
        fechaNacimiento: "2010-02-10",
        activo: true,
        membresia: {
          tipo: "trimestral",
          estado: "activa",
          fechaInicio: "2026-07-01",
          fechaFin: "2026-09-30",
          monto: 240,
        },
        ultimoPago: {
          estado: "aprobado",
          fechaPago: "2026-06-26",
          monto: 240,
          periodo: "Julio — Septiembre 2026",
        },
      },
    ],
  },
  {
    id: "rp-003",
    role: "representante",
    nombres: "Diego",
    apellidos: "Flores",
    email: "diego.flores@email.com",
    telefono: "+593 97 654 3210",
    estudiantes: [
      {
        id: "stu-005",
        nombres: "Camila",
        apellidos: "Flores",
        email: "camila.flores@email.com",
        grupoId: "grupo-001",
        fechaNacimiento: "2015-06-18",
        activo: true,
        membresia: {
          tipo: "mensual",
          estado: "vencida",
          fechaInicio: "2026-06-01",
          fechaFin: "2026-06-30",
          monto: 85,
        },
        ultimoPago: null,
      },
    ],
  },
  {
    id: "rp-004",
    role: "estudiante",
    nombres: "Nicolás",
    apellidos: "Acosta",
    email: "nicolas.acosta@email.com",
    telefono: "+593 96 543 2109",
    estudiantes: [
      {
        id: "stu-006",
        nombres: "Nicolás",
        apellidos: "Acosta",
        email: "nicolas.acosta@email.com",
        grupoId: "grupo-002",
        activo: true,
        membresia: {
          tipo: "anual",
          estado: "activa",
          fechaInicio: "2026-01-01",
          fechaFin: "2026-12-31",
          monto: 720,
        },
        ultimoPago: {
          estado: "aprobado",
          fechaPago: "2025-12-20",
          monto: 720,
          periodo: "Anual 2026",
        },
      },
    ],
  },
  {
    id: "rp-005",
    role: "representante",
    nombres: "Carlos",
    apellidos: "Ramírez",
    email: "carlos.ramirez@email.com",
    telefono: "+593 95 432 1098",
    estudiantes: [
      {
        id: "stu-007",
        nombres: "Santiago",
        apellidos: "Ramírez",
        email: "santiago.ramirez@email.com",
        grupoId: "grupo-001",
        fechaNacimiento: "2013-09-30",
        activo: true,
        membresia: {
          tipo: "mensual",
          estado: "vencida",
          fechaInicio: "2026-06-01",
          fechaFin: "2026-06-30",
          monto: 85,
        },
        ultimoPago: {
          estado: "pendiente_validacion",
          fechaPago: "2026-06-26",
          monto: 85,
          periodo: "Julio 2026",
        },
      },
      {
        id: "stu-008",
        nombres: "Isabella",
        apellidos: "Morales",
        email: "isabella.morales@email.com",
        grupoId: "grupo-001",
        fechaNacimiento: "2014-12-12",
        activo: true,
        membresia: {
          tipo: "mensual",
          estado: "vencida",
          fechaInicio: "2026-05-01",
          fechaFin: "2026-05-31",
          monto: 85,
        },
        ultimoPago: null,
      },
    ],
  },
  {
    id: "rp-006",
    role: "representante",
    nombres: "Lucía",
    apellidos: "Mendoza",
    email: "lucia.mendoza@email.com",
    telefono: "+593 94 321 0987",
    estudiantes: [
      {
        id: "stu-009",
        nombres: "Joaquín",
        apellidos: "Mendoza",
        email: "joaquin.mendoza@email.com",
        grupoId: null,
        fechaNacimiento: "2017-04-20",
        activo: true,
        membresia: null,
        ultimoPago: null,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Mock Groups — technical level is carried by the group, not the student.
// ---------------------------------------------------------------------------

export const MOCK_GRUPOS: Grupo[] = [
  {
    id: "grupo-001",
    nombre: "Principiantes",
    nivel: "principiante",
    estudiantesIds: ["stu-001", "stu-003", "stu-005", "stu-007", "stu-008"],
    horariosIds: ["hor-001", "hor-004", "hor-007"],
    activo: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "grupo-002",
    nombre: "Intermedios",
    nivel: "intermedio",
    estudiantesIds: ["stu-002", "stu-006"],
    horariosIds: ["hor-002", "hor-005"],
    activo: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "grupo-003",
    nombre: "Avanzados",
    nivel: "avanzado",
    estudiantesIds: ["stu-004"],
    horariosIds: ["hor-003", "hor-006", "hor-008"],
    activo: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
];
