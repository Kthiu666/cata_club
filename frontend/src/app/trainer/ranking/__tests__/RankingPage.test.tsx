/**
 * Component tests for the trainer Ranking page's "Asignar Nivel" tab:
 *  - a text search that filters the student table by name (additive,
 *    client-side only), and
 *  - a color-coded badge for each student's current nivel, reusing the
 *    existing LEVEL_BADGE convention (src/app/groups/groups-page-utils.ts).
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import RankingPage from "@/app/trainer/ranking/page";
import { createAuthenticatedAuth } from "@/components/__tests__/test-utils";

vi.mock("@/components/ProtectedRoute", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => createAuthenticatedAuth("trainer", "Coach Torres"),
}));

const mockFetchMembers = vi.fn();
const mockAssignStudentToNivel = vi.fn();
const mockMoveStudentToNivel = vi.fn();

vi.mock("@/services/api", () => ({
  fetchMembers: () => mockFetchMembers(),
  assignStudentToNivel: (personaId: number, nivelId: number) => mockAssignStudentToNivel(personaId, nivelId),
  moveStudentToNivel: (personaId: number, nivelId: number) => mockMoveStudentToNivel(personaId, nivelId),
  registrarResultadoMensual: vi.fn(),
  cerrarMes: vi.fn(),
  ApiClientError: class ApiClientError extends Error {},
}));

const NIVELES = [
  { id: 1, numeroNivel: 1, nombre: "Nivel 1", capacidadMinima: 0, capacidadMaxima: 10, personasActuales: 1, cuposDisponibles: 9, necesitaRevision: false, nivelCategoria: "principiante" as const },
  { id: 2, numeroNivel: 2, nombre: "Nivel 2", capacidadMinima: 0, capacidadMaxima: 10, personasActuales: 1, cuposDisponibles: 9, necesitaRevision: false, nivelCategoria: "avanzado" as const },
];

const ACCOUNTS = [
  {
    id: "acc-1",
    role: "representante" as const,
    nombres: "Padre",
    apellidos: "Uno",
    telefono: "0000",
    estudiantes: [
      { id: "10", nombres: "Ana", apellidos: "López", activo: true, grupoId: "1" },
      { id: "11", nombres: "Carlos", apellidos: "Martínez", activo: true, grupoId: "2" },
      { id: "12", nombres: "Beatriz", apellidos: "Núñez", activo: true, grupoId: null },
    ],
  },
];

describe("RankingPage — AsignarNivelTab search + level-color badge", () => {
  beforeEach(() => {
    mockFetchMembers.mockReset().mockResolvedValue({ accounts: ACCOUNTS, niveles: NIVELES, personasCapped: false });
    mockAssignStudentToNivel.mockReset();
    mockMoveStudentToNivel.mockReset();
  });

  it("renders every student before searching", async () => {
    render(<RankingPage />);

    expect(await screen.findByText("Ana López")).toBeInTheDocument();
    expect(screen.getByText("Carlos Martínez")).toBeInTheDocument();
    expect(screen.getByText("Beatriz Núñez")).toBeInTheDocument();
  });

  it("filters the table by name (case-insensitive substring)", async () => {
    render(<RankingPage />);
    await screen.findByText("Ana López");

    fireEvent.change(screen.getByPlaceholderText("Buscar alumno..."), { target: { value: "ana" } });

    expect(screen.getByText("Ana López")).toBeInTheDocument();
    expect(screen.queryByText("Carlos Martínez")).not.toBeInTheDocument();
    expect(screen.queryByText("Beatriz Núñez")).not.toBeInTheDocument();
  });

  it("filters by a different substring, matching apellidos (triangulation)", async () => {
    render(<RankingPage />);
    await screen.findByText("Ana López");

    fireEvent.change(screen.getByPlaceholderText("Buscar alumno..."), { target: { value: "núñez" } });

    expect(screen.getByText("Beatriz Núñez")).toBeInTheDocument();
    expect(screen.queryByText("Ana López")).not.toBeInTheDocument();
    expect(screen.queryByText("Carlos Martínez")).not.toBeInTheDocument();
  });

  /** The "Nivel actual" `<td>` is the 2nd column — scoped to avoid matching the "Nuevo nivel" `<select>`'s `<option>` in the same row. */
  function nivelActualCell(studentDisplayName: string): HTMLElement {
    const row = screen.getByText(studentDisplayName).closest("tr");
    if (!row) throw new Error("row not found");
    const cell = row.querySelectorAll("td")[1];
    if (!cell) throw new Error("Nivel actual cell not found");
    return cell as HTMLElement;
  }

  it("renders a principiante-colored badge for a student in nivel 1", async () => {
    render(<RankingPage />);
    await screen.findByText("Ana López");

    const badge = within(nivelActualCell("Ana López")).getByText("Principiante");
    expect(badge.tagName).toBe("SPAN");
    expect(badge).toHaveClass("text-cata-state-ok");
  });

  it("renders an avanzado-colored badge for a student in nivel 2 (triangulation)", async () => {
    render(<RankingPage />);
    await screen.findByText("Carlos Martínez");

    const badge = within(nivelActualCell("Carlos Martínez")).getByText("Avanzado");
    expect(badge.tagName).toBe("SPAN");
    expect(badge).toHaveClass("text-cata-red");
  });

  it("preserves the existing assign flow for an unassigned student", async () => {
    mockAssignStudentToNivel.mockResolvedValue(undefined);
    render(<RankingPage />);
    await screen.findByText("Beatriz Núñez");

    const row = screen.getByText("Beatriz Núñez").closest("tr");
    if (!row) throw new Error("row not found");
    fireEvent.change(within(row).getByLabelText("Nuevo nivel para Beatriz Núñez"), { target: { value: "1" } });
    fireEvent.click(within(row).getByRole("button", { name: "Asignar" }));

    await waitFor(() => expect(mockAssignStudentToNivel).toHaveBeenCalledWith(12, 1));
  });
});
