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
  ClipboardList,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Demo data — Trainer dashboard (frontend-only, no backend)
// ---------------------------------------------------------------------------

type AttendanceState = "present" | "absent" | "late" | "justified";

interface SessionStudent {
  name: string;
  attendance: AttendanceState;
}

interface TrainingSession {
  id: string;
  groupName: string;
  time: string;
  court: string;
  level: string;
  studentCount: number;
  students: SessionStudent[];
}

const todaySessions: TrainingSession[] = [
  {
    id: "s1",
    groupName: "Principiantes — Lun/Mié",
    time: "15:00 — 16:30",
    court: "Cancha 1",
    level: "Principiante",
    studentCount: 8,
    students: [
      { name: "Sofia Martinez", attendance: "present" },
      { name: "Mateo Rodriguez", attendance: "present" },
      { name: "Valentina Lopez", attendance: "late" },
      { name: "Benjamin Torres", attendance: "absent" },
      { name: "Camila Flores", attendance: "present" },
      { name: "Emilia Castillo", attendance: "justified" },
      { name: "Santiago Ramirez", attendance: "present" },
      { name: "Isabella Morales", attendance: "absent" },
    ],
  },
  {
    id: "s2",
    groupName: "Intermedios — Lun/Mié",
    time: "16:45 — 18:15",
    court: "Cancha 2",
    level: "Intermedio",
    studentCount: 6,
    students: [
      { name: "Nicolas Acosta", attendance: "present" },
      { name: "Valeria Gomez", attendance: "present" },
      { name: "Diego Herrera", attendance: "present" },
      { name: "Luciana Paz", attendance: "late" },
      { name: "Tomas Rivas", attendance: "present" },
      { name: "Gabriela Silva", attendance: "absent" },
    ],
  },
  {
    id: "s3",
    groupName: "Avanzados — Lun/Mié",
    time: "18:30 — 20:00",
    court: "Cancha 1 y 3",
    level: "Avanzado",
    studentCount: 4,
    students: [
      { name: "Alejandro Padilla", attendance: "present" },
      { name: "Carolina Mendez", attendance: "present" },
      { name: "Felipe Ortega", attendance: "present" },
      { name: "Mariana Rios", attendance: "justified" },
    ],
  },
];

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

const attendanceBadgeStyles: Record<AttendanceState, string> = {
  present: "bg-emerald-50 text-emerald-700",
  absent: "bg-red-50 text-cata-red",
  late: "bg-amber-50 text-amber-700",
  justified: "bg-blue-50 text-blue-700",
};

const levelBadge: Record<string, string> = {
  Principiante: "bg-green-50 text-green-700",
  Intermedio: "bg-amber-50 text-amber-700",
  Avanzado: "bg-cata-red/8 text-cata-red",
};

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
  isToday: label === "Lun",
}));

