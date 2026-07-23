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
const mockFetchFichaMedica = vi.fn();
const mockActualizarFichaMedica = vi.fn();
const mockFetchTiposMembresia = vi.fn().mockResolvedValue([]);
const mockCrearMembresia = vi.fn();
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
    fetchFichaMedica: (personaId: number) => mockFetchFichaMedica(personaId),
    actualizarFichaMedica: (personaId: number, data: unknown) => mockActualizarFichaMedica(personaId, data),
    fetchTiposMembresia: () => mockFetchTiposMembresia(),
    crearMembresia: (data: unknown) => mockCrearMembresia(data),
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

/**
 * Each row renders two "Editar" triggers — a desktop one and a
 * mobile-visible duplicate (the desktop trigger's whole column is CSS-hidden
 * below `sm`, so mobile needs its own reachable one). jsdom doesn't apply
 * real CSS, so both match `getByRole` here; the mobile one comes first in
 * DOM order (it lives in the always-rendered name column), which is also
 * what the component's focus-restoration logic naturally targets when a
 * test clicks this one.
 */
function getEditButton(container: HTMLElement): HTMLElement {
  return within(container).getAllByRole("button", { name: /^editar$/i })[0];
}

describe("MembersPage — Editar member modal", () => {
  beforeEach(() => {
    mockFetchMembers.mockReset();
    mockAsignarRol.mockReset();
    mockQuitarRol.mockReset();
    mockCambiarEstadoCuenta.mockReset();
    mockFetchFichaMedica.mockReset();
    mockActualizarFichaMedica.mockReset();
    mockFetchTiposMembresia.mockReset().mockResolvedValue([]);
    mockCrearMembresia.mockReset();
    mockFetchMembers.mockResolvedValue({ accounts: [ACCOUNT], niveles: [] });
    mockAsignarRol.mockResolvedValue({ roles: ["ADMINISTRADOR"] });
    mockQuitarRol.mockResolvedValue({ roles: [] });
    mockCambiarEstadoCuenta.mockResolvedValue({ activo: false });
  });

  it("renders an Editar trigger per account row (desktop + a mobile-visible duplicate) instead of inline role/status controls", async () => {
    render(<MembersPage />);
    const row = await findAccountRow();

    // Two triggers exist by design — one in the desktop-only contact/status
    // column, one next to the mobile status badge (that column is CSS-hidden
    // below `sm`, so mobile needs its own reachable trigger). jsdom doesn't
    // apply real CSS, so both are "in the document" here; only one is ever
    // visually reachable at a given real viewport.
    expect(within(row).getAllByRole("button", { name: /^editar$/i })).toHaveLength(2);
    expect(within(row).queryByRole("button", { name: /^roles$/i })).not.toBeInTheDocument();
    expect(within(row).queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("never renders a row expand/collapse control — the table no longer expands", async () => {
    render(<MembersPage />);
    const row = await findAccountRow();

    expect(within(row).queryByRole("button", { name: /^expandir$/i })).not.toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: /^contraer$/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Sofía González")).not.toBeInTheDocument();

    fireEvent.click(getEditButton(row));
    // The student only becomes visible once the modal is open — never via row interaction.
    expect(screen.getByRole("dialog")).toHaveTextContent("Sofía González");
  });

  it("shows each student's editable ficha médica action inside the modal", async () => {
    render(<MembersPage />);
    const row = await findAccountRow();

    fireEvent.click(getEditButton(row));
    const dialog = screen.getByRole("dialog");

    expect(within(dialog).getByText("Estudiantes a cargo")).toBeInTheDocument();
    expect(within(dialog).getByText("Sofía González")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /ficha médica/i })).toBeInTheDocument();
  });

  it("renders one edit panel per student when an account manages multiple students", async () => {
    mockFetchMembers.mockResolvedValue({
      accounts: [
        {
          ...ACCOUNT,
          estudiantes: [
            { ...ACCOUNT.estudiantes[0], id: "10", nombres: "Sofía", apellidos: "González" },
            { ...ACCOUNT.estudiantes[0], id: "11", nombres: "Mateo", apellidos: "González" },
          ],
        },
      ],
      niveles: [],
    });
    render(<MembersPage />);
    const row = await findAccountRow();

    fireEvent.click(getEditButton(row));
    const dialog = screen.getByRole("dialog");

    expect(within(dialog).getByText("Sofía González")).toBeInTheDocument();
    expect(within(dialog).getByText("Mateo González")).toBeInTheDocument();
    expect(within(dialog).getAllByRole("button", { name: /ficha médica/i })).toHaveLength(2);
  });

  it("opens a floating modal dialog with 4 checkable role rows when Editar is clicked", async () => {
    render(<MembersPage />);
    const row = await findAccountRow();

    fireEvent.click(getEditButton(row));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(within(dialog).getByRole("checkbox", { name: /admin/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("checkbox", { name: /entrenador/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("checkbox", { name: /representante/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("checkbox", { name: /alumno/i })).toBeInTheDocument();
  });

  it("shows the member's read-only name and telefono inside the modal", async () => {
    render(<MembersPage />);
    const row = await findAccountRow();

    fireEvent.click(getEditButton(row));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("María González");
    expect(dialog).toHaveTextContent("0999999999");
  });

  it("selecting a role in the modal fires asignarRol, same as the old popover", async () => {
    render(<MembersPage />);
    const row = await findAccountRow();

    fireEvent.click(getEditButton(row));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /admin/i }));

    await waitFor(() => {
      expect(mockAsignarRol).toHaveBeenCalledWith(1, "ADMINISTRADOR");
    });
  });

  it("deselecting an already-selected role fires quitarRol", async () => {
    render(<MembersPage />);
    const row = await findAccountRow();

    fireEvent.click(getEditButton(row));
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

    fireEvent.click(getEditButton(row));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /admin/i }));

    await waitFor(() => {
      expect(within(dialog).getByRole("checkbox", { name: /admin/i })).toBeChecked();
    });
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
  });

  it('reconciles local state when the backend reports "no tiene el rol" on unassign', async () => {
    render(<MembersPage />);
    const row = await findAccountRow();

    fireEvent.click(getEditButton(row));
    const dialog = screen.getByRole("dialog");
    const adminCheckbox = within(dialog).getByRole("checkbox", { name: /admin/i });

    // First click assigns (default mockAsignarRol success) so the checkbox
    // is checked before we exercise the removal-reconciliation branch.
    fireEvent.click(adminCheckbox);
    await waitFor(() => expect(adminCheckbox).toBeChecked());

    mockQuitarRol.mockRejectedValueOnce(new Error("Esta persona no tiene el rol ADMINISTRADOR"));
    fireEvent.click(adminCheckbox);

    await waitFor(() => {
      expect(adminCheckbox).not.toBeChecked();
    });
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("toggling the account activo/inactivo state inside the modal calls cambiarEstadoCuenta", async () => {
    render(<MembersPage />);
    const row = await findAccountRow();

    fireEvent.click(getEditButton(row));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /^activa$/i }));

    await waitFor(() => {
      expect(mockCambiarEstadoCuenta).toHaveBeenCalledWith(1, false);
    });
  });

  it("closes the modal when the close (X) button is clicked", async () => {
    render(<MembersPage />);
    const row = await findAccountRow();

    fireEvent.click(getEditButton(row));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^cerrar$/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("returns focus to the Editar button when the modal closes", async () => {
    render(<MembersPage />);
    const row = await findAccountRow();

    const editButton = getEditButton(row);
    fireEvent.click(editButton);
    fireEvent.click(screen.getByRole("button", { name: /^cerrar$/i }));

    expect(document.activeElement).toBe(editButton);
  });

  it("does not carry a stale error into a freshly reopened modal", async () => {
    mockAsignarRol.mockRejectedValueOnce(new Error("Error de red"));
    render(<MembersPage />);
    const row = await findAccountRow();

    fireEvent.click(getEditButton(row));
    fireEvent.click(screen.getByRole("checkbox", { name: /admin/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Error de red");

    fireEvent.click(screen.getByRole("button", { name: /^cerrar$/i }));
    fireEvent.click(getEditButton(row));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("closes the modal when clicking the backdrop", async () => {
    render(<MembersPage />);
    const row = await findAccountRow();

    fireEvent.click(getEditButton(row));
    fireEvent.click(screen.getByRole("dialog"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes the modal on Escape", async () => {
    render(<MembersPage />);
    const row = await findAccountRow();

    fireEvent.click(getEditButton(row));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opening a second row's modal closes any previously open modal (only one at a time)", async () => {
    mockFetchMembers.mockResolvedValue({ accounts: createAccounts(2), niveles: [] });
    render(<MembersPage />);

    const row1 = (await screen.findByText("Responsable 1 González")).closest("tr") as HTMLElement;
    const row2 = screen.getByText("Responsable 2 González").closest("tr") as HTMLElement;

    fireEvent.click(getEditButton(row1));
    expect(screen.getByRole("dialog")).toHaveTextContent("Responsable 1");

    fireEvent.click(getEditButton(row2));
    const dialogs = screen.getAllByRole("dialog");
    expect(dialogs).toHaveLength(1);
    expect(dialogs[0]).toHaveTextContent("Responsable 2");
  });
});

describe("MembersPage — Crear membresía inline form", () => {
  beforeEach(() => {
    mockFetchMembers.mockReset();
    mockFetchMembers.mockResolvedValue({ accounts: [ACCOUNT], niveles: [] });
    mockFetchTiposMembresia.mockReset().mockResolvedValue([]);
  });

  it("opens the create-membership form (type select + Crear/Cancelar) inside the student's card", async () => {
    render(<MembersPage />);
    const row = await findAccountRow();

    // Membership creation lives inside the student's edit-panel card, only
    // reachable via the account's edit modal — no more row expansion. The
    // card is fixed-width (no dynamic grid-column-span hack needed anymore,
    // unlike the old cramped 4-column row layout).
    fireEvent.click(getEditButton(row));
    const dialog = screen.getByRole("dialog");

    const crearButton = await within(dialog).findByRole("button", { name: /crear membresía/i });
    fireEvent.click(crearButton);

    const combobox = await within(dialog).findByRole("combobox");
    // Scoped to the create-membership form itself: the modal footer also has
    // its own "Cancelar" button, so a dialog-wide query would be ambiguous.
    const form = combobox.parentElement as HTMLElement;
    expect(within(form).getByRole("button", { name: /^crear$/i })).toBeInTheDocument();
    expect(within(form).getByRole("button", { name: /^cancelar$/i })).toBeInTheDocument();
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
