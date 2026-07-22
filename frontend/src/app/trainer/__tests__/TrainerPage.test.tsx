/**
 * Component tests for the trainer dashboard's new "Asistencias Recientes"
 * list with filters (recent-attendance, last-7-days default window).
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TrainerPage from "@/app/trainer/page";
import type { TrainingSchedule, AttendanceRecord } from "@/app/attendance/attendance-utils";
import { createAuthenticatedAuth } from "@/components/__tests__/test-utils";

vi.mock("@/components/ProtectedRoute", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => createAuthenticatedAuth("trainer", "Coach Martinez"),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/trainer",
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

const SCHEDULES: TrainingSchedule[] = [
  { id: 1, diaSemana: "lun", horaInicio: "15:00", horaFin: "16:30", entrenadorId: 42, entrenadorNombre: "Coach Martinez" },
  { id: 2, diaSemana: "mar", horaInicio: "17:00", horaFin: "18:00", entrenadorId: 42, entrenadorNombre: "Coach Martinez" },
];

const RECENT_RECORDS: AttendanceRecord[] = [
  { id: "att-1", fecha: "2026-07-20", horario: "Lunes 15:00", estudiante: "Ana López", estado: "present", entrenador: "Coach Martinez" },
  { id: "att-2", fecha: "2026-07-21", horario: "Martes 17:00", estudiante: "Carlos Ruiz", estado: "absent", entrenador: "Coach Martinez" },
];

const mockFetchTrainingSchedules = vi.fn();
const mockFetchAttendanceRecords = vi.fn();

vi.mock("@/services/api", () => ({
  fetchTrainingSchedules: () => mockFetchTrainingSchedules(),
  fetchAttendanceRecords: (params?: unknown) => mockFetchAttendanceRecords(params),
}));

/** True for a single-day range (today's stat cards fetch, not the recent list). */
function isSingleDayRange(params: { fechaInicio?: string; fechaFin?: string } | undefined): boolean {
  return !!params && params.fechaInicio === params.fechaFin;
}

describe("TrainerPage — Asistencias Recientes list", () => {
  beforeEach(() => {
    mockFetchTrainingSchedules.mockReset().mockResolvedValue(SCHEDULES);
    mockFetchAttendanceRecords.mockReset().mockImplementation((params) =>
      Promise.resolve(isSingleDayRange(params) ? [] : RECENT_RECORDS),
    );
  });

  it("renders recent attendance records with estudiante, fecha, horario and estado", async () => {
    render(<TrainerPage />);

    expect(await screen.findByText("Ana López")).toBeInTheDocument();
    expect(screen.getByText("Carlos Ruiz")).toBeInTheDocument();
    expect(screen.getByText("2026-07-20")).toBeInTheDocument();
    expect(screen.getByText("Lunes 15:00")).toBeInTheDocument();
    expect(screen.getByText("Presente")).toBeInTheDocument();
    expect(screen.getByText("Ausente")).toBeInTheDocument();
  });

  it("defaults the date filters to the last 7 days", async () => {
    render(<TrainerPage />);
    await screen.findByText("Ana López");

    const recentCall = mockFetchAttendanceRecords.mock.calls.find(
      (call) => !isSingleDayRange(call[0]),
    );
    expect(recentCall?.[0]).toMatchObject({ fechaInicio: expect.any(String), fechaFin: expect.any(String) });
    const start = new Date(recentCall![0].fechaInicio);
    const end = new Date(recentCall![0].fechaFin);
    const diffDays = Math.round((end.getTime() - start.getTime()) / 86_400_000);
    expect(diffDays).toBe(6); // 7-day inclusive window
  });

  it("re-fetches with the selected horario filter", async () => {
    render(<TrainerPage />);
    await screen.findByText("Ana López");
    mockFetchAttendanceRecords.mockClear();

    fireEvent.change(screen.getByLabelText("Filtrar por horario"), { target: { value: "2" } });

    await waitFor(() => {
      expect(mockFetchAttendanceRecords).toHaveBeenCalledWith(
        expect.objectContaining({ horarioId: 2 }),
      );
    });
  });

  it("shows an empty state when there are no records in range", async () => {
    mockFetchAttendanceRecords.mockImplementation(() => Promise.resolve([]));
    render(<TrainerPage />);

    expect(await screen.findByText(/no hay asistencias registradas/i)).toBeInTheDocument();
  });

  it("shows an error state with Reintentar that retries the fetch", async () => {
    mockFetchAttendanceRecords.mockImplementation((params) =>
      isSingleDayRange(params) ? Promise.resolve([]) : Promise.reject(new Error("boom")),
    );
    render(<TrainerPage />);

    expect(await screen.findByText(/error al cargar las asistencias recientes/i)).toBeInTheDocument();
    const retryButtons = screen.getAllByRole("button", { name: "Reintentar" });
    expect(retryButtons.length).toBeGreaterThan(0);

    mockFetchAttendanceRecords.mockImplementation((params) =>
      Promise.resolve(isSingleDayRange(params) ? [] : RECENT_RECORDS),
    );
    fireEvent.click(retryButtons[retryButtons.length - 1]);

    expect(await screen.findByText("Ana López")).toBeInTheDocument();
  });
});
