/**
 * Trainer Attendance — "Pasar lista"
 * (`docs/ux/prototipos/20-tomar-lista.html`).
 *
 * Three steps, backed by real data end to end:
 *   - Horario selection from `GET /api/attendance/schedules`, with the roster
 *     loaded from that Horario's assigned alumnos
 *     (`GET /api/groups/horarios/:id/alumnos`).
 *   - Marking, on 48px single-line fiches.
 *   - Confirmation + persistence via `POST /api/attendance/records`.
 *
 * Domain rules: a Horario is not owned by one trainer, any trainer may file a
 * session, and the system records who did.
 *
 * ## Data-integrity guarantees this screen must never lose
 *
 * The roster starts on `DEFAULT_ATTENDANCE` ("present"), because a session is
 * overwhelmingly "everyone showed up" and starting from nothing turned 40
 * students into 40 obligatory taps.
 *
 * That default does NOT remove the risk it replaced, it turns it around: the
 * old `absent` default let a trainer file a whole session as a no-show by
 * tapping straight through, and a `present` default lets them file students as
 * having attended without ever looking at them — including students on roster
 * page 2 they never scrolled to. So the roll call separates the VALUE from the
 * DECISION and never conflates the two:
 *   - `SessionStudent.reviewed` says whether a human touched the row. Every
 *     path that sets a state sets it: the fiche tap, the four controls,
 *     "Marcar restantes presentes", a record already saved for this session,
 *     and a restored draft entry.
 *   - `countUnreviewed` spans the FULL roster, never the visible page or the
 *     name filter, and both the roll call and the confirmation step show it.
 *   - An unreviewed fiche is visibly provisional (dashed outline, dashed state
 *     chip, "sin revisar" in its accessible name), and "Ver solo sin revisar"
 *     turns the count into a way to actually go clear it.
 *   - The confirmation step says "N de M siguen en Presente porque nadie los
 *     revisó" instead of reporting "45 presentes" identically either way, and
 *     offers to go back. It informs; it does not block — the trainer asked for
 *     a default, and a default that blocks is not one.
 *   - Tapping a fiche cycles the state, but `cycleWizardAttendance` can never
 *     return to `UNMARKED`, and the four explicit 44px controls stay present
 *     and stay a `radiogroup` — the tap is an accelerator, not a replacement.
 *   - The draft in `sessionStorage` only ever persists REVIEWED rows in one of
 *     the four REAL states, keyed by horario + date, so a refresh can never
 *     launder "nobody looked" into "confirmed"; see the rules block in
 *     `attendance-utils.ts`.
 *   - The `UNMARKED` sentinel still never reaches the API: `toAttendanceMarks`
 *     strips it and the submit refuses while `countUnmarked` is non-zero.
 *
 * ## What the audit found, and where it is answered
 *
 *   - 40 simultaneous targets on one screen → the fiche is one target for the
 *     common case; the four controls are the deliberate path.
 *   - No sticky commit → the totals + Continuar bar is `sticky bottom-0`, so
 *     the trainer never scrolls the card to reach it.
 *   - No draft persistence → a phone call no longer costs the session.
 *   - "N registro(s) no se pudieron guardar" without naming anyone → the
 *     failures are listed by name.
 */

"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/shell/AppShell";

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  Calendar,
  Clock,
  Users,
  UserCheck,
  UserX,
  Timer,
  FileText,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import {
  ATTENDANCE_LABELS,
  ATTENDANCE_STATES,
  UNMARKED,
  applyAttendanceDraft,
  attendanceDraftKey,
  clearAttendanceDraft,
  countByState,
  countUnmarked,
  countUnreviewed,
  isReviewed,
  loadAttendanceDraft,
  markRemainingPresent,
  resolveFailedStudentNames,
  tapWizardAttendance,
  saveAttendanceDraft,
  toAttendanceMarks,
  buildAttendanceSummary,
  buildRosterFromAlumnoHorarios,
  resolveEntrenadorId,
  resolveDisplayTrainerName,
  type SessionStudent,
} from "./attendance-utils";
import {
  getAttendanceBadgeTokens,
  getAttendanceBadgeTone,
  formatDay,
  groupSchedulesByDay,
  selectVisibleSchedules,
  paginateRecords,
  getTotalPages,
} from "@/app/attendance/attendance-utils";
import BackLink from "@/components/BackLink";
import { Badge, Button, EmptyState, ErrorState, LoadingState, Pagination, Stepper, buttonClasses } from "@/components/ui";
import { getUserInitials } from "@/lib/auth-utils";
import { clubIsoDate, todayDiaSemana } from "@/lib/club-date";
import type { TrainingSchedule } from "@/app/attendance/attendance-utils";
import type { DiaSemana } from "@/types/domain";
import {
  fetchTrainingSchedules,
  fetchAlumnosPorHorario,
  fetchAttendanceRecords,
  registerAttendance,
  type RegisterAttendanceResult,
} from "@/services/api";
import type { EstadoAsistencia } from "@/types/domain";
import { useWizardHistory } from "@/lib/wizard-history";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WizardStep = "select-session" | "mark-attendance" | "confirm";

const STEP_ORDER: WizardStep[] = ["select-session", "mark-attendance", "confirm"];

/** The card heading per step. */
const STEP_LABELS: Record<WizardStep, string> = {
  "select-session": "Elija el horario",
  "mark-attendance": "Pasar lista",
  confirm: "Confirmar y finalizar",
};

// ---------------------------------------------------------------------------
// UI constants
// ---------------------------------------------------------------------------

