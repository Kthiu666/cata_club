"use client";

import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/shell/AppShell";
import {
  Calendar,
  Users,
  UserCheck,
  Clock,
  MapPin,
  TrendingUp,
  CheckCircle2,
  ClipboardList,
  ArrowRight,
} from "lucide-react";
import { buildTrainingSessions } from "@/lib/groups-utils";
import { MOCK_GRUPOS, MOCK_MEMBER_ACCOUNTS } from "@/mocks/members";
import { MOCK_SCHEDULES } from "@/mocks/attendance";

// ---------------------------------------------------------------------------
// Demo data — Trainer dashboard (frontend-only, no backend)
// ---------------------------------------------------------------------------

const studentNameMap: Record<string, string> = {};
for (const account of MOCK_MEMBER_ACCOUNTS) {
  for (const estudiante of account.estudiantes) {
    studentNameMap[estudiante.id] = `${estudiante.nombres} ${estudiante.apellidos}`;
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

export default function TrainerPage(): React.ReactElement {
  const totalStudents = todaySessions.reduce((sum, s) => sum + s.studentCount, 0);
  const totalPresent = todaySessions.reduce(
    (sum, s) => sum + s.students.filter((st) => st.attendance === "present").length,
    0,
  );
  const presentPercent = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;

  const todayLongLabel = new Date().toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <ProtectedRoute allowedRoles={["trainer"]}>
      <AppShell
        eyebrow="Área de entrenadores"
        title="Panel del Entrenador"
        subtitle={`Resumen de entrenamiento de hoy — ${todayLongLabel}.`}
      >
        {/* Interactive Attendance CTA */}
        <div className="mb-6">
          <Link
            href="/trainer/attendance"
            className="flex items-center justify-between gap-3 rounded-2xl border border-cata-red/20 bg-cata-red/10 px-5 py-4 text-cata-red transition-colors hover:bg-cata-red/15"
          >
            <span className="flex items-center gap-3">
              <ClipboardList size={20} strokeWidth={1.5} aria-hidden="true" />
              <span>
                <span className="block text-sm font-bold">Registrar Asistencia Interactiva</span>
                <span className="block text-xs text-cata-red/75">
                  Tomá asistencia de las sesiones de hoy en unos pasos
                </span>
              </span>
            </span>
            <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
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
              {totalPresent > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-cata-state-ok/10 px-2 py-0.5 text-[10px] font-semibold text-cata-state-ok">
                  <TrendingUp size={10} strokeWidth={2} aria-hidden="true" />
                  {presentPercent}%
                </span>
              )}
            </div>
            <p className="text-xs font-medium uppercase tracking-wider text-cata-text/65">Presentes Hoy</p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight text-cata-text">
              {totalPresent}/{totalStudents}
            </p>
            {totalPresent === 0 && totalStudents > 0 && (
              <p className="mt-1 text-xs text-cata-text/40">
                Aún sin registrar — usá &quot;Registrar Asistencia&quot;
              </p>
            )}
          </div>
        </div>

        {/* Today's sessions */}
        <div className="mb-4 flex items-center gap-2">
          <Calendar size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
          <h2 className="text-lg font-bold text-cata-text">Sesiones de Hoy</h2>
        </div>
        {todaySessions.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {todaySessions.map((session) => (
              <div key={session.id} className="card-hover p-5">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cata-red/15">
                    <Users size={18} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-cata-text">{session.groupName}</p>
                    <p className="text-xs text-cata-text/65">{session.level}</p>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-cata-text/65">
                  <p className="flex items-center gap-1.5">
                    <Clock size={12} strokeWidth={1.5} aria-hidden="true" />
                    {session.time}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <MapPin size={12} strokeWidth={1.5} aria-hidden="true" />
                    {session.court}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Users size={12} strokeWidth={1.5} aria-hidden="true" />
                    {session.studentCount} estudiante{session.studentCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <Link
                  href="/trainer/attendance"
                  className="mt-3 flex items-center gap-1 text-xs font-medium text-cata-red hover:text-cata-red-light"
                >
                  Registrar asistencia
                  <ArrowRight size={12} strokeWidth={1.5} aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="card flex flex-col items-center py-12 text-center">
            <Calendar size={32} strokeWidth={1.5} className="mb-3 text-cata-text/20" aria-hidden="true" />
            <p className="text-sm text-cata-text/50">No hay sesiones programadas para hoy.</p>
          </div>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}
