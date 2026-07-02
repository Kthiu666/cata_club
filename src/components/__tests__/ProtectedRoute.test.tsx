/**
 * Component tests for ProtectedRoute.
 *
 * Covers all four states: loading, unauthenticated, wrong role, and authorized.
 * Uses mocked next/navigation and AuthContext to avoid coupling to the full
 * provider tree.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ProtectedRoute from "@/components/ProtectedRoute";

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
} from "./test-utils";

const mockUseAuth = vi.mocked(useAuth);

const CONTENT = <p>Protected content</p>;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ProtectedRoute", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockUseAuth.mockReset();
    // Default: admin authenticated
    mockUseAuth.mockReturnValue(createAuthenticatedAuth("admin"));
  });

  // --- Loading state ---

  it("shows loading skeleton while session is hydrating", () => {
    mockUseAuth.mockReturnValue(createLoadingAuth());

    render(
      <ProtectedRoute allowedRoles={["admin"]}>{CONTENT}</ProtectedRoute>,
    );

    expect(screen.getByText("Cargando sesión...")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  // --- Unauthenticated ---

  it("redirects unauthenticated users to the default /login", () => {
    mockUseAuth.mockReturnValue(createUnauthenticatedAuth(false));

    render(
      <ProtectedRoute allowedRoles={["admin"]}>{CONTENT}</ProtectedRoute>,
    );

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/login");
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("redirects unauthenticated users to a custom redirectTo", () => {
    mockUseAuth.mockReturnValue(createUnauthenticatedAuth(false));

    render(
      <ProtectedRoute
        allowedRoles={["admin"]}
        redirectTo="/custom-login"
      >
        {CONTENT}
      </ProtectedRoute>,
    );

    expect(mockReplace).toHaveBeenCalledWith("/custom-login");
  });

  // --- Wrong role ---

  it("redirects users with an insufficient role to their default route", () => {
    mockUseAuth.mockReturnValue(createAuthenticatedAuth("trainer"));

    render(
      <ProtectedRoute allowedRoles={["admin"]}>{CONTENT}</ProtectedRoute>,
    );

    expect(mockReplace).toHaveBeenCalledWith("/trainer");
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("redirects responsable_pago to /student when page requires admin", () => {
    mockUseAuth.mockReturnValue(
      createAuthenticatedAuth("responsable_pago"),
    );

    render(
      <ProtectedRoute allowedRoles={["admin"]}>{CONTENT}</ProtectedRoute>,
    );

    expect(mockReplace).toHaveBeenCalledWith("/student");
  });

  // --- Authorized ---

  it("renders children when the user has an allowed role", () => {
    render(
      <ProtectedRoute allowedRoles={["admin"]}>{CONTENT}</ProtectedRoute>,
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("accepts multiple allowed roles and renders for any match", () => {
    mockUseAuth.mockReturnValue(createAuthenticatedAuth("trainer"));

    render(
      <ProtectedRoute allowedRoles={["admin", "trainer"]}>
        {CONTENT}
      </ProtectedRoute>,
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("renders nothing while in redirect transition for unauthenticated users", () => {
    mockUseAuth.mockReturnValue(createUnauthenticatedAuth(false));

    const { container } = render(
      <ProtectedRoute allowedRoles={["admin"]}>{CONTENT}</ProtectedRoute>,
    );

    // Component returns null — container should be empty
    expect(container.textContent).toBe("");
  });

  it("renders nothing while in redirect transition for wrong-role users", () => {
    mockUseAuth.mockReturnValue(createAuthenticatedAuth("trainer"));

    const { container } = render(
      <ProtectedRoute allowedRoles={["admin"]}>{CONTENT}</ProtectedRoute>,
    );

    expect(container.textContent).toBe("");
  });

  // --- Boundary: empty allowed roles ---

  it("redirects when allowedRoles is empty even for an authorized role", () => {
    mockUseAuth.mockReturnValue(createAuthenticatedAuth("admin"));

    render(
      <ProtectedRoute allowedRoles={[]}>{CONTENT}</ProtectedRoute>,
    );

    // canAccess("admin", []) returns false → redirect to admin default
    expect(mockReplace).toHaveBeenCalledWith("/dashboard");
  });
});