/** Page size for the student list in the attendance registration wizard. */
const WIZARD_PAGE_SIZE = 10;

const ATTENDANCE_ICONS: Record<EstadoAsistencia, React.ReactNode> = {
  present: <UserCheck size={16} strokeWidth={2} aria-hidden="true" />,
  absent: <UserX size={16} strokeWidth={2} aria-hidden="true" />,
  late: <Timer size={16} strokeWidth={2} aria-hidden="true" />,
  justified: <FileText size={16} strokeWidth={2} aria-hidden="true" />,
};

/** Plural labels for the save bar's running totals. */
const TOTAL_LABELS: Record<EstadoAsistencia, [singular: string, plural: string]> = {
  present: ["Presente", "Presentes"],
  late: ["Tardanza", "Tardanzas"],
  justified: ["Justificado", "Justificados"],
  absent: ["Ausente", "Ausentes"],
};

/** Best news first — the same order every attendance surface reads in. */
const TOTAL_ORDER: EstadoAsistencia[] = ["present", "late", "justified", "absent"];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function TrainerAttendanceWizard(): React.ReactElement {
  const { session } = useAuth();
  const { showError } = useToast();

  const [schedules, setSchedules] = useState<TrainingSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<DiaSemana>>(new Set());
  /**
   * The picker opens on today and stays there until the trainer says
   * otherwise — a default, never a lock. Filing a session missed yesterday
   * has to stay one tap away.
   */
  const [showAllDays, setShowAllDays] = useState(false);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);

  const [students, setStudents] = useState<SessionStudent[]>([]);
  const [sessionDate, setSessionDate] = useState<string | null>(null);
  const [restoredFromDraft, setRestoredFromDraft] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  /** Narrows the roll call to the rows nobody has touched yet. */
  const [onlyUnreviewed, setOnlyUnreviewed] = useState(false);
  const [studentPage, setStudentPage] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<RegisterAttendanceResult | null>(null);

  const loadOptions = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setLoadError(null);
      const scheduleData = await fetchTrainingSchedules();
      setSchedules(scheduleData);
    } catch (err) {
      console.error("[trainer/attendance] loadOptions failed", err);
      setLoadError("Error al cargar horarios");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  /**
   * Resolved every render rather than memoized: a tablet left open at
   * courtside crosses midnight, and a "today" frozen at mount would keep
   * offering yesterday's sessions. The formatter behind it is cached, so the
   * cost is a lookup.
   */
  const today = todayDiaSemana();
  const visible = useMemo(
    () => selectVisibleSchedules(schedules, today, showAllDays),
    [schedules, today, showAllDays],
  );

  /**
   * Open today's panel as soon as the schedules land. With a single day on
   * screen, making the trainer tap the accordion to reveal its times is the
   * friction this whole default exists to remove.
   */
  useEffect(() => {
    if (schedules.length === 0) return;
    const currentDay = todayDiaSemana();
    if (!schedules.some((s) => s.diaSemana === currentDay)) return;
    setExpandedDays((prev) => (prev.has(currentDay) ? prev : new Set(prev).add(currentDay)));
  }, [schedules]);

  /**
   * One feedback rule, product-wide (see `payments/page.tsx` for the other
   * half of it): the TOAST carries the outcome of an action the user just
   * took; an INLINE block carries a blocker attached to a specific control.
   *
   * `submitError` is an outcome — the registration failed — with no control
   * left to attach it to, so it toasts. `rosterError` blocks the "Continuar"
   * button it renders directly above, so it stays inline and does NOT also
   * toast.
   */
  useEffect(() => {
    if (submitError) showError(submitError);
  }, [submitError, showError]);

  // Reset student page when either filter changes.
  useEffect(() => {
    setStudentPage(1);
  }, [searchFilter, onlyUnreviewed]);

  /**
   * How far this session has actually got, which is what the URL is allowed to
   * ask for. `sessionDate` — not `students.length` — is the honest test: it is
   * set exactly when a roster load succeeds, so a horario with zero assigned
   * alumnos still advances and says so, while a reload carrying `?paso=3` with
   * no roster behind it lands back on the horario picker instead of rendering
   * a confirmation of nothing.
   */
  const maxReachableStep = sessionDate === null ? 0 : STEP_ORDER.length - 1;
  const { step, goToStep, goBack, resetToFirstStep } = useWizardHistory(
    STEP_ORDER,
    maxReachableStep,
  );

  const currentIndex = STEP_ORDER.indexOf(step);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === STEP_ORDER.length - 1;

  const selectedSchedule = schedules.find((s) => s.id === selectedScheduleId) ?? null;

  /** The draft's key — null until a session is actually chosen. */
  const draftKey = useMemo(
    () =>
      selectedScheduleId !== null && sessionDate
        ? attendanceDraftKey(selectedScheduleId, sessionDate)
        : null,
    [selectedScheduleId, sessionDate],
  );

  // Admins may register attendance on a trainer's behalf (backend requires
  // entrenadorId to belong to an actual ENTRENADOR — see attendance-utils.ts).
  const trainerName = resolveDisplayTrainerName(
    session?.user?.role ?? null,
    session?.user?.name,
    selectedSchedule,
  );
  const entrenadorPersonaId = resolveEntrenadorId(
    session?.user?.role ?? null,
    session?.user?.id,
    selectedSchedule,
  );

  // /trainer is gated to the "trainer" role only — an admin using this page
  // must bounce back to their own attendance overview, not the trainer panel.
  const backHref = session?.user?.role === "admin" ? "/attendance" : "/trainer";

  // ---- Navigation ----

  async function handleContinueToRoster(): Promise<void> {
    if (selectedScheduleId === null) return;
    setRosterLoading(true);
    setRosterError(null);
    try {
      // The wizard always registers attendance for "today" (the backend
      // defaults fechaEntrenamiento to today's server date when omitted).
      // Re-opening the wizard for a session that already has today's
      // attendance recorded must show those existing marks, not silently
      // default everyone back to unmarked.
      const today = clubIsoDate();
      // The prefill fetch is a convenience, not a requirement: if it fails,
      // fall back to an empty list rather than failing the whole roster load.
      const [alumnoHorarios, existingRecords] = await Promise.all([
        fetchAlumnosPorHorario(selectedScheduleId),
        fetchAttendanceRecords({ fechaInicio: today, fechaFin: today, horarioId: selectedScheduleId }).catch(
          (err: unknown) => {
            console.error("[trainer/attendance] fetchAttendanceRecords prefill failed", err);
            return [];
          },
        ),
      ]);

      // Order matters: server records first, then the trainer's own in-progress
      // draft on top — the draft is the newer intent. Neither can produce
      // `UNMARKED`, so a student nobody has decided on stays undecided.
      const roster = buildRosterFromAlumnoHorarios(alumnoHorarios, existingRecords);
      const draft = loadAttendanceDraft(attendanceDraftKey(selectedScheduleId, today));
      const withDraft = applyAttendanceDraft(roster, draft);

      setSessionDate(today);
      setRestoredFromDraft(
        withDraft !== roster && countUnreviewed(withDraft) < countUnreviewed(roster),
      );
      setStudents(withDraft);
      setStudentPage(1);
      setOnlyUnreviewed(false);
      goToStep("mark-attendance");
    } catch (err) {
      console.error("[trainer/attendance] fetchAlumnosPorHorario failed", err);
      setRosterError("No se pudo cargar el listado de estudiantes de este horario.");
    } finally {
      setRosterLoading(false);
    }
  }

  /**
   * "Atrás" IS the browser's Back. Two ways to go back that push different
   * history is how the roll call got destroyed in the first place — the button
   * stepped back one card while the browser's Back left the wizard entirely.
   */
  function handleBack(): void {
    if (currentIndex > 0) goBack();
  }

  function handleNext(): void {
    const nextIdx = currentIndex + 1;
    if (nextIdx < STEP_ORDER.length) {
      goToStep(STEP_ORDER[nextIdx]);
    }
  }

  function toggleDay(day: DiaSemana): void {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  }

  /** Every path that changes a mark funnels through here, so does the draft. */
  const commitStudents = useCallback(
    (next: SessionStudent[]): void => {
      setStudents(next);
      setRestoredFromDraft(false);
      if (draftKey) saveAttendanceDraft(draftKey, next);
    },
    [draftKey],
  );

  /**
   * Every mark the trainer makes is also a REVIEW of that student — including
   * setting a row to the state it already had. Tapping "Presente" on a student
   * who was already present by default is the trainer saying "yes, that one is
   * here", and the roll call has to stop asking about them.
   */
  function handleDirectAttendanceSet(studentIndex: number, state: EstadoAsistencia): void {
    commitStudents(
      students.map((s, i) => (i === studentIndex ? { ...s, attendance: state, reviewed: true } : s)),
    );
  }

  /** The whole fiche is tappable — one target for the common case. */
  function handleCycleAttendance(studentIndex: number): void {
    commitStudents(
      students.map((s, i) =>
        i === studentIndex ? { ...s, attendance: tapWizardAttendance(s), reviewed: true } : s,
      ),
    );
  }

  /**
   * Bulk action for the common case (near-full attendance): the trainer states
   * in one tap that everyone they have not touched is present. Marks the
   * trainer already made are preserved. Applies to the whole roster, not just
   * the visible page or the current filter.
   */
  function handleMarkRemainingPresent(): void {
    commitStudents(markRemainingPresent(students));
  }

  async function handleConfirm(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!selectedScheduleId || entrenadorPersonaId === null) return;
    // Only the confirmation step files a session. Without this, a submit that
    // reached the form from anywhere else would file one straight from the
    // roll call — see the `key` on the advance/submit buttons for the way that
    // actually happened.
    if (step !== "confirm") return;
    // Never file a session carrying the sentinel — `toAttendanceMarks` strips
    // it, and this refuses the batch rather than filing a short roster.
    if (countUnmarked(students) > 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const registration = await registerAttendance({
        horarioId: selectedScheduleId,
        entrenadorId: entrenadorPersonaId,
        // `toAttendanceMarks` strips the frontend-only `unmarked` sentinel,
        // which the backend contract does not accept.
        students: toAttendanceMarks(students),
      });
      setResult(registration);
      setConfirmed(true);
      // The session is filed; the draft has nothing left to protect. Kept when
      // some records failed, so a retry still starts from the trainer's marks.
      if (draftKey && registration.failed.length === 0) clearAttendanceDraft(draftKey);
    } catch (err) {
      console.error("[trainer/attendance] registerAttendance failed", err);
      setSubmitError("No se pudo registrar la asistencia. Intente nuevamente.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset(): void {
    if (draftKey) clearAttendanceDraft(draftKey);
    // Replace rather than push: "Registrar otra asistencia" starts a new roll
    // call, so leaving the finished one on the back stack would offer to
    // return to a session that no longer exists in this component's state.
    resetToFirstStep();
    setSelectedScheduleId(null);
    setSessionDate(null);
    setRestoredFromDraft(false);
    setStudents([]);
    setSearchFilter("");
    setOnlyUnreviewed(false);
    setConfirmed(false);
    setSubmitting(false);
    setSubmitError(null);
    setResult(null);
  }

  // ---- Student list pagination (attendance wizard) ----

  const filteredStudents = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q && !onlyUnreviewed) return students;
    return students.filter(
      (s) =>
        (!q || s.name.toLowerCase().includes(q)) && (!onlyUnreviewed || !isReviewed(s)),
    );
  }, [students, searchFilter, onlyUnreviewed]);

  const totalStudentPages = useMemo(
    () => getTotalPages(filteredStudents.length, WIZARD_PAGE_SIZE),
    [filteredStudents.length],
  );
  const paginatedStudents = useMemo(
    () => paginateRecords(filteredStudents, studentPage, WIZARD_PAGE_SIZE),
    [filteredStudents, studentPage],
  );

  // Deliberately computed over `students` (the FULL roster) rather than
  // `filteredStudents`/`paginatedStudents`: the wizard paginates at 10 and
  // the search box filters, so a page- or filter-scoped count would report
  // "0 sin revisar" while a whole second page of students was about to be
  // filed present sight unseen — the exact silent-data-loss path this counter
  // exists to close.
  const unreviewedCount = useMemo(() => countUnreviewed(students), [students]);
  const unmarkedCount = useMemo(() => countUnmarked(students), [students]);
  const presentCount = useMemo(() => countByState(students, "present"), [students]);
  const unmarkedReasonId = "attendance-unmarked-reason";

  /** The named steps — step 1 carries the decision already made. */
  const stepNames = useMemo(
    () => [
      selectedSchedule
        ? `Horario · ${formatDay(selectedSchedule.diaSemana)} ${selectedSchedule.horaInicio}`
        : "Horario",
      "Pasar lista",
      "Confirmar",
    ],
    [selectedSchedule],
  );

  // ---- Step renderers ----

  function renderSessionSelection(): React.ReactElement {
    const dayGroups = groupSchedulesByDay(visible.schedules);
    return (
      <div className="flex flex-col gap-5">
        <div>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="text-[13px] text-ink-3">
              {visible.narrowedToToday
                ? `Horarios de hoy · ${formatDay(today)}`
                : "Seleccione el horario de entrenamiento:"}
            </p>
            {/* The escape hatch. Hidden when today is empty: the list is
                already the full week and the hint below says why. */}
            {schedules.length > 0 && !visible.emptyToday && (
              <button
                type="button"
                onClick={() => setShowAllDays((prev) => !prev)}
                className="text-[12.5px] font-semibold text-ink-2 underline underline-offset-2 transition-colors hover:text-ink"
              >
                {showAllDays ? "Ver solo hoy" : "Ver todos los días"}
              </button>
            )}
          </div>
          {visible.emptyToday && (
            <p className="mb-3 text-[12.5px] text-ink-3">
              No hay entrenamientos hoy ({formatDay(today).toLowerCase()}). Mostrando la semana
              completa.
            </p>
          )}
          {schedules.length === 0 ? (
            <EmptyState
              icon={<Calendar size={21} strokeWidth={1.5} aria-hidden="true" />}
              title="No hay horarios registrados"
              description="Sin un horario no se puede tomar lista. Pida a administración que registre uno."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {dayGroups.map((group) => {
                const isExpanded = expandedDays.has(group.day);
                const panelId = `schedule-day-${group.day}`;
                return (
                  <div key={group.day} className="overflow-hidden rounded-ctl border border-line bg-paper">
                    <button
                      type="button"
                      onClick={() => toggleDay(group.day)}
                      aria-expanded={isExpanded}
                      aria-controls={panelId}
                      className="flex min-h-[52px] w-full items-center justify-between gap-2.5 px-4 py-3 text-left transition-colors hover:bg-canvas"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="text-sm font-bold text-ink">{group.label}</span>
                        <span className="text-xs text-ink-3">
                          ({group.schedules.length}{" "}
                          {group.schedules.length === 1 ? "horario" : "horarios"})
                        </span>
                      </span>
                      <ChevronDown
                        size={16}
                        strokeWidth={2}
                        className={`shrink-0 text-ink-3 transition-transform duration-150 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                    {isExpanded && (
                      <div id={panelId} className="grid gap-2 border-t border-line p-3 sm:grid-cols-2">
                        {group.schedules.map((sched) => {
                          const isActive = sched.id === selectedScheduleId;
                          return (
                            <button
                              key={sched.id}
                              type="button"
                              onClick={() => setSelectedScheduleId(sched.id)}
                              aria-pressed={isActive}
                              // Selection is coal + the yellow ball dot, never
                              // a red fill — red is CTA and destructive only.
                              className={`flex min-h-[56px] flex-col justify-center gap-1 rounded-ctl border px-4 py-3 text-left transition-colors ${
                                isActive
                                  ? "border-coal bg-paper shadow-[0_0_0_1px_theme(colors.coal.DEFAULT)]"
                                  : "border-line-2 bg-paper hover:border-ink-3"
                              }`}
                            >
                              <span className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
                                <Clock size={14} strokeWidth={2} className="text-ink-3" aria-hidden="true" />
                                {sched.horaInicio} — {sched.horaFin}
                                {isActive && (
                                  <span
                                    aria-hidden="true"
                                    className="ml-auto h-1.5 w-1.5 rounded-full bg-ball ring-2 ring-coal"
                                  />
                                )}
                              </span>
                              <span className="text-[11.5px] text-ink-3">{sched.entrenadorNombre}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
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

        <Button
          type="button"
          variant="primary"
          onClick={handleContinueToRoster}
          disabled={!selectedScheduleId || rosterLoading}
          className="w-full"
        >
          {rosterLoading ? "Cargando estudiantes…" : "Continuar"}
          <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
        </Button>
      </div>
    );
  }

  function renderMarkAttendance(): React.ReactElement | null {
    if (!selectedSchedule) return null;

    return (
      <div className="flex flex-col gap-4">
        {/*
         * The coal header: the live marker the trainer glances at, the session
         * it belongs to, and the one-tap shortcut for the common case.
         */}
        <div className="flex flex-wrap items-center gap-5 rounded-card bg-coal px-[22px] py-[18px] text-white">
          <span
            aria-live="polite"
            className="text-[40px] font-extrabold leading-none tracking-[-0.05em] tabular-nums"
          >
            {presentCount}
            <span className="text-[20px] text-white/50">/{students.length}</span>
          </span>
          <span className="flex min-w-[170px] flex-1 flex-col gap-1">
            <b className="text-[15px] font-bold">presentes</b>
            <span className="flex flex-wrap items-center gap-1.5 text-[13px] text-white/60">
              {/* Kept as its own node: "Lunes" is the day, the range is the
                  time, and they are two different facts. */}
              <span>{formatDay(selectedSchedule.diaSemana)}</span>
              <span aria-hidden="true">·</span>
              <span>
                {selectedSchedule.horaInicio} — {selectedSchedule.horaFin}
              </span>
            </span>
            {/* The counter that keeps the default honest: the big number reads
                45/45 from the first second, and this says how much of it
                anybody has actually looked at. */}
            {unreviewedCount > 0 && (
              <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-ball">
                <AlertTriangle size={12} strokeWidth={2.5} aria-hidden="true" />
                {unreviewedCount === 1
                  ? "1 alumno sin revisar"
                  : `${unreviewedCount} alumnos sin revisar`}
              </span>
            )}
          </span>
          {unreviewedCount > 0 && (
            <button
              type="button"
              onClick={handleMarkRemainingPresent}
              className="inline-flex h-ctl items-center gap-2 rounded-ctl border border-white/25 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-white/10"
            >
              <UserCheck size={14} strokeWidth={2} aria-hidden="true" />
              Marcar restantes presentes
            </button>
          )}
        </div>

        {restoredFromDraft && (
          <p className="rounded-ctl border border-line bg-canvas px-3.5 py-2.5 text-xs text-ink-2">
            Recuperamos las marcas que ya había hecho en esta sesión. Revíselas antes de continuar.
          </p>
        )}

        {students.length === 0 ? (
          <EmptyState
            icon={<Users size={21} strokeWidth={1.5} aria-hidden="true" />}
            title="Este horario no tiene alumnos asignados."
            description="Pida a administración que asigne alumnos a este horario para poder tomar lista."
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {TOTAL_ORDER.map((state) => (
                <Badge key={state} tone={getAttendanceBadgeTone(state)}>
                  {ATTENDANCE_LABELS[state]}
                </Badge>
              ))}
              <span className="h-badge inline-flex items-center rounded-full border border-dashed border-line-2 px-[11px] text-[11.5px] font-bold text-ink-3">
                Sin revisar
              </span>
              <span className="text-xs text-ink-3">Toque la ficha para confirmar o cambiar</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Filtrar alumnos por nombre…"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                aria-label="Filtrar alumnos"
                className="h-ctl min-w-[180px] flex-1 rounded-ctl border border-line-2 bg-paper px-[13px] text-[13.5px] text-ink placeholder:text-ink-3 focus:border-cata-red focus:outline-none focus:ring-[3px] focus:ring-cata-red/10"
              />
              {/* Turns the count into something the trainer can act on: the
                  point of knowing 12 are unreviewed is being able to go
                  through those 12. Selection is coal, never a red fill. */}
              {(unreviewedCount > 0 || onlyUnreviewed) && (
                <button
                  type="button"
                  onClick={() => setOnlyUnreviewed((prev) => !prev)}
                  aria-pressed={onlyUnreviewed}
                  className={`inline-flex h-ctl shrink-0 items-center gap-2 rounded-ctl border px-4 text-[13px] font-semibold transition-colors ${
                    onlyUnreviewed
                      ? "border-coal bg-coal text-white"
                      : "border-line-2 bg-paper text-ink-2 hover:border-ink-3 hover:text-ink"
                  }`}
                >
                  Ver solo sin revisar
                  <span className="tabular-nums">({unreviewedCount})</span>
                </button>
              )}
            </div>

            {filteredStudents.length === 0 ? (
              <EmptyState
                icon={<Users size={21} strokeWidth={1.5} aria-hidden="true" />}
                title={
                  onlyUnreviewed && unreviewedCount === 0
                    ? "Ya revisó a todos los alumnos de este horario."
                    : "No se encontraron alumnos con ese nombre."
                }
                description={
                  onlyUnreviewed && unreviewedCount === 0
                    ? "Quite el filtro para volver a ver la lista completa antes de continuar."
                    : "Revise el filtro o bórrelo para volver a ver la lista completa."
                }
                action={
                  onlyUnreviewed ? (
                    <Button type="button" onClick={() => setOnlyUnreviewed(false)}>
                      Ver la lista completa
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <>
                <ul className="flex flex-col gap-2">
                  {paginatedStudents.map((student) => {
                    const idx = students.findIndex((s) => s.id === student.id);
                    const isUnmarked = student.attendance === UNMARKED;
                    const reviewed = isReviewed(student);
                    const nameId = `student-name-${student.id}`;
                    const groupLabelId = `attendance-label-${student.id}`;
                    const stateLabel = isUnmarked
                      ? "Sin marcar"
                      : ATTENDANCE_LABELS[student.attendance as EstadoAsistencia];
                    return (
                      <li
                        key={student.id}
                        data-attendance={student.attendance}
                        data-reviewed={reviewed}
                        className={`flex flex-col overflow-hidden rounded-ctl border bg-paper sm:h-12 sm:flex-row sm:items-center ${
                          reviewed ? "border-line-2" : "border-dashed border-ink-3/50"
                        }`}
                      >
                        {/*
                         * `.fiche` — 48px, avatar + name + state, and the WHOLE
                         * surface is the target. Sibling of the radiogroup, not
                         * its parent: nesting controls inside a button is
                         * invalid and unreachable by keyboard.
                         */}
                        <button
                          type="button"
                          onClick={() => handleCycleAttendance(idx)}
                          // The name says which of the two things a tap does
                          // here: an unreviewed row is a proposal, and the
                          // first tap accepts it.
                          aria-label={
                            reviewed
                              ? `${student.name}: ${stateLabel}. Cambiar estado`
                              : `${student.name}: ${stateLabel}, sin revisar. Confirmar o cambiar estado`
                          }
                          // `shrink-0` + `w-full`, and `flex-1` only from `sm`:
                          // on a phone the row is a COLUMN, where a bare
                          // `flex-1` (flex-basis 0) collapsed the 48px fiche to
                          // its 28px content height — the one dimension the
                          // prototype is explicit about.
                          className="flex h-12 w-full min-w-0 shrink-0 items-center gap-[11px] px-[13px] text-left transition-colors hover:bg-canvas sm:w-auto sm:flex-1"
                        >
                          <span
                            aria-hidden="true"
                            className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-state-neutral-bg text-[10px] font-bold text-state-neutral"
                          >
                            {getUserInitials(student.name)}
                          </span>
                          <span
                            id={nameId}
                            className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink"
                          >
                            {student.name}
                          </span>
                          {/* Same chip, two weights. A reviewed row wears the
                              state's own colour; an unreviewed one wears the
                              state in a dashed outline — the value is there
                              and readable, and it reads as provisional
                              because it is. */}
                          {reviewed && !isUnmarked ? (
                            <Badge
                              tone={getAttendanceBadgeTone(student.attendance)}
                              className="flex-none"
                            >
                              {stateLabel}
                            </Badge>
                          ) : (
                            <span className="h-badge inline-flex flex-none items-center rounded-full border border-dashed border-line-2 px-[11px] text-[11.5px] font-bold text-ink-3">
                              {stateLabel}
                            </span>
                          )}
                        </button>

                        {/*
                         * A radiogroup, not a fieldset of `aria-pressed`
                         * toggles: the four states are mutually exclusive, and
                         * toggle buttons announce as four independent switches
                         * that never convey that exclusivity. The group is
                         * labelled by the RENDERED student name, so the
                         * accessible name can never drift from what is on
                         * screen. This is the deliberate path; the tap above is
                         * the accelerator.
                         */}
                        <div
                          role="radiogroup"
                          aria-labelledby={`${groupLabelId} ${nameId}`}
                          className="grid w-full grid-cols-4 gap-0.5 border-t border-line p-1 sm:h-full sm:w-auto sm:border-l sm:border-t-0 sm:p-0.5"
                        >
                          <span id={groupLabelId} className="sr-only">
                            Estado de asistencia de
                          </span>
                          {ATTENDANCE_STATES.map((state) => {
                            const isActive = student.attendance === state;
                            return (
                              <button
                                key={state}
                                type="button"
                                role="radio"
                                onClick={() => handleDirectAttendanceSet(idx, state)}
                                aria-checked={isActive}
                                title={ATTENDANCE_LABELS[state]}
                                className={`inline-flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg border px-1 text-[10px] font-semibold leading-tight transition-colors ${
                                  isActive
                                    ? `border-transparent ${getAttendanceBadgeTokens(state).badgeClass}`
                                    : "border-transparent text-ink-3 hover:bg-canvas hover:text-ink"
                                }`}
                              >
                                {ATTENDANCE_ICONS[state]}
                                <span className="sm:sr-only">{ATTENDANCE_LABELS[state]}</span>
                              </button>
                            );
                          })}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {filteredStudents.length > WIZARD_PAGE_SIZE && (
                  <Pagination
                    className="mt-0 rounded-ctl border border-line bg-canvas px-4 py-3"
                    page={studentPage}
                    totalPages={totalStudentPages}
                    onPageChange={setStudentPage}
                    totalItems={filteredStudents.length}
                    pageSize={WIZARD_PAGE_SIZE}
                    itemNoun="alumno"
                  />
                )}
              </>
            )}
          </>
        )}

        <p className="text-xs text-ink-3">Registrando como: {trainerName}</p>
      </div>
    );
  }

  function renderConfirmation(): React.ReactElement | null {
    if (!selectedSchedule) return null;

    return (
      <div className="flex flex-col gap-4">
        <p className="text-[13px] text-ink-3">
          Revise el resumen antes de confirmar el registro de asistencia:
        </p>

        <dl className="overflow-hidden rounded-ctl border border-line">
          <div className="flex h-drow items-center gap-4 border-b border-line px-5">
            <dt className="w-[160px] flex-none text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-3">
              Horario
            </dt>
            <dd className="flex-1 text-sm font-semibold text-ink">
              {formatDay(selectedSchedule.diaSemana)} {selectedSchedule.horaInicio} —{" "}
              {selectedSchedule.horaFin}
            </dd>
          </div>
          <div className="flex h-drow items-center gap-4 border-b border-line px-5">
            <dt className="w-[160px] flex-none text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-3">
              Registra
            </dt>
            <dd className="flex-1 text-sm font-semibold text-ink">{trainerName}</dd>
          </div>
          <div className="flex min-h-drow items-center gap-4 px-5 py-3">
            <dt className="w-[160px] flex-none text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-3">
              Resultado
            </dt>
            <dd className="flex flex-1 flex-wrap gap-2">
              {TOTAL_ORDER.map((state) => (
                <Badge key={state} tone={getAttendanceBadgeTone(state)}>
                  {countByState(students, state)} {ATTENDANCE_LABELS[state].toLowerCase()}
                </Badge>
              ))}
              {/* Without this, "45 presentes" reads the same whether the
                  trainer went through the roster or never looked at it. */}
              {unreviewedCount > 0 && (
                <Badge tone="warn">{unreviewedCount} sin revisar</Badge>
              )}
            </dd>
          </div>
        </dl>

        {unreviewedCount > 0 && (
          /*
           * Names the risk in the trainer's own terms and hands back the way
           * to fix it. It does NOT block: the trainer asked for a default, and
           * a default you cannot submit is not a default. What it must never
           * do is let the summary above read as a reviewed roster.
           */
          <div
            role="status"
            className="flex flex-col gap-3 rounded-ctl border border-state-warn/25 bg-state-warn-bg p-3.5"
          >
            <p className="flex items-start gap-2 text-[13px] font-semibold text-state-warn">
              <AlertTriangle
                size={14}
                strokeWidth={2}
                className="mt-0.5 flex-none"
                aria-hidden="true"
              />
              <span>
                {unreviewedCount === 1
                  ? `1 de ${students.length} alumnos sigue en "Presente" porque nadie lo revisó.`
                  : `${unreviewedCount} de ${students.length} alumnos siguen en "Presente" porque nadie los revisó.`}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => {
                  setOnlyUnreviewed(true);
                  setSearchFilter("");
                  setStudentPage(1);
                  // The roll call is the entry immediately behind this one —
                  // going BACK to it rather than pushing a second copy keeps
                  // the back stack the three steps the stepper promises.
                  goBack();
                }}
              >
                {unreviewedCount === 1 ? "Revisar a ese alumno" : `Revisar a esos ${unreviewedCount}`}
              </Button>
              <Button type="button" variant="ghost" onClick={handleMarkRemainingPresent}>
                <UserCheck size={14} strokeWidth={2} aria-hidden="true" />
                Confirmar que están presentes
              </Button>
            </div>
          </div>
        )}

        <p className="text-xs text-ink-3">
          Se registrará la asistencia de {students.length}{" "}
          {students.length === 1 ? "estudiante" : "estudiantes"}.
        </p>
      </div>
    );
  }

  /** Running totals for the save bar — the same numbers, one glance. */
  function renderTotals(): React.ReactElement {
    return (
      <span className="min-w-[250px] flex-1 text-xs text-ink-3">
        {TOTAL_ORDER.map((state, index) => {
          const count = countByState(students, state);
          const [singular, plural] = TOTAL_LABELS[state];
          return (
            <span key={state}>
              {index > 0 ? " · " : ""}
              <span>{`${count} ${count === 1 ? singular : plural}`}</span>
            </span>
          );
        })}
        {unreviewedCount > 0 && (
          <>
            {" · "}
            <span className="font-bold text-state-warn">{`${unreviewedCount} sin revisar`}</span>
          </>
        )}
      </span>
    );
  }

  // ---- Render ----

  return (
    <ProtectedRoute allowedRoles={["trainer", "admin"]}>
      <AppShell eyebrow="Tomar asistencia" title="Pasar lista">
      {!confirmed && (
        <BackLink
          href={backHref}
          label={session?.user?.role === "admin" ? "Volver a Asistencias" : "Volver al Panel del Entrenador"}
        />
      )}
      {confirmed ? (
        <div className="flex min-h-[50vh] items-center justify-center py-8">
          <div className="w-full max-w-lg text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-state-ok-bg">
              <CheckCircle size={32} className="text-state-ok" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <h2 className="mb-3 text-2xl font-bold tracking-tight text-ink">
              Asistencia Registrada
            </h2>
            <p className="mb-2 text-sm leading-relaxed text-ink-2">
              La asistencia para{" "}
              <strong className="text-ink">
                {selectedSchedule
                  ? `${formatDay(selectedSchedule.diaSemana)} ${selectedSchedule.horaInicio} — ${selectedSchedule.horaFin}`
                  : "el horario seleccionado"}
              </strong>{" "}
              ha sido registrada exitosamente.
            </p>
            <p className="mb-2 text-sm leading-relaxed text-ink-2">
              <strong className="text-ink">{trainerName}</strong> figura como
              el entrenador que tomó la asistencia de{" "}
              <strong className="text-ink">{result?.createdCount ?? 0} estudiantes</strong>.
            </p>
            {students.length > 0 && (
              <p className="mb-4 text-xs text-ink-3">{buildAttendanceSummary(students)}</p>
            )}
            {result && result.failed.length > 0 && (
              /*
               * NAME the students. This used to say "N registro(s) no se
               * pudieron guardar" and then ask the trainer to retry for
               * students it refused to identify — leaving them to re-mark the
               * whole roster to find out who was missing.
               */
              <div
                role="alert"
                className="mb-8 rounded-ctl border border-state-warn/25 bg-state-warn-bg p-3.5 text-left text-xs text-state-warn"
              >
                <p className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle size={13} strokeWidth={2} aria-hidden="true" />
                  {result.failed.length === 1
                    ? "No se pudo guardar 1 registro"
                    : `No se pudieron guardar ${result.failed.length} registros`}
                </p>
                <ul className="mt-1.5 list-inside list-disc font-semibold">
                  {resolveFailedStudentNames(result.failed, students).map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
                <p className="mt-1.5 text-state-warn/80">
                  Vuelva a tomar lista de este horario para reintentar con estos alumnos — el resto
                  ya quedó guardado.
                </p>
              </div>
            )}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button type="button" variant="primary" onClick={handleReset}>
                Registrar Otra Asistencia
              </Button>
              <Link href={backHref} className={buttonClasses("secondary")}>
                Volver al Panel
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {loading && <LoadingState label="Cargando horarios…" />}

          {loadError && !loading && (
            <ErrorState className="mb-8" message={loadError} onRetry={() => loadOptions()} />
          )}

          {!loading && !loadError && (
            <>
              {/* The stepper is NAMED: "Horario · Lunes 15:00" tells you what
                  you already decided; "Paso 2 de 3" does not. */}
              <Stepper
                className="mb-5"
                steps={stepNames}
                current={currentIndex + 1}
                label="Pasos para tomar asistencia"
              />

              <div className="mx-auto max-w-3xl">
                <div className="rounded-card border border-line bg-paper p-5 sm:p-6">
                  <h2 className="mb-4 text-[13px] font-bold text-ink">{STEP_LABELS[step]}</h2>

                  <form onSubmit={handleConfirm}>
                    {step === "select-session" && renderSessionSelection()}
                    {step === "mark-attendance" && renderMarkAttendance()}
                    {step === "confirm" && renderConfirmation()}

                    {/*
                     * The commit bar. `sticky bottom-0` so the trainer never
                     * scrolls the whole card to reach Siguiente — the audit
                     * found exactly that, on the screen where the commit
                     * matters most.
                     */}
                    {step !== "select-session" && (
                      <div className="sticky bottom-0 -mx-5 mt-5 flex flex-wrap items-center gap-3 border-t border-line bg-paper/95 px-5 py-3.5 backdrop-blur sm:-mx-6 sm:px-6">
                        {!isFirst && (
                          <Button type="button" variant="ghost" onClick={handleBack} disabled={submitting}>
                            <ChevronLeft size={14} strokeWidth={2} aria-hidden="true" />
                            Atrás
                          </Button>
                        )}

                        {step === "mark-attendance" && renderTotals()}

                        <div className="ml-auto flex flex-col items-end gap-1.5">
                          {/* The `UNMARKED` invariant, and its explanation.
                              No path the wizard can take produces the sentinel
                              any more, so in practice neither renders — but a
                              button disabled by an invariant still has to say
                              why, or it reads as a broken wizard. Being
                              unreviewed does NOT gate the advance: it is a
                              warning, not a blocker. */}
                          {unmarkedCount > 0 && (
                            <p
                              id={unmarkedReasonId}
                              role="status"
                              className="text-xs font-semibold text-ink-2"
                            >
                              {unmarkedCount === 1
                                ? "Falta 1 alumno por marcar"
                                : `Faltan ${unmarkedCount} alumnos por marcar`}
                            </p>
                          )}
                          {/*
                           * The `key`s are load-bearing, not decoration.
                           *
                           * Both branches render a `Button` in the same slot,
                           * so React reconciled them into ONE `<button>` node
                           * and merely swapped its `type` from "button" to
                           * "submit". React flushes the state update inside the
                           * click handler, so by the time the browser ran that
                           * click's DEFAULT ACTION the node under the finger
                           * was already a submit button: one tap on "Siguiente"
                           * advanced the wizard AND filed the session, skipping
                           * the confirmation step entirely. Distinct keys make
                           * React replace the node instead of mutating it.
                           */}
                          {!isLast ? (
                            <Button
                              key="advance"
                              type="button"
                              variant="primary"
                              onClick={handleNext}
                              disabled={students.length === 0 || unmarkedCount > 0}
                              aria-describedby={unmarkedCount > 0 ? unmarkedReasonId : undefined}
                            >
                              Siguiente
                              <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
                            </Button>
                          ) : (
                            <Button
                              key="file-session"
                              type="submit"
                              variant="primary"
                              disabled={
                                submitting ||
                                entrenadorPersonaId === null ||
                                students.length === 0 ||
                                unmarkedCount > 0
                              }
                              aria-describedby={unmarkedCount > 0 ? unmarkedReasonId : undefined}
                            >
                              {submitting ? (
                                "Registrando…"
                              ) : (
                                <>
                                  <CheckCircle size={14} strokeWidth={2} aria-hidden="true" />
                                  Confirmar Asistencia
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </>
          )}
        </div>
      )}
      </AppShell>
    </ProtectedRoute>
  );
}

export default function TrainerAttendancePage(): React.ReactElement {
  // The wizard reads its step from the query string, and `useSearchParams`
  // needs a boundary to fall back to during prerender — the same wrapper
  // `/student/payments` and `/reset-password` use for the same reason.
  return (
    <Suspense>
      <TrainerAttendanceWizard />
    </Suspense>
  );
}
