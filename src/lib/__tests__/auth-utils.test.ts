/**
 * Unit tests for auth utility functions.
 *
 * All utilities are pure functions — no React, no browser APIs required.
 */

import { describe, it, expect } from "vitest";
import {
  canAccess,
  getDefaultRoute,
  getRoleLabel,
  getNavLinksForRole,
} from "../auth-utils";
import type { UserRole } from "@/types/domain";

const ALL_ROLES: UserRole[] = ["admin", "trainer", "representante", "estudiante"];

// ---------------------------------------------------------------------------
// canAccess
// ---------------------------------------------------------------------------

describe("canAccess", () => {
  it("allows access when role is in allowedRoles", () => {
    expect(canAccess("admin", ["admin"])).toBe(true);
    expect(canAccess("admin", ["admin", "trainer"])).toBe(true);
    expect(canAccess("trainer", ["admin", "trainer", "estudiante"])).toBe(true);
  });

  it("denies access when role is not in allowedRoles", () => {
    expect(canAccess("estudiante", ["admin"])).toBe(false);
    expect(canAccess("trainer", ["estudiante"])).toBe(false);
  });

  it("denies access when role is null (unauthenticated)", () => {
    expect(canAccess(null, ["admin"])).toBe(false);
    expect(canAccess(null, ["admin", "trainer", "estudiante"])).toBe(false);
    expect(canAccess(null, [])).toBe(false);
  });

  it("denies access when allowedRoles is empty", () => {
    expect(canAccess("admin", [])).toBe(false);
    expect(canAccess("estudiante", [])).toBe(false);
  });

  it("covers every role", () => {
    for (const role of ALL_ROLES) {
      expect(canAccess(role, ALL_ROLES)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// getDefaultRoute
// ---------------------------------------------------------------------------

describe("getDefaultRoute", () => {
  it('returns "/dashboard" for admin', () => {
    expect(getDefaultRoute("admin")).toBe("/dashboard");
  });

  it('returns "/trainer" for trainer', () => {
    expect(getDefaultRoute("trainer")).toBe("/trainer");
  });

  it('returns "/student" for representante', () => {
    expect(getDefaultRoute("representante")).toBe("/student");
  });

  it('returns "/student" for estudiante', () => {
    expect(getDefaultRoute("estudiante")).toBe("/student");
  });

  it("returns a valid path for every role", () => {
    for (const role of ALL_ROLES) {
      const route = getDefaultRoute(role);
      expect(route).toMatch(/^\//);
      expect(route.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// getRoleLabel
// ---------------------------------------------------------------------------

describe("getRoleLabel", () => {
  it('returns "Administrador" for admin', () => {
    expect(getRoleLabel("admin")).toBe("Administrador");
  });

  it('returns "Entrenador" for trainer', () => {
    expect(getRoleLabel("trainer")).toBe("Entrenador");
  });

  it('returns "Representante" for representante', () => {
    expect(getRoleLabel("representante")).toBe("Representante");
  });

  it('returns "Alumno" for estudiante', () => {
    expect(getRoleLabel("estudiante")).toBe("Alumno");
  });
});

// ---------------------------------------------------------------------------
// getNavLinksForRole (RBAC nav contract — pure function, no React)
// ---------------------------------------------------------------------------

describe("getNavLinksForRole", () => {
  it("returns unauthenticated links when role is null", () => {
    const links = getNavLinksForRole(null);
    expect(links).toHaveLength(2);
    expect(links[0]).toEqual({ href: "/", label: "Inicio" });
    expect(links[1]).toEqual({ href: "/login", label: "Iniciar Sesión" });
  });

  it("returns admin links including /groups, /members and /attendance", () => {
    const links = getNavLinksForRole("admin");
    expect(links).toHaveLength(6);
    expect(links[0]).toEqual({ href: "/", label: "Inicio" });
    expect(links[1]).toEqual({ href: "/dashboard", label: "Administración" });
    expect(links[2]).toEqual({ href: "/members", label: "Miembros" });
    expect(links[3]).toEqual({ href: "/groups", label: "Grupos" });
    expect(links[4]).toEqual({ href: "/payments", label: "Membresías y Pagos" });
    expect(links[5]).toEqual({ href: "/attendance", label: "Horarios y Asistencia" });
  });

  it("returns trainer link", () => {
    const links = getNavLinksForRole("trainer");
    expect(links).toHaveLength(2);
    expect(links[0]).toEqual({ href: "/", label: "Inicio" });
    expect(links[1]).toEqual({ href: "/trainer", label: "Entrenador" });
  });

  it("returns representante link to Mi Cuenta", () => {
    const links = getNavLinksForRole("representante");
    expect(links).toHaveLength(2);
    expect(links[0]).toEqual({ href: "/", label: "Inicio" });
    expect(links[1]).toEqual({ href: "/student", label: "Mi Cuenta" });
  });

  it("returns estudiante link to Mi Cuenta", () => {
    const links = getNavLinksForRole("estudiante");
    expect(links).toHaveLength(2);
    expect(links[0]).toEqual({ href: "/", label: "Inicio" });
    expect(links[1]).toEqual({ href: "/student", label: "Mi Cuenta" });
  });

  it("every role gets Inicio as first link and at least one role-specific link", () => {
    for (const role of ALL_ROLES) {
      const links = getNavLinksForRole(role);
      expect(links.length).toBeGreaterThanOrEqual(2);
      expect(links[0].href).toBe("/");
      expect(links[0].label).toBe("Inicio");
    }
  });
});
