/**
 * Shared test utilities for component tests.
 *
 * Provides typed mock session factories and reusable test doubles so each
 * test file can focus on scenario logic rather than boilerplate.
 */

import type { AuthSession } from "@/services/auth";
import type { UserRole } from "@/types/domain";
import type { AuthContextValue } from "@/contexts/AuthContext";
import { vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock session factories
// ---------------------------------------------------------------------------

/**
 * Build a lightweight AuthSession suitable for component tests.
 * All fields are populated with sensible defaults — override as needed.
 */
export function createMockSession(
  overrides?: Partial<AuthSession>,
): AuthSession {
  return {
    user: {
      id: "user-test-1",
      name: "Test User",
      email: "test@cataclub.com",
      role: "admin",
      createdAt: "2026-01-01T00:00:00Z",
    },
    token: "demo-token-test-1234567890",
    loggedInAt: "2026-07-01T12:00:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// AuthContext mock values
// ---------------------------------------------------------------------------

/**
 * Build an AuthContextValue for the unauthenticated / loading state.
 */
export function createUnauthenticatedAuth(
  isLoading = false,
): AuthContextValue {
  return {
    session: null,
    isAuthenticated: false,
    isLoading,
    login: vi.fn(),
    logout: vi.fn(),
  };
}

/**
 * Build an AuthContextValue for an authenticated user with the given role.
 */
export function createAuthenticatedAuth(
  role: UserRole = "admin",
  name = "Test User",
  overrides?: Partial<AuthContextValue>,
): AuthContextValue {
  const session = createMockSession({
    user: {
      id: `user-${role}-1`,
      name,
      email: `${role}@cataclub.com`,
      role,
      createdAt: "2026-01-01T00:00:00Z",
    },
  });

  return {
    session,
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  };
}

/**
 * Build an AuthContextValue for the loading / hydrating state.
 */
export function createLoadingAuth(): AuthContextValue {
  return {
    session: null,
    isAuthenticated: false,
    isLoading: true,
    login: vi.fn(),
    logout: vi.fn(),
  };
}
