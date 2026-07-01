/**
 * Mock Authentication Service
 *
 * Client-side only authentication for demo purposes. Provides typed sessions,
 * predefined demo personas for each role, and localStorage persistence.
 *
 * ⚠️ Limitations (documented):
 *  - Credentials are hardcoded — NOT a real auth system.
 *  - Session is stored in localStorage (vulnerable to XSS).
 *  - No token refresh, no password hashing, no CSRF protection.
 *  - Must be replaced with a real backend auth flow for production.
 *
 * Environment: browser only (checks for localStorage availability).
 */

import type { UserRole, Usuario } from "@/types/domain";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** An authenticated session — returned after successful login. */
export interface AuthSession {
  /** The authenticated user profile. */
  user: Usuario;
  /** A fake bearer token for demo API calls. */
  token: string;
  /** ISO timestamp of the login event. */
  loggedInAt: string;
}

// ---------------------------------------------------------------------------
// Runtime type guard — protects consumers from corrupted localStorage data
// ---------------------------------------------------------------------------

const VALID_ROLES: readonly UserRole[] = [
  "admin",
  "trainer",
  "responsable_pago",
] as const;

/**
 * Runtime validation that an unknown value is a well-shaped AuthSession.
 *
 * Catches cases where localStorage contains valid JSON but with the wrong
 * shape (e.g. `{ "token": "x" }` or a stale schema) that would otherwise
 * crash consumers reading `session.user.role`.
 *
 * @returns true when every required field exists with the correct type.
 */
export function isValidAuthSession(data: unknown): data is AuthSession {
  if (data === null || typeof data !== "object") return false;

  const candidate = data as Record<string, unknown>;

  // --- user block ---
  const user = candidate.user;
  if (user === null || typeof user !== "object") return false;

  const u = user as Record<string, unknown>;
  if (typeof u.id !== "string" || u.id.length === 0) return false;
  if (typeof u.name !== "string" || u.name.length === 0) return false;
  if (typeof u.email !== "string" || u.email.length === 0) return false;
  if (!VALID_ROLES.includes(u.role as UserRole)) return false;

  // --- top-level fields ---
  if (typeof candidate.token !== "string" || candidate.token.length === 0)
    return false;
  if (typeof candidate.loggedInAt !== "string")
    return false;

  return true;
}

/** A predefined demo persona with known credentials. */
export interface DemoPersona {
  email: string;
  password: string;
  user: Usuario;
}

// ---------------------------------------------------------------------------
// Safe storage wrapper — degrades gracefully when localStorage is unavailable
// (private browsing, disabled storage, SSR, quota exceeded, etc.)
// ---------------------------------------------------------------------------

const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof localStorage === "undefined") return null;
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(key, value);
      }
    } catch {
      // Storage unavailable — silently degrade to memory-only
    }
  },
  removeItem(key: string): void {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(key);
      }
    } catch {
      // Storage unavailable — silently degrade
    }
  },
};

// ---------------------------------------------------------------------------
// Demo personas
// ---------------------------------------------------------------------------

/**
 * Predefined demo accounts. Each persona has a hardcoded email and password
 * that are safe to commit (demo-only, no real secrets).
 *
 * These are the ONLY credentials the mock auth service accepts.
 *
 * Domain model (2026-07 correction):
 *  - `"responsable_pago"` replaces the old `"student"` and `"representative"`
 *    roles. An account owner may be an external representative (managing
 *    multiple students) or a self-managed adult student.
 *  - See DEMO_PERSONAS below for examples of both subtypes.
 */
export const DEMO_PERSONAS: DemoPersona[] = [
  {
    email: "admin@cataclub.com",
    password: "admin123",
    user: {
      id: "user-admin-1",
      name: "Admin Cata Club",
      email: "admin@cataclub.com",
      role: "admin",
      createdAt: "2026-01-01T00:00:00Z",
    },
  },
  {
    email: "entrenador@cataclub.com",
    password: "trainer123",
    user: {
      id: "user-trainer-1",
      name: "Carlos Entrenador",
      email: "entrenador@cataclub.com",
      role: "trainer",
      createdAt: "2026-01-15T00:00:00Z",
    },
  },
  {
    email: "representante@cataclub.com",
    password: "rep123",
    user: {
      id: "user-rep-1",
      name: "Carlos Martinez",
      email: "representante@cataclub.com",
      role: "responsable_pago",
      createdAt: "2026-02-01T00:00:00Z",
    },
  },
  {
    email: "autogestionado@cataclub.com",
    password: "self123",
    user: {
      id: "user-self-1",
      name: "Sofia Martinez (Autogestionado)",
      email: "autogestionado@cataclub.com",
      role: "responsable_pago",
      createdAt: "2026-02-01T00:00:00Z",
    },
  },
];

// ---------------------------------------------------------------------------
// Storage key — shared with AuthContext
// ---------------------------------------------------------------------------

const SESSION_KEY = "cata-club-auth-session";

// ---------------------------------------------------------------------------
// MockAuthService
// ---------------------------------------------------------------------------

export class MockAuthService {
  /**
   * In-memory session — always tracks current session for the page lifecycle.
   * localStorage is used for cross-reload persistence, but the in-memory
   * value provides a reliable fallback when storage is unavailable.
   */
  private _currentSession: AuthSession | null = null;

  /**
   * Authenticate against demo personas.
   *
   * Always stores the session in memory. Best-effort persists to localStorage
   * so the session survives page reloads.
   *
   * @param email — The user's email (case-insensitive).
   * @param password — The user's password.
   * @returns An AuthSession on success, or null on invalid credentials.
   */
  login(email: string, password: string): AuthSession | null {
    const persona = DEMO_PERSONAS.find(
      (p) => p.email.toLowerCase() === email.toLowerCase() && p.password === password,
    );
    if (!persona) return null;

    const session: AuthSession = {
      user: { ...persona.user },
      token: `demo-token-${persona.user.id}-${Date.now()}`,
      loggedInAt: new Date().toISOString(),
    };

    this._currentSession = session;
    safeStorage.setItem(SESSION_KEY, JSON.stringify(session));

    return session;
  }

  /**
   * End the current session and clear stored data.
   */
  logout(): void {
    this._currentSession = null;
    safeStorage.removeItem(SESSION_KEY);
  }

  /**
   * Retrieve the current session.
   *
   * Returns the in-memory session if set (same page lifecycle), otherwise
   * attempts to hydrate from localStorage (cross-reload persistence).
   * Gracefully degrades when localStorage is unavailable.
   *
   * @returns The current AuthSession, or null if none exists / is corrupted.
   */
  getSession(): AuthSession | null {
    if (this._currentSession) return this._currentSession;

    const raw = safeStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!isValidAuthSession(parsed)) {
        // Valid JSON with invalid shape — treat as corrupted
        safeStorage.removeItem(SESSION_KEY);
        return null;
      }
      this._currentSession = parsed;
      return parsed;
    } catch {
      // Invalid JSON — clean it up
      safeStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  /**
   * Quick check for an active session.
   */
  isAuthenticated(): boolean {
    return this._currentSession !== null || this.getSession() !== null;
  }
}

/** Singleton instance for the client application. */
export const authService = new MockAuthService();
