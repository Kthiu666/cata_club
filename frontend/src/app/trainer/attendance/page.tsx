/**
 * Trainer Attendance Registration — real, persisted flow (Fase 3).
 *
 * Multi-step wizard for registering attendance in training sessions,
 * backed by real data end-to-end:
 *   - Schedule (Horario) and roster (NivelRanking "Grupo" roster) selection
 *     from `GET /api/attendance/schedules` and `GET /api/ranking/niveles`
 *     + `GET /api/ranking/niveles/:id/tabla`.
 *   - Student attendance marking (present/absent/late/justified).
 *   - Confirmation + real persistence via `POST /api/attendance/records`
 *     (one real `POST /asistencias` per student, see
 *     src/lib/server/attendance-adapter.ts).
 *
 * Domain rules:
 *   - Horario/session is NOT owned by one trainer.
 *   - Any trainer can register attendance in any available session.
 *   - The system records which trainer took the attendance.
 *
 * Schedule and roster are selected independently rather than as one combined
 * "session": the backend has no API exposing which NivelRanking a Horario
 * belongs to (see attendance-utils.ts docstring) — asking the trainer to
 * pick both is the honest adaptation to that gap, not a stylistic choice.
 */

"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/shell/AppShell";
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
  ClipboardList,
  XCircle,
} from "lucide-react";
import {
  ATTENDANCE_LABELS,
  ATTENDANCE_STATES,
  countByState,
  buildAttendanceSummary,
  buildRosterFromTabla,
  type SessionStudent,
} from "./attendance-utils";
import { getAttendanceBadgeTokens, formatDay } from "@/app/attendance/attendance-utils";
import type { TrainingSchedule } from "@/app/attendance/attendance-utils";
import {
  fetchTrainingSchedules,
  fetchNivelesConOcupacion,
  fetchNivelRoster,
  registerAttendance,
  type NivelConOcupacion,
  type RegisterAttendanceResult,
} from "@/services/api";
import type { EstadoAsistencia } from "@/types/domain";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WizardStep = "select-session" | "mark-attendance" | "confirm";

const STEP_ORDER: WizardStep[] = ["select-session", "mark-attendance", "confirm"];

const STEP_LABELS: Record<WizardStep, string> = {
  "select-session": "Seleccionar Horario y Grupo",
  "mark-attendance": "Registrar Asistencia",
  confirm: "Confirmar y Finalizar",
};

const NIVEL_CATEGORIA_LABELS: Record<NivelConOcupacion["nivelCategoria"], string> = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

// ---------------------------------------------------------------------------
// UI constants
// ---------------------------------------------------------------------------

