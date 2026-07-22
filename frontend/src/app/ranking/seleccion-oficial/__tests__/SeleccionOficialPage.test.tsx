/**
 * Component tests for the dedicated Selección Oficial page (PR9).
 *
 * Extracted from the anchor-jump section that used to live inside
 * groups/page.tsx (`#seleccion-oficial`) — the app owner said the
 * smooth-scroll+highlight fix (PR4/PR7) still felt like an abrupt context
 * switch and asked for a dedicated screen instead. Covers: the page renders
 * under its own AppShell, the add-selection form submits via the unchanged
 * `seleccionOficial` API call, and the roster table reflects new entries.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import SeleccionOficialPage from "@/app/ranking/seleccion-oficial/page";
import type { MemberAccount } from "@/app/members/members-utils";

vi.mock("@/components/ProtectedRoute", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/ranking/seleccion-oficial",
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
const mockSeleccionOficial = vi.fn();
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
    seleccionOficial: (dto: unknown) => mockSeleccionOficial(dto),
    fetchNotificaciones: () => mockFetchNotificaciones(),
    marcarNotificacionLeida: (id: number) => mockMarcarNotificacionLeida(id),
    ApiClientError: MockApiClientError,
  };
});

const ACCOUNT: MemberAccount = {
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
      grupoId: "1",
      activo: true,
      membresia: null,
      ultimoPago: null,
    },
  ],
};

describe("SeleccionOficialPage", () => {
  beforeEach(() => {
    mockFetchMembers.mockReset();
    mockSeleccionOficial.mockReset();
    mockFetchMembers.mockResolvedValue({ accounts: [ACCOUNT], niveles: [] });
  });

  it("renders under its own AppShell with the Selección Oficial heading", async () => {
    render(<SeleccionOficialPage />);
    // AppShell's own <h1> title also reads "Selección Oficial" — assert on
    // the page-level heading specifically (level 1, the AppShell contract).
    expect(await screen.findByRole("heading", { name: /selección oficial/i, level: 1 })).toBeInTheDocument();
  });

  it("submits the form via the unchanged seleccionOficial API call and lists the new entry", async () => {
    mockSeleccionOficial.mockResolvedValue({
      id: "so-1",
      estudianteId: "10",
      categoria: 3,
      periodo: "2026-07",
    });

    render(<SeleccionOficialPage />);

    const studentSelect = await screen.findByLabelText(/estudiante/i);
    fireEvent.change(studentSelect, { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText(/categoría/i), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText(/período/i), { target: { value: "2026-07" } });
    fireEvent.click(screen.getByRole("button", { name: /agregar a selección oficial/i }));

    await waitFor(() => {
      expect(mockSeleccionOficial).toHaveBeenCalledWith({
        estudianteId: "10",
        categoria: 3,
        periodo: "2026-07",
      });
    });

    const table = await screen.findByRole("table");
    expect(within(table).getByText("Sofía González")).toBeInTheDocument();
  });
});
