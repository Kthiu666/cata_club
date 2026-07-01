/**
 * Trainer Attendance Registration — Interactive Prototype
 *
 * Multi-step wizard for registering attendance in training sessions.
 * This is a frontend-only mock that demonstrates the full attendance flow:
 *   - Session selection from available sessions
 *   - Student attendance marking (present/absent/late/justified)
 *   - Confirmation summary showing which trainer registered the attendance
 *
 * Domain rules:
 *   - Horario/session is NOT owned by one trainer.
 *   - Any trainer can register attendance in any available session.
 *   - The system records which trainer took the attendance.
 *   - Attendance is tied to a specific session/horario and specific alumnos.
 *
 * No data is persisted — this is a UI prototype akin to a Figma mockup.
 * All labels and copy are in Spanish per app convention.
 */

"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import {
  Calendar,
  Clock,
  GraduationCap,
  Users,
  UserCheck,
  UserX,
  Timer,
  FileText,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import {
  AVAILABLE_SESSIONS,
  ATTENDANCE_LABELS,
  ATTENDANCE_BADGE_STYLES,
  ATTENDANCE_CARD_STYLES,
  ATTENDANCE_CARD_DEFAULT,
  ATTENDANCE_STATES,
  countByState,
  buildAttendanceSummary,
  type TrainingSession,
  type SessionStudent,
} from "./attendance-utils";
import type { EstadoAsistencia } from "@/types/domain";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WizardStep = "select-session" | "mark-attendance" | "confirm";

const STEP_ORDER: WizardStep[] = ["select-session", "mark-attendance", "confirm"];

const STEP_LABELS: Record<WizardStep, string> = {
  "select-session": "Seleccionar Sesión",
  "mark-attendance": "Registrar Asistencia",
  confirm: "Confirmar y Finalizar",
};

// ---------------------------------------------------------------------------
// UI constants
// ---------------------------------------------------------------------------

const LEVEL_BADGE: Record<string, string> = {
  Principiante: "bg-green-50 text-green-700 ring-1 ring-green-200",
  Intermedio: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  Avanzado: "bg-red-50 text-red-700 ring-1 ring-red-200",
};

