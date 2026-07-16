"use client";

import { useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  Calendar,
  Users,
  UserCheck,
  UserX,
  Timer,
  FileText,
  Clock,
  GraduationCap,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  ClipboardList,
  ArrowRight,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { buildTrainingSessions, getLevelBadgeTokens } from "@/lib/groups-utils";
import { getAttendanceBadgeTokens } from "@/app/attendance/attendance-utils";
import { MOCK_GRUPOS, MOCK_MEMBER_ACCOUNTS } from "@/mocks/members";
import { MOCK_SCHEDULES } from "@/mocks/attendance";

// ---------------------------------------------------------------------------
// Demo data — Trainer dashboard (frontend-only, no backend)
// ---------------------------------------------------------------------------

type AttendanceState = "present" | "absent" | "late" | "justified";

const studentNameMap: Record<string, string> = {};
for (const account of MOCK_MEMBER_ACCOUNTS) {
  for (const alumno of account.alumnos) {
    studentNameMap[alumno.id] = `${alumno.nombres} ${alumno.apellidos}`;
  }
}

const allSessions = buildTrainingSessions(
  MOCK_GRUPOS,
  MOCK_SCHEDULES,
  studentNameMap,
);

const jsDayToLabel = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
const todayLabel = jsDayToLabel[new Date().getDay()];

const todaySessions = allSessions.filter((s) => {
  const dayPart = s.groupName.split(" — ")[1];
  if (!dayPart) return false;
  const shortDay = dayPart.split("/")[0];
  return shortDay === todayLabel;
});

// ---------------------------------------------------------------------------
// Attendance UI helpers
// ---------------------------------------------------------------------------

const attendanceLabels: Record<AttendanceState, string> = {
  present: "Presente",
  absent: "Ausente",
  late: "Tardanza",
  justified: "Justificado",
};

const attendanceIcons: Record<AttendanceState, LucideIcon> = {
  present: UserCheck,
  absent: UserX,
  late: Timer,
  justified: FileText,
};

// Badge/status color tokens are sourced from the shared pure helpers
// (`getAttendanceBadgeTokens`, `getLevelBadgeTokens`) instead of local
// hardcoded Records — reuses the light-theme tokens validated in
// Fase 3b (attendance) and above (groups-utils).

// ---------------------------------------------------------------------------
// Weekly schedule — single source of truth, derived counts
// ---------------------------------------------------------------------------

interface WeeklySlot {
  day: string;
  groupName: string;
  level: string;
}

const weeklySchedule: WeeklySlot[] = [
  // Monday — matches todaySessions above
  { day: "Lun", groupName: "Principiantes", level: "Principiante" },
  { day: "Lun", groupName: "Intermedios", level: "Intermedio" },
  { day: "Lun", groupName: "Avanzados", level: "Avanzado" },
  // Tuesday
  { day: "Mar", groupName: "Principiantes", level: "Principiante" },
  { day: "Mar", groupName: "Intermedios", level: "Intermedio" },
  // Wednesday
  { day: "Mie", groupName: "Principiantes", level: "Principiante" },
  { day: "Mie", groupName: "Intermedios", level: "Intermedio" },
  { day: "Mie", groupName: "Avanzados", level: "Avanzado" },
  // Thursday
  { day: "Jue", groupName: "Principiantes", level: "Principiante" },
  { day: "Jue", groupName: "Intermedios", level: "Intermedio" },
  // Friday
  { day: "Vie", groupName: "Avanzados", level: "Avanzado" },
];

const weekDayLabels = ["Lun", "Mar", "Mie", "Jue", "Vie"] as const;
const weekDays = weekDayLabels.map((label) => ({
  label,
  sessions: weeklySchedule.filter((s) => s.day === label).length,
  isToday: label === todayLabel,
}));

export default function TrainerPage(): React.ReactElement {
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  function toggleSession(sessionId: string): void {
    setExpandedSession((prev) => (prev === sessionId ? null : sessionId));
  }

  const totalStudents = todaySessions.reduce((sum, s) => sum + s.studentCount, 0);
  const totalPresent = todaySessions.reduce(
    (sum, s) => sum + s.students.filter((st) => st.attendance === "present").length,
    0,
  );
  const presentPercent = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;

  return (
    <ProtectedRoute allowedRoles={["trainer"]}>
      <div>
        {/* Hero Banner */}
        <div className="relative mb-10 overflow-hidden rounded-3xl border border-cata-border bg-cata-surface px-6 py-10 shadow-elevated sm:px-10 sm:py-12">
          <div className="absolute inset-0 bg-logo-glow" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-cata-red">
                <GraduationCap size={14} strokeWidth={2} aria-hidden="true" />
                Área de Entrenadores
              </div>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-cata-text sm:text-4xl">
                Panel del Entrenador
              </h1>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-cata-text/60">
                Resumen de entrenamiento de hoy — {new Date().toLocaleDateString("es-EC", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <span className="hidden rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 sm:inline-block">
              Demo
            </span>
          </div>
        </div>

        {/* Interactive Attendance CTA */}
        <div className="mb-6">
          <Link
            href="/trainer/attendance"
            className="inline-flex items-center gap-2 rounded-xl bg-cata-red/15 px-4 py-2.5 text-sm font-medium text-cata-red transition-all duration-200 hover:bg-cata-red/25"
          >
            <ClipboardList size={16} strokeWidth={1.5} aria-hidden="true" />
            Registrar Asistencia Interactiva
            <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
          </Link>
        </div>

        {/* Summary stats */}
        <div className="mb-10 grid gap-5 sm:grid-cols-3">
          <div className="card-hover p-5 sm:p-6">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cata-red/15">
                <Calendar size={22} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-cata-state-ok/10 px-2 py-0.5 text-[10px] font-semibold text-cata-state-ok">
                <CheckCircle2 size={10} strokeWidth={2} aria-hidden="true" />
                Hoy
              </span>
            </div>
            <p className="text-xs font-medium uppercase tracking-wider text-cata-text/65">Sesiones de Hoy</p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight text-cata-text">
              {todaySessions.length}
            </p>
          </div>
          <div className="card-hover p-5 sm:p-6">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cata-red/15">
                <Users size={22} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
              </div>
            </div>
            <p className="text-xs font-medium uppercase tracking-wider text-cata-text/65">Estudiantes Asignados</p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight text-cata-text">
              {totalStudents}
            </p>
          </div>
          <div className="card-hover p-5 sm:p-6">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cata-red/15">
                <UserCheck size={22} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-cata-state-ok/10 px-2 py-0.5 text-[10px] font-semibold text-cata-state-ok">
                <TrendingUp size={10} strokeWidth={2} aria-hidden="true" />
                {presentPercent}%
              </span>
            </div>
            <p className="text-xs font-medium uppercase tracking-wider text-cata-text/65">Presentes Hoy</p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight text-cata-text">
              {totalPresent}/{totalStudents}
            </p>
          </div>
        </div>

        {/* Sessions & roster */}
        <div className="space-y-8">
          <section>
            <div className="mb-4 flex items-center gap-2">
              <ClipboardList size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
              <h2 className="text-lg font-bold text-cata-text">
                Sesiones de Hoy
              </h2>
            </div>
            <div className="space-y-4">
              {todaySessions.length === 0 && (
                <div className="card flex flex-col items-center py-12 text-center">
                  <ClipboardList
                    size={32}
                    strokeWidth={1.5}
                    className="mb-3 text-white/20"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-white/50">
                    No hay sesiones programadas para hoy.
                  </p>
                </div>
              )}
              {todaySessions.map((session) => (
                <div key={session.id} className="card overflow-hidden">
                  {/* Session header (click to expand roster) */}
                  <button
                    onClick={() => toggleSession(session.id)}
                    className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-cata-bg sm:p-6"
                    aria-expanded={expandedSession === session.id}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cata-red/15">
                          <GraduationCap size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                        </div>
                        <h3 className="font-semibold text-cata-text">
                          {session.groupName}
                        </h3>
                        <span className={`badge ${getLevelBadgeTokens(session.level)}`}>
                          {session.level}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-cata-text/65">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock size={13} strokeWidth={1.5} aria-hidden="true" />
                          {session.time}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin size={13} strokeWidth={1.5} aria-hidden="true" />
                          {session.court}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Users size={13} strokeWidth={1.5} aria-hidden="true" />
                          {session.studentCount} estudiantes
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      size={18}
                      strokeWidth={1.5}
                      className={`ml-3 shrink-0 text-cata-text/30 transition-transform ${
                        expandedSession === session.id ? "rotate-90" : ""
                      }`}
                      aria-hidden="true"
                    />
                  </button>

                  {/* Roster (expandable) */}
                  {expandedSession === session.id && (
                    <div className="border-t border-cata-border px-5 py-4 sm:px-6 sm:py-5 overflow-x-auto">
                      <table className="w-full text-sm min-w-[300px]">
                        <thead>
                          <tr className="border-b border-cata-border text-left text-xs font-medium uppercase tracking-wider text-cata-text/45">
                            <th className="pb-2 pr-4">Estudiante</th>
                            <th className="pb-2">Asistencia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {session.students.map((student) => {
                            const Icon = attendanceIcons[student.attendance];
                            const { badgeClass, iconClass } = getAttendanceBadgeTokens(
                              student.attendance,
                            );
                            return (
                              <tr
                                key={student.name}
                                className="border-b border-cata-border last:border-0"
                              >
                                <td className="py-2.5 pr-4 font-medium text-cata-text">
                                  {student.name}
                                </td>
                                <td className="py-2.5">
                                  <span
                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}
                                  >
                                    <Icon size={12} strokeWidth={2} className={iconClass} aria-hidden="true" />
                                    {attendanceLabels[student.attendance]}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* Session attendance summary */}
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        <span className="text-cata-state-ok">
                          {session.students.filter((s) => s.attendance === "present").length} Presentes
                        </span>
                        <span className="text-amber-400">
                          {session.students.filter((s) => s.attendance === "late").length} Tardanzas
                        </span>
                        <span className="text-cata-red">
                          {session.students.filter((s) => s.attendance === "absent").length} Ausentes
                        </span>
                        <span className="text-blue-400">
                          {session.students.filter((s) => s.attendance === "justified").length} Justificados
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Weekly calendar strip */}
        <section className="mt-10">
          <div className="mb-4 flex items-center gap-2">
            <Calendar size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
            <h2 className="text-lg font-bold text-cata-text">
              Horario Semanal
            </h2>
          </div>
          <p className="mb-4 text-sm leading-relaxed text-cata-text/65">
            Cualquier entrenador puede registrar asistencia en las sesiones disponibles.
            Las sesiones no están asignadas a un entrenador específico.
          </p>
          <div className="grid gap-3 sm:grid-cols-5">
            {weekDays.map((day) => (
              <div
                key={day.label}
                className={`card p-4 text-center transition-all ${
                  day.isToday
                    ? "ring-2 ring-cata-red/20 ring-offset-2 ring-offset-cata-bg"
                    : ""
                }`}
              >
                <p
                  className={`text-sm font-semibold ${
                    day.isToday ? "text-cata-red" : "text-cata-text"
                  }`}
                >
                  {day.label}
                </p>
                <p className="mt-1.5 text-xs text-cata-text/65">
                  {day.sessions} {day.sessions === 1 ? "sesión" : "sesiones"}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Demo honesty footer */}
        <p className="mt-10 text-center text-xs text-cata-text/30">
          El panel del entrenador muestra solo datos de demostración. No se almacenan registros
          reales de asistencia u horarios. Listo para la integración con la API del backend.
        </p>
      </div>
    </ProtectedRoute>
  );
}