export default function TrainerPage() {
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  function toggleSession(sessionId: string) {
    setExpandedSession((prev) => (prev === sessionId ? null : sessionId));
  }

  const totalStudents = todaySessions.reduce((sum, s) => sum + s.studentCount, 0);
  const totalPresent = todaySessions.reduce(
    (sum, s) => sum + s.students.filter((st) => st.attendance === "present").length,
    0,
  );

  return (
    <ProtectedRoute allowedRoles={["trainer"]}>
    <div>
      {/* ── Header ── */}
      <div className="mb-10">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-cata-charcoal sm:text-3xl">
            Panel del Entrenador
          </h1>
          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-700">
            Demo
          </span>
        </div>
        <p className="mt-1 text-sm text-cata-gray">
          Sesiones disponibles del día — registre la asistencia en cualquier sesión disponible
        </p>
      </div>

      {/* ── Current trainer context ── */}
      <div className="mb-8 flex items-center gap-2 rounded-xl border border-cata-stone/40 bg-white p-3 text-sm shadow-sm">
        <UserCheck size={16} strokeWidth={1.5} className="text-cata-red" />
        <span className="font-medium text-cata-charcoal">Entrenador: Demo</span>
        <span className="ml-auto text-xs text-cata-gray">
          Registrando asistencia en las sesiones de hoy
        </span>
      </div>

      {/* ── Interactive Attendance CTA ── */}
      <div className="mb-6">
        <Link
          href="/trainer/attendance"
          className="inline-flex items-center gap-2 rounded-xl bg-cata-red/8 px-4 py-2.5 text-sm font-medium text-cata-red transition-all duration-200 hover:bg-cata-red/15"
        >
          <ClipboardList size={16} strokeWidth={1.5} aria-hidden="true" />
          Registrar Asistencia Interactiva
          <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
        </Link>
      </div>

      {/* ── Summary stats ── */}
      <div className="mb-10 grid gap-5 sm:grid-cols-3">
        <div className="card-hover p-5 sm:p-6">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-cata-red/8">
            <Calendar size={18} strokeWidth={1.5} className="text-cata-red" />
          </div>
          <p className="text-sm font-medium text-cata-gray">Sesiones de Hoy</p>
          <p className="mt-0.5 text-3xl font-bold tracking-tight text-cata-charcoal">
            {todaySessions.length}
          </p>
        </div>
        <div className="card-hover p-5 sm:p-6">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-cata-red/8">
            <Users size={18} strokeWidth={1.5} className="text-cata-red" />
          </div>
          <p className="text-sm font-medium text-cata-gray">Estudiantes en Sesiones</p>
          <p className="mt-0.5 text-3xl font-bold tracking-tight text-cata-charcoal">
            {totalStudents}
          </p>
        </div>
        <div className="card-hover p-5 sm:p-6">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-cata-red/8">
            <UserCheck size={18} strokeWidth={1.5} className="text-cata-red" />
          </div>
          <p className="text-sm font-medium text-cata-gray">Presentes Hoy</p>
          <p className="mt-0.5 text-3xl font-bold tracking-tight text-cata-charcoal">
            {totalPresent}/{totalStudents}
          </p>
        </div>
      </div>

      {/* ── Sessions & roster ── */}
      <div className="space-y-8">
        <section>
            <h2 className="mb-4 text-lg font-semibold text-cata-charcoal">
              Sesiones de Hoy
            </h2>
            <div className="space-y-4">
              {todaySessions.map((session) => (
                <div key={session.id} className="card overflow-hidden">
                  {/* ── Session header (click to expand roster) ── */}
                  <button
                    onClick={() => toggleSession(session.id)}
                    className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-cata-warm/50 sm:p-6"
                    aria-expanded={expandedSession === session.id}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-cata-charcoal">
                          {session.groupName}
                        </h3>
                        <span className={`badge ${levelBadge[session.level] ?? "badge-neutral"}`}>
                          {session.level}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-cata-gray">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock size={13} strokeWidth={1.5} />
                          {session.time}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <GraduationCap size={13} strokeWidth={1.5} />
                          {session.court}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Users size={13} strokeWidth={1.5} />
                          {session.studentCount} estudiantes
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      size={18}
                      strokeWidth={1.5}
                      className={`ml-3 shrink-0 text-cata-gray/40 transition-transform ${
                        expandedSession === session.id ? "rotate-90" : ""
                      }`}
                    />
                  </button>

                  {/* ── Roster (expandable) ── */}
                  {expandedSession === session.id && (
                    <div className="border-t border-cata-stone/50 px-5 py-4 sm:px-6 sm:py-5">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-cata-stone/30 text-left text-xs font-medium uppercase tracking-wider text-cata-gray-light">
                            <th className="pb-2 pr-4">Estudiante</th>
                            <th className="pb-2">Asistencia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {session.students.map((student) => {
                            const Icon = attendanceIcons[student.attendance];
                            return (
                              <tr
                                key={student.name}
                                className="border-b border-cata-stone/20 last:border-0"
                              >
                                <td className="py-2.5 pr-4 font-medium text-cata-charcoal">
                                  {student.name}
                                </td>
                                <td className="py-2.5">
                                  <span
                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                      attendanceBadgeStyles[student.attendance]
                                    }`}
                                  >
                                    <Icon size={12} strokeWidth={2} />
                                    {attendanceLabels[student.attendance]}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* Session attendance summary — explicit labels for every state */}
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        <span className="text-emerald-700">
                          {session.students.filter((s) => s.attendance === "present").length} Presentes
                        </span>
                        <span className="text-amber-700">
                          {session.students.filter((s) => s.attendance === "late").length} Tardanzas
                        </span>
                        <span className="text-cata-red">
                          {session.students.filter((s) => s.attendance === "absent").length} Ausentes
                        </span>
                        <span className="text-blue-700">
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

      {/* ── Weekly calendar strip ── */}
      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-cata-charcoal">
          Horario Semanal
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-cata-gray">
          Cualquier entrenador puede registrar asistencia en las sesiones disponibles.
          Las sesiones no están asignadas a un entrenador específico.
        </p>
        <div className="grid gap-3 sm:grid-cols-5">
          {weekDays.map((day) => (
            <div
              key={day.label}
              className={`card p-4 text-center transition-all ${
                day.isToday
                  ? "ring-2 ring-cata-red/20 ring-offset-2 ring-offset-cata-cream"
                  : ""
              }`}
            >
              <p
                className={`text-sm font-semibold ${
                  day.isToday ? "text-cata-red" : "text-cata-charcoal"
                }`}
              >
                {day.label}
              </p>
              <p className="mt-1.5 text-xs text-cata-gray">
                {day.sessions} {day.sessions === 1 ? "sesión" : "sesiones"}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Demo honesty footer ── */}
      <p className="mt-10 text-center text-xs text-cata-gray/40">
        Datos de demostración. No se almacenan registros reales. El sistema registra qué
        entrenador tomó la asistencia en cada sesión. Listo para la integración con la API del backend.
      </p>
    </div>
    </ProtectedRoute>
  );
}
