/**
 * Component tests for ClasesExtraPage pagination (Issue #41).
 *
 * Covers the pending-solicitudes list, which must paginate client-side at
 * 10/page via the shared `usePagination`/`<Pagination>` surface.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ClasesExtraPage from "@/app/clases-extra/page";
import type { SolicitudClaseExtra } from "@/types/domain";

vi.mock("@/components/ProtectedRoute", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/clases-extra",
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

const mockFetchClasesExtraPendientes = vi.fn();
const mockResolverClaseExtra = vi.fn();
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
    fetchClasesExtraPendientes: () => mockFetchClasesExtraPendientes(),
    resolverClaseExtra: (id: number, dto: unknown) => mockResolverClaseExtra(id, dto),
    fetchNotificaciones: () => mockFetchNotificaciones(),
    marcarNotificacionLeida: (id: number) => mockMarcarNotificacionLeida(id),
    ApiClientError: MockApiClientError,
  };
});

function buildSolicitudes(count: number): SolicitudClaseExtra[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    fechaClaseSolicitada: "2026-07-10",
    estado: "PENDIENTE",
    costoAdicional: null,
    fechaSolicitud: "2026-07-01T00:00:00.000Z",
    observaciones: null,
    personaId: i + 1,
    personaNombreCompleto: `Persona ${i + 1}`,
    membresiaId: 1,
    horarioId: 1,
    horarioDiaSemana: "LUNES",
    horarioHoraInicio: "15:00:00",
    horarioHoraFin: "16:00:00",
  }));
}

describe("ClasesExtraPage — pagination (Issue #41)", () => {
  beforeEach(() => {
    mockFetchClasesExtraPendientes.mockReset();
    mockFetchClasesExtraPendientes.mockResolvedValue(buildSolicitudes(15));
  });

  it("renders only 10 solicitudes initially and shows pagination controls", async () => {
    render(<ClasesExtraPage />);

    expect(await screen.findByText("Persona 1")).toBeInTheDocument();
    expect(screen.queryByText("Persona 11")).not.toBeInTheDocument();
    expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
  });

  it("advances to the next page and back when Siguiente/Anterior are clicked", async () => {
    render(<ClasesExtraPage />);

    await screen.findByText("Persona 1");
    fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));

    expect(await screen.findByText("Persona 11")).toBeInTheDocument();
    expect(screen.queryByText("Persona 1")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /anterior/i }));
    expect(await screen.findByText("Persona 1")).toBeInTheDocument();
  });
});
