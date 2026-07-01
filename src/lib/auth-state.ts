/**
 * Auth state management — pure functions for session state transitions.
 *
 * These functions model the state contract that AuthContext depends on,
 * extracted so they can be unit-tested without React or browser APIs.
 *
 * AuthContext uses these internally; any change to the state contract
 * must update both the context implementation and these functions.
 */

import type { AuthSession } from "@/services/auth";

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export interface AuthState {
  /** The current session, or null when not authenticated. */
  session: AuthSession | null;
  /** True while hydrating session from storage on first mount. */
  isLoading: boolean;
}

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

/**
 * Initial state before hydration.
 */
export function createInitialAuthState(): AuthState {
  return { session: null, isLoading: true };
}

/**
 * Transition: hydrate session from persisted storage on mount.
 *
 * After calling authService.getSession(), apply the result to produce
 * the resolved state (always sets isLoading to false).
 */
export function hydrateState(savedSession: AuthSession | null): AuthState {
  return { session: savedSession, isLoading: false };
}

/**
 * Transition: apply a successful login.
 *
 * Returns the state unchanged when login fails (result is null).
 * This is a pure function — it does not call authService itself.
 */
export function applyLoginResult(
  current: AuthState,
  result: AuthSession | null,
): AuthState {
  if (!result) return current;
  return { ...current, session: result };
}

/**
 * Transition: clear the session on logout.
 */
export function applyLogout(current: AuthState): AuthState {
  return { ...current, session: null };
}
