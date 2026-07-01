/**
 * Unit tests for auth state transition functions.
 *
 * These are pure function tests — no React, no browser APIs needed.
 * They validate the state contract that AuthContext depends on.
 */

import { describe, it, expect } from "vitest";
import {
  createInitialAuthState,
  hydrateState,
  applyLoginResult,
  applyLogout,
} from "../auth-state";
import type { AuthSession } from "@/services/auth";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockSession: AuthSession = {
  user: {
    id: "user-admin-1",
    name: "Admin",
    email: "admin@cataclub.com",
    role: "admin",
    createdAt: "2026-01-01T00:00:00Z",
  },
  token: "demo-token-user-admin-1-1234567890",
  loggedInAt: "2026-07-01T12:00:00Z",
};

// ---------------------------------------------------------------------------
// createInitialAuthState
// ---------------------------------------------------------------------------

describe("createInitialAuthState", () => {
  it("returns an unauthenticated loading state", () => {
    const state = createInitialAuthState();
    expect(state.session).toBeNull();
    expect(state.isLoading).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// hydrateState
// ---------------------------------------------------------------------------

describe("hydrateState", () => {
  it("sets session when saved session exists", () => {
    const state = hydrateState(mockSession);
    expect(state.session).toBe(mockSession);
    expect(state.isLoading).toBe(false);
  });

  it("keeps session null when no saved session", () => {
    const state = hydrateState(null);
    expect(state.session).toBeNull();
    expect(state.isLoading).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// applyLoginResult
// ---------------------------------------------------------------------------

describe("applyLoginResult", () => {
  it("updates session on successful login", () => {
    const initial = createInitialAuthState();
    const next = applyLoginResult(initial, mockSession);
    expect(next.session).toBe(mockSession);
    expect(next.isLoading).toBe(initial.isLoading);
  });

  it("does not change state on failed login", () => {
    const initial = createInitialAuthState();
    // Simulate a failed login after hydration (not loading anymore)
    const hydrated = hydrateState(null);
    const next = applyLoginResult(hydrated, null);
    expect(next.session).toBeNull();
    expect(next.isLoading).toBe(false);
  });

  it("preserves existing session on failed login", () => {
    const initial = hydrateState(mockSession);
    const next = applyLoginResult(initial, null);
    expect(next.session).toBe(mockSession);
    expect(next.isLoading).toBe(false);
  });

  it("replaces existing session with new login", () => {
    const newSession: AuthSession = {
      ...mockSession,
      user: { ...mockSession.user, id: "user-trainer-1", role: "trainer" },
      token: "demo-token-user-trainer-1-9999999999",
    };
    const initial = hydrateState(mockSession);
    const next = applyLoginResult(initial, newSession);
    expect(next.session).toBe(newSession);
    expect(next.session!.user.role).toBe("trainer");
    expect(next.isLoading).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// applyLogout
// ---------------------------------------------------------------------------

describe("applyLogout", () => {
  it("clears session when authenticated", () => {
    const initial = hydrateState(mockSession);
    const next = applyLogout(initial);
    expect(next.session).toBeNull();
    expect(next.isLoading).toBe(false);
  });

  it("is a no-op on session when already null", () => {
    const initial = hydrateState(null);
    const next = applyLogout(initial);
    expect(next.session).toBeNull();
    expect(next.isLoading).toBe(false);
  });
});
