"use client";

import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  Calendar,
  Users,
  UserCheck,
  GraduationCap,
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

      </div>
    </ProtectedRoute>
  );
}
