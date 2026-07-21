/**
 * Horarios y Asistencia — Admin overview of training schedules and attendance.
 *
 * Admin can view real schedules (Horario, from `GET /asistencias/horarios`)
 * and attendance records (Asistencia, from `GET /asistencias/reportes`), both
 * proxied through `/api/attendance/*` (see src/lib/server/attendance-adapter.ts).
 * No CRUD operations yet — read-only, same as the original prototype.
 *
 * Domain rule: schedules are NOT trainer-owned. `entrenadorId` on a Horario
 * is the titular trainer by default; the attendance record itself carries
 * whoever actually registered it, which can differ (substitution).
 *
 * Backend gap: `HorarioResponseDTO` has no `cancha`, `cupoMaximo`, `activo`,
 * or nivel/group linkage — those existed only in the frontend mock and have
 * no real equivalent yet, so this page no longer shows them (see the
 * attendance-adapter.ts docstring for the full gap writeup).
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/shell/AppShell";
import {
  Calendar,
  Clock,
  UserCheck,
  GraduationCap,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock3,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { fetchTrainingSchedules, fetchAttendanceRecords } from "@/services/api";
import {
  buildAttendanceStats,
  getAttendanceBadgeTokens,
  DIA_SEMANA_LABELS,
  ATTENDANCE_LABELS,
  paginateRecords,
  getTotalPages,
  groupSchedulesByDay,
  type AttendanceRecord,
  type TrainingSchedule,
} from "./attendance-utils";

// ---------------------------------------------------------------------------
// Attendance state icon
// ---------------------------------------------------------------------------

interface AttendanceIconProps {
  estado: string;
}

function AttendanceIcon({ estado }: AttendanceIconProps): React.ReactElement {
  const { iconClass } = getAttendanceBadgeTokens(estado);
  switch (estado) {
    case "present":
      return <CheckCircle2 size={12} strokeWidth={2} className={iconClass} aria-hidden="true" />;
    case "absent":
      return <XCircle size={12} strokeWidth={2} className={iconClass} aria-hidden="true" />;
    case "late":
      return <Clock3 size={12} strokeWidth={2} className={iconClass} aria-hidden="true" />;
    case "justified":
      return <AlertTriangle size={12} strokeWidth={2} className={iconClass} aria-hidden="true" />;
    default:
      return <HelpCircle size={12} strokeWidth={2} className={iconClass} aria-hidden="true" />;
  }
}

interface AttendanceBadgeProps {
  estado: string;
}

function AttendanceBadge({ estado }: AttendanceBadgeProps): React.ReactElement {
  const base = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium";
  const { badgeClass } = getAttendanceBadgeTokens(estado);
  const safeLabel = ATTENDANCE_LABELS[estado as keyof typeof ATTENDANCE_LABELS] ?? "Desconocido";
  return (
    <span className={`${base} ${badgeClass}`}>
      <AttendanceIcon estado={estado} />
      {safeLabel}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Day filter buttons
// ---------------------------------------------------------------------------

const DAY_OPTIONS = [
  { value: "all", label: "Todos los días" },
  ...Object.entries(DIA_SEMANA_LABELS).map(([key, label]) => ({
    value: key,
    label,
  })),
] as const;

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function AttendancePage(): React.ReactElement {
  const [dayFilter, setDayFilter] = useState<string>("all");
  const [schedules, setSchedules] = useState<TrainingSchedule[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recordsPage, setRecordsPage] = useState(1);

  const loadData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const [scheduleData, recordData] = await Promise.all([
        fetchTrainingSchedules(),
        fetchAttendanceRecords(),
      ]);
      setSchedules(scheduleData);
      setRecords(recordData);
    } catch (err) {
      console.error("[attendance] loadData failed", err);
      setError("Error al cargar horarios y asistencias");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset to page 1 whenever the underlying records set changes (e.g. after
  // a reload), so the paginator never gets stuck on a stale/out-of-range page.
  useEffect(() => {
    setRecordsPage(1);
  }, [records]);

  const stats = buildAttendanceStats(records);

  const filteredSchedules =
    dayFilter === "all" ? schedules : schedules.filter((s) => s.diaSemana === dayFilter);

  const scheduleDayGroups = useMemo(
    () => groupSchedulesByDay(filteredSchedules),
    [filteredSchedules],
  );

  const recordsTotalPages = useMemo(() => getTotalPages(records.length), [records]);
  const paginatedRecords = useMemo(
    () => paginateRecords(records, recordsPage),
    [records, recordsPage],
  );

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AppShell
        eyebrow="Asistencia y horarios"
        title="Horarios y Asistencia"
        subtitle="Horarios de entrenamiento y registros de asistencia reales."
      >
        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-2">
              <Clock size={16} strokeWidth={1.5} className="animate-spin text-cata-text/65" aria-hidden="true" />
              <p className="text-sm text-cata-text/50">Cargando horarios y asistencias...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="card mb-8 border border-red-200 bg-red-50 p-6 text-center">
            <XCircle size={32} strokeWidth={1.5} className="mx-auto mb-3 text-red-700" aria-hidden="true" />
            <p className="text-sm text-cata-red">{error}</p>
            <button type="button" onClick={() => loadData()} className="btn-ghost mt-3 text-xs text-cata-red">
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Stats grid */}
            <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="card-hover p-5 sm:p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cata-red/15">
                    <Calendar size={22} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                  </div>
                </div>
                <p className="text-xs font-medium uppercase tracking-wider text-cata-text/65">Horarios</p>
                <p className="mt-1 text-3xl font-extrabold tracking-tight text-cata-text">
                  {schedules.length}
                </p>
              </div>

              <div className="card-hover p-5 sm:p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cata-red/15">
                    <UserCheck size={22} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                  </div>
                </div>
                <p className="text-xs font-medium uppercase tracking-wider text-cata-text/65">Asistencias registradas</p>
                <p className="mt-1 text-3xl font-extrabold tracking-tight text-cata-text">
                  {stats.totalStudents}
                </p>
              </div>

              <div className="card-hover p-5 sm:p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cata-red/15">
                    <CheckCircle2 size={22} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-cata-state-ok/10 px-2 py-0.5 text-[10px] font-semibold text-cata-state-ok">
                    <CheckCircle2 size={10} strokeWidth={2} aria-hidden="true" />
                    {stats.totalStudents > 0
                      ? `${Math.round((stats.totalPresent / stats.totalStudents) * 100)}%`
                      : "N/A"}
                  </span>
                </div>
                <p className="text-xs font-medium uppercase tracking-wider text-cata-text/65">Presentes</p>
                <p className="mt-1 text-3xl font-extrabold tracking-tight text-cata-text">
                  {stats.totalPresent}
                </p>
              </div>

              <div className="card-hover p-5 sm:p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cata-red/15">
                    <Clock3 size={22} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                  </div>
                </div>
                <p className="text-xs font-medium uppercase tracking-wider text-cata-text/65">Ausencias / Tardanzas</p>
                <p className="mt-1 text-3xl font-extrabold tracking-tight text-cata-text">
                  {stats.totalAbsent + stats.totalLate}
                </p>
                <p className="mt-1 text-xs text-cata-text/40">
                  {stats.totalAbsent} ausentes &middot; {stats.totalLate} tardanzas
                </p>
              </div>
            </div>

            {/* Schedules section */}
            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                  <h2 className="text-lg font-bold text-cata-text">
                    Horarios de Entrenamiento
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <Filter size={13} strokeWidth={1.5} className="text-cata-text/65" aria-hidden="true" />
                  <select
                    value={dayFilter}
                    onChange={(e) => setDayFilter(e.target.value)}
                    className="input-field py-1.5 pl-3 pr-8 text-xs"
                    aria-label="Filtrar por día"
                  >
                    {DAY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {scheduleDayGroups.length > 0 ? (
                <div className="space-y-5">
                  {scheduleDayGroups.map((group) => (
                    <div key={group.day}>
                      <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-cata-text">
                        <Calendar size={14} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                        {group.label}
                      </h3>
                      <div className="card overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead>
                              <tr className="border-b border-cata-border bg-cata-bg text-xs font-medium uppercase tracking-wider text-cata-text/65">
                                <th className="px-4 py-2 font-medium">Horario</th>
                                <th className="px-4 py-2 font-medium">Entrenador</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-cata-border">
                              {group.schedules.map((slot) => (
                                <tr key={slot.id} className="transition-colors hover:bg-cata-bg">
                                  <td className="px-4 py-2 text-xs text-cata-text">
                                    <span className="flex items-center gap-1.5">
                                      <Clock size={12} strokeWidth={1.5} className="text-cata-red/70" aria-hidden="true" />
                                      {slot.horaInicio}–{slot.horaFin}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-xs text-cata-text/65">
                                    <span className="flex items-center gap-1.5">
                                      <UserCheck size={12} strokeWidth={1.5} aria-hidden="true" />
                                      {slot.entrenadorNombre}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card flex flex-col items-center py-12 text-center">
                  <Calendar size={32} strokeWidth={1.5} className="mb-3 text-cata-text/20" aria-hidden="true" />
                  <p className="text-sm text-cata-text/50">
                    No hay horarios para el día seleccionado.
                  </p>
                </div>
              )}
            </div>

            {/* Recent attendance section */}
            <div className="mb-8">
              <div className="mb-4 flex items-center gap-2">
                <UserCheck size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                <h2 className="text-lg font-bold text-cata-text">
                  Registros de Asistencia
                </h2>
              </div>

              {records.length > 0 ? (
                <>
                  <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-cata-border bg-cata-bg text-xs font-medium uppercase tracking-wider text-cata-text/65">
                            <th className="px-4 py-3 font-medium">Fecha</th>
                            <th className="px-4 py-3 font-medium">Horario</th>
                            <th className="px-4 py-3 font-medium">Estudiante</th>
                            <th className="px-4 py-3 font-medium">Estado</th>
                            <th className="px-4 py-3 font-medium">Registrado por</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-cata-border">
                          {paginatedRecords.map((record) => (
                            <tr key={record.id} className="transition-colors hover:bg-cata-bg">
                              <td className="px-4 py-3 text-xs text-cata-text/65">
                                {record.fecha}
                              </td>
                              <td className="px-4 py-3 text-xs text-cata-text">
                                {record.horario}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-cata-text">
                                {record.estudiante}
                              </td>
                              <td className="px-4 py-3">
                                <AttendanceBadge estado={record.estado} />
                              </td>
                              <td className="px-4 py-3 text-xs text-cata-text/65">
                                <span className="flex items-center gap-1.5">
                                  <UserCheck size={11} strokeWidth={1.5} aria-hidden="true" />
                                  {record.entrenador}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {recordsTotalPages > 1 && (
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xs text-cata-text/50">
                        Página {recordsPage} de {recordsTotalPages}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setRecordsPage((p) => Math.max(1, p - 1))}
                          disabled={recordsPage <= 1}
                          className="btn-ghost px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Página anterior"
                        >
                          <ChevronLeft size={14} strokeWidth={1.5} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setRecordsPage((p) => Math.min(recordsTotalPages, p + 1))}
                          disabled={recordsPage >= recordsTotalPages}
                          className="btn-ghost px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Página siguiente"
                        >
                          <ChevronRight size={14} strokeWidth={1.5} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="card flex flex-col items-center py-12 text-center">
                  <UserCheck size={32} strokeWidth={1.5} className="mb-3 text-cata-text/20" aria-hidden="true" />
                  <p className="text-sm text-cata-text/50">
                    Aún no hay registros de asistencia.
                  </p>
                </div>
              )}
            </div>

            {/* Domain info card */}
            <div className="rounded-2xl border border-cata-border bg-cata-bg p-6">
              <div className="mb-3 flex items-center gap-2">
                <GraduationCap size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                <h3 className="text-sm font-bold text-cata-text">Modelo de dominio</h3>
              </div>
              <p className="text-sm leading-relaxed text-cata-text/65">
                Los <strong className="text-cata-text">horarios</strong> tienen un entrenador titular
                asignado por defecto, pero no está fijo: el registro de{" "}
                <strong className="text-cata-text">asistencia</strong> almacena qué entrenador dictó
                realmente cada sesión, que puede diferir del titular en caso de sustitución.
              </p>
            </div>
          </>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}
