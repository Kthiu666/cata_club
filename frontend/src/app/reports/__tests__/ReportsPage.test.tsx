/**
 * Component tests for ReportsPage pagination (Issue #41).
 *
 * Covers both lists on this page: the persona results table (Etiquetas /
 * Período tabs, shared `filteredPersonaResults`) and the attendance results
 * table (Asistencia tab) — each must paginate client-side at 10/page via the
 * shared `usePagination`/`<Pagination>` surface.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ReportsPage from "@/app/reports/page";
import type { PersonaReporte } from "@/types/domain";
import type { AttendanceRecord } from "@/app/attendance/attendance-utils";

vi.mock("@/components/ProtectedRoute", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/reports",
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

const mockFetchPersonasPorEtiquetas = vi.fn();
const mockFetchNuevosPorPeriodo = vi.fn();
const mockFetchAttendanceRecords = vi.fn();
const mockFetchTrainingSchedules = vi.fn();
const mockFetchNotificaciones = vi.fn().mockResolvedValue([]);
const mockMarcarNotificacionLeida = vi.fn().mockResolvedValue(undefined);

vi.mock("@/services/api", () => ({
  fetchPersonasPorEtiquetas: (filtros: unknown) => mockFetchPersonasPorEtiquetas(filtros),
  fetchNuevosPorPeriodo: (a: string, b: string) => mockFetchNuevosPorPeriodo(a, b),
  fetchAttendanceRecords: (params?: unknown) => mockFetchAttendanceRecords(params),
  fetchTrainingSchedules: () => mockFetchTrainingSchedules(),
  fetchNotificaciones: () => mockFetchNotificaciones(),
  marcarNotificacionLeida: (id: number) => mockMarcarNotificacionLeida(id),
}));

function buildPersonas(count: number): PersonaReporte[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    nombres: "Persona",
    apellidos: `${i + 1}`,
    cedula: `000000000${i + 1}`,
    fechaNacimiento: "2000-01-01",
    telefono: "0999999999",
    prioridadMunicipal: false,
    porcentajeBeca: 0,
  }));
}

function buildAttendance(count: number): AttendanceRecord[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `att-${i + 1}`,
    fecha: "2026-07-01",
    horario: "Lunes 15:00",
    estudiante: `Estudiante ${i + 1}`,
    estado: "present",
    entrenador: "Coach Martinez",
  }));
}

describe("ReportsPage — persona results pagination (Issue #41)", () => {
  beforeEach(() => {
    mockFetchPersonasPorEtiquetas.mockReset().mockResolvedValue(buildPersonas(15));
    mockFetchTrainingSchedules.mockReset().mockResolvedValue([]);
  });

  it("renders only 10 personas initially and shows pagination controls", async () => {
    render(<ReportsPage />);

    fireEvent.click(screen.getByRole("button", { name: /^buscar$/i }));

    expect(await screen.findByText("Persona 1")).toBeInTheDocument();
    expect(screen.queryByText("Persona 11")).not.toBeInTheDocument();
    expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
  });

  it("advances to the next page when Siguiente is clicked", async () => {
    render(<ReportsPage />);

    fireEvent.click(screen.getByRole("button", { name: /^buscar$/i }));
    await screen.findByText("Persona 1");

    fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));

    expect(await screen.findByText("Persona 11")).toBeInTheDocument();
    expect(screen.queryByText("Persona 1")).not.toBeInTheDocument();
  });
});

describe("ReportsPage — attendance results pagination (Issue #41)", () => {
  beforeEach(() => {
    mockFetchTrainingSchedules.mockReset().mockResolvedValue([]);
    mockFetchAttendanceRecords.mockReset().mockResolvedValue(buildAttendance(15));
  });

  it("renders only 10 attendance records initially and shows pagination controls", async () => {
    render(<ReportsPage />);

    fireEvent.click(screen.getByRole("button", { name: /asistencia/i }));
    fireEvent.click(screen.getByRole("button", { name: /^buscar$/i }));

    expect(await screen.findByText("Estudiante 1")).toBeInTheDocument();
    expect(screen.queryByText("Estudiante 11")).not.toBeInTheDocument();
    expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
  });

  it("advances to the next page when Siguiente is clicked", async () => {
    render(<ReportsPage />);

    fireEvent.click(screen.getByRole("button", { name: /asistencia/i }));
    fireEvent.click(screen.getByRole("button", { name: /^buscar$/i }));
    await screen.findByText("Estudiante 1");

    fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));

    await waitFor(() => {
      expect(screen.getByText("Estudiante 11")).toBeInTheDocument();
    });
    expect(screen.queryByText("Estudiante 1")).not.toBeInTheDocument();
  });
});
