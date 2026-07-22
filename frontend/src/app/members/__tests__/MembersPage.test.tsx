/**
 * Component tests for MembersPage — Editar member modal replacing the inline
 * Roles popover + activo/inactivo toggle button in each account row.
 * Covers: a single "Editar" trigger per row opens a floating modal dialog
 * (role="dialog") with the same role checkboxes and activo toggle, closeable
 * via the X button, backdrop click, and Escape; only one modal can be open
 * at a time; and the same asignarRol/quitarRol/cambiarEstadoCuenta calls and
 * "ya tiene el rol" reconciliation the old inline popover fired.
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
const mockCambiarEstadoCuenta = vi.fn();
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
    cambiarEstadoCuenta: (personaId: number, activo: boolean) => mockCambiarEstadoCuenta(personaId, activo),
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

function createAccounts(count: number): MemberAccount[] {
  return Array.from({ length: count }, (_, index) => ({
    ...ACCOUNT,
    id: String(index + 1),
    nombres: `Responsable ${index + 1}`,
  }));
}

async function findAccountRow(): Promise<HTMLElement> {
  return (await screen.findByText("María González")).closest("tr") as HTMLElement;
}

describe("MembersPage — Editar member modal", () => {
  beforeEach(() => {
    mockFetchMembers.mockReset();
    mockAsignarRol.mockReset();
    mockQuitarRol.mockReset();
    mockCambiarEstadoCuenta.mockReset();
    mockFetchMembers.mockResolvedValue({ accounts: [ACCOUNT], niveles: [] });
    mockAsignarRol.mockResolvedValue({ roles: ["ADMINISTRADOR"] });
    mockQuitarRol.mockResolvedValue({ roles: [] });
    mockCambiarEstadoCuenta.mockResolvedValue({ activo: false });
  });

  it("renders a single Editar trigger per account row instead of inline role/status controls", async () => {
    render(<MembersPage />);
    const row = await findAccountRow();

    expect(within(row).getByRole("button", { name: /^editar$/i })).toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: /^roles$/i })).not.toBeInTheDocument();
    expect(within(row).queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens a floating modal dialog with 4 checkable role rows when Editar is clicked", async () => {
    render(<MembersPage />);
    const row = await findAccountRow();

    fireEvent.click(within(row).getByRole("button", { name: /^editar$/i }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(within(dialog).getByRole("checkbox", { name: /admin/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("checkbox", { name: /entrenador/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("checkbox", { name: /tesorero/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("checkbox", { name: /alumno/i })).toBeInTheDocument();
  });

  it("shows the member's read-only name and telefono inside the modal", async () => {
    render(<MembersPage />);
    const row = await findAccountRow();

    fireEvent.click(within(row).getByRole("button", { name: /^editar$/i }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("María González");
    expect(dialog).toHaveTextContent("0999999999");
  });

  it("selecting a role in the modal fires asignarRol, same as the old popover", async () => {
    render(<MembersPage />);
    const row = await findAccountRow();

    fireEvent.click(within(row).getByRole("button", { name: /^editar$/i }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /admin/i }));

    await waitFor(() => {
      expect(mockAsignarRol).toHaveBeenCalledWith(1, "ADMINISTRADOR");
    });
  });

  it("deselecting an already-selected role fires quitarRol", async () => {
    render(<MembersPage />);
    const row = await findAccountRow();

    fireEvent.click(within(row).getByRole("button", { name: /^editar$/i }));
    const dialog = screen.getByRole("dialog");
    const adminCheckbox = within(dialog).getByRole("checkbox", { name: /admin/i });

    fireEvent.click(adminCheckbox);
    await waitFor(() => expect(mockAsignarRol).toHaveBeenCalledWith(1, "ADMINISTRADOR"));

    fireEvent.click(adminCheckbox);
    await waitFor(() => {
      expect(mockQuitarRol).toHaveBeenCalledWith(1, "ADMINISTRADOR");
    });
  });

  it('reconciles local state when the backend reports "ya tiene el rol" on assign', async () => {
    mockAsignarRol.mockRejectedValueOnce(new Error("Esta persona ya tiene el rol ADMINISTRADOR"));
    render(<MembersPage />);
    const row = await findAccountRow();

    fireEvent.click(within(row).getByRole("button", { name: /^editar$/i }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /admin/i }));

    await waitFor(() => {
      expect(within(dialog).getByRole("checkbox", { name: /admin/i })).toBeChecked();
    });
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("toggling the account activo/inactivo state inside the modal calls cambiarEstadoCuenta", async () => {
    render(<MembersPage />);
    const row = await findAccountRow();

    fireEvent.click(within(row).getByRole("button", { name: /^editar$/i }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /^activa$/i }));

    await waitFor(() => {
      expect(mockCambiarEstadoCuenta).toHaveBeenCalledWith(1, false);
    });
  });

  it("closes the modal when the close (X) button is clicked", async () => {
    render(<MembersPage />);
    const row = await findAccountRow();

    fireEvent.click(within(row).getByRole("button", { name: /^editar$/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^cerrar$/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes the modal when clicking the backdrop", async () => {
    render(<MembersPage />);
    const row = await findAccountRow();

    fireEvent.click(within(row).getByRole("button", { name: /^editar$/i }));
    fireEvent.click(screen.getByRole("dialog").parentElement as HTMLElement);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes the modal on Escape", async () => {
    render(<MembersPage />);
    const row = await findAccountRow();

    fireEvent.click(within(row).getByRole("button", { name: /^editar$/i }));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opening a second row's modal closes any previously open modal (only one at a time)", async () => {
    mockFetchMembers.mockResolvedValue({ accounts: createAccounts(2), niveles: [] });
    render(<MembersPage />);

    const row1 = (await screen.findByText("Responsable 1 González")).closest("tr") as HTMLElement;
    const row2 = screen.getByText("Responsable 2 González").closest("tr") as HTMLElement;

    fireEvent.click(within(row1).getByRole("button", { name: /^editar$/i }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Responsable 1");

    fireEvent.click(within(row2).getByRole("button", { name: /^editar$/i }));
    const dialogs = screen.getAllByRole("dialog");
    expect(dialogs).toHaveLength(1);
    expect(dialogs[0]).toHaveTextContent("Responsable 2");
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

describe("MembersPage — capped results help", () => {
  it("opens named help that truthfully describes the known 200-result cap", async () => {
    render(<MembersPage />);
    await findAccountRow();

    fireEvent.click(screen.getByRole("button", { name: "Ayuda sobre límite de resultados" }));

    const help = screen.getByRole("region", { name: "Ayuda sobre límite de resultados" });
    expect(help).toHaveTextContent("hasta 200 registros");
    expect(help).toHaveTextContent("no confirma que se hayan cargado todos los miembros");
  });
});

describe("MembersPage — honest aggregate coverage", () => {
  it("shows the incomplete-coverage notice when the upstream persona cap is reached after accounts collapse", async () => {
    mockFetchMembers.mockResolvedValue({ accounts: [ACCOUNT], niveles: [], personasCapped: true });

    render(<MembersPage />);

    expect(await screen.findByRole("status", { name: "Resultados mostrados" })).toHaveTextContent(
      "1 resultados mostrados",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "puede estar incompleto",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("200 registros");
    expect(screen.queryByRole("navigation", { name: /paginación/i })).not.toBeInTheDocument();
  });

  it("hides the incomplete-coverage notice below the cap without adding pagination controls", async () => {
    mockFetchMembers.mockResolvedValue({ accounts: createAccounts(199), niveles: [], personasCapped: false });

    render(<MembersPage />);

    expect(await screen.findByRole("status", { name: "Resultados mostrados" })).toHaveTextContent(
      "199 resultados mostrados",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /paginación/i })).not.toBeInTheDocument();
  });
});