const ATTENDANCE_ICONS: Record<EstadoAsistencia, React.ReactNode> = {
  present: <UserCheck size={16} strokeWidth={2} aria-hidden="true" />,
  absent: <UserX size={16} strokeWidth={2} aria-hidden="true" />,
  late: <Timer size={16} strokeWidth={2} aria-hidden="true" />,
  justified: <FileText size={16} strokeWidth={2} aria-hidden="true" />,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TrainerAttendancePage(): React.ReactElement {
  const { session } = useAuth();
  const trainerName = session?.user?.name ?? "Entrenador";
  const entrenadorPersonaId = session?.user?.id ? Number(session.user.id) : null;

  const [step, setStep] = useState<WizardStep>("select-session");

  const [schedules, setSchedules] = useState<TrainingSchedule[]>([]);
  const [niveles, setNiveles] = useState<NivelConOcupacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [selectedNivelId, setSelectedNivelId] = useState<number | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);

  const [students, setStudents] = useState<SessionStudent[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<RegisterAttendanceResult | null>(null);

  const loadOptions = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setLoadError(null);
      const [scheduleData, nivelData] = await Promise.all([
        fetchTrainingSchedules(),
        fetchNivelesConOcupacion(),
      ]);
      setSchedules(scheduleData);
      setNiveles(nivelData);
    } catch (err) {
      console.error("[trainer/attendance] loadOptions failed", err);
      setLoadError("Error al cargar horarios y grupos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  const currentIndex = STEP_ORDER.indexOf(step);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === STEP_ORDER.length - 1;
  const progress = ((currentIndex + 1) / STEP_ORDER.length) * 100;

  const selectedSchedule = schedules.find((s) => s.id === selectedScheduleId) ?? null;
  const selectedNivel = niveles.find((n) => n.id === selectedNivelId) ?? null;
  const bothSelected = selectedScheduleId !== null && selectedNivelId !== null;

  // ---- Navigation ----

  async function handleContinueToRoster(): Promise<void> {
    if (selectedNivelId === null) return;
    setRosterLoading(true);
    setRosterError(null);
    try {
      const tabla = await fetchNivelRoster(selectedNivelId);
      setStudents(buildRosterFromTabla(tabla));
      setStep("mark-attendance");
    } catch (err) {
      console.error("[trainer/attendance] fetchNivelRoster failed", err);
      setRosterError("No se pudo cargar el listado de estudiantes de este grupo.");
    } finally {
      setRosterLoading(false);
    }
  }

  function handleBack(): void {
    const prevIdx = currentIndex - 1;
    if (prevIdx >= 0) {
      setStep(STEP_ORDER[prevIdx]);
    }
  }

  function handleNext(): void {
    const nextIdx = currentIndex + 1;
    if (nextIdx < STEP_ORDER.length) {
      setStep(STEP_ORDER[nextIdx]);
    }
  }

  function handleToggleAttendance(studentIndex: number): void {
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

  function handleDirectAttendanceSet(studentIndex: number, state: EstadoAsistencia): void {
    setStudents((prev) =>
      prev.map((s, i) => (i === studentIndex ? { ...s, attendance: state } : s)),
    );
  }

  async function handleConfirm(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!selectedScheduleId || entrenadorPersonaId === null) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const registration = await registerAttendance({
        horarioId: selectedScheduleId,
        entrenadorId: entrenadorPersonaId,
        students: students.map((s) => ({ personaId: Number(s.id), estado: s.attendance })),
      });
      setResult(registration);
      setConfirmed(true);
    } catch (err) {
      console.error("[trainer/attendance] registerAttendance failed", err);
      setSubmitError("No se pudo registrar la asistencia. Intente nuevamente.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset(): void {
    setStep("select-session");
    setSelectedScheduleId(null);
    setSelectedNivelId(null);
    setStudents([]);
    setConfirmed(false);
    setSubmitting(false);
    setSubmitError(null);
    setResult(null);
  }

  // ---- Step renderers ----

  function renderSessionSelection(): React.ReactElement {
    return (
      <div className="space-y-6">
        <div>
          <p className="mb-3 text-sm leading-relaxed text-cata-text/65">
            Seleccione el horario de entrenamiento:
          </p>
          {schedules.length === 0 ? (
            <p className="text-sm text-cata-text/45">No hay horarios registrados.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {schedules.map((sched) => {
                const isActive = sched.id === selectedScheduleId;
                return (
                  <button
                    key={sched.id}
                    type="button"
                    onClick={() => setSelectedScheduleId(sched.id)}
                    className={`card-hover p-5 text-left transition-all duration-150 ${
                      isActive
                        ? "ring-2 ring-cata-red/30 border-cata-red/20"
                        : ""
                    }`}
                  >
                    <div className="mb-2.5 flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cata-red/15">
                        <Calendar size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                      </div>
                      <span className="text-sm font-bold text-cata-text">
                        {formatDay(sched.diaSemana)}
                      </span>
                    </div>
                    <div className="rounded-lg bg-cata-bg/60 px-3 py-2">
                      <p className="flex items-center gap-1.5 text-xs text-cata-text/70">
                        <Clock size={13} strokeWidth={1.5} className="text-cata-red/70" aria-hidden="true" />
                        <span className="font-semibold text-cata-text">{sched.horaInicio}</span>
                        <span className="text-cata-text/40">a</span>
                        <span className="font-semibold text-cata-text">{sched.horaFin}</span>
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-cata-text/55">
                        <UserCheck size={12} strokeWidth={1.5} aria-hidden="true" />
                        {sched.entrenadorNombre}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <p className="mb-3 text-sm leading-relaxed text-cata-text/65">
            Seleccione el grupo cuya asistencia va a registrar:
          </p>
          {niveles.length === 0 ? (
            <p className="text-sm text-cata-text/45">No hay grupos registrados.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {niveles.map((nivel) => {
                const isActive = nivel.id === selectedNivelId;
                return (
                  <button
                    key={nivel.id}
                    type="button"
                    onClick={() => setSelectedNivelId(nivel.id)}
                    className={`rounded-xl border p-4 text-left transition-all duration-150 ${
                      isActive
                        ? "border-cata-red bg-cata-red/10"
                        : "border-cata-border bg-cata-surface hover:border-cata-red/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-cata-text">
                      <GraduationCap size={14} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                      {nivel.nombre ?? `Nivel ${nivel.numeroNivel}`}
                    </div>
                    <p className="mt-1 text-xs text-cata-text/65">
                      {NIVEL_CATEGORIA_LABELS[nivel.nivelCategoria]} &middot; {nivel.personasActuales} estudiantes
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {rosterError && (
          <div className="alert-error" role="alert">
            {rosterError}
          </div>
        )}

        <button
          type="button"
          onClick={handleContinueToRoster}
          disabled={!bothSelected || rosterLoading}
          className="btn-primary w-full shadow-soft"
        >
          {rosterLoading ? "Cargando estudiantes..." : "Continuar"}
          <ChevronRight size={14} strokeWidth={1.5} aria-hidden="true" />
        </button>

        {/* Domain reminder */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-900/20 p-3 text-xs text-amber-400">
          <p className="flex items-center gap-1.5 font-medium">
            <AlertTriangle size={12} strokeWidth={2} aria-hidden="true" />
            Cualquier entrenador puede registrar asistencia
          </p>
          <p className="mt-1 text-amber-700/80">
            Los horarios no están asignados a un entrenador específico.
            El sistema registrará quién tomó la asistencia.
          </p>
        </div>
      </div>
    );
  }

  function renderMarkAttendance(): React.ReactElement | null {
    if (!selectedSchedule || !selectedNivel) return null;

    const presentCount = countByState(students, "present");
    const absentCount = countByState(students, "absent");
    const lateCount = countByState(students, "late");
    const justifiedCount = countByState(students, "justified");

    return (
      <div className="space-y-4">
        {/* Session context */}
        <div className="rounded-xl border border-cata-border bg-cata-surface p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cata-red/15">
              <Calendar size={14} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
            </div>
            <span className="font-medium text-cata-text">
              {selectedNivel.nombre ?? `Nivel ${selectedNivel.numeroNivel}`}
            </span>
            <span className="text-cata-text/65">—</span>
            <span className="text-cata-text/65">{formatDay(selectedSchedule.diaSemana)}</span>
            <span className="text-cata-text/65">&middot;</span>
            <span className="text-cata-text/65">
              {selectedSchedule.horaInicio} — {selectedSchedule.horaFin}
            </span>
          </div>
          {/* Live counts */}
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-cata-state-ok/10 px-2 py-0.5 font-medium text-cata-state-ok">
              <UserCheck size={11} strokeWidth={2} aria-hidden="true" />
              {presentCount} Presentes
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700">
              <UserX size={11} strokeWidth={2} aria-hidden="true" />
              {absentCount} Ausentes
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
              <Timer size={11} strokeWidth={2} aria-hidden="true" />
              {lateCount} Tardanzas
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
              <FileText size={11} strokeWidth={2} aria-hidden="true" />
              {justifiedCount} Justificados
            </span>
          </div>
        </div>

        {/* Student list with attendance toggle */}
        {students.length === 0 ? (
          <div className="card flex flex-col items-center py-10 text-center">
            <Users size={28} strokeWidth={1.5} className="mb-2 text-cata-text/20" aria-hidden="true" />
            <p className="text-sm text-cata-text/50">Este grupo no tiene estudiantes asignados.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {students.map((student, idx) => (
              <div
                key={student.id}
                className="card-hover flex items-center justify-between gap-3 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cata-red/15">
                    <UserCheck size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                  </div>
                  <span className="text-sm font-medium text-cata-text">
                    {student.name}
                  </span>
                </div>

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
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all duration-150 ${
                            isActive
                              ? `border-current/20 ${getAttendanceBadgeTokens(state).badgeClass}`
                              : "border-transparent text-cata-text/45 hover:border-cata-border hover:text-cata-text/65"
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
                      getAttendanceBadgeTokens(student.attendance).badgeClass
                    }`}
                  >
                    {ATTENDANCE_ICONS[student.attendance]}
                    {ATTENDANCE_LABELS[student.attendance]}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Trainer attribution reminder */}
        <div className="rounded-xl border border-cata-border bg-cata-bg p-3 text-xs text-cata-text/65">
          <span className="flex items-center gap-1.5 font-medium text-cata-text">
            <UserCheck size={12} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
            Registrando como: {trainerName}
          </span>
        </div>
      </div>
    );
  }

  function renderConfirmation(): React.ReactElement | null {
    if (!selectedSchedule || !selectedNivel) return null;

    const presentCount = countByState(students, "present");
    const absentCount = countByState(students, "absent");
    const lateCount = countByState(students, "late");
    const justifiedCount = countByState(students, "justified");
    const summary = buildAttendanceSummary(students);

    return (
      <div className="space-y-5">
        <p className="text-sm leading-relaxed text-cata-text/65">
          Revise el resumen antes de confirmar el registro de asistencia:
        </p>

        {/* Session data */}
        <div className="card-hover p-4">
          <div className="mb-3 flex items-center gap-2">
            <Calendar size={14} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-cata-text/45">
              Sesión
            </h3>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-cata-text/65">Grupo</dt>
            <dd className="font-medium text-cata-text">
              {selectedNivel.nombre ?? `Nivel ${selectedNivel.numeroNivel}`}
            </dd>
            <dt className="text-cata-text/65">Horario</dt>
            <dd className="font-medium text-cata-text">
              {formatDay(selectedSchedule.diaSemana)} {selectedSchedule.horaInicio} — {selectedSchedule.horaFin}
            </dd>
          </dl>
        </div>

        {/* Attendance summary */}
        <div className="card-hover p-4">
          <div className="mb-3 flex items-center gap-2">
            <Users size={14} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-cata-text/45">
              Resumen de Asistencia
            </h3>
          </div>
          <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-cata-state-ok/10 p-3 text-center">
              <p className="text-lg font-bold text-cata-state-ok">{presentCount}</p>
              <p className="text-xs text-cata-state-ok/80">Presentes</p>
            </div>
            <div className="rounded-lg bg-red-50 p-3 text-center">
              <p className="text-lg font-bold text-red-700">{absentCount}</p>
              <p className="text-xs text-red-700/80">Ausentes</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 text-center">
              <p className="text-lg font-bold text-amber-700">{lateCount}</p>
              <p className="text-xs text-amber-700/80">Tardanzas</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3 text-center">
              <p className="text-lg font-bold text-blue-700">{justifiedCount}</p>
              <p className="text-xs text-blue-700/80">Justificados</p>
            </div>
          </div>
          <p className="text-xs text-cata-text/45">{summary}</p>
        </div>

        {/* Trainer attribution */}
        <div className="rounded-xl border border-cata-state-ok/30 bg-cata-state-ok/10 p-4">
          <div className="mb-2 flex items-center gap-2">
            <UserCheck size={14} strokeWidth={1.5} className="text-cata-state-ok" aria-hidden="true" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-cata-state-ok">
              Asistencia Registrada Por
            </h3>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <UserCheck size={16} strokeWidth={1.5} className="text-cata-state-ok" aria-hidden="true" />
            <span className="font-medium text-cata-state-ok">{trainerName}</span>
          </div>
          <p className="mt-1 text-xs text-cata-state-ok/80">
            {trainerName} será registrado como el entrenador que tomó la asistencia
            de {students.length} estudiantes en esta sesión.
          </p>
        </div>

        {submitError && (
          <div className="alert-error" role="alert">
            {submitError}
          </div>
        )}
      </div>
    );
  }

  // ---- Render ----

  const stepSubtitle =
    step === "select-session"
      ? "Seleccione la sesión en la que desea registrar asistencia."
      : step === "mark-attendance"
        ? "Marque la asistencia de cada estudiante en la sesión seleccionada."
        : "Revise y confirme el registro de asistencia.";

  return (
    <ProtectedRoute allowedRoles={["trainer"]}>
      <AppShell
        eyebrow="Área de entrenadores"
        title="Registrar Asistencia"
        subtitle={confirmed ? "Asistencia registrada." : stepSubtitle}
      >
      {confirmed ? (
        <div className="flex min-h-[50vh] items-center justify-center py-8">
          <div className="w-full max-w-lg text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-cata-state-ok/10">
              <CheckCircle size={32} className="text-cata-state-ok" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <h2 className="mb-3 text-2xl font-bold tracking-tight text-cata-text">
              Asistencia Registrada
            </h2>
            <p className="mb-2 text-sm leading-relaxed text-cata-text/65">
              La asistencia para{" "}
              <strong className="text-cata-text">
                {selectedNivel?.nombre ?? "el grupo seleccionado"}
              </strong>{" "}
              ha sido registrada exitosamente.
            </p>
            <p className="mb-2 text-sm leading-relaxed text-cata-text/65">
              <strong className="text-cata-text">{trainerName}</strong> figura como
              el entrenador que tomó la asistencia de{" "}
              <strong className="text-cata-text">{result?.createdCount ?? 0} estudiantes</strong>.
            </p>
            {students.length > 0 && (
              <p className="mb-4 text-xs text-cata-text/40">
                {buildAttendanceSummary(students)}
              </p>
            )}
            {result && result.failed.length > 0 && (
              <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-900/20 p-3 text-left text-xs text-amber-400">
                <p className="flex items-center gap-1.5 font-medium">
                  <AlertTriangle size={12} strokeWidth={2} aria-hidden="true" />
                  {result.failed.length} registro(s) no se pudieron guardar
                </p>
                <p className="mt-1 text-amber-700/80">
                  Vuelva a intentar el registro para esos estudiantes desde una nueva sesión.
                </p>
              </div>
            )}
            {(!result || result.failed.length === 0) && <div className="mb-8" />}

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
        <div>
          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="flex items-center gap-2">
                <Clock size={16} strokeWidth={1.5} className="animate-spin text-cata-text/65" aria-hidden="true" />
                <p className="text-sm text-cata-text/50">Cargando horarios y grupos...</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {loadError && !loading && (
            <div className="card mb-8 border border-red-200 bg-red-50 p-6 text-center">
              <XCircle size={32} strokeWidth={1.5} className="mx-auto mb-3 text-red-700" aria-hidden="true" />
              <p className="text-sm text-cata-red">{loadError}</p>
              <button type="button" onClick={() => loadOptions()} className="btn-ghost mt-3 text-xs text-cata-red">
                Reintentar
              </button>
            </div>
          )}

          {!loading && !loadError && (
            <>
              {/* Progress bar */}
              <div className="mb-8">
                <div className="mb-2 flex items-center justify-between text-xs text-cata-text/45">
                  <span>
                    Paso {currentIndex + 1} de {STEP_ORDER.length}
                  </span>
                  <span>{STEP_LABELS[step]}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-cata-border">
                  <div
                    className="h-full rounded-full bg-cata-red transition-all duration-400 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Form card */}
              <div className="card mx-auto max-w-2xl p-6 sm:p-8">
                <div className="mb-6 flex items-center gap-2">
                  <ClipboardList size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                  <h2 className="text-lg font-semibold text-cata-text">
                    {STEP_LABELS[step]}
                  </h2>
                </div>

                <form onSubmit={handleConfirm}>
                  {/* Step content */}
                  {step === "select-session" && renderSessionSelection()}
                  {step === "mark-attendance" && renderMarkAttendance()}
                  {step === "confirm" && renderConfirmation()}

                  {/* Navigation buttons */}
                  {step !== "select-session" && (
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
                        {!isLast ? (
                          <button
                            type="button"
                            onClick={handleNext}
                            disabled={students.length === 0}
                            className="btn-primary shadow-soft"
                          >
                            Siguiente
                            <ChevronRight size={14} strokeWidth={1.5} aria-hidden="true" />
                          </button>
                        ) : null}

                        {isLast && (
                          <button
                            type="submit"
                            disabled={submitting || entrenadorPersonaId === null}
                            className="btn-primary shadow-soft"
                          >
                            {submitting ? (
                              "Registrando..."
                            ) : (
                              <>
                                <CheckCircle size={14} strokeWidth={2} aria-hidden="true" />
                                Confirmar Asistencia
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </form>
              </div>

              {/* Navigation link */}
              <p className="mt-6 text-center text-sm text-cata-text/65">
                <Link
                  href="/trainer"
                  className="font-medium text-cata-red transition-colors hover:text-cata-red-light"
                >
                  &larr; Volver al Panel del Entrenador
                </Link>
              </p>
            </>
          )}
        </div>
      )}
      </AppShell>
    </ProtectedRoute>
  );
}
