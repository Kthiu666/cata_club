/**
 * Component tests for RankingPage's pagination (Issue #41).
 *
 * Covers all 4 in-scope lists on this page (spec appendix rows #13-16):
 *  - Asignar Nivel tab: students table (:275)
 *  - Resultados Mensuales tab: "Estudiante" select options (:445)
 *  - Resultados Mensuales tab: registered-results history table (:524)
 *  - Cierre de Mes tab: cerrados history table (:703)
 *
 * `students` (row #13/#14's shared source) is derived via
 * `buildRankingStudents(members)` directly in `RankingPage`'s render body —
 * NOT wrapped in `useMemo` before this change, so it gets a fresh array
 * reference on every `RankingPage` re-render (any state update: tab switch,
 * a registered resultado, a closed month), which — per the reset-to-page-1
 * gotcha discovered in PR2 — silently snaps rows #13/#14's pagination back
 * to page 1 on unrelated re-renders. Every "persists across re-render" test
 * below uses RTL's `rerender()` to force exactly that kind of re-render
 * without changing the underlying data, to specifically catch this bug
 * class (not just prove a single "next" click works once).
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import RankingPage from "@/app/trainer/ranking/page";
import type { MemberAccount } from "@/app/members/members-utils";
import type {
  NivelConOcupacion,
  RegistrarResultadoMensualDTO,
  CerrarMesDTO,
} from "@/services/api";

vi.mock("@/components/ProtectedRoute", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    session: {
      user: { id: "17", name: "Coach Torres", email: "coach@cataclub.com", role: "trainer", representanteId: null },
      roles: ["ENTRENADOR"],
      loggedInAt: "2026-07-01T12:00:00Z",
    },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

const mockFetchMembers = vi.fn();
const mockAssignStudentToNivel = vi.fn();
const mockMoveStudentToNivel = vi.fn();
const mockRegistrarResultadoMensual = vi.fn();
const mockCerrarMes = vi.fn();

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
    registrarResultadoMensual: (dto: RegistrarResultadoMensualDTO) => mockRegistrarResultadoMensual(dto),
    cerrarMes: (nivelId: number, dto: CerrarMesDTO) => mockCerrarMes(nivelId, dto),
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
];

function buildAccounts(count: number): MemberAccount[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `acc-${i + 1}`,
    role: "representante",
    nombres: "Familia",
    apellidos: `${i + 1}`,
    telefono: "0999999999",
    estudiantes: [
      {
        id: `${i + 1}`,
        nombres: "Estudiante",
        apellidos: `${i + 1}`,
        grupoId: null,
        activo: true,
        membresia: null,
        ultimoPago: null,
      },
    ],
  }));
}

const SINGLE_ACCOUNT: MemberAccount = {
  id: "acc-1",
  role: "representante",
  nombres: "Familia",
  apellidos: "Uno",
  telefono: "0999999999",
  estudiantes: [
    { id: "1", nombres: "Estudiante", apellidos: "Uno", grupoId: null, activo: true, membresia: null, ultimoPago: null },
  ],
};

describe("RankingPage — asignar nivel students pagination (Issue #41)", () => {
  beforeEach(() => {
    mockFetchMembers.mockReset();
    mockFetchMembers.mockResolvedValue({ accounts: buildAccounts(15), niveles: NIVELES });
  });

  it("renders only 10 students initially in the asignar-nivel table and shows pagination controls", async () => {
    render(<RankingPage />);

    expect(await screen.findByText("Estudiante 1")).toBeInTheDocument();
    expect(screen.queryByText("Estudiante 11")).not.toBeInTheDocument();
    expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
  });

  it("advances to the next page and persists across an unrelated re-render", async () => {
    const { rerender } = render(<RankingPage />);
    await screen.findByText("Estudiante 1");

    fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(await screen.findByText("Estudiante 11")).toBeInTheDocument();

    rerender(<RankingPage />);
    expect(screen.getByText("Estudiante 11")).toBeInTheDocument();
    expect(screen.queryByText("Estudiante 1")).not.toBeInTheDocument();
  });
});

describe("RankingPage — resultados-mensuales estudiante select pagination (Issue #41)", () => {
  beforeEach(() => {
    mockFetchMembers.mockReset();
    mockFetchMembers.mockResolvedValue({ accounts: buildAccounts(15), niveles: NIVELES });
  });

  it("caps the estudiante select to 10 options initially and shows pagination", async () => {
    render(<RankingPage />);
    await screen.findByText("Estudiante 1");
    fireEvent.click(screen.getByRole("tab", { name: "Resultados Mensuales" }));

    const select = await screen.findByRole("combobox", { name: "Estudiante" });
    expect(within(select).getByRole("option", { name: "Estudiante 1" })).toBeInTheDocument();
    expect(within(select).queryByRole("option", { name: "Estudiante 11" })).not.toBeInTheDocument();
    expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
  });

  it("advances the estudiante select to the next page and persists across an unrelated re-render", async () => {
    const { rerender } = render(<RankingPage />);
    await screen.findByText("Estudiante 1");
    fireEvent.click(screen.getByRole("tab", { name: "Resultados Mensuales" }));
    await screen.findByRole("combobox", { name: "Estudiante" });

    fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(
      within(screen.getByRole("combobox", { name: "Estudiante" })).getByRole("option", { name: "Estudiante 11" }),
    ).toBeInTheDocument();

    rerender(<RankingPage />);
    expect(
      within(screen.getByRole("combobox", { name: "Estudiante" })).getByRole("option", { name: "Estudiante 11" }),
    ).toBeInTheDocument();
  });
});

describe("RankingPage — resultados mensuales history pagination (Issue #41)", () => {
  beforeEach(() => {
    mockFetchMembers.mockReset();
    mockFetchMembers.mockResolvedValue({ accounts: [SINGLE_ACCOUNT], niveles: NIVELES });
    mockRegistrarResultadoMensual.mockReset();
    let counter = 0;
    mockRegistrarResultadoMensual.mockImplementation((dto: RegistrarResultadoMensualDTO) =>
      Promise.resolve({
        id: ++counter,
        personaId: dto.personaId,
        nivelRankingId: 1,
        anio: dto.anio,
        mes: dto.mes,
        posicion: dto.posicion ?? null,
        puntosObtenidos: 0,
        participo: dto.participo,
        ausenciaJustificada: false,
      }),
    );
  });

  async function registerResultados(n: number): Promise<void> {
    fireEvent.click(screen.getByRole("tab", { name: "Resultados Mensuales" }));
    const select = await screen.findByRole("combobox", { name: "Estudiante" });
    fireEvent.change(select, { target: { value: "1" } });
    const periodoInput = screen.getByLabelText("Período");
    for (let i = 0; i < n; i++) {
      const year = 2000 + i;
      fireEvent.change(periodoInput, { target: { value: `${year}-01` } });
      fireEvent.click(screen.getByRole("button", { name: /registrar resultado/i }));
      await waitFor(() => expect(mockRegistrarResultadoMensual).toHaveBeenCalledTimes(i + 1));
    }
  }

  it("renders only 10 results initially and shows pagination", async () => {
    render(<RankingPage />);
    await screen.findByText("Estudiante Uno");
    await registerResultados(15);

    expect(screen.getByText("2014-01")).toBeInTheDocument();
    expect(screen.queryByText("2004-01")).not.toBeInTheDocument();
    expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
  });

  it("advances the results history to the next page and persists across an unrelated re-render", async () => {
    const { rerender } = render(<RankingPage />);
    await screen.findByText("Estudiante Uno");
    await registerResultados(15);

    fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(await screen.findByText("2004-01")).toBeInTheDocument();

    rerender(<RankingPage />);
    expect(screen.getByText("2004-01")).toBeInTheDocument();
    expect(screen.queryByText("2014-01")).not.toBeInTheDocument();
  });
});

describe("RankingPage — meses cerrados history pagination (Issue #41)", () => {
  beforeEach(() => {
    mockFetchMembers.mockReset();
    mockFetchMembers.mockResolvedValue({ accounts: [SINGLE_ACCOUNT], niveles: NIVELES });
    mockCerrarMes.mockReset();
    mockCerrarMes.mockImplementation((nivelId: number, dto: CerrarMesDTO) =>
      Promise.resolve({
        nivelRankingId: nivelId,
        anio: dto.anio,
        mes: dto.mes,
        personasProcesadas: 0,
        personasEliminadas: [],
      }),
    );
  });

  async function closeCierres(n: number): Promise<void> {
    fireEvent.click(screen.getByRole("tab", { name: "Cierre de Mes" }));
    const nivelSelect = await screen.findByRole("combobox", { name: "Nivel" });
    fireEvent.change(nivelSelect, { target: { value: String(NIVELES[0].id) } });
    const periodoInput = screen.getByLabelText("Período");
    for (let i = 0; i < n; i++) {
      const year = 2000 + i;
      fireEvent.change(periodoInput, { target: { value: `${year}-01` } });
      fireEvent.click(screen.getByRole("button", { name: "Cerrar mes" }));
      const dialog = await screen.findByRole("dialog");
      fireEvent.click(within(dialog).getByRole("button", { name: "Cerrar mes" }));
      await waitFor(() => expect(mockCerrarMes).toHaveBeenCalledTimes(i + 1));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    }
  }

  it("renders only 10 cierres initially and shows pagination", async () => {
    render(<RankingPage />);
    await screen.findByText("Estudiante Uno");
    await closeCierres(15);

    expect(screen.getByText("2014-01")).toBeInTheDocument();
    expect(screen.queryByText("2004-01")).not.toBeInTheDocument();
    expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
  });

  it("advances the cierres history to the next page and persists across an unrelated re-render", async () => {
    const { rerender } = render(<RankingPage />);
    await screen.findByText("Estudiante Uno");
    await closeCierres(15);

    fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(await screen.findByText("2004-01")).toBeInTheDocument();

    rerender(<RankingPage />);
    expect(screen.getByText("2004-01")).toBeInTheDocument();
    expect(screen.queryByText("2014-01")).not.toBeInTheDocument();
  });
});
