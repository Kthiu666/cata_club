/**
 * Component tests for ReportsPage — "Exportar PDF" button visibility/state.
 * Covers: hidden before search / while loading / on empty results; visible
 * and enabled once results are present; shows a busy state and disables
 * itself while the PDF download is in flight.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ReportsPage from "@/app/reports/page";
import type { PersonaReporte } from "@/types/domain";

vi.mock("@/components/ProtectedRoute", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// AppShell renders NotificationBell + needs next/navigation, next/link,
// next/image, AuthContext — same minimal mock pattern as PaymentsPage.test.tsx.
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

const mockFetchNuevosPorPeriodo = vi.fn();
const mockFetchAttendanceRecords = vi.fn();
const mockFetchTrainingSchedules = vi.fn();
const mockExportNuevosPorPeriodoPdf = vi.fn();
const mockExportAsistenciaReportePdf = vi.fn();

vi.mock("@/services/api", () => ({
  fetchNuevosPorPeriodo: (...args: unknown[]) => mockFetchNuevosPorPeriodo(...args),
  fetchAttendanceRecords: (...args: unknown[]) => mockFetchAttendanceRecords(...args),
  fetchTrainingSchedules: (...args: unknown[]) => mockFetchTrainingSchedules(...args),
  exportNuevosPorPeriodoPdf: (...args: unknown[]) => mockExportNuevosPorPeriodoPdf(...args),
  exportAsistenciaReportePdf: (...args: unknown[]) => mockExportAsistenciaReportePdf(...args),
}));

const PERSONA: PersonaReporte = {
  id: 1,
  nombres: "Juan",
  apellidos: "Pérez",
  cedula: "1710034065",
  fechaNacimiento: "2010-05-14",
  telefono: "0991234567",
};

function exportButton(): HTMLElement | null {
  return screen.queryByRole("button", { name: /exportar pdf/i });
}

/** Fill the periodo tab's required date-range fields (fechaInicio/fechaFin). */
function fillPeriodoFechas(): void {
  fireEvent.change(screen.getByLabelText(/fecha inicio/i), { target: { value: "2026-01-01" } });
  fireEvent.change(screen.getByLabelText(/fecha fin/i), { target: { value: "2026-12-31" } });
}

describe("ReportsPage — Exportar PDF button (periodo tab)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchTrainingSchedules.mockResolvedValue([]);
  });

  it("is hidden before a search is performed", async () => {
    render(<ReportsPage />);
    // Flush the mount-time `fetchTrainingSchedules()` effect before asserting.
    await waitFor(() => expect(mockFetchTrainingSchedules).toHaveBeenCalled());
    expect(exportButton()).not.toBeInTheDocument();
  });

  it("is hidden while a search is loading", async () => {
    let resolveFetch: (value: PersonaReporte[]) => void = () => {};
    mockFetchNuevosPorPeriodo.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    render(<ReportsPage />);
    fillPeriodoFechas();
    fireEvent.click(screen.getByRole("button", { name: /^buscar$/i }));

    expect(screen.getByRole("button", { name: /buscando/i })).toBeInTheDocument();
    expect(exportButton()).not.toBeInTheDocument();

    resolveFetch([]);
    await waitFor(() => expect(screen.queryByText(/buscando/i)).not.toBeInTheDocument());
  });

  it("is hidden when the search returns no results", async () => {
    mockFetchNuevosPorPeriodo.mockResolvedValue([]);

    render(<ReportsPage />);
    fillPeriodoFechas();
    fireEvent.click(screen.getByRole("button", { name: /^buscar$/i }));

    await waitFor(() => {
      expect(mockFetchNuevosPorPeriodo).toHaveBeenCalled();
    });
    expect(exportButton()).not.toBeInTheDocument();
  });

  it("is visible and enabled once the search returns results", async () => {
    mockFetchNuevosPorPeriodo.mockResolvedValue([PERSONA]);

    render(<ReportsPage />);
    fillPeriodoFechas();
    fireEvent.click(screen.getByRole("button", { name: /^buscar$/i }));

    await waitFor(() => {
      expect(exportButton()).toBeInTheDocument();
    });
    expect(exportButton()).toBeEnabled();
  });

  it("shows a busy state and disables itself while the PDF download is in flight", async () => {
    mockFetchNuevosPorPeriodo.mockResolvedValue([PERSONA]);
    let resolveExport: () => void = () => {};
    mockExportNuevosPorPeriodoPdf.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveExport = resolve;
      }),
    );

    render(<ReportsPage />);
    fillPeriodoFechas();
    fireEvent.click(screen.getByRole("button", { name: /^buscar$/i }));
    await waitFor(() => expect(exportButton()).toBeInTheDocument());

    fireEvent.click(exportButton()!);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /generando/i })).toBeDisabled();
    });
    expect(mockExportNuevosPorPeriodoPdf).toHaveBeenCalledTimes(1);

    resolveExport();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /exportar pdf/i })).toBeEnabled();
    });
  });
});

describe("ReportsPage — Exportar PDF button (asistencia tab)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchTrainingSchedules.mockResolvedValue([]);
  });

  async function switchToAsistenciaTab(): Promise<void> {
    fireEvent.click(screen.getByRole("button", { name: /asistencia/i }));
    // Flush the mount-time `fetchTrainingSchedules()` effect before proceeding.
    await waitFor(() => expect(mockFetchTrainingSchedules).toHaveBeenCalled());
  }

  it("is hidden before a search and appears once results are returned", async () => {
    mockFetchAttendanceRecords.mockResolvedValue([
      {
        id: 1,
        fecha: "2026-07-06",
        horario: "Lunes 08:00–09:00",
        estudiante: "Juan Pérez",
        estado: "PRESENTE",
        entrenador: "Carlos Ruiz",
      },
    ]);

    render(<ReportsPage />);
    await switchToAsistenciaTab();
    expect(exportButton()).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^buscar$/i }));

    await waitFor(() => {
      expect(exportButton()).toBeInTheDocument();
    });
  });

  it("calls exportAsistenciaReportePdf when clicked", async () => {
    mockFetchAttendanceRecords.mockResolvedValue([
      {
        id: 1,
        fecha: "2026-07-06",
        horario: "Lunes 08:00–09:00",
        estudiante: "Juan Pérez",
        estado: "PRESENTE",
        entrenador: "Carlos Ruiz",
      },
    ]);
    mockExportAsistenciaReportePdf.mockResolvedValue(undefined);

    render(<ReportsPage />);
    await switchToAsistenciaTab();
    fireEvent.click(screen.getByRole("button", { name: /^buscar$/i }));
    await waitFor(() => expect(exportButton()).toBeInTheDocument());

    fireEvent.click(exportButton()!);

    await waitFor(() => {
      expect(mockExportAsistenciaReportePdf).toHaveBeenCalledTimes(1);
    });
  });
});