const ATTENDANCE_ICONS: Record<EstadoAsistencia, React.ReactNode> = {
  present: <UserCheck size={16} strokeWidth={2} />,
  absent: <UserX size={16} strokeWidth={2} />,
  late: <Timer size={16} strokeWidth={2} />,
  justified: <FileText size={16} strokeWidth={2} />,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TrainerAttendancePage() {
  const { session } = useAuth();
  const trainerName = session?.user?.name ?? "Entrenador Demo";

  const [step, setStep] = useState<WizardStep>("select-session");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [students, setStudents] = useState<SessionStudent[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const currentIndex = STEP_ORDER.indexOf(step);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === STEP_ORDER.length - 1;
  const progress = ((currentIndex + 1) / STEP_ORDER.length) * 100;

  const selectedSession = selectedSessionId
    ? AVAILABLE_SESSIONS.find((s) => s.id === selectedSessionId) ?? null
    : null;

  // ---- Navigation ----

  function handleSelectSession(sessionId: string) {
    const session = AVAILABLE_SESSIONS.find((s) => s.id === sessionId);
    if (!session) return;
    setSelectedSessionId(sessionId);
    // Clone students so the wizard works on mutable copies
    setStudents(session.students.map((s) => ({ ...s })));
    setStep("mark-attendance");
  }

  function handleBack() {
    const prevIdx = currentIndex - 1;
    if (prevIdx >= 0) {
      setStep(STEP_ORDER[prevIdx]);
    }
  }

  function handleNext() {
    const nextIdx = currentIndex + 1;
    if (nextIdx < STEP_ORDER.length) {
      setStep(STEP_ORDER[nextIdx]);
    }
  }

  function handleToggleAttendance(studentIndex: number) {
    setStudents((prev) =>
      prev.map((s, i) => {
        if (i !== studentIndex) return s;
        const order: EstadoAsistencia[] = ["absent", "present", "late", "justified"];
        const idx = order.indexOf(s.attendance);
        const next = idx === -1 || idx === order.length - 1 ? order[0] : order[idx + 1];
        return { ...s, attendance: next };
      }),
    );
  }

  function handleDirectAttendanceSet(studentIndex: number, state: EstadoAsistencia) {
    setStudents((prev) =>
      prev.map((s, i) => (i === studentIndex ? { ...s, attendance: state } : s)),
    );
  }

  function handleConfirm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    // Simulate submission delay
    setTimeout(() => {
      setSubmitting(false);
      setConfirmed(true);
    }, 1200);
  }

  function handleReset() {
    setStep("select-session");
    setSelectedSessionId(null);
    setStudents([]);
    setConfirmed(false);
    setSubmitting(false);
  }

  // ---- Step renderers ----

  function renderSessionSelection() {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-cata-gray">
          Seleccione la sesión en la que desea registrar asistencia:
        </p>

        <div className="space-y-3">
          {AVAILABLE_SESSIONS.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => handleSelectSession(session.id)}
              className="card-hover flex w-full items-start gap-4 p-5 text-left transition-all duration-200 sm:p-6"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cata-red/8">
                <Calendar size={20} strokeWidth={1.5} className="text-cata-red" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-cata-charcoal">
                    {session.groupName}
                  </h3>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_BADGE[session.level] ?? "bg-cata-warm text-cata-gray"}`}>
                    {session.level}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-cata-gray">
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
                className="mt-1 shrink-0 text-cata-gray/40"
              />
            </button>
          ))}
        </div>

        {/* Domain reminder */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          <p className="flex items-center gap-1.5 font-medium">
            <AlertTriangle size={12} strokeWidth={2} />
            Cualquier entrenador puede registrar asistencia
          </p>
          <p className="mt-1 text-amber-600/80">
            Las sesiones no están asignadas a un entrenador específico.
            El sistema registrará quién tomó la asistencia.
          </p>
        </div>
      </div>
    );
  }

  function renderMarkAttendance() {
    if (!selectedSession) return null;

    const presentCount = countByState(students, "present");
    const absentCount = countByState(students, "absent");
    const lateCount = countByState(students, "late");
    const justifiedCount = countByState(students, "justified");

    return (
      <div className="space-y-4">
        {/* Session context */}
        <div className="rounded-xl border border-cata-stone/50 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Calendar size={14} strokeWidth={1.5} className="text-cata-red" />
            <span className="font-medium text-cata-charcoal">
              {selectedSession.groupName}
            </span>
            <span className="text-cata-gray">—</span>
            <span className="text-cata-gray">{selectedSession.time}</span>
            <span className="text-cata-gray">&middot;</span>
            <span className="text-cata-gray">{selectedSession.court}</span>
          </div>
          {/* Live counts */}
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
              <UserCheck size={11} strokeWidth={2} />
              {presentCount} Presentes
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700">
              <UserX size={11} strokeWidth={2} />
              {absentCount} Ausentes
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
              <Timer size={11} strokeWidth={2} />
              {lateCount} Tardanzas
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
              <FileText size={11} strokeWidth={2} />
              {justifiedCount} Justificados
            </span>
          </div>
        </div>

        {/* Student list with attendance toggle */}
        <div className="space-y-2">
          {students.map((student, idx) => (
            <div
              key={student.id}
              className="rounded-xl border border-cata-stone/50 bg-white p-3 transition-all duration-200 hover:border-cata-stone sm:p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-cata-charcoal">
                  {student.name}
                </span>

                {/* Quick-toggle button cycles through states */}
                <div className="flex items-center gap-1.5">
                  {/* Quick-state buttons for each attendance option */}
                  <div className="hidden gap-1 sm:flex">
                    {ATTENDANCE_STATES.map((state) => {
                      const isActive = student.attendance === state;
                      return (
                        <button
                          key={state}
                          type="button"
                          onClick={() => handleDirectAttendanceSet(idx, state)}
                          title={ATTENDANCE_LABELS[state]}
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150 ${
                            isActive
                              ? ATTENDANCE_CARD_STYLES[state]
                              : "border border-transparent text-cata-gray-light hover:border-cata-stone/70 hover:text-cata-gray"
                          }`}
                        >
                          {ATTENDANCE_ICONS[state]}
                          <span className="hidden lg:inline">{ATTENDANCE_LABELS[state]}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Mobile/compact toggle (cycle) */}
                  <button
                    type="button"
                    onClick={() => handleToggleAttendance(idx)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 sm:hidden ${
                      ATTENDANCE_BADGE_STYLES[student.attendance]
                    }`}
                  >
                    {ATTENDANCE_ICONS[student.attendance]}
                    {ATTENDANCE_LABELS[student.attendance]}
                  </button>
                </div>
              </div>

              {/* Mobile hint */}
              <p className="mt-1 text-[10px] text-cata-gray-light sm:hidden">
                Toque para cambiar estado
              </p>
            </div>
          ))}
        </div>

        {/* Trainer attribution reminder */}
        <div className="rounded-xl border border-cata-stone/40 bg-cata-warm/50 p-3 text-xs text-cata-gray">
          <span className="flex items-center gap-1.5 font-medium text-cata-charcoal">
            <UserCheck size={12} strokeWidth={1.5} className="text-cata-red" />
            Registrando como: {trainerName}
          </span>
        </div>
      </div>
    );
  }

  function renderConfirmation() {
    if (!selectedSession) return null;

    const presentCount = countByState(students, "present");
    const absentCount = countByState(students, "absent");
    const lateCount = countByState(students, "late");
    const justifiedCount = countByState(students, "justified");
    const summary = buildAttendanceSummary(students);

    return (
      <div className="space-y-5">
        <p className="text-sm leading-relaxed text-cata-gray">
          Revise el resumen antes de confirmar el registro de asistencia:
        </p>

        {/* Session data */}
        <div className="rounded-xl border border-cata-stone/50 bg-white p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-cata-gray-light">
            Sesión
          </h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-cata-gray">Grupo</dt>
            <dd className="font-medium text-cata-charcoal">
              {selectedSession.groupName}
            </dd>
            <dt className="text-cata-gray">Horario</dt>
            <dd className="font-medium text-cata-charcoal">
              {selectedSession.time}
            </dd>
            <dt className="text-cata-gray">Cancha</dt>
            <dd className="font-medium text-cata-charcoal">
              {selectedSession.court}
            </dd>
            <dt className="text-cata-gray">Nivel</dt>
            <dd className="font-medium text-cata-charcoal">
              {selectedSession.level}
            </dd>
          </dl>
        </div>

        {/* Attendance summary */}
        <div className="rounded-xl border border-cata-stone/50 bg-white p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-cata-gray-light">
            Resumen de Asistencia
          </h3>
          <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-emerald-50 p-3 text-center">
              <p className="text-lg font-bold text-emerald-700">{presentCount}</p>
              <p className="text-xs text-emerald-600">Presentes</p>
            </div>
            <div className="rounded-lg bg-red-50 p-3 text-center">
              <p className="text-lg font-bold text-red-700">{absentCount}</p>
              <p className="text-xs text-red-600">Ausentes</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 text-center">
              <p className="text-lg font-bold text-amber-700">{lateCount}</p>
              <p className="text-xs text-amber-600">Tardanzas</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3 text-center">
              <p className="text-lg font-bold text-blue-700">{justifiedCount}</p>
              <p className="text-xs text-blue-600">Justificados</p>
            </div>
          </div>
          <p className="text-xs text-cata-gray-light">{summary}</p>
        </div>

        {/* Trainer attribution — explicit */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Asistencia Registrada Por
          </h3>
          <div className="flex items-center gap-2 text-sm">
            <UserCheck size={16} strokeWidth={1.5} className="text-emerald-600" />
            <span className="font-medium text-emerald-800">{trainerName}</span>
          </div>
          <p className="mt-1 text-xs text-emerald-600/80">
            {trainerName} será registrado como el entrenador que tomó la asistencia
            de {students.length} alumnos en esta sesión.
          </p>
        </div>

        {/* Demo note */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          <p className="flex items-center gap-1.5 font-medium">
            <AlertTriangle size={12} strokeWidth={2} />
            Demo — Sin almacenamiento real
          </p>
          <p className="mt-1 text-amber-600/80">
            Esta es una demostración del flujo de registro de asistencia.
            En producción, los datos se enviarían al backend para su almacenamiento permanente.
          </p>
        </div>
      </div>
    );
  }

  // ---- Render ----

  return (
    <ProtectedRoute allowedRoles={["trainer"]}>
    {confirmed ? (
      <div className="flex min-h-[75vh] items-center justify-center py-12">
        <div className="w-full max-w-lg text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle size={32} className="text-emerald-600" strokeWidth={1.5} />
          </div>
          <h1 className="mb-3 text-2xl font-bold tracking-tight text-cata-charcoal">
            Asistencia Registrada
          </h1>
          <p className="mb-2 text-sm leading-relaxed text-cata-gray">
            La asistencia para{" "}
            <strong className="text-cata-charcoal">
              {selectedSession?.groupName}
            </strong>{" "}
            ha sido registrada exitosamente.
          </p>
          <p className="mb-2 text-sm leading-relaxed text-cata-gray">
            <strong className="text-cata-charcoal">{trainerName}</strong> figura como
            el entrenador que tomó la asistencia de{" "}
            <strong className="text-cata-charcoal">{students.length} alumnos</strong>.
          </p>
          {students.length > 0 && (
            <p className="mb-8 text-xs text-cata-gray/60">
              {buildAttendanceSummary(students)}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button type="button" onClick={handleReset} className="btn-primary shadow-soft">
              Registrar Otra Asistencia
            </button>
            <Link href="/trainer" className="btn-secondary">
              Volver al Panel
            </Link>
          </div>
        </div>
      </div>
    ) : (
    <div className="py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-cata-charcoal sm:text-3xl">
            Registrar Asistencia
          </h1>
          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-700">
            Demo
          </span>
        </div>
        <p className="mt-1.5 text-sm text-cata-gray">
          {step === "select-session" &&
            "Seleccione la sesión en la que desea registrar asistencia."}
          {step === "mark-attendance" &&
            "Marque la asistencia de cada alumno en la sesión seleccionada."}
          {step === "confirm" &&
            "Revise y confirme el registro de asistencia."}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-xs text-cata-gray-light">
          <span>
            Paso {currentIndex + 1} de {STEP_ORDER.length}
          </span>
          <span>{STEP_LABELS[step]}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-cata-stone/50">
          <div
            className="h-full rounded-full bg-cata-red transition-all duration-400 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Form card */}
      <div className="card mx-auto max-w-2xl p-6 sm:p-8">
        <h2 className="mb-6 text-lg font-semibold text-cata-charcoal">
          {STEP_LABELS[step]}
        </h2>

        <form onSubmit={handleConfirm}>
          {/* Step content */}
          {step === "select-session" && renderSessionSelection()}
          {step === "mark-attendance" && renderMarkAttendance()}
          {step === "confirm" && renderConfirmation()}

          {/* Navigation buttons */}
          <div className="mt-8 flex items-center justify-between gap-3">
            <div>
              {!isFirst && (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={submitting}
                  className="btn-ghost"
                >
                  <ChevronLeft size={14} strokeWidth={1.5} aria-hidden="true" />
                  Atrás
                </button>
              )}
            </div>

            <div className="flex gap-3">
              {!isLast && step !== "select-session" ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-primary shadow-soft"
                >
                  Siguiente
                  <ChevronRight size={14} strokeWidth={1.5} aria-hidden="true" />
                </button>
              ) : null}

              {isLast && (
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary shadow-soft"
                >
                  {submitting ? (
                    "Registrando..."
                  ) : (
                    <>
                      <CheckCircle size={14} strokeWidth={2} />
                      Confirmar Asistencia
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Navigation link */}
      <p className="mt-6 text-center text-sm text-cata-gray">
        <Link
          href="/trainer"
          className="font-medium text-cata-red transition-colors hover:text-cata-red-light"
        >
          &larr; Volver al Panel del Entrenador
        </Link>
      </p>

      {/* Demo note */}
      <p className="mt-4 text-center text-xs text-cata-gray/40">
        Prototipo de demostración interactivo. No se almacena ningún dato real.
        Datos ficticios para fines de presentación.
      </p>
    </div>
    )}
    </ProtectedRoute>
  );
}
