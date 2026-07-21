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
import { render, screen, waitFor } from "@testing-library/react";
import StudentPage from "@/app/student/page";
import type { StudentPortalSummary } from "@/services/api";
import type { Justificativo } from "@/types/domain";

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

vi.mock("@/services/api", () => ({
  fetchStudentPortal: () => mockFetchStudentPortal(),
  fetchMembresiasPorPersona: () => mockFetchMembresiasPorPersona(),
  fetchTrainingSchedules: () => mockFetchTrainingSchedules(),
  listarClasesExtra: () => mockListarClasesExtra(),
  solicitarClaseExtra: vi.fn(),
  submitJustificativo: (dto: unknown) => mockSubmitJustificativo(dto),
  fetchJustificativosDePersona: (personaId: string) => mockFetchJustificativosDePersona(personaId),
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

beforeEach(() => {
  mockFetchStudentPortal.mockReset().mockResolvedValue(PORTAL);
  mockFetchMembresiasPorPersona.mockReset().mockResolvedValue([]);
  mockFetchTrainingSchedules.mockReset().mockResolvedValue([]);
  mockListarClasesExtra.mockReset().mockResolvedValue([]);
  mockSubmitJustificativo.mockReset();
  mockFetchJustificativosDePersona.mockReset();
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
