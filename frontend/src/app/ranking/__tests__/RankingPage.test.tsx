/**
 * Component tests for RankingPage — dropdown assign for unassigned
 * students.
 * Covers: the unassigned-students section renders one dropdown/button per
 * student (not one button per student×nivel pair) and fires the same
 * `handleAssignStudent` mutation.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import RankingPage from "@/app/ranking/page";
import type { NivelConOcupacion } from "@/services/api";
import type { MemberAccount } from "@/app/members/members-utils";

vi.mock("@/components/ProtectedRoute", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// AppShell renders NotificationBell + needs next/navigation, next/link,
// next/image, AuthContext — same minimal mock pattern as PaymentsPage.test.tsx.
vi.mock("next/navigation", () => ({
  usePathname: () => "/ranking",
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

async function findUnassignedRow(): Promise<HTMLElement> {
  const heading = await screen.findByText(/^estudiantes sin nivel/i);
  const section = heading.closest("div.card") as HTMLElement;
  return within(section).getByText("Sofía González").closest("div.card-hover") as HTMLElement;
}

describe("RankingPage — unassigned dropdown assign", () => {
  beforeEach(() => {
    mockFetchMembers.mockReset();
    mockAssignStudentToNivel.mockReset();
    mockMoveStudentToNivel.mockReset();
    mockFetchMembers.mockResolvedValue({ accounts: [UNASSIGNED_ACCOUNT], niveles: NIVELES });
    mockAssignStudentToNivel.mockResolvedValue(undefined);
  });

  it("renders one dropdown + Asignar button per unassigned student, not one button per nivel", async () => {
    render(<RankingPage />);
    const row = await findUnassignedRow();

    const select = within(row).getByRole("combobox");
    const buttons = within(row).getAllByRole("button");

    // Exactly one select (not N buttons — one per nivel) and one Asignar button.
    expect(select).toBeInTheDocument();
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveTextContent(/asignar/i);
  });

  it("fires handleAssignStudent's mutation with the nivel picked from the dropdown", async () => {
    render(<RankingPage />);
    const row = await findUnassignedRow();

    const select = within(row).getByRole("combobox");
    fireEvent.change(select, { target: { value: "2" } });
    fireEvent.click(within(row).getByRole("button", { name: /asignar/i }));

    await waitFor(() => {
      expect(mockAssignStudentToNivel).toHaveBeenCalledWith(10, 2);
    });
  });

  it("disables the Asignar button until a nivel is picked", async () => {
    render(<RankingPage />);
    const row = await findUnassignedRow();

    const assignButton = within(row).getByRole("button", { name: /asignar/i });
    expect(assignButton).toBeDisabled();

    const select = within(row).getByRole("combobox");
    fireEvent.change(select, { target: { value: "1" } });
    expect(assignButton).toBeEnabled();
  });
});
