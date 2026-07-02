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
  isSelfManaged,
  getTipoResponsableLabel,
  getNavLinksForRole,
} from "../auth-utils";
import type { UserRole } from "@/types/domain";

// ---------------------------------------------------------------------------
// canAccess
// ---------------------------------------------------------------------------

describe("canAccess", () => {
  it("allows access when role is in allowedRoles", () => {
    expect(canAccess("admin", ["admin"])).toBe(true);
    expect(canAccess("admin", ["admin", "trainer"])).toBe(true);
    expect(canAccess("trainer", ["admin", "trainer", "responsable_pago"])).toBe(true);
  });

  it("denies access when role is not in allowedRoles", () => {
    expect(canAccess("responsable_pago", ["admin"])).toBe(false);
    expect(canAccess("trainer", ["responsable_pago"])).toBe(false);
  });

  it("denies access when role is null (unauthenticated)", () => {
    expect(canAccess(null, ["admin"])).toBe(false);
    expect(canAccess(null, ["admin", "trainer", "responsable_pago"])).toBe(false);
    expect(canAccess(null, [])).toBe(false);
  });

  it("denies access when allowedRoles is empty", () => {
    expect(canAccess("admin", [])).toBe(false);
    expect(canAccess("responsable_pago", [])).toBe(false);
  });

  it("covers every role", () => {
    const allRoles: UserRole[] = ["admin", "trainer", "responsable_pago"];
    for (const role of allRoles) {
      expect(canAccess(role, allRoles)).toBe(true);
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

  it('returns "/student" for responsable_pago', () => {
    expect(getDefaultRoute("responsable_pago")).toBe("/student");
  });

  it("returns a valid path for every role", () => {
    const allRoles: UserRole[] = ["admin", "trainer", "responsable_pago"];
    for (const role of allRoles) {
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

  it('returns "Responsable de pago" for responsable_pago', () => {
    expect(getRoleLabel("responsable_pago")).toBe("Responsable de pago");
  });
});

// ---------------------------------------------------------------------------
// isSelfManaged
// ---------------------------------------------------------------------------

describe("isSelfManaged", () => {
  it("returns true for autogestionado", () => {
    expect(isSelfManaged("autogestionado")).toBe(true);
  });

  it("returns false for representante", () => {
    expect(isSelfManaged("representante")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getTipoResponsableLabel
// ---------------------------------------------------------------------------

describe("getTipoResponsableLabel", () => {
  it('returns "Representante" (domain subtype, not compound UI label)', () => {
    expect(getTipoResponsableLabel("representante")).toBe("Representante");
  });

  it('returns "Alumno autogestionado" for autogestionado', () => {
    expect(getTipoResponsableLabel("autogestionado")).toBe("Alumno autogestionado");
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

  it("returns responsable_pago link to Mi Cuenta", () => {
    const links = getNavLinksForRole("responsable_pago");
    expect(links).toHaveLength(2);
    expect(links[0]).toEqual({ href: "/", label: "Inicio" });
    expect(links[1]).toEqual({ href: "/student", label: "Mi Cuenta" });
  });

  it("every role gets Inicio as first link and at least one role-specific link", () => {
    const allRoles: UserRole[] = ["admin", "trainer", "responsable_pago"];
    for (const role of allRoles) {
      const links = getNavLinksForRole(role);
      expect(links.length).toBeGreaterThanOrEqual(2);
      expect(links[0].href).toBe("/");
      expect(links[0].label).toBe("Inicio");
    }
  });
});
