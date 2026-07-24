/**
 * Component tests for StudentPage: dependiente CTA, pagos link, and
 * membership display (including unavailable-membership recovery state).
 *
 * PagosSection tests are in payments-utils.test.ts and
 * PaymentsPage.test.tsx (the payments view lives at /student/payments).
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import StudentPage from "@/app/student/page";
import type { StudentPortalSummary } from "@/services/api";

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
const mockRegistrarPago = vi.fn();

vi.mock("@/services/api", () => ({
  fetchStudentPortal: () => mockFetchStudentPortal(),
  registrarPago: (...args: unknown[]) => mockRegistrarPago(...(args as never[])),
  subirVoucherPago: vi.fn(),
  fetchPagosDePersona: vi.fn().mockResolvedValue([]),
}));

const PORTAL: StudentPortalSummary = {
  self: {
    personaId: "9",
    nombres: "Alumno",
    apellidos: "Test",
    fechaNacimiento: "1995-05-14",
    representanteId: null,
    ranking: { status: "unavailable", reason: "error" },
    recentSessions: [],
    membership: null,
  },
  representados: [],
  membershipPlans: [],
  representanteNombre: null,
};

beforeEach(() => {
  mockFetchStudentPortal.mockReset().mockResolvedValue(PORTAL);
});

describe("StudentPage — Agregar/Inscribir dependiente CTA", () => {
  it("links to the public enrollment wizard when the account has no dependents yet", async () => {
    render(<StudentPage />);

    const link = await screen.findByText("Inscribir hijo/dependiente");
    expect(link.closest("a")).toHaveAttribute("href", "/student/enroll?type=child");
  });

  it("links to the authenticated add-dependent wizard once the account already represents a dependent", async () => {
    mockFetchStudentPortal
      .mockReset()
      .mockResolvedValue({ ...PORTAL, representados: [{ ...PORTAL.self, personaId: "42" }] });

    render(<StudentPage />);

    const link = await screen.findByText("Agregar hijo/dependiente");
    expect(link.closest("a")).toHaveAttribute("href", "/student/add-dependent");
  });
});

describe("StudentPage — Pagos link", () => {
  it("does not render inline payment history (payments moved to /student/payments)", async () => {
    render(<StudentPage />);

    await waitFor(() => {
      expect(mockFetchStudentPortal).toHaveBeenCalled();
    });
    expect(screen.queryByText("Efectivo")).not.toBeInTheDocument();
    expect(screen.queryByText("RECHAZADO")).not.toBeInTheDocument();
  });

  it("links to the dedicated payments page", async () => {
    render(<StudentPage />);

    const link = await screen.findByText("Ver pagos");
    expect(link.closest("a")).toHaveAttribute("href", "/student/payments");
  });
});

describe("StudentPage — membership display", () => {
  it("renders active membership with plan details", async () => {
    mockFetchStudentPortal.mockResolvedValueOnce({
      ...PORTAL,
      self: { ...PORTAL.self!, membership: { id: 4, estado: "ACTIVA", personaId: 9, montoAplicado: "85.00", categoria: "Mensual", modalidad: "MENSUAL", franjaHoraria: "Tarde", fechaFin: null } },
    });

    render(<StudentPage />);

    const heading = await screen.findByRole("heading", { name: /activa/i });
    expect(heading).toBeInTheDocument();
    const card = heading.closest("section")!;
    expect(card).toHaveTextContent("Mensual");
  });

  it("shows sin membresía when membership is null", async () => {
    render(<StudentPage />);

    const heading = await screen.findByRole("heading", { name: /sin membresía/i });
    expect(heading).toBeInTheDocument();
    const card = heading.closest("section")!;
    expect(card).toHaveTextContent("Aún no tenés una membresía");
  });

  it("shows pendiente de activación for INACTIVA state", async () => {
    mockFetchStudentPortal.mockResolvedValueOnce({
      ...PORTAL,
      self: { ...PORTAL.self!, membership: { id: 5, estado: "INACTIVA", personaId: 9, montoAplicado: "85.00", categoria: "Mensual", modalidad: "MENSUAL", franjaHoraria: null, fechaFin: null } },
    });

    render(<StudentPage />);

    const heading = await screen.findByRole("heading", { name: /pendiente de activación/i });
    expect(heading).toBeInTheDocument();
    const card = heading.closest("section")!;
    expect(card).toHaveTextContent("validación del primer pago");
  });

  it("renders a 'Registrar primer pago' link for an INACTIVA membership", async () => {
    mockFetchStudentPortal.mockResolvedValueOnce({
      ...PORTAL,
      self: { ...PORTAL.self!, membership: { id: 5, estado: "INACTIVA", personaId: 9, montoAplicado: "85.00", categoria: "Mensual", modalidad: "MENSUAL", franjaHoraria: null, fechaFin: null } },
    });

    render(<StudentPage />);

    const link = await screen.findByText("Registrar primer pago");
    expect(link.closest("a")).toHaveAttribute("href", "/student/payments");
  });

  it("renders a 'Renovar membresía' link when the membership is VENCIDA", async () => {
    mockFetchStudentPortal.mockResolvedValueOnce({
      ...PORTAL,
      self: { ...PORTAL.self!, membership: { id: 6, estado: "VENCIDA", personaId: 9, montoAplicado: "85.00", categoria: "Mensual", modalidad: "MENSUAL", franjaHoraria: "Tarde", fechaFin: "2026-06-30" } },
    });

    render(<StudentPage />);

    const heading = await screen.findByRole("heading", { name: /vencida/i });
    expect(heading).toBeInTheDocument();
    const link = await screen.findByText("Renovar membresía");
    expect(link.closest("a")).toHaveAttribute("href", "/student/payments");
  });

  it("renders a 'Renovar membresía' link when ACTIVA but fechaFin already passed", async () => {
    mockFetchStudentPortal.mockResolvedValueOnce({
      ...PORTAL,
      self: { ...PORTAL.self!, membership: { id: 7, estado: "ACTIVA", personaId: 9, montoAplicado: "85.00", categoria: "Mensual", modalidad: "MENSUAL", franjaHoraria: "Tarde", fechaFin: "2025-12-31" } },
    });

    render(<StudentPage />);

    const heading = await screen.findByRole("heading", { name: /vencida/i });
    expect(heading).toBeInTheDocument();
    const link = await screen.findByText("Renovar membresía");
    expect(link.closest("a")).toHaveAttribute("href", "/student/payments");
  });

  it("does NOT render a renovar link when ACTIVA and fechaFin is in the future", async () => {
    mockFetchStudentPortal.mockResolvedValueOnce({
      ...PORTAL,
      self: { ...PORTAL.self!, membership: { id: 8, estado: "ACTIVA", personaId: 9, montoAplicado: "85.00", categoria: "Mensual", modalidad: "MENSUAL", franjaHoraria: "Tarde", fechaFin: "2999-12-31" } },
    });

    render(<StudentPage />);

    await screen.findByRole("heading", { name: /activa/i });
    expect(screen.queryByText("Renovar membresía")).not.toBeInTheDocument();
    expect(screen.queryByText("Registrar primer pago")).not.toBeInTheDocument();
  });
});
