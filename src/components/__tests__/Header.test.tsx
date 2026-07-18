/**
 * Component tests for Header.
 *
 * Covers loading, unauthenticated, and authenticated states for every user
 * role. Validates nav link visibility, active-link highlighting, and the
 * mobile menu toggle.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Header from "@/components/Header";

interface MockLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children: React.ReactNode;
  href: string;
}

interface MockImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fill?: boolean;
  priority?: boolean;
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPathname = vi.fn<() => string>();

vi.mock("next/navigation", (): { usePathname: () => string } => ({
  usePathname: (): string => mockPathname(),
}));

vi.mock("next/link", (): { __esModule: boolean; default: (props: MockLinkProps) => React.ReactElement } => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...props
  }: MockLinkProps): React.ReactElement => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", (): { __esModule: boolean; default: (props: MockImageProps) => React.ReactElement } => ({
  __esModule: true,
  default: (props: MockImageProps): React.ReactElement => {
    // Strip Next.js-specific props, keep standard img attrs
    const { fill, priority, sizes, ...rest } = props;
    void fill;
    void priority;
    void sizes;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt="" {...rest} />;
  },
}));

vi.mock("@/contexts/AuthContext", (): { useAuth: typeof useAuth } => ({
  useAuth: vi.fn<typeof useAuth>(),
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Header", (): void => {
  beforeEach((): void => {
    mockPathname.mockReturnValue("/dashboard");
    mockUseAuth.mockReset();
    // Default: not loading, not authenticated
    mockUseAuth.mockReturnValue(createUnauthenticatedAuth(false));
  });

  it("hides the header on the landing route when requested", (): void => {
    mockPathname.mockReturnValue("/");
    render(<Header hideOnLanding />);

    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
  });

  it("shows the header on a non-landing route when landing hiding is requested", (): void => {
    mockPathname.mockReturnValue("/dashboard");

    render(<Header hideOnLanding />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  // --- Auth shell routes (login, register, forgot-password) ---

  it.each(["/login", "/register", "/forgot-password"])(
    "hides the header on the %s auth-shell route",
    (route): void => {
      mockPathname.mockReturnValue(route);

      render(<Header />);

      expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    },
  );

  // --- Loading skeleton ---

  it("shows skeleton while session is hydrating", (): void => {
    mockUseAuth.mockReturnValue(createLoadingAuth());

    render(<Header />);

    // Brand visible but as plain text, not a link
    expect(screen.getByText("Cata Club")).toBeInTheDocument();
    expect(screen.getByText("Demo")).toBeInTheDocument();

    // No nav links rendered
    expect(screen.queryByRole("link", { name: /Inicio/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Iniciar Sesi\u00f3n/i })).not.toBeInTheDocument();
  });

  // --- Institutional Header (landing page) ---

  it("shows institutional links on landing page", () => {
    mockPathname.mockReturnValue("/");
    render(<Header />);

    // Brand shows "Cata Club" + "Tenis de Mesa"
    expect(screen.getByText("Cata Club")).toBeInTheDocument();
    expect(screen.getByText("Tenis de Mesa")).toBeInTheDocument();

    // Institutional navigation
    expect(screen.getByRole("link", { name: /Inicio/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Nosotros/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Formaci\u00f3n/i })).toBeInTheDocument();

    // Login button for unauthenticated users
    expect(
      screen.getByRole("link", { name: /Iniciar sesi\u00f3n/i }),
    ).toBeInTheDocument();

    // No app-specific elements
    expect(screen.queryByText("Demo")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Cerrar Sesi\u00f3n/i })).not.toBeInTheDocument();
  });

  it("shows institutional mobile menu on landing", () => {
    mockPathname.mockReturnValue("/");
    render(<Header />);

    fireEvent.click(screen.getByRole("button", { name: /Abrir men\u00fa/i }));

    // Mobile menu has institutional links
    expect(screen.getAllByRole("link", { name: /Inicio/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /Iniciar sesi\u00f3n/i }).length).toBeGreaterThan(0);
  });

  // --- Unauthenticated ---

  it("shows Inicio and Iniciar Sesión when not authenticated", (): void => {
    render(<Header />);

    expect(screen.getByRole("link", { name: /Inicio/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Iniciar Sesión/i }),
    ).toBeInTheDocument();

    // Authenticated-only elements are absent
    expect(screen.queryByText("Administración")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Cerrar Sesión/i })).not.toBeInTheDocument();
  });

  // --- Authenticated — admin ---

  it("shows admin nav links, user name, and logout button", (): void => {
    mockUseAuth.mockReturnValue(
      createAuthenticatedAuth("admin", "Admin Cata Club"),
    );

    render(<Header />);

    // Admin-specific links
    expect(screen.getByRole("link", { name: /Inicio/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Administración/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Miembros/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Grupos/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Membresías/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Horarios/i }),
    ).toBeInTheDocument();

    // User info
    expect(screen.getByText("Admin Cata Club")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Cerrar Sesión/i }),
    ).toBeInTheDocument();
  });

  // --- Authenticated — trainer ---

  it("shows trainer nav links", (): void => {
    mockUseAuth.mockReturnValue(
      createAuthenticatedAuth("trainer", "Carlos Entrenador"),
    );

    render(<Header />);

    // Trainer gets Inicio + Entrenador
    expect(screen.getByRole("link", { name: /Inicio/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Entrenador/i }),
    ).toBeInTheDocument();

    // Other roles not visible
    expect(
      screen.queryByText("Administración"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Mi Cuenta")).not.toBeInTheDocument();

    // User info
    expect(screen.getByText("Carlos Entrenador")).toBeInTheDocument();
  });

  // --- Authenticated — representante ---

  it("shows representante nav link", (): void => {
    mockUseAuth.mockReturnValue(
      createAuthenticatedAuth("representante", "Carlos Martinez"),
    );

    render(<Header />);

    expect(screen.getByRole("link", { name: /Inicio/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Mi Cuenta/i }),
    ).toBeInTheDocument();

    // Other roles not visible
    expect(
      screen.queryByText("Administración"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Entrenador")).not.toBeInTheDocument();

    expect(screen.getByText("Carlos Martinez")).toBeInTheDocument();
  });

  // --- Active link highlighting ---

  it("marks the active link with aria-current=\"page\"", (): void => {
    mockPathname.mockReturnValue("/members");
    mockUseAuth.mockReturnValue(
      createAuthenticatedAuth("admin", "Admin"),
    );

    render(<Header />);

    const membersLink = screen.getByRole("link", { name: /Miembros/i });
    expect(membersLink).toHaveAttribute("aria-current", "page");
  });

  it("does not apply aria-current to non-current route links", (): void => {
    mockPathname.mockReturnValue("/members");
    mockUseAuth.mockReturnValue(
      createAuthenticatedAuth("admin", "Admin"),
    );

    render(<Header />);

    const inicioLink = screen.getByRole("link", { name: /Inicio/i });
    expect(inicioLink).not.toHaveAttribute("aria-current");
  });

  // --- Mobile menu ---

  it("toggles mobile menu open and closed", (): void => {
    render(<Header />);

    const menuButton = screen.getByRole("button", { name: /Abrir menú/i });
    expect(menuButton).toBeInTheDocument();
    expect(menuButton).toHaveAttribute("aria-expanded", "false");

    // Mobile menu is closed initially — nav not visible on mobile
    // (the desktop nav is rendered but hidden via CSS, the mobile panel is not rendered)
    expect(screen.queryByText("Cerrar Sesión")).not.toBeInTheDocument();

    // Open mobile menu
    fireEvent.click(menuButton);

    // Now the mobile menu button label changes to "Cerrar menú"
    expect(screen.queryByRole("button", { name: /Abrir menú/i })).not.toBeInTheDocument();
    const closeMenuButton = screen.getByRole("button", { name: /Cerrar menú/i });
    expect(closeMenuButton).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(closeMenuButton);

    expect(screen.getByRole("button", { name: /Abrir menú/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("renders mobile nav panel with admin links when authenticated", (): void => {
    mockUseAuth.mockReturnValue(
      createAuthenticatedAuth("admin", "Admin"),
    );

    render(<Header />);

    // Open mobile menu
    fireEvent.click(screen.getByRole("button", { name: /Abrir menú/i }));

    // Logout button should appear in mobile panel
    const logoutButtons = screen.getAllByRole("button", { name: /Cerrar Sesión/i });
    // At least one is visible (mobile logout)
    expect(logoutButtons.length).toBeGreaterThan(0);

    // User name visible
    expect(screen.getAllByText("Admin").length).toBeGreaterThan(0);
  });

  // --- Logout ---

  it("calls logout when desktop logout button is clicked", (): void => {
    const mockLogout = vi.fn();
    mockUseAuth.mockReturnValue(
      createAuthenticatedAuth("admin", "Admin", { logout: mockLogout }),
    );

    render(<Header />);

    const logoutBtn = screen.getByRole("button", { name: /Cerrar Sesión/i });
    fireEvent.click(logoutBtn);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("calls logout when mobile logout button is clicked", (): void => {
    const mockLogout = vi.fn();
    mockUseAuth.mockReturnValue(
      createAuthenticatedAuth("admin", "Admin", { logout: mockLogout }),
    );

    render(<Header />);

    // Open mobile menu
    fireEvent.click(screen.getByRole("button", { name: /Abrir menú/i }));

    // Click the mobile logout button (there are two: desktop and mobile)
    const logoutButtons = screen.getAllByRole("button", { name: /Cerrar Sesión/i });
    // The last button in DOM is the mobile one
    fireEvent.click(logoutButtons[logoutButtons.length - 1]);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
