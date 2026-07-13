/**
 * Unit tests for MockAuthService.
 *
 * Uses global mocks for localStorage since the test environment is node.
 * Covers login success for all roles, login failure modes, session
 * persistence, and logout behaviour.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MockAuthService, DEMO_PERSONAS } from "../auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** In-memory localStorage mock. */
function createMockStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((k) => delete store[k]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((_index: number) => null),
  };
}

/** localStorage mock that throws on every operation (disabled storage). */
function createBrokenStorage(): Storage {
  const thrower = () => {
    throw new Error("localStorage is not available");
  };
  return {
    getItem: thrower,
    setItem: thrower,
    removeItem: thrower,
    clear: thrower,
    get length() {
      throw new Error("localStorage is not available");
    },
    key: thrower,
  } as unknown as Storage;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let authService: MockAuthService;

beforeEach(() => {
  const storage = createMockStorage();
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", {});
  authService = new MockAuthService();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// login — success paths
// ---------------------------------------------------------------------------

describe("login — success", () => {
  it("returns a session for admin credentials", () => {
    const session = authService.login("admin@cataclub.com", "admin123");
    expect(session).not.toBeNull();
    expect(session!.user.role).toBe("admin");
    expect(session!.user.email).toBe("admin@cataclub.com");
    expect(session!.token).toMatch(/^demo-token-user-admin-1-/);
    expect(session!.loggedInAt).toBeTruthy();
  });

  it("returns a session for trainer credentials", () => {
    const session = authService.login("entrenador@cataclub.com", "trainer123");
    expect(session).not.toBeNull();
    expect(session!.user.role).toBe("trainer");
    expect(session!.user.name).toBe("Carlos Entrenador");
  });

  it("returns a session for representative (responsable_pago) credentials", () => {
    const session = authService.login("representante@cataclub.com", "rep123");
    expect(session).not.toBeNull();
    expect(session!.user.role).toBe("responsable_pago");
    expect(session!.user.name).toBe("Carlos Martinez");
  });

  it("returns a session for self-managed student (responsable_pago) credentials", () => {
    const session = authService.login("autogestionado@cataclub.com", "self123");
    expect(session).not.toBeNull();
    expect(session!.user.role).toBe("responsable_pago");
    expect(session!.user.name).toBe("Sofia Martinez (Autogestionado)");
  });

  it("persists the session to localStorage", () => {
    authService.login("admin@cataclub.com", "admin123");
    const raw = localStorage.getItem("cata-club-auth-session");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.user.role).toBe("admin");
  });

  it("is case-insensitive for email", () => {
    const session = authService.login("ADMIN@cataclub.com", "admin123");
    expect(session).not.toBeNull();
    expect(session!.user.role).toBe("admin");
  });

  it("returns a session for every demo persona defined", () => {
    for (const persona of DEMO_PERSONAS) {
      const session = authService.login(persona.email, persona.password);
      expect(session).not.toBeNull();
      expect(session!.user.role).toBe(persona.user.role);
    }
  });
});

// ---------------------------------------------------------------------------
// login — failure paths
// ---------------------------------------------------------------------------

describe("login — failure", () => {
  it("returns null for wrong password", () => {
    const session = authService.login("admin@cataclub.com", "wrongpassword");
    expect(session).toBeNull();
  });

  it("returns null for unknown email", () => {
    const session = authService.login("unknown@cataclub.com", "admin123");
    expect(session).toBeNull();
  });

  it("returns null for empty email", () => {
    const session = authService.login("", "admin123");
    expect(session).toBeNull();
  });

  it("returns null for empty password", () => {
    const session = authService.login("admin@cataclub.com", "");
    expect(session).toBeNull();
  });

  it("returns null for both empty", () => {
    const session = authService.login("", "");
    expect(session).toBeNull();
  });

  it("does NOT persist a failed login attempt", () => {
    authService.login("admin@cataclub.com", "wrong");
    const raw = localStorage.getItem("cata-club-auth-session");
    expect(raw).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getSession
// ---------------------------------------------------------------------------

describe("getSession", () => {
  it("returns the stored session after login", () => {
    authService.login("admin@cataclub.com", "admin123");
    const session = authService.getSession();
    expect(session).not.toBeNull();
    expect(session!.user.email).toBe("admin@cataclub.com");
  });

  it("returns null when no session exists", () => {
    expect(authService.getSession()).toBeNull();
  });

  it("returns null when stored data is corrupted JSON", () => {
    localStorage.setItem("cata-club-auth-session", "not-json");
    expect(authService.getSession()).toBeNull();
  });

  it("clears corrupted data from localStorage", () => {
    localStorage.setItem("cata-club-auth-session", "not-json");
    authService.getSession();
    expect(localStorage.getItem("cata-club-auth-session")).toBeNull();
  });

  it("returns null when stored JSON is missing the user property", () => {
    localStorage.setItem(
      "cata-club-auth-session",
      JSON.stringify({ token: "abc", loggedInAt: new Date().toISOString() }),
    );
    expect(authService.getSession()).toBeNull();
  });

  it("returns null when stored JSON has an invalid role", () => {
    localStorage.setItem(
      "cata-club-auth-session",
      JSON.stringify({
        user: { id: "u1", name: "Test", email: "t@t.com", role: "superadmin" },
        token: "abc",
        loggedInAt: new Date().toISOString(),
      }),
    );
    expect(authService.getSession()).toBeNull();
  });

  it("rejects persisted session with old 'student' role (domain correction)", () => {
    localStorage.setItem(
      "cata-club-auth-session",
      JSON.stringify({
        user: { id: "u1", name: "Student", email: "student@cataclub.com", role: "student" },
        token: "old-token",
        loggedInAt: new Date().toISOString(),
      }),
    );
    expect(authService.getSession()).toBeNull();
  });

  it("rejects persisted session with old 'representative' role (domain correction)", () => {
    localStorage.setItem(
      "cata-club-auth-session",
      JSON.stringify({
        user: { id: "u1", name: "Representative", email: "rep@cataclub.com", role: "representative" },
        token: "old-token",
        loggedInAt: new Date().toISOString(),
      }),
    );
    expect(authService.getSession()).toBeNull();
  });

  it("clears localStorage when persisted session has old 'student' role", () => {
    localStorage.setItem(
      "cata-club-auth-session",
      JSON.stringify({
        user: { id: "u1", name: "Student", email: "student@cataclub.com", role: "student" },
        token: "old-token",
        loggedInAt: new Date().toISOString(),
      }),
    );
    authService.getSession();
    expect(localStorage.getItem("cata-club-auth-session")).toBeNull();
  });

  it("clears localStorage when persisted session has old 'representative' role", () => {
    localStorage.setItem(
      "cata-club-auth-session",
      JSON.stringify({
        user: { id: "u1", name: "Representative", email: "rep@cataclub.com", role: "representative" },
        token: "old-token",
        loggedInAt: new Date().toISOString(),
      }),
    );
    authService.getSession();
    expect(localStorage.getItem("cata-club-auth-session")).toBeNull();
  });

  it("returns null when stored JSON user is null", () => {
    localStorage.setItem(
      "cata-club-auth-session",
      JSON.stringify({ user: null, token: "abc", loggedInAt: new Date().toISOString() }),
    );
    expect(authService.getSession()).toBeNull();
  });

  it("returns null when stored JSON is missing the token field", () => {
    localStorage.setItem(
      "cata-club-auth-session",
      JSON.stringify({
        user: { id: "u1", name: "Test", email: "t@t.com", role: "admin" },
        loggedInAt: new Date().toISOString(),
      }),
    );
    expect(authService.getSession()).toBeNull();
  });

  it("clears localStorage when JSON shape is invalid", () => {
    localStorage.setItem(
      "cata-club-auth-session",
      JSON.stringify({ user: null, token: "abc", loggedInAt: new Date().toISOString() }),
    );
    authService.getSession();
    expect(localStorage.getItem("cata-club-auth-session")).toBeNull();
  });

  it("returns a valid session when stored data passes shape validation", () => {
    authService.login("admin@cataclub.com", "admin123");
    // Simulate a fresh instance reading the valid persisted data
    const fresh = new MockAuthService();
    const session = fresh.getSession();
    expect(session).not.toBeNull();
    expect(session!.user.role).toBe("admin");
  });
});

// ---------------------------------------------------------------------------
// isAuthenticated
// ---------------------------------------------------------------------------

describe("isAuthenticated", () => {
  it("returns true after login", () => {
    authService.login("admin@cataclub.com", "admin123");
    expect(authService.isAuthenticated()).toBe(true);
  });

  it("returns false before login", () => {
    expect(authService.isAuthenticated()).toBe(false);
  });

  it("returns false after logout", () => {
    authService.login("admin@cataclub.com", "admin123");
    authService.logout();
    expect(authService.isAuthenticated()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// logout
// ---------------------------------------------------------------------------

describe("logout", () => {
  it("clears the stored session", () => {
    authService.login("admin@cataclub.com", "admin123");
    authService.logout();
    expect(authService.getSession()).toBeNull();
  });

  it("removes the localStorage key", () => {
    authService.login("admin@cataclub.com", "admin123");
    authService.logout();
    expect(localStorage.getItem("cata-club-auth-session")).toBeNull();
  });

  it("is safe to call when no session exists", () => {
    expect(() => authService.logout()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Graceful degradation — localStorage unavailable (SSR, private browsing, etc.)
// ---------------------------------------------------------------------------

describe("localStorage unavailable", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createBrokenStorage());
    vi.stubGlobal("window", {});
    authService = new MockAuthService();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("login returns session even when localStorage.setItem throws", () => {
    const session = authService.login("admin@cataclub.com", "admin123");
    expect(session).not.toBeNull();
    expect(session!.user.role).toBe("admin");
  });

  it("getSession returns null when localStorage.getItem throws", () => {
    expect(authService.getSession()).toBeNull();
  });

  it("getSession returns null from a fresh instance after login (memory-only)", () => {
    // Login works after a successful login (memory-only, no persistence)
    authService.login("admin@cataclub.com", "admin123");
    // A new service instance should have no session (persistence failed)
    const freshService = new MockAuthService();
    expect(freshService.getSession()).toBeNull();
  });

  it("logout does not throw when localStorage.removeItem throws", () => {
    authService.login("admin@cataclub.com", "admin123");
    expect(() => authService.logout()).not.toThrow();
  });

  it("isAuthenticated returns true after login (in-memory session)", () => {
    authService.login("admin@cataclub.com", "admin123");
    expect(authService.isAuthenticated()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// SSR — localStorage is undefined
// ---------------------------------------------------------------------------

describe("SSR (localStorage undefined)", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", undefined);
    // No window stub — simulate server environment
    authService = new MockAuthService();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("login returns session without persisting", () => {
    const session = authService.login("admin@cataclub.com", "admin123");
    expect(session).not.toBeNull();
    expect(session!.user.role).toBe("admin");
  });

  it("getSession returns null without error", () => {
    expect(authService.getSession()).toBeNull();
  });

  it("logout does not throw", () => {
    expect(() => authService.logout()).not.toThrow();
  });
});
