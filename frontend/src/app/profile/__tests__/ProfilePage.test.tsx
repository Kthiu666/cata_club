/**
 * Component tests for ProfilePage (issue #36) — the role-differentiated
 * `/profile` screen that replaced the old same-for-all-roles "under
 * construction" placeholder (issue #35).
 *
 * Mirrors the mocking pattern established by StudentPage.test.tsx /
 * ProtectedRoute.test.tsx (ProtectedRoute passthrough, next/navigation,
 * AuthContext, @/services/api all stubbed).
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProfilePage from "@/app/profile/page";
import type { PerfilPropio } from "@/types/domain";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/components/ProtectedRoute", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const mockFetchMiPerfil = vi.fn();
const mockActualizarMiPerfil = vi.fn();
const mockSolicitarRecuperacion = vi.fn();
const mockFetchStudentPortal = vi.fn();

vi.mock("@/services/api", () => ({
  fetchMiPerfil: () => mockFetchMiPerfil(),
  actualizarMiPerfil: (data: unknown) => mockActualizarMiPerfil(data),
  solicitarRecuperacion: (correo: string) => mockSolicitarRecuperacion(correo),
  fetchStudentPortal: (personaId: string) => mockFetchStudentPortal(personaId),
  ApiClientError: class ApiClientError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = "ApiClientError";
      this.status = status;
    }
  },
}));

import { useAuth } from "@/contexts/AuthContext";
const mockUseAuth = vi.mocked(useAuth);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ADMIN_SESSION = {
  session: {
    user: {
      id: "1",
      name: "Ana Admin",
      email: "ana.admin@cataclub.com",
      role: "admin" as const,
      representanteId: null,
    },
    roles: ["ADMINISTRADOR"],
    loggedInAt: "2026-07-01T12:00:00Z",
  },
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  refreshSession: vi.fn(),
};

function sessionForRole(role: "admin" | "trainer" | "representante" | "estudiante") {
  const user =
    role === "estudiante"
      ? { ...ADMIN_SESSION.session.user, role, grupoId: null, activo: true }
      : { ...ADMIN_SESSION.session.user, role };

  return {
    ...ADMIN_SESSION,
    session: { ...ADMIN_SESSION.session, user },
  };
}

const PERFIL_ADMIN: PerfilPropio = {
  correo: "ana.admin@cataclub.com",
  personaId: 1,
  nombres: "Ana",
  apellidos: "Admin",
  roles: ["ADMINISTRADOR"],
  telefono: "099111222",
  fechaCreacion: "2024-03-10T14:22:05.123456",
};

beforeEach(() => {
  mockReplace.mockReset();
  mockFetchMiPerfil.mockReset();
  mockActualizarMiPerfil.mockReset();
  mockSolicitarRecuperacion.mockReset();
  mockFetchStudentPortal.mockReset();
  mockUseAuth.mockReset();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ProfilePage — staff view (ADMINISTRADOR/ENTRENADOR)", () => {
  it("renders the authenticated staff user's own identity fields", async () => {
    mockUseAuth.mockReturnValue(sessionForRole("admin"));
    mockFetchMiPerfil.mockResolvedValueOnce(PERFIL_ADMIN);

    render(<ProfilePage />);

    expect(await screen.findByText("Ana Admin")).toBeInTheDocument();
    expect(screen.getByText("ana.admin@cataclub.com")).toBeInTheDocument();
    expect(screen.getByText("099111222")).toBeInTheDocument();
    expect(screen.getByText("ADMINISTRADOR")).toBeInTheDocument();
    expect(screen.getByText(/miembro desde/i)).toBeInTheDocument();
    expect(screen.getByText("10 de marzo de 2024")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("renders the same staff fields for an ENTRENADOR session (triangulation)", async () => {
    mockUseAuth.mockReturnValue(sessionForRole("trainer"));
    mockFetchMiPerfil.mockResolvedValueOnce({
      ...PERFIL_ADMIN,
      correo: "carla.entrenadora@cataclub.com",
      nombres: "Carla",
      apellidos: "Entrenadora",
      roles: ["ENTRENADOR"],
      telefono: "099333444",
      fechaCreacion: "2025-11-02T08:00:00",
    });

    render(<ProfilePage />);

    expect(await screen.findByText("Carla Entrenadora")).toBeInTheDocument();
    expect(screen.getByText("carla.entrenadora@cataclub.com")).toBeInTheDocument();
    expect(screen.getByText("ENTRENADOR")).toBeInTheDocument();
    // Different fechaCreacion than the admin fixture — proves the "Miembro
    // desde" date is computed from `perfil.fechaCreacion`, not hardcoded.
    expect(screen.getByText("2 de noviembre de 2025")).toBeInTheDocument();
  });

  it("does not render nombres/apellidos/roles as editable inputs", async () => {
    mockUseAuth.mockReturnValue(sessionForRole("admin"));
    mockFetchMiPerfil.mockResolvedValueOnce(PERFIL_ADMIN);

    render(<ProfilePage />);

    await screen.findByText("Ana Admin");
    expect(screen.queryByDisplayValue("Ana")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Admin")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("ADMINISTRADOR")).not.toBeInTheDocument();
  });
});

describe("ProfilePage — student/representante summary view", () => {
  it("renders a summary card for the estudiante's own profile with ranking and membership status", async () => {
    mockUseAuth.mockReturnValue(sessionForRole("estudiante"));
    mockFetchStudentPortal.mockResolvedValueOnce({
      self: {
        personaId: "1",
        nombres: "Sofía",
        apellidos: "Alumna",
        fechaNacimiento: "2012-05-10",
        ranking: {
          status: "available",
          posicionActual: 3,
          puntajeAcumulado: 120,
          nivelNombre: "Nivel 3",
          estaEnRanking: true,
        },
        recentSessions: [],
      },
      representados: [],
      membershipPlans: [],
      memberships: [{ id: 1, estado: "ACTIVA", personaId: 1 }],
    });

    render(<ProfilePage />);

    expect(await screen.findByText("Sofía Alumna")).toBeInTheDocument();
    expect(screen.getByText("Nivel 3")).toBeInTheDocument();
    expect(screen.getByText("Activa")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockFetchMiPerfil).not.toHaveBeenCalled();
  });

  it("shows the honest 'no disponible' fallback when self has no matching membership row", async () => {
    mockUseAuth.mockReturnValue(sessionForRole("estudiante"));
    mockFetchStudentPortal.mockResolvedValueOnce({
      self: {
        personaId: "1",
        nombres: "Sofía",
        apellidos: "Alumna",
        fechaNacimiento: "2012-05-10",
        ranking: { status: "unavailable", reason: "error" },
        recentSessions: [],
      },
      representados: [],
      membershipPlans: [],
      memberships: [],
    });

    render(<ProfilePage />);

    expect(await screen.findByText("Sofía Alumna")).toBeInTheDocument();
    expect(screen.getByText("No disponible — consulte con administración")).toBeInTheDocument();
  });

  it("renders one summary card per representado for a representante session, always showing the honest 'no disponible' fallback for their membership (the backend never scopes /membresias/mias to a dependent, only to the caller) (triangulation)", async () => {
    mockUseAuth.mockReturnValue(sessionForRole("representante"));
    mockFetchStudentPortal.mockResolvedValueOnce({
      self: null,
      representados: [
        {
          personaId: "20",
          nombres: "Juan",
          apellidos: "Hijo",
          fechaNacimiento: "2014-02-01",
          ranking: { status: "unavailable", reason: "forbidden" },
          recentSessions: [],
        },
        {
          personaId: "21",
          nombres: "Ana",
          apellidos: "Hija",
          fechaNacimiento: "2016-08-15",
          ranking: { status: "unavailable", reason: "forbidden" },
          recentSessions: [],
        },
      ],
      membershipPlans: [],
      // Realistic shape: /membresias/mias only ever scopes to the caller
      // (the representante), never to a represented dependent — so this
      // array is always irrelevant for representado cards, whatever it
      // contains.
      memberships: [{ id: 5, estado: "VENCIDA", personaId: 999 }],
    });

    render(<ProfilePage />);

    expect(await screen.findByText("Juan Hijo")).toBeInTheDocument();
    expect(screen.getByText("Ana Hija")).toBeInTheDocument();
    expect(screen.getAllByText("No disponible — consulte con administración")).toHaveLength(2);
    expect(screen.queryByText("Vencida")).not.toBeInTheDocument();
    expect(mockFetchMiPerfil).not.toHaveBeenCalled();
  });

  it("shows the real membership status for self alongside representados who correctly get the 'no disponible' fallback (owner-scoping regression test)", async () => {
    mockUseAuth.mockReturnValue(sessionForRole("representante"));
    mockFetchStudentPortal.mockResolvedValueOnce({
      self: {
        personaId: "1",
        nombres: "Rosa",
        apellidos: "Representante",
        fechaNacimiento: "1985-03-01",
        ranking: { status: "unavailable", reason: "forbidden" },
        recentSessions: [],
      },
      representados: [
        {
          personaId: "20",
          nombres: "Juan",
          apellidos: "Hijo",
          fechaNacimiento: "2014-02-01",
          ranking: { status: "unavailable", reason: "forbidden" },
          recentSessions: [],
        },
      ],
      membershipPlans: [],
      // Only the caller's (self, personaId "1") own membership is ever
      // present — this is the real /membresias/mias contract.
      memberships: [{ id: 9, estado: "ACTIVA", personaId: 1 }],
    });

    render(<ProfilePage />);

    expect(await screen.findByText("Rosa Representante")).toBeInTheDocument();
    expect(screen.getByText("Juan Hijo")).toBeInTheDocument();
    expect(screen.getByText("Activa")).toBeInTheDocument();
    expect(screen.getByText("No disponible — consulte con administración")).toBeInTheDocument();
  });

  it("includes a link to the full /student portal for detail", async () => {
    mockUseAuth.mockReturnValue(sessionForRole("estudiante"));
    mockFetchStudentPortal.mockResolvedValueOnce({
      self: {
        personaId: "1",
        nombres: "Sofía",
        apellidos: "Alumna",
        fechaNacimiento: "2012-05-10",
        ranking: { status: "unavailable", reason: "error" },
        recentSessions: [],
      },
      representados: [],
      membershipPlans: [],
      memberships: [],
    });

    render(<ProfilePage />);

    await screen.findByText("Sofía Alumna");
    const link = screen.getByRole("link", { name: /ver portal completo/i });
    expect(link).toHaveAttribute("href", "/student");
  });

  it("shows a loading state and then an error with retry when the portal fetch fails", async () => {
    mockUseAuth.mockReturnValue(sessionForRole("estudiante"));
    mockFetchStudentPortal.mockRejectedValueOnce(new Error("No se pudo cargar su cuenta."));

    render(<ProfilePage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cargar su cuenta.");
    expect(screen.getByRole("button", { name: /reintentar/i })).toBeInTheDocument();
  });
});

describe("ProfilePage — inline correo/teléfono edit", () => {
  it("saves a new correo/teléfono and displays the updated values", async () => {
    mockUseAuth.mockReturnValue(sessionForRole("admin"));
    mockFetchMiPerfil.mockResolvedValueOnce(PERFIL_ADMIN);
    mockActualizarMiPerfil.mockResolvedValueOnce({
      ...PERFIL_ADMIN,
      correo: "ana.nueva@cataclub.com",
      telefono: "099999000",
    });

    render(<ProfilePage />);
    await screen.findByText("Ana Admin");

    fireEvent.click(screen.getByRole("button", { name: /editar/i }));

    const correoInput = screen.getByLabelText(/correo electrónico/i);
    fireEvent.change(correoInput, { target: { value: "ana.nueva@cataclub.com" } });

    const telefonoInput = screen.getByLabelText(/teléfono/i);
    fireEvent.change(telefonoInput, { target: { value: "099999000" } });

    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(mockActualizarMiPerfil).toHaveBeenCalledWith({
        correo: "ana.nueva@cataclub.com",
        telefono: "099999000",
      });
    });
    expect(await screen.findByText("ana.nueva@cataclub.com")).toBeInTheDocument();
    expect(screen.getByText("099999000")).toBeInTheDocument();
  });

  it("surfaces an error and keeps the previously saved values displayed when the save fails", async () => {
    mockUseAuth.mockReturnValue(sessionForRole("admin"));
    mockFetchMiPerfil.mockResolvedValueOnce(PERFIL_ADMIN);
    mockActualizarMiPerfil.mockRejectedValueOnce(new Error("El correo ya está en uso."));

    render(<ProfilePage />);
    await screen.findByText("Ana Admin");

    fireEvent.click(screen.getByRole("button", { name: /editar/i }));
    const correoInput = screen.getByLabelText(/correo electrónico/i);
    fireEvent.change(correoInput, { target: { value: "duplicado@cataclub.com" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("El correo ya está en uso.");
    expect(screen.getByText("ana.admin@cataclub.com")).toBeInTheDocument();
    expect(screen.queryByText("duplicado@cataclub.com")).not.toBeInTheDocument();
  });
});

describe("ProfilePage — change password", () => {
  it("triggers the recovery-email flow for the logged-in user's own correo", async () => {
    mockUseAuth.mockReturnValue(sessionForRole("admin"));
    mockFetchMiPerfil.mockResolvedValueOnce(PERFIL_ADMIN);
    mockSolicitarRecuperacion.mockResolvedValueOnce({
      mensaje: "Si el correo está registrado, recibirá un enlace de recuperación.",
    });

    render(<ProfilePage />);
    await screen.findByText("Ana Admin");

    fireEvent.click(screen.getByRole("button", { name: /cambiar contraseña/i }));

    await waitFor(() => {
      expect(mockSolicitarRecuperacion).toHaveBeenCalledWith("ana.admin@cataclub.com");
    });
    expect(
      await screen.findByText("Si el correo está registrado, recibirá un enlace de recuperación."),
    ).toBeInTheDocument();
  });

  it("surfaces an error message when the recovery-email request fails (triangulation)", async () => {
    mockUseAuth.mockReturnValue(sessionForRole("admin"));
    mockFetchMiPerfil.mockResolvedValueOnce(PERFIL_ADMIN);
    mockSolicitarRecuperacion.mockRejectedValueOnce(new Error("No se pudo enviar el correo."));

    render(<ProfilePage />);
    await screen.findByText("Ana Admin");

    fireEvent.click(screen.getByRole("button", { name: /cambiar contraseña/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo enviar el correo.");
  });

  it("uses the just-saved correo, not the stale AuthContext session email, after an in-place correo edit", async () => {
    // Regression test: AuthContext only revalidates on a 5-minute interval or
    // tab-visibility change, so session.user.email can be stale right after
    // a successful correo edit. accountEmail must prefer the freshly-saved
    // perfil.correo over the cached session email.
    mockUseAuth.mockReturnValue(sessionForRole("admin"));
    mockFetchMiPerfil.mockResolvedValueOnce(PERFIL_ADMIN);
    mockActualizarMiPerfil.mockResolvedValueOnce({
      ...PERFIL_ADMIN,
      correo: "ana.nueva@cataclub.com",
    });
    mockSolicitarRecuperacion.mockResolvedValueOnce({
      mensaje: "Si el correo está registrado, recibirá un enlace de recuperación.",
    });

    render(<ProfilePage />);
    await screen.findByText("Ana Admin");

    fireEvent.click(screen.getByRole("button", { name: /editar/i }));
    fireEvent.change(screen.getByLabelText(/correo electrónico/i), {
      target: { value: "ana.nueva@cataclub.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));
    await screen.findByText("ana.nueva@cataclub.com");

    fireEvent.click(screen.getByRole("button", { name: /cambiar contraseña/i }));

    await waitFor(() => {
      expect(mockSolicitarRecuperacion).toHaveBeenCalledWith("ana.nueva@cataclub.com");
    });
    expect(mockSolicitarRecuperacion).not.toHaveBeenCalledWith("ana.admin@cataclub.com");
  });
});
