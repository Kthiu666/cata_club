/**
 * Component tests for MembersPage — Roles popover replacing 4 always-visible
 * pill buttons per account row (PR5, design decision #11).
 * Covers: a single "Roles" trigger opens a popover of 4 checkable role rows,
 * and toggling a role in the popover fires the same asignarRol/quitarRol
 * calls the old buttons fired.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import MembersPage from "@/app/members/page";
import type { MemberAccount } from "@/app/members/members-utils";

vi.mock("@/components/ProtectedRoute", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// AppShell renders NotificationBell + needs next/navigation, next/link,
// next/image, AuthContext — same minimal mock pattern as GroupsPage.test.tsx.
vi.mock("next/navigation", () => ({
  usePathname: () => "/members",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean }) => {
    const { fill, priority, sizes, ...rest } = props;
    void fill;
    void priority;
    void sizes;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt="" {...rest} />;
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    session: {
      user: { id: "u1", name: "Admin Test", email: "admin@cataclub.com", role: "admin", representanteId: null },
      roles: ["ADMINISTRADOR"],
      loggedInAt: "2026-07-01T12:00:00Z",
    },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

const mockFetchMembers = vi.fn();
const mockAsignarRol = vi.fn();
const mockQuitarRol = vi.fn();
const mockFetchNotificaciones = vi.fn().mockResolvedValue([]);
const mockMarcarNotificacionLeida = vi.fn().mockResolvedValue(undefined);

vi.mock("@/services/api", () => {
  class MockApiClientError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = "ApiClientError";
      this.status = status;
    }
  }
  return {
    fetchMembers: () => mockFetchMembers(),
    asignarRol: (personaId: number, tipoRol: string) => mockAsignarRol(personaId, tipoRol),
    quitarRol: (personaId: number, tipoRol: string) => mockQuitarRol(personaId, tipoRol),
    cambiarEstadoCuenta: vi.fn(),
    fetchFichaMedica: vi.fn(),
    actualizarFichaMedica: vi.fn(),
    fetchTiposMembresia: vi.fn().mockResolvedValue([]),
    crearMembresia: vi.fn(),
    fetchNotificaciones: () => mockFetchNotificaciones(),
    marcarNotificacionLeida: (id: number) => mockMarcarNotificacionLeida(id),
    ApiClientError: MockApiClientError,
  };
});

const ACCOUNT: MemberAccount = {
  id: "1",
  role: "representante",
  nombres: "María",
  apellidos: "González",
  telefono: "0999999999",
  estudiantes: [
    {
      id: "10",
      nombres: "Sofía",
      apellidos: "González",
      grupoId: null,
      activo: true,
      membresia: null,
      ultimoPago: null,
    },
  ],
};

async function findAccountRow(): Promise<HTMLElement> {
  return (await screen.findByText("María González")).closest("tr") as HTMLElement;
}

describe("MembersPage — Roles popover", () => {
  beforeEach(() => {
    mockFetchMembers.mockReset();
    mockAsignarRol.mockReset();
    mockQuitarRol.mockReset();
    mockFetchMembers.mockResolvedValue({ accounts: [ACCOUNT], niveles: [] });
    mockAsignarRol.mockResolvedValue({ roles: ["ADMINISTRADOR"] });
    mockQuitarRol.mockResolvedValue({ roles: [] });
  });

  it("renders a single Roles trigger per account row instead of 4 always-visible pill buttons", async () => {
    render(<MembersPage />);
    const row = await findAccountRow();

    expect(within(row).getByRole("button", { name: /^roles$/i })).toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: /^admin$/i })).not.toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: /^entrenador$/i })).not.toBeInTheDocument();
  });

  it("opens a popover of 3 checkable role rows when the Roles trigger is clicked (Tesorero is deactivated)", async () => {
    render(<MembersPage />);
    const row = await findAccountRow();

    fireEvent.click(within(row).getByRole("button", { name: /^roles$/i }));

    expect(within(row).getByRole("checkbox", { name: /admin/i })).toBeInTheDocument();
    expect(within(row).getByRole("checkbox", { name: /entrenador/i })).toBeInTheDocument();
    expect(within(row).getByRole("checkbox", { name: /alumno/i })).toBeInTheDocument();
    expect(within(row).queryByRole("checkbox", { name: /tesorero/i })).not.toBeInTheDocument();
  });

  it("selecting a role in the popover fires asignarRol, same as the old buttons", async () => {
    render(<MembersPage />);
    const row = await findAccountRow();

    fireEvent.click(within(row).getByRole("button", { name: /^roles$/i }));
    fireEvent.click(within(row).getByRole("checkbox", { name: /admin/i }));

    await waitFor(() => {
      expect(mockAsignarRol).toHaveBeenCalledWith(1, "ADMINISTRADOR");
    });
  });

  it("deselecting an already-selected role fires quitarRol", async () => {
    render(<MembersPage />);
    const row = await findAccountRow();

    fireEvent.click(within(row).getByRole("button", { name: /^roles$/i }));
    const adminCheckbox = within(row).getByRole("checkbox", { name: /admin/i });

    fireEvent.click(adminCheckbox);
    await waitFor(() => expect(mockAsignarRol).toHaveBeenCalledWith(1, "ADMINISTRADOR"));

    fireEvent.click(adminCheckbox);
    await waitFor(() => {
      expect(mockQuitarRol).toHaveBeenCalledWith(1, "ADMINISTRADOR");
    });
  });
});

describe("MembersPage — Crear membresía inline form width (live-QA bugfix)", () => {
  beforeEach(() => {
    mockFetchMembers.mockReset();
    mockFetchMembers.mockResolvedValue({ accounts: [ACCOUNT], niveles: [] });
  });

  it("widens the Membresía block to the full row when the create-membership form is open, instead of staying cramped in a single grid column", async () => {
    render(<MembersPage />);
    await findAccountRow();

    // Single account with a single student is expanded by default (defaultOpen),
    // so the student detail row (and its "Crear membresía" button) is already visible.
    const crearButton = await screen.findByRole("button", { name: /crear membresía/i });
    fireEvent.click(crearButton);

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    const membershipBlock = screen.getByText("Membresía", { exact: true }).parentElement;
    expect(membershipBlock).not.toBeNull();
    expect(membershipBlock?.className).toMatch(/lg:col-span-4/);
    expect(membershipBlock?.className).toMatch(/sm:col-span-2/);
  });
});
