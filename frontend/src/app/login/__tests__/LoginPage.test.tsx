/**
 * Component tests for LoginPage.
 *
 * Covers the redirect-in-progress state for an already-authenticated user:
 * the form must never paint (not even for one frame) while the redirect
 * effect is pending — see issue #31.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import LoginPage from "@/app/login/page";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockReplace = vi.fn();
const mockRouter = { replace: mockReplace };

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { useAuth } from "@/contexts/AuthContext";
import {
  createUnauthenticatedAuth,
  createAuthenticatedAuth,
  createLoadingAuth,
} from "@/components/__tests__/test-utils";

const mockUseAuth = vi.mocked(useAuth);

describe("LoginPage", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockUseAuth.mockReset();
  });

  it("shows the loading state, never the form, while session is hydrating", () => {
    mockUseAuth.mockReturnValue(createLoadingAuth());

    render(<LoginPage />);

    expect(screen.getByText("Cargando sesión...")).toBeInTheDocument();
    expect(screen.queryByLabelText("Correo electrónico")).not.toBeInTheDocument();
  });

  it("shows the loading state, not the form, once hydration resolves to an authenticated session (redirect in flight)", () => {
    mockUseAuth.mockReturnValue(createAuthenticatedAuth("admin"));

    render(<LoginPage />);

    expect(screen.getByText("Cargando sesión...")).toBeInTheDocument();
    expect(screen.queryByLabelText("Correo electrónico")).not.toBeInTheDocument();
    expect(mockReplace).toHaveBeenCalledWith("/dashboard");
  });

  it("renders the login form once hydration confirms there is no session", () => {
    mockUseAuth.mockReturnValue(createUnauthenticatedAuth(false));

    render(<LoginPage />);

    expect(screen.getByLabelText("Correo electrónico")).toBeInTheDocument();
    expect(screen.queryByText("Cargando sesión...")).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
