/**
 * AuthContext — React context for session state.
 *
 * Hydrates from localStorage on mount and exposes login/logout actions.
 * Must be wrapped in a client component boundary (already done in layout.tsx).
 */

"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { AuthSession } from "@/services/auth";
import { authService } from "@/services/auth";
import { hydrateState } from "@/lib/auth-state";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthContextValue {
  /** The current session, or null when not authenticated. */
  session: AuthSession | null;
  /** Convenience flag — true when session is non-null. */
  isAuthenticated: boolean;
  /** True while hydrating the session from localStorage on first mount. */
  isLoading: boolean;
  /**
   * Attempt login with email + password against demo personas.
   * @returns The session on success, null on failure.
   */
  login: (email: string, password: string) => AuthSession | null;
  /** Clear the current session. */
  logout: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate session from localStorage on mount
  useEffect(() => {
    const saved = authService.getSession();
    const { session: hydratedSession, isLoading: done } = hydrateState(saved);
    if (hydratedSession) setSession(hydratedSession);
    setIsLoading(done);
  }, []);

  const login = useCallback(
    (email: string, password: string): AuthSession | null => {
      const result = authService.login(email, password);
      if (result) setSession(result);
      return result;
    },
    [],
  );

  const logout = useCallback(() => {
    authService.logout();
    setSession(null);
  }, []);

  const value: AuthContextValue = {
    session,
    isAuthenticated: session !== null,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Access the current auth context. Must be called within an AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
