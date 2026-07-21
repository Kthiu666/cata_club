/**
 * Component tests for AppShell.
 *
 * Covers role-derived nav rendering, the mobile sidebar toggle, and the
 * command palette (open/close, filtering, Enter-to-navigate) — the new
 * interactive behavior introduced by this component.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AppShell from "@/components/shell/AppShell";

interface MockLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children: React.ReactNode;
  href: string;
}

interface MockImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fill?: boolean;
  priority?: boolean;
}

// jsdom in this environment doesn't ship a working `localStorage` (Node's
// experimental global shadows it — see `enrollment-session.test.ts`'s
// pre-existing failure). Stub a real in-memory implementation so the
// collapse-persistence tests exercise the actual get/set contract instead
// of skipping storage assertions altogether.
function createMemoryStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string): string | null => (key in store ? store[key] : null),
    setItem: (key: string, value: string): void => {
      store[key] = String(value);
    },
    removeItem: (key: string): void => {
      delete store[key];
    },
    clear: (): void => {
      store = {};
    },
    key: (index: number): string | null => Object.keys(store)[index] ?? null,
    get length(): number {
      return Object.keys(store).length;
    },
  } as Storage;
}

const mockPush = vi.fn();

vi.mock("next/navigation", (): { usePathname: () => string; useRouter: () => { push: typeof mockPush } } => ({
  usePathname: (): string => "/dashboard",
  useRouter: (): { push: typeof mockPush } => ({ push: mockPush }),
}));

vi.mock("next/link", (): { __esModule: boolean; default: (props: MockLinkProps) => React.ReactElement } => ({
  __esModule: true,
  default: ({ children, href, ...props }: MockLinkProps): React.ReactElement => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", (): { __esModule: boolean; default: (props: MockImageProps) => React.ReactElement } => ({
  __esModule: true,
  default: (props: MockImageProps): React.ReactElement => {
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

// useNotificaciones (rendered via NotificationBell in the topbar) fetches on
// mount — stub it out so AppShell's tests don't depend on network/timer
// behavior unrelated to shell/nav rendering.
const mockFetchNotificaciones = vi.fn().mockResolvedValue([]);
const mockMarcarNotificacionLeida = vi.fn().mockResolvedValue(undefined);
vi.mock("@/services/api", () => ({
  fetchNotificaciones: () => mockFetchNotificaciones(),
  marcarNotificacionLeida: (id: number) => mockMarcarNotificacionLeida(id),
}));

import { useAuth } from "@/contexts/AuthContext";
import { createAuthenticatedAuth } from "@/components/__tests__/test-utils";

const mockUseAuth = vi.mocked(useAuth);

describe("AppShell", (): void => {
  beforeEach((): void => {
    mockPush.mockReset();
    mockUseAuth.mockReset();
    mockUseAuth.mockReturnValue(createAuthenticatedAuth("admin", "Admin Cata Club"));
    mockFetchNotificaciones.mockClear();
    mockFetchNotificaciones.mockResolvedValue([]);
    mockMarcarNotificacionLeida.mockClear();
    mockMarcarNotificacionLeida.mockResolvedValue(undefined);
    vi.stubGlobal("localStorage", createMemoryStorage());
  });

  it("renders the title, subtitle, and eyebrow", (): void => {
    render(
      <AppShell title="Dashboard" subtitle="Resumen diario" eyebrow="Área administrativa">
        <p>contenido</p>
      </AppShell>,
    );

    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Resumen diario")).toBeInTheDocument();
    expect(screen.getByText("Área administrativa")).toBeInTheDocument();
  });

  it("renders page content as children", (): void => {
    render(
      <AppShell title="Dashboard">
        <p>contenido de la página</p>
      </AppShell>,
    );

    expect(screen.getByText("contenido de la página")).toBeInTheDocument();
  });

  it("derives nav links from the admin role and excludes Inicio", (): void => {
    render(<AppShell title="Dashboard">{null}</AppShell>);

    expect(screen.getByRole("link", { name: /Miembros/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Grupos/i })).toBeInTheDocument();
    // "Inicio" is represented by the brand logo link, not a separate nav row.
    expect(screen.queryByRole("link", { name: /^Inicio$/i })).not.toBeInTheDocument();
  });

  it("shows only trainer links for the trainer role", (): void => {
    mockUseAuth.mockReturnValue(createAuthenticatedAuth("trainer", "Carlos Entrenador"));

    render(<AppShell title="Panel">{null}</AppShell>);

    expect(screen.getByRole("link", { name: /Entrenador/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Miembros/i })).not.toBeInTheDocument();
  });

  it("shows the signed-in user's name, role label, and initials", (): void => {
    render(<AppShell title="Dashboard">{null}</AppShell>);

    expect(screen.getByText("Admin Cata Club")).toBeInTheDocument();
    expect(screen.getByText("Administrador")).toBeInTheDocument();
    expect(screen.getByText("AC")).toBeInTheDocument();
  });

  // --- Notification bell ---

  it("renders the notification bell in the topbar when a session is present", (): void => {
    render(<AppShell title="Dashboard">{null}</AppShell>);

    expect(screen.getByRole("button", { name: /notificaciones/i })).toBeInTheDocument();
  });

  it("calls logout when the sidebar logout button is clicked", (): void => {
    const mockLogout = vi.fn();
    mockUseAuth.mockReturnValue(createAuthenticatedAuth("admin", "Admin", { logout: mockLogout }));

    render(<AppShell title="Dashboard">{null}</AppShell>);

    fireEvent.click(screen.getByRole("button", { name: /Cerrar Sesión/i }));

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("opens and closes the mobile sidebar", (): void => {
    render(<AppShell title="Dashboard">{null}</AppShell>);

    fireEvent.click(screen.getByRole("button", { name: /Abrir menú/i }));
    fireEvent.click(screen.getByRole("button", { name: /Cerrar menú/i }));
    // No assertion needed beyond "didn't throw" — the sidebar's open state
    // only affects a translate-x CSS class, not conditional rendering.
    expect(screen.getByRole("button", { name: /Abrir menú/i })).toBeInTheDocument();
  });

  // --- Command palette ---

  it("opens the command palette from the search trigger button", (): void => {
    render(<AppShell title="Dashboard">{null}</AppShell>);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Buscar una sección/i }));

    expect(screen.getByRole("dialog", { name: /Buscador de secciones/i })).toBeInTheDocument();
  });

  it("opens the command palette with Ctrl+K", (): void => {
    render(<AppShell title="Dashboard">{null}</AppShell>);

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes the command palette with Escape", (): void => {
    render(<AppShell title="Dashboard">{null}</AppShell>);

    fireEvent.click(screen.getByRole("button", { name: /Buscar una sección/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("filters palette results by the typed query", (): void => {
    render(<AppShell title="Dashboard">{null}</AppShell>);

    fireEvent.click(screen.getByRole("button", { name: /Buscar una sección/i }));
    const input = screen.getByPlaceholderText("Ir a una sección…");

    fireEvent.change(input, { target: { value: "pagos" } });

    expect(screen.getByRole("button", { name: /Membresías y Pagos/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Grupos$/i })).not.toBeInTheDocument();
  });

  it("shows an empty-results message when nothing matches", (): void => {
    render(<AppShell title="Dashboard">{null}</AppShell>);

    fireEvent.click(screen.getByRole("button", { name: /Buscar una sección/i }));
    fireEvent.change(screen.getByPlaceholderText("Ir a una sección…"), {
      target: { value: "zzz-no-existe" },
    });

    expect(screen.getByText(/No se encontraron secciones/i)).toBeInTheDocument();
  });

  it("navigates and closes the palette when a result is clicked", (): void => {
    render(<AppShell title="Dashboard">{null}</AppShell>);

    fireEvent.click(screen.getByRole("button", { name: /Buscar una sección/i }));
    fireEvent.click(screen.getByRole("button", { name: /Grupos/i }));

    expect(mockPush).toHaveBeenCalledWith("/groups");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("navigates to the highlighted result on Enter", (): void => {
    render(<AppShell title="Dashboard">{null}</AppShell>);

    fireEvent.click(screen.getByRole("button", { name: /Buscar una sección/i }));
    const input = screen.getByPlaceholderText("Ir a una sección…");
    fireEvent.change(input, { target: { value: "asistencia" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockPush).toHaveBeenCalledWith("/attendance");
  });

  // --- Desktop sidebar collapse ---

  it("collapses the sidebar: compact aside width, hidden nav labels, icon tooltips", (): void => {
    const { container } = render(<AppShell title="Dashboard">{null}</AppShell>);

    fireEvent.click(screen.getByRole("button", { name: /Colapsar menú/i }));

    expect(container.querySelector("aside")).toHaveClass("lg:w-[76px]");
    const groupsLink = screen.getByRole("link", { name: /Grupos/i });
    expect(groupsLink).toHaveAttribute("title", "Grupos");
    expect(groupsLink.querySelector("span")).toHaveClass("lg:hidden");
    expect(screen.getByRole("button", { name: /Expandir menú/i })).toBeInTheDocument();
  });

  it("initializes as collapsed when localStorage has a persisted collapsed flag", (): void => {
    localStorage.setItem("cata_sidebar_collapsed", "true");

    const { container } = render(<AppShell title="Dashboard">{null}</AppShell>);

    expect(screen.getByRole("button", { name: /Expandir menú/i })).toBeInTheDocument();
    expect(container.querySelector("aside")).toHaveClass("lg:w-[76px]");
  });

  it("persists the collapsed flag to localStorage when toggled", (): void => {
    render(<AppShell title="Dashboard">{null}</AppShell>);

    fireEvent.click(screen.getByRole("button", { name: /Colapsar menú/i }));
    expect(localStorage.getItem("cata_sidebar_collapsed")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: /Expandir menú/i }));
    expect(localStorage.getItem("cata_sidebar_collapsed")).toBe("false");
  });

  it("keeps the mobile drawer independent of the desktop collapse state", (): void => {
    render(<AppShell title="Dashboard">{null}</AppShell>);

    fireEvent.click(screen.getByRole("button", { name: /Colapsar menú/i }));
    fireEvent.click(screen.getByRole("button", { name: /Abrir menú/i }));
    fireEvent.click(screen.getByRole("button", { name: /Cerrar menú/i }));

    // Mobile open/close still works after collapsing the desktop sidebar —
    // the two toggles remain functionally independent.
    expect(screen.getByRole("button", { name: /Abrir menú/i })).toBeInTheDocument();
  });
});
