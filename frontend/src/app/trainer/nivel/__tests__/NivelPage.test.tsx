/**
 * Component tests for NivelPage — single "Asignar Nivel" section (the
 * "Resultados Mensuales" tab was removed) plus its search/nivel filter.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NivelPage from "@/app/trainer/nivel/page";
import type { NivelConOcupacion } from "@/services/api";
import type { MemberAccount } from "@/app/members/members-utils";

vi.mock("@/components/ProtectedRoute", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockFetchMembers = vi.fn();
const mockAssignStudentToNivel = vi.fn();
const mockMoveStudentToNivel = vi.fn();

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
      grupoId: null,
      activo: true,
      membresia: null,
      ultimoPago: null,
    },
    {
      id: "11",
      nombres: "Pedro",
      apellidos: "Ramírez",
      grupoId: "1",
      activo: true,
      membresia: null,
      ultimoPago: null,
    },
  ],
};

describe("NivelPage", () => {
  beforeEach(() => {
    mockFetchMembers.mockReset();
    mockAssignStudentToNivel.mockReset();
    mockMoveStudentToNivel.mockReset();
    mockFetchMembers.mockResolvedValue({ accounts: [ACCOUNT], niveles: NIVELES });
  });

  it("no longer renders a 'Resultados Mensuales' tab or section", async () => {
    render(<NivelPage />);
    await screen.findByText("Sofía González");

    expect(screen.queryByText(/resultados mensuales/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("renders every student by default with the total count", async () => {
    render(<NivelPage />);
    await screen.findByText("Sofía González");

    expect(screen.getByText("Pedro Ramírez")).toBeInTheDocument();
    expect(screen.getByText("Estudiantes (2)")).toBeInTheDocument();
  });

  it("filters students by name (case-insensitive)", async () => {
    render(<NivelPage />);
    await screen.findByText("Sofía González");

    fireEvent.change(screen.getByLabelText(/buscar estudiante/i), { target: { value: "sofía" } });

    await waitFor(() => {
      expect(screen.getByText("Estudiantes (1)")).toBeInTheDocument();
    });
    expect(screen.getByText("Sofía González")).toBeInTheDocument();
    expect(screen.queryByText("Pedro Ramírez")).not.toBeInTheDocument();
  });

  it("filters students by current nivel", async () => {
    render(<NivelPage />);
    await screen.findByText("Sofía González");

    fireEvent.change(screen.getByLabelText(/filtrar por nivel actual/i), { target: { value: "1" } });

    await waitFor(() => {
      expect(screen.getByText("Estudiantes (1)")).toBeInTheDocument();
    });
    expect(screen.getByText("Pedro Ramírez")).toBeInTheDocument();
    expect(screen.queryByText("Sofía González")).not.toBeInTheDocument();
  });

  it("combines the name and nivel filters", async () => {
    render(<NivelPage />);
    await screen.findByText("Sofía González");

    fireEvent.change(screen.getByLabelText(/buscar estudiante/i), { target: { value: "sofía" } });
    fireEvent.change(screen.getByLabelText(/filtrar por nivel actual/i), { target: { value: "1" } });

    await waitFor(() => {
      expect(screen.getByText("No se encontraron estudiantes con ese criterio.")).toBeInTheDocument();
    });
  });

  it("shows an empty-filter state distinct from the no-students state", async () => {
    render(<NivelPage />);
    await screen.findByText("Sofía González");

    fireEvent.change(screen.getByLabelText(/buscar estudiante/i), { target: { value: "nadie-existe" } });

    await waitFor(() => {
      expect(screen.getByText("No se encontraron estudiantes con ese criterio.")).toBeInTheDocument();
    });
    expect(screen.queryByText("No hay estudiantes registrados.")).not.toBeInTheDocument();
  });
});
