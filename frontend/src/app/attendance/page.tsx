/**
 * Horarios y Asistencia — Admin overview of training schedules and attendance.
 *
 * First iteration: admin can view available schedules (Horario) and recent
 * attendance records (Asistencia). No CRUD operations yet.
 *
 * Domain rule: schedules are NOT trainer-owned. Attendance records show which
 * trainer registered attendance for each session.
 *
 * Frontend-only mock — no backend integration.
 */

"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  Calendar,
  Clock,
  Users,
  UserCheck,
  MapPin,
  GraduationCap,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock3,
  HelpCircle,
} from "lucide-react";
import {
  MOCK_SCHEDULES,
  MOCK_ATTENDANCE_RECORDS,
} from "@/mocks/attendance";
import { MOCK_GRUPOS } from "@/mocks/members";
import {
  buildAttendanceStats,
  formatDay,
  countActiveSchedules,
  buildScheduleGroupMap,
  getScheduleLevelLabel,
  getAttendanceBadgeTokens,
  DIA_SEMANA_LABELS,
  ATTENDANCE_LABELS,
  type ScheduleSlot,
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

const SCHEDULE_GROUP_MAP = buildScheduleGroupMap(MOCK_GRUPOS);

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
  const todayStats = buildAttendanceStats(MOCK_ATTENDANCE_RECORDS);

  const filteredSchedules: ScheduleSlot[] =
    dayFilter === "all"
      ? MOCK_SCHEDULES
      : MOCK_SCHEDULES.filter((s) => s.diaSemana === dayFilter);

  const activeCount = countActiveSchedules(MOCK_SCHEDULES);

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div>
        {/* Hero Banner */}
        <div className="relative mb-10 overflow-hidden rounded-3xl border border-cata-border bg-cata-surface px-6 py-10 shadow-elevated sm:px-10 sm:py-12">
          <div className="absolute inset-0 bg-logo-glow" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-cata-red">
              <Calendar size={14} strokeWidth={2} aria-hidden="true" />
              Asistencia y Horarios
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-cata-text sm:text-4xl">
              Horarios y Asistencia
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-cata-text/60">
              Horarios de entrenamiento y registros de asistencia. Organice sesiones,
              canchas y grupos de entrenamiento.
            </p>
          </div>
        </div>

        {/* Demo badge */}
        <div className="mb-6 flex items-center gap-2">
          <span className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
            Demo
          </span>
          <span className="text-xs text-cata-text/40">
            Los datos de horarios y asistencia son simulados
          </span>
        </div>

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
              {MOCK_SCHEDULES.length}
            </p>
            <p className="mt-1 text-xs text-cata-text/40">{activeCount} activos</p>
          </div>

          <div className="card-hover p-5 sm:p-6">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cata-red/15">
                <UserCheck size={22} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
              </div>
            </div>
            <p className="text-xs font-medium uppercase tracking-wider text-cata-text/65">Asistencias registradas</p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight text-cata-text">
              {todayStats.totalStudents}
            </p>
            <p className="mt-1 text-xs text-cata-text/40">en los últimos registros</p>
          </div>

          <div className="card-hover p-5 sm:p-6">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cata-red/15">
                <CheckCircle2 size={22} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-cata-state-ok/10 px-2 py-0.5 text-[10px] font-semibold text-cata-state-ok">
                <CheckCircle2 size={10} strokeWidth={2} aria-hidden="true" />
                {todayStats.totalStudents > 0
                  ? `${Math.round((todayStats.totalPresent / todayStats.totalStudents) * 100)}%`
                  : "N/A"}
              </span>
            </div>
            <p className="text-xs font-medium uppercase tracking-wider text-cata-text/65">Presentes</p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight text-cata-text">
              {todayStats.totalPresent}
            </p>
            <p className="mt-1 text-xs text-cata-text/40">
              {todayStats.totalStudents > 0
                ? `${Math.round((todayStats.totalPresent / todayStats.totalStudents) * 100)}% de asistencia`
                : "sin datos"}
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
              {todayStats.totalAbsent + todayStats.totalLate}
            </p>
            <p className="mt-1 text-xs text-cata-text/40">
              {todayStats.totalAbsent} ausentes &middot; {todayStats.totalLate} tardanzas
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

          {filteredSchedules.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSchedules.map((slot) => (
                <div
                  key={slot.id}
                  className={`card-hover p-4 ${
                    !slot.activo ? "opacity-50" : ""
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cata-red/15">
                        <Calendar size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                      </div>
                      <span className="text-sm font-bold text-cata-text">
                        {formatDay(slot.diaSemana)}
                      </span>
                    </div>
                    {!slot.activo && (
                      <span className="badge badge-error text-[10px]">Inactivo</span>
                    )}
                  </div>
                  <div className="space-y-1.5 text-xs text-cata-text/65">
                    <p className="flex items-center gap-1.5">
                      <Clock size={12} strokeWidth={1.5} aria-hidden="true" />
                      {slot.horaInicio} — {slot.horaFin}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <MapPin size={12} strokeWidth={1.5} aria-hidden="true" />
                      {slot.cancha}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <GraduationCap size={12} strokeWidth={1.5} aria-hidden="true" />
                      {getScheduleLevelLabel(slot, MOCK_GRUPOS)}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Users size={12} strokeWidth={1.5} aria-hidden="true" />
                      Cupo: {slot.cupoMaximo} estudiantes
                    </p>
                    {SCHEDULE_GROUP_MAP[slot.id] && (
                      <p className="flex items-center gap-1.5 text-cata-red/70">
                        <Users size={12} strokeWidth={1.5} aria-hidden="true" />
                        Grupo: {SCHEDULE_GROUP_MAP[slot.id].join(", ")}
                      </p>
                    )}
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
              Registros de Asistencia Recientes
            </h2>
          </div>

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
                  {MOCK_ATTENDANCE_RECORDS.map((record) => (
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
        </div>

        {/* Domain info card */}
        <div className="rounded-2xl border border-cata-border bg-cata-bg p-6">
          <div className="mb-3 flex items-center gap-2">
            <GraduationCap size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
            <h3 className="text-sm font-bold text-cata-text">Modelo de dominio (Demo)</h3>
          </div>
          <p className="text-sm leading-relaxed text-cata-text/65">
            Los <strong className="text-cata-text">horarios</strong> son slots de entrenamiento disponibles.
            NO pertenecen a un entrenador específico. El registro de{" "}
            <strong className="text-cata-text">asistencia</strong> almacena qué entrenador registró la
            asistencia de cada estudiante en una sesión determinada. Cualquier
            entrenador puede registrar asistencia en cualquier horario disponible.
          </p>
        </div>

        {/* Demo footer */}
        <p className="mt-8 text-center text-xs text-cata-text/30">
          Datos de demostración. Los registros reales se cargarán desde el backend.
        </p>
      </div>
    </ProtectedRoute>
  );
}
