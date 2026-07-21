/**
 * Component tests for GroupsPage — dropdown assign + justificativo
 * confirmation gating.
 * Covers: the unassigned-students section renders one dropdown/button per
 * student (not one button per student×nivel pair) and fires the same
 * `handleAssignStudent` mutation; Aprobar/Rechazar open `ConfirmDialog`
 * before `handleEvaluarJustificativo` fires, and canceling makes no call.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import GroupsPage from "@/app/groups/page";
import type { NivelConOcupacion } from "@/services/api";
import type { Justificativo } from "@/types/domain";
import type { MemberAccount } from "@/app/members/members-utils";

vi.mock("@/components/ProtectedRoute", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// AppShell renders NotificationBell + needs next/navigation, next/link,
// next/image, AuthContext — same minimal mock pattern as PaymentsPage.test.tsx.
vi.mock("next/navigation", () => ({
  usePathname: () => "/groups",
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
const mockAssignStudentToNivel = vi.fn();
const mockMoveStudentToNivel = vi.fn();
const mockFetchJustificativosPendientes = vi.fn();
const mockEvaluarJustificativo = vi.fn();
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
    assignStudentToNivel: (personaId: number, nivelId: number) => mockAssignStudentToNivel(personaId, nivelId),
    moveStudentToNivel: (personaId: number, nivelId: number) => mockMoveStudentToNivel(personaId, nivelId),
    reingresar: vi.fn(),
    fetchJustificativosPendientes: () => mockFetchJustificativosPendientes(),
    evaluarJustificativo: (id: number, dto: unknown) => mockEvaluarJustificativo(id, dto),
    fetchNotificaciones: () => mockFetchNotificaciones(),
    marcarNotificacionLeida: (id: number) => mockMarcarNotificacionLeida(id),
    ApiClientError: MockApiClientError,
  };
});

const NIVELES: NivelConOcupacion[] = [
  {
    id: 1,
    numeroNivel: 1,
    nombre: "Nivel Iniciación",
    capacidadMinima: 1,
    capacidadMaxima: 10,
    personasActuales: 0,
    cuposDisponibles: 10,
    necesitaRevision: false,
    nivelCategoria: "principiante",
  },
  {
    id: 2,
    numeroNivel: 2,
    nombre: "Nivel Intermedio",
    capacidadMinima: 1,
    capacidadMaxima: 10,
    personasActuales: 0,
    cuposDisponibles: 10,
    necesitaRevision: false,
    nivelCategoria: "intermedio",
  },
];

const UNASSIGNED_ACCOUNT: MemberAccount = {
  id: "acc-1",
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

const PENDING_JUSTIFICATIVO: Justificativo = {
  id: 5,
  personaId: 10,
  anio: 2026,
  mes: 7,
  motivo: "Viaje familiar",
  archivoUrl: null,
  estado: "PENDIENTE",
  motivoRechazo: null,
  fechaSolicitud: "2026-07-01T00:00:00.000Z",
  fechaEvaluacion: null,
  evaluadoPorId: null,
};

async function findUnassignedRow(): Promise<HTMLElement> {
  const heading = await screen.findByText(/^estudiantes sin grupo/i);
  const section = heading.closest("div.card") as HTMLElement;
  return within(section).getByText("Sofía González").closest("div.card-hover") as HTMLElement;
}

describe("GroupsPage — unassigned dropdown assign", () => {
  beforeEach(() => {
    mockFetchMembers.mockReset();
    mockAssignStudentToNivel.mockReset();
    mockMoveStudentToNivel.mockReset();
    mockFetchJustificativosPendientes.mockReset();
    mockEvaluarJustificativo.mockReset();
    mockFetchMembers.mockResolvedValue({ accounts: [UNASSIGNED_ACCOUNT], niveles: NIVELES });
    mockAssignStudentToNivel.mockResolvedValue(undefined);
    mockFetchJustificativosPendientes.mockResolvedValue([]);
  });

  it("renders one dropdown + Asignar button per unassigned student, not one button per nivel", async () => {
    render(<GroupsPage />);
    const row = await findUnassignedRow();

    const select = within(row).getByRole("combobox");
    const buttons = within(row).getAllByRole("button");

    // Exactly one select (not N buttons — one per nivel) and one Asignar button.
    expect(select).toBeInTheDocument();
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveTextContent(/asignar/i);
  });

  it("fires handleAssignStudent's mutation with the nivel picked from the dropdown", async () => {
    render(<GroupsPage />);
    const row = await findUnassignedRow();

    const select = within(row).getByRole("combobox");
    fireEvent.change(select, { target: { value: "2" } });
    fireEvent.click(within(row).getByRole("button", { name: /asignar/i }));

    await waitFor(() => {
      expect(mockAssignStudentToNivel).toHaveBeenCalledWith(10, 2);
    });
  });

  it("disables the Asignar button until a nivel is picked", async () => {
    render(<GroupsPage />);
    const row = await findUnassignedRow();

    const assignButton = within(row).getByRole("button", { name: /asignar/i });
    expect(assignButton).toBeDisabled();

    const select = within(row).getByRole("combobox");
    fireEvent.change(select, { target: { value: "1" } });
    expect(assignButton).toBeEnabled();
  });
});

describe("GroupsPage — justificativo Aprobar/Rechazar confirmation gating", () => {
  beforeEach(() => {
    mockFetchMembers.mockReset();
    mockAssignStudentToNivel.mockReset();
    mockMoveStudentToNivel.mockReset();
    mockFetchJustificativosPendientes.mockReset();
    mockEvaluarJustificativo.mockReset();
    mockFetchMembers.mockResolvedValue({ accounts: [], niveles: NIVELES });
    mockFetchJustificativosPendientes.mockResolvedValue([PENDING_JUSTIFICATIVO]);
    mockEvaluarJustificativo.mockResolvedValue({ ...PENDING_JUSTIFICATIVO, estado: "APROBADO" });
  });

  it("opens a confirmation dialog on Aprobar without mutating yet", async () => {
    render(<GroupsPage />);
    await screen.findByText(/persona #10/i);

    fireEvent.click(screen.getByRole("button", { name: /^aprobar$/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(mockEvaluarJustificativo).not.toHaveBeenCalled();
  });

  it("evaluates as APROBADO only after the confirm control is activated", async () => {
    render(<GroupsPage />);
    await screen.findByText(/persona #10/i);

    fireEvent.click(screen.getByRole("button", { name: /^aprobar$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^confirmar$/i }));

    await waitFor(() => {
      expect(mockEvaluarJustificativo).toHaveBeenCalledWith(5, { estado: "APROBADO" });
    });
  });

  it("reveals an inline reason input on Rechazar instead of a plain confirm dialog", async () => {
    render(<GroupsPage />);
    await screen.findByText(/persona #10/i);

    fireEvent.click(screen.getByRole("button", { name: /^rechazar$/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/motivo de rechazo/i)).toBeInTheDocument();
    expect(mockEvaluarJustificativo).not.toHaveBeenCalled();
  });

  it("cancels the reject form without mutating", async () => {
    render(<GroupsPage />);
    await screen.findByText(/persona #10/i);

    fireEvent.click(screen.getByRole("button", { name: /^rechazar$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^cancelar$/i }));

    expect(screen.queryByLabelText(/motivo de rechazo/i)).not.toBeInTheDocument();
    expect(mockEvaluarJustificativo).not.toHaveBeenCalled();
  });

  it("shows a client-side error and does not call evaluarJustificativo when submitting an empty reason", async () => {
    render(<GroupsPage />);
    await screen.findByText(/persona #10/i);

    fireEvent.click(screen.getByRole("button", { name: /^rechazar$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^confirmar$/i }));

    expect(await screen.findByText(/el motivo de rechazo es obligatorio/i)).toBeInTheDocument();
    expect(mockEvaluarJustificativo).not.toHaveBeenCalled();
  });

  it("calls evaluarJustificativo with the trimmed motivoRechazo when a reason is typed and submitted", async () => {
    render(<GroupsPage />);
    await screen.findByText(/persona #10/i);

    fireEvent.click(screen.getByRole("button", { name: /^rechazar$/i }));
    fireEvent.change(screen.getByLabelText(/motivo de rechazo/i), {
      target: { value: "  No corresponde al mes declarado  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /^confirmar$/i }));

    await waitFor(() => {
      expect(mockEvaluarJustificativo).toHaveBeenCalledWith(5, {
        estado: "RECHAZADO",
        motivoRechazo: "No corresponde al mes declarado",
      });
    });
  });
});

describe("GroupsPage — Selección Oficial extracted to its own route (PR9)", () => {
  beforeEach(() => {
    mockFetchMembers.mockReset();
    mockFetchJustificativosPendientes.mockReset();
    mockFetchMembers.mockResolvedValue({ accounts: [UNASSIGNED_ACCOUNT], niveles: NIVELES });
    mockFetchJustificativosPendientes.mockResolvedValue([]);
  });

  it("no longer renders the Selección Oficial section inline", async () => {
    render(<GroupsPage />);
    await screen.findByText(/^estudiantes sin grupo/i);

    // Scoped to <main> — the sidebar nav link text ("Selección Oficial",
    // now pointing at the dedicated route) legitimately still renders there.
    const main = screen.getByRole("main");
    expect(within(main).queryByText(/selección oficial/i)).not.toBeInTheDocument();
    expect(document.getElementById("seleccion-oficial")).not.toBeInTheDocument();
  });
});
