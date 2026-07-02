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
  DIA_SEMANA_LABELS,
  ATTENDANCE_LABELS,
  type ScheduleSlot,
  type AttendanceRecord,
} from "./attendance-utils";

// ---------------------------------------------------------------------------
// Attendance state icon
// ---------------------------------------------------------------------------

function AttendanceIcon({ estado }: { estado: string }) {
  switch (estado) {
    case "present":
      return <CheckCircle2 size={12} strokeWidth={2} className="text-emerald-600" aria-hidden="true" />;
    case "absent":
      return <XCircle size={12} strokeWidth={2} className="text-red-600" aria-hidden="true" />;
    case "late":
      return <Clock3 size={12} strokeWidth={2} className="text-amber-600" aria-hidden="true" />;
    case "justified":
      return <AlertTriangle size={12} strokeWidth={2} className="text-blue-600" aria-hidden="true" />;
    default:
      return <HelpCircle size={12} strokeWidth={2} className="text-cata-gray" aria-hidden="true" />;
  }
}

function AttendanceBadge({ estado }: { estado: string }) {
  const base = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium";
  const colors: Record<string, string> = {
    present: "bg-emerald-50 text-emerald-700",
    absent: "bg-red-50 text-red-700",
    late: "bg-amber-50 text-amber-700",
    justified: "bg-blue-50 text-blue-700",
  };
  const safeColor = colors[estado] ?? "bg-gray-50 text-gray-700";
  const safeLabel = ATTENDANCE_LABELS[estado as keyof typeof ATTENDANCE_LABELS] ?? "Desconocido";
  return (
    <span className={`${base} ${safeColor}`}>
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

export default function AttendancePage() {
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
        {/* ══ Header ══ */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cata-red/10">
              <Calendar
                size={20}
                strokeWidth={1.5}
                className="text-cata-red"
                aria-hidden="true"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-cata-charcoal">
                Horarios y Asistencia
              </h1>
              <p className="text-sm text-cata-gray">
                Horarios de entrenamiento y registros de asistencia
              </p>
            </div>
          </div>
        </div>

        {/* ══ Demo indicator ══ */}
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
          <span className="font-medium">Demo</span> &mdash; Los datos de
          horarios y asistencia son simulados. No hay integración con un backend
          real.
        </div>

        {/* ══ Stats grid ══ */}
        <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card-hover p-5 sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cata-warm">
                <Calendar size={18} strokeWidth={1.5} className="text-cata-gray" aria-hidden="true" />
              </div>
            </div>
            <p className="text-sm font-medium text-cata-gray">Horarios</p>
            <p className="mt-0.5 text-3xl font-bold tracking-tight text-cata-charcoal">
              {MOCK_SCHEDULES.length}
            </p>
            <p className="mt-0.5 text-xs text-cata-gray/60">{activeCount} activos</p>
          </div>

          <div className="card-hover p-5 sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cata-red/8">
                <UserCheck size={18} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
              </div>
            </div>
            <p className="text-sm font-medium text-cata-gray">Asistencias registradas</p>
            <p className="mt-0.5 text-3xl font-bold tracking-tight text-cata-charcoal">
              {todayStats.totalStudents}
            </p>
            <p className="mt-0.5 text-xs text-cata-gray/60">en los últimos registros</p>
          </div>

          <div className="card-hover p-5 sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <CheckCircle2 size={18} strokeWidth={1.5} className="text-emerald-600" aria-hidden="true" />
              </div>
            </div>
            <p className="text-sm font-medium text-cata-gray">Presentes</p>
            <p className="mt-0.5 text-3xl font-bold tracking-tight text-cata-charcoal">
              {todayStats.totalPresent}
            </p>
            <p className="mt-0.5 text-xs text-cata-gray/60">
              {todayStats.totalStudents > 0
                ? `${Math.round((todayStats.totalPresent / todayStats.totalStudents) * 100)}% de asistencia`
                : "sin datos"}
            </p>
          </div>

          <div className="card-hover p-5 sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                <Clock3 size={18} strokeWidth={1.5} className="text-amber-600" aria-hidden="true" />
              </div>
            </div>
            <p className="text-sm font-medium text-cata-gray">Ausencias / Tardanzas</p>
            <p className="mt-0.5 text-3xl font-bold tracking-tight text-cata-charcoal">
              {todayStats.totalAbsent + todayStats.totalLate}
            </p>
            <p className="mt-0.5 text-xs text-cata-gray/60">
              {todayStats.totalAbsent} ausentes &middot; {todayStats.totalLate} tardanzas
            </p>
          </div>
        </div>

        {/* ══ Schedules section ══ */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-cata-charcoal">
              Horarios de Entrenamiento
            </h2>
            <div className="flex items-center gap-2">
              <Filter size={13} strokeWidth={1.5} className="text-cata-gray" aria-hidden="true" />
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
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-cata-charcoal">
                      {formatDay(slot.diaSemana)}
                    </span>
                    {!slot.activo && (
                      <span className="badge badge-error text-[10px]">Inactivo</span>
                    )}
                  </div>
                  <div className="space-y-1 text-xs text-cata-gray">
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
              <Calendar size={36} strokeWidth={1} className="mb-2 text-cata-stone" aria-hidden="true" />
              <p className="text-sm text-cata-gray">
                No hay horarios para el día seleccionado.
              </p>
            </div>
          )}
        </div>

        {/* ══ Recent attendance section ══ */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-cata-charcoal">
            Registros de Asistencia Recientes
          </h2>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cata-stone/60 bg-cata-warm text-xs font-medium uppercase tracking-wider text-cata-gray">
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Horario</th>
                    <th className="px-4 py-3 font-medium">Alumno</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Registrado por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cata-stone/40">
                  {MOCK_ATTENDANCE_RECORDS.map((record) => (
                    <tr key={record.id} className="transition-colors hover:bg-cata-warm/40">
                      <td className="px-4 py-3 text-xs text-cata-gray">
                        {record.fecha}
                      </td>
                      <td className="px-4 py-3 text-xs text-cata-charcoal">
                        {record.horario}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-cata-charcoal">
                        {record.alumno}
                      </td>
                      <td className="px-4 py-3">
                        <AttendanceBadge estado={record.estado} />
                      </td>
                      <td className="px-4 py-3 text-xs text-cata-gray">
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

        {/* ══ Domain info card ══ */}
        <div className="rounded-xl border border-cata-stone/50 bg-white p-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-cata-gray-light">
            Modelo de dominio (Demo)
          </h3>
          <p className="text-xs leading-relaxed text-cata-gray">
            Los <strong>horarios</strong> son slots de entrenamiento disponibles.
            NO pertenecen a un entrenador específico. El registro de{" "}
            <strong>asistencia</strong> almacena qué entrenador registró la
            asistencia de cada alumno en una sesión determinada. Cualquier
            entrenador puede registrar asistencia en cualquier horario disponible.
          </p>
        </div>

        {/* ══ Demo footer ══ */}
        <p className="mt-8 text-center text-xs text-cata-gray/40">
          Datos de demostración. Los registros reales se cargarán desde el backend.
        </p>
      </div>
    </ProtectedRoute>
  );
}
