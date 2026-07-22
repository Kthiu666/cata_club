/**
 * Component tests for StudentPage's Justificativos section — the student's
 * own justificativo history now fetches from the backend (`GET
 * /ranking/:personaId/justificativos`, E04-RF012 ampliado) instead of only
 * reflecting what was submitted during the current session, and a
 * RECHAZADO entry now surfaces its `motivoRechazo`.
 *
 * Mirrors the mocking pattern established by PaymentsPage.test.tsx /
 * GroupsPage.test.tsx (ProtectedRoute, next/navigation, next/link,
 * next/image, AuthContext all stubbed; @/services/api mocked).
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import StudentPage from "@/app/student/page";
import type {
  StudentPortalSummary,
  PagoPersona,
  StudentProfileSummary,
  StudentSessionSummary,
  MembresiaPorPersona,
} from "@/services/api";
import type { Justificativo, SolicitudClaseExtra } from "@/types/domain";

vi.mock("@/components/ProtectedRoute", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/student",
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
      user: { id: "9", name: "Alumno Test", email: "alumno@cataclub.com", role: "estudiante", representanteId: null },
      roles: ["ALUMNO"],
      loggedInAt: "2026-07-01T12:00:00Z",
    },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

const mockFetchStudentPortal = vi.fn();
const mockFetchMembresiasPorPersona = vi.fn();
const mockFetchTrainingSchedules = vi.fn();
const mockListarClasesExtra = vi.fn();
const mockSubmitJustificativo = vi.fn();
const mockFetchJustificativosDePersona = vi.fn();
const mockFetchPagosDePersona = vi.fn();

vi.mock("@/services/api", () => ({
  fetchStudentPortal: () => mockFetchStudentPortal(),
  fetchMembresiasPorPersona: () => mockFetchMembresiasPorPersona(),
  fetchTrainingSchedules: () => mockFetchTrainingSchedules(),
  listarClasesExtra: () => mockListarClasesExtra(),
  solicitarClaseExtra: vi.fn(),
  submitJustificativo: (dto: unknown) => mockSubmitJustificativo(dto),
  fetchJustificativosDePersona: (personaId: string) => mockFetchJustificativosDePersona(personaId),
  fetchPagosDePersona: (personaId: string) => mockFetchPagosDePersona(personaId),
}));

const PORTAL: StudentPortalSummary = {
  self: {
    personaId: "9",
    nombres: "Alumno",
    apellidos: "Test",
    fechaNacimiento: "2010-05-14",
    ranking: { status: "unavailable", reason: "error" },
    recentSessions: [],
  },
  representados: [],
  membershipPlans: [],
};

const RECHAZADO: Justificativo = {
  id: 1,
  personaId: 9,
  anio: 2026,
  mes: 6,
  motivo: "Viaje familiar",
  archivoUrl: null,
  estado: "RECHAZADO",
  motivoRechazo: "Comprobante ilegible",
  fechaSolicitud: "2026-06-05T14:30:00Z",
  fechaEvaluacion: "2026-06-10T09:00:00Z",
  evaluadoPorId: 1,
};

const PENDIENTE: Justificativo = {
  id: 2,
  personaId: 9,
  anio: 2026,
  mes: 7,
  motivo: "Certificado médico",
  archivoUrl: null,
  estado: "PENDIENTE",
  motivoRechazo: null,
  fechaSolicitud: "2026-07-05T14:30:00Z",
  fechaEvaluacion: null,
  evaluadoPorId: null,
};

const PAGO_RECHAZADO: PagoPersona = {
  id: 1,
  monto: "35.00",
  motivoRechazo: "Comprobante ilegible",
  estadoPago: "RECHAZADO",
  tipoPago: "TRANSFERENCIA",
  fechaRegistro: "2026-06-01T09:00:00Z",
  fechaValidacion: "2026-06-02T14:30:00Z",
  fechaInicio: "2026-06-01",
  fechaFin: "2026-06-30",
  personaId: 9,
  membresiaId: 3,
  voucherUrl: null,
  voucherFormato: null,
};

const PAGO_APROBADO: PagoPersona = {
  id: 2,
  monto: "35.00",
  motivoRechazo: null,
  estadoPago: "APROBADO",
  tipoPago: "EFECTIVO",
  fechaRegistro: "2026-07-01T09:00:00Z",
  fechaValidacion: "2026-07-01T10:00:00Z",
  fechaInicio: "2026-07-01",
  fechaFin: "2026-07-31",
  personaId: 9,
  membresiaId: 3,
  voucherUrl: null,
  voucherFormato: null,
};

// --- Pagination fixture builders (Issue #41) ---

function buildSessions(count: number): StudentSessionSummary[] {
  return Array.from({ length: count }, (_, i) => ({
    fecha: `2026-01-${String(i + 1).padStart(2, "0")}`,
    horario: "10:00",
    estado: "present" as const,
  }));
}

function buildPagos(count: number): PagoPersona[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    monto: `${100 + i}.00`,
    motivoRechazo: null,
    estadoPago: "APROBADO" as const,
    tipoPago: "EFECTIVO" as const,
    fechaRegistro: "2026-01-01T09:00:00Z",
    fechaValidacion: "2026-01-01T10:00:00Z",
    fechaInicio: "2026-01-01",
    fechaFin: "2026-01-31",
    personaId: 9,
    membresiaId: 3,
    voucherUrl: null,
    voucherFormato: null,
  }));
}

function buildJustificativos(count: number): Justificativo[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    personaId: 9,
    anio: 2001 + i,
    mes: 1,
    motivo: "Motivo",
    archivoUrl: null,
    estado: "PENDIENTE" as const,
    motivoRechazo: null,
    fechaSolicitud: "2026-01-01T00:00:00Z",
    fechaEvaluacion: null,
    evaluadoPorId: null,
  }));
}

function buildSolicitudes(count: number): SolicitudClaseExtra[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    fechaClaseSolicitada: `2026-02-${String(i + 1).padStart(2, "0")}`,
    estado: "PENDIENTE" as const,
    costoAdicional: null,
    fechaSolicitud: "2026-01-01T00:00:00Z",
    observaciones: null,
    personaId: 9,
    membresiaId: 3,
    horarioId: 1,
  }));
}

const ACTIVE_PERSONALIZADA_MEMBERSHIP: MembresiaPorPersona = {
  id: 1,
  estado: "ACTIVA",
  montoAplicado: "0",
  fechaActivacion: "2026-01-01",
  personaId: 9,
  tipoMembresiaId: 1,
  tipo: { id: 1, categoria: "cat", franjaHoraria: "manana", precio: "0", modalidad: "PERSONALIZADA" },
};

function buildRepresentados(count: number): StudentProfileSummary[] {
  return Array.from({ length: count }, (_, i) => ({
    personaId: `${100 + i}`,
    nombres: "Estudiante",
    apellidos: `${i + 1}`,
    fechaNacimiento: "2012-01-01",
    ranking: { status: "unavailable" as const, reason: "error" as const },
    recentSessions: [],
  }));
}

beforeEach(() => {
  mockFetchStudentPortal.mockReset().mockResolvedValue(PORTAL);
  mockFetchMembresiasPorPersona.mockReset().mockResolvedValue([]);
  mockFetchTrainingSchedules.mockReset().mockResolvedValue([]);
  mockListarClasesExtra.mockReset().mockResolvedValue([]);
  mockSubmitJustificativo.mockReset();
  mockFetchJustificativosDePersona.mockReset().mockResolvedValue([]);
  mockFetchPagosDePersona.mockReset().mockResolvedValue([]);
});

describe("StudentPage — Justificativos section", () => {
  it("fetches the persona's justificativo history from the service instead of only session state", async () => {
    mockFetchJustificativosDePersona.mockResolvedValueOnce([RECHAZADO]);

    render(<StudentPage />);

    await waitFor(() => {
      expect(mockFetchJustificativosDePersona).toHaveBeenCalledWith("9");
    });
    expect(await screen.findByText("Viaje familiar")).toBeInTheDocument();
  });

  it("shows the rejection reason for a RECHAZADO entry", async () => {
    mockFetchJustificativosDePersona.mockResolvedValueOnce([RECHAZADO]);

    render(<StudentPage />);

    expect(await screen.findByText("Comprobante ilegible")).toBeInTheDocument();
  });

  it("does not show a rejection-reason block for a PENDIENTE entry", async () => {
    mockFetchJustificativosDePersona.mockResolvedValueOnce([PENDIENTE]);

    render(<StudentPage />);

    await screen.findByText("Certificado médico");
    expect(screen.queryByText(/motivo de rechazo/i)).not.toBeInTheDocument();
  });
});

describe("StudentPage — Pagos section", () => {
  it("fetches and renders the persona's payment history from the service", async () => {
    mockFetchPagosDePersona.mockResolvedValueOnce([PAGO_APROBADO]);

    render(<StudentPage />);

    await waitFor(() => {
      expect(mockFetchPagosDePersona).toHaveBeenCalledWith("9");
    });
    expect(await screen.findByText("Efectivo")).toBeInTheDocument();
  });

  it("shows the rejection reason for a RECHAZADO payment", async () => {
    mockFetchPagosDePersona.mockResolvedValueOnce([PAGO_RECHAZADO]);

    render(<StudentPage />);

    expect(await screen.findByText("Comprobante ilegible")).toBeInTheDocument();
  });

  it("does not show a rejection-reason block for an APROBADO payment", async () => {
    mockFetchPagosDePersona.mockResolvedValueOnce([PAGO_APROBADO]);

    render(<StudentPage />);

    await screen.findByText("Efectivo");
    expect(screen.queryByText(/motivo de rechazo/i)).not.toBeInTheDocument();
  });
});

describe("StudentPage — unavailable membership recovery", () => {
  it("labels the unavailable membership state and offers the honest next action", async () => {
    render(<StudentPage />);

    const recovery = await screen.findByRole("region", { name: /membresía no disponible/i });
    expect(recovery).toHaveTextContent("No disponible desde este portal por el momento.");
    expect(screen.getByRole("link", { name: /consultar con administración/i })).toHaveAttribute("href", "mailto:administracion@cataclub.local");
  });

  it("opens named help that explains the unavailable membership limitation without promising access", async () => {
    render(<StudentPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Ayuda sobre membresía no disponible" }));

    const help = screen.getByRole("region", { name: "Ayuda sobre membresía no disponible" });
    expect(help).toHaveTextContent("no está disponible desde este portal");
    expect(help).toHaveTextContent("Consulte con administración");
    expect(screen.getByRole("link", { name: /consultar con administración/i })).toHaveAttribute("href", "mailto:administracion@cataclub.local");
  });
});

// ---------------------------------------------------------------------------
// Pagination (Issue #41) — 5 lists on this page. `managedProfiles` in
// `ActivePortalView` is computed inline as `[data.self, ...data.representados]`
// on every render — a fresh array reference each time — so it MUST be wrapped
// in `useMemo` before wiring `usePagination`, per the reset-to-page-1 gotcha
// discovered in PR2/PR3. Every "advances + persists" test below uses RTL's
// `rerender()` (with the same underlying data) to specifically catch that bug
// class, not just prove a single "next" click works once.
// ---------------------------------------------------------------------------

describe("StudentPage — recent sessions pagination (Issue #41)", () => {
  it("renders only 10 recent sessions initially and shows pagination controls", async () => {
    mockFetchStudentPortal.mockResolvedValueOnce({
      ...PORTAL,
      self: { ...PORTAL.self!, recentSessions: buildSessions(15) },
    });

    render(<StudentPage />);

    expect(await screen.findByText("2026-01-01")).toBeInTheDocument();
    expect(screen.queryByText("2026-01-11")).not.toBeInTheDocument();
    expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
  });

  it("advances to the next page and persists across an unrelated re-render", async () => {
    mockFetchStudentPortal.mockResolvedValueOnce({
      ...PORTAL,
      self: { ...PORTAL.self!, recentSessions: buildSessions(15) },
    });

    const { rerender } = render(<StudentPage />);
    await screen.findByText("2026-01-01");

    fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(await screen.findByText("2026-01-11")).toBeInTheDocument();

    rerender(<StudentPage />);
    expect(screen.getByText("2026-01-11")).toBeInTheDocument();
    expect(screen.queryByText("2026-01-01")).not.toBeInTheDocument();
  });
});

describe("StudentPage — clases extra history pagination (Issue #41)", () => {
  beforeEach(() => {
    mockFetchMembresiasPorPersona.mockReset().mockResolvedValue([ACTIVE_PERSONALIZADA_MEMBERSHIP]);
    mockFetchTrainingSchedules.mockReset().mockResolvedValue([]);
  });

  it("renders only 10 solicitudes initially and shows pagination controls", async () => {
    mockListarClasesExtra.mockResolvedValueOnce(buildSolicitudes(15));

    render(<StudentPage />);

    expect(await screen.findByText("2026-02-01")).toBeInTheDocument();
    expect(screen.queryByText("2026-02-11")).not.toBeInTheDocument();
    expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
  });

  it("advances to the next page and persists across an unrelated re-render", async () => {
    mockListarClasesExtra.mockResolvedValueOnce(buildSolicitudes(15));

    const { rerender } = render(<StudentPage />);
    await screen.findByText("2026-02-01");

    fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(await screen.findByText("2026-02-11")).toBeInTheDocument();

    rerender(<StudentPage />);
    expect(screen.getByText("2026-02-11")).toBeInTheDocument();
    expect(screen.queryByText("2026-02-01")).not.toBeInTheDocument();
  });
});

describe("StudentPage — pagos pagination (Issue #41)", () => {
  it("renders only 10 pagos initially and shows pagination controls", async () => {
    mockFetchPagosDePersona.mockResolvedValueOnce(buildPagos(15));

    render(<StudentPage />);

    expect(await screen.findByText(/100\.00/)).toBeInTheDocument();
    expect(screen.queryByText(/110\.00/)).not.toBeInTheDocument();
    expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
  });

  it("advances to the next page and persists across an unrelated re-render", async () => {
    mockFetchPagosDePersona.mockResolvedValueOnce(buildPagos(15));

    const { rerender } = render(<StudentPage />);
    await screen.findByText(/100\.00/);

    fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(await screen.findByText(/110\.00/)).toBeInTheDocument();

    rerender(<StudentPage />);
    expect(screen.getByText(/110\.00/)).toBeInTheDocument();
    expect(screen.queryByText(/100\.00/)).not.toBeInTheDocument();
  });
});

describe("StudentPage — justificativos pagination (Issue #41)", () => {
  it("renders only 10 justificativos initially and shows pagination controls", async () => {
    mockFetchJustificativosDePersona.mockResolvedValueOnce(buildJustificativos(15));

    render(<StudentPage />);

    expect(await screen.findByText("Enero 2001")).toBeInTheDocument();
    expect(screen.queryByText("Enero 2011")).not.toBeInTheDocument();
    expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
  });

  it("advances to the next page and persists across an unrelated re-render", async () => {
    mockFetchJustificativosDePersona.mockResolvedValueOnce(buildJustificativos(15));

    const { rerender } = render(<StudentPage />);
    await screen.findByText("Enero 2001");

    fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(await screen.findByText("Enero 2011")).toBeInTheDocument();

    rerender(<StudentPage />);
    expect(screen.getByText("Enero 2011")).toBeInTheDocument();
    expect(screen.queryByText("Enero 2001")).not.toBeInTheDocument();
  });
});

describe("StudentPage — representados select pagination (Issue #41)", () => {
  it("caps the estudiante select to 10 options initially and shows pagination", async () => {
    mockFetchStudentPortal.mockResolvedValueOnce({
      ...PORTAL,
      representados: buildRepresentados(14),
    });

    render(<StudentPage />);

    const select = await screen.findByRole("combobox", { name: "Seleccionar estudiante" });
    expect(within(select).getByRole("option", { name: "Estudiante 1" })).toBeInTheDocument();
    expect(within(select).queryByRole("option", { name: "Estudiante 10" })).not.toBeInTheDocument();
    expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
  });

  it("advances the estudiante select to the next page and persists across an unrelated re-render", async () => {
    mockFetchStudentPortal.mockResolvedValueOnce({
      ...PORTAL,
      representados: buildRepresentados(14),
    });

    const { rerender } = render(<StudentPage />);
    await screen.findByRole("combobox", { name: "Seleccionar estudiante" });

    fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(
      within(screen.getByRole("combobox", { name: "Seleccionar estudiante" })).getByRole("option", {
        name: "Estudiante 10",
      }),
    ).toBeInTheDocument();

    rerender(<StudentPage />);
    expect(
      within(screen.getByRole("combobox", { name: "Seleccionar estudiante" })).getByRole("option", {
        name: "Estudiante 10",
      }),
    ).toBeInTheDocument();
  });
});
