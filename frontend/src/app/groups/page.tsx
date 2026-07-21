/**
 * Gestión de Grupos — Admin page for managing group membership.
 *
 * Displays all training groups (`NivelRanking`, the backend's "Grupo" —
 * see ranking_schemas.py's module docstring) with their technical level,
 * assigned students, and capacity. Shows unassigned students and lets an
 * admin assign/move students between groups.
 *
 * Domain: Technical level (NivelTecnico) belongs to the group, NOT to the
 * student. A student's level is determined by which group they belong to.
 * Students with no group assignment have no technical level yet — pending
 * trainer evaluation.
 *
 * Connected to the real backend (Fase 4): `GET /api/ranking/niveles` (list),
 * `GET /api/members` (student roster + current group, flattened) and two
 * new mutation routes, `POST /api/groups/assign` and `PATCH
 * /api/groups/move` — see src/app/groups/groups-page-utils.ts for the
 * `NivelRanking → Grupo` adapter.
 *
 * Two real backend gaps affect this page (do not work around either —
 * documented at the source instead of guessed here):
 *  - No API exposes which `Horario` belongs to which `NivelRanking` (see
 *    src/lib/server/attendance-adapter.ts) — the "Horarios vinculados"
 *    panel always shows the empty state.
 *  - Initial group assignment (`POST /ranking/asignar-nivel-inicial`) is
 *    backend-restricted to ENTRENADOR — an ADMINISTRADOR gets a real 403
 *    (see src/app/api/groups/assign/route.ts). Moving an already-assigned
 *    student works fine for admins. Removing a student from a group
 *    entirely has no backend endpoint at all, so that action is disabled.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/shell/AppShell";
import {
  Users,
  GraduationCap,
  Calendar,
  UserPlus,
  UserMinus,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  ArrowRight,
  RotateCcw,
  FileText,
  XCircle,
  Loader2,
} from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  fetchMembers,
  assignStudentToNivel,
  moveStudentToNivel,
  reingresar,
  fetchJustificativosPendientes,
  evaluarJustificativo,
  ApiClientError,
} from "@/services/api";
import type { EvaluarJustificativoDTO, NivelConOcupacion } from "@/services/api";
import type { Justificativo } from "@/types/domain";
import { getUnassignedStudents, getLevelLabel, type StudentRef, type GroupCardData } from "@/lib/groups-utils";
import { buildGroupCardsFromNiveles, getLevelBadgeClass, getCapacityBarColor } from "./groups-page-utils";

interface LevelBadgeProps {
  level: string;
}

function LevelBadge({ level }: LevelBadgeProps): React.ReactElement {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getLevelBadgeClass(level)}`}
    >
      <GraduationCap size={10} strokeWidth={2} className="mr-1" aria-hidden="true" />
      {getLevelLabel(level as GroupCardData["level"])}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Capacity bar
// ---------------------------------------------------------------------------

interface CapacityBarProps {
  percent: number;
  total: number;
}

function CapacityBar({ percent, total }: CapacityBarProps): React.ReactElement {
  return (
    <div
      className="flex items-center gap-2"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Capacidad utilizada: ${percent}% de ${total}`}
    >
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-cata-border">
        <div
          className={`h-full rounded-full transition-all ${getCapacityBarColor(percent)}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <span className="text-[11px] font-medium text-cata-text/65" aria-hidden="true">
        {percent}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

function extractErrorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : fallback;
}

export default function GroupsPage(): React.ReactElement {
  const [niveles, setNiveles] = useState<NivelConOcupacion[]>([]);
  const [allStudents, setAllStudents] = useState<StudentRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Reingreso (Ranking track) — frontend-only session state: students
  // re-admitted this session are tracked locally since there's no backend
  // GET yet to refresh `activo` after a successful /ranking/:id/reingresar
  // call. See src/app/api/ranking/[id]/reingresar/route.ts.
  const [reingresandoId, setReingresandoId] = useState<string | null>(null);
  const [reingresados, setReingresados] = useState<Set<string>>(new Set());

  // Justificativos pendientes (Ranking track, E03-RF006b) — admin review
  // queue. No backend endpoint lists pending justificativos yet (only
  // POST .../justificativos and PATCH .../evaluar exist — see
  // src/mocks/justificativos.ts), so `fetchJustificativosPendientes` is
  // mock-only; evaluating one is a real backend call.
  const [justificativosPendientes, setJustificativosPendientes] = useState<Justificativo[]>([]);
  const [justificativosLoading, setJustificativosLoading] = useState(true);
  const [evaluandoId, setEvaluandoId] = useState<number | null>(null);
  const [confirmingApproveId, setConfirmingApproveId] = useState<number | null>(null);

  // Rechazar requires a typed reason (owner-mandated, PR13) — a single
  // reason/error pair is reused across rows, keyed by which row currently
  // has its inline reject form open. Reset whenever the form opens for a
  // different justificativo or is canceled.
  const [rejectingJustificativoId, setRejectingJustificativoId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionValidationError, setRejectionValidationError] = useState<string | null>(null);

  // Quick-assign dropdown selection per unassigned student, keyed by
  // estudianteId -> nivel id (as a string, matching the <select> value).
  const [pendingAssignment, setPendingAssignment] = useState<Record<string, string>>({});

  const loadJustificativos = useCallback(async (): Promise<void> => {
    setJustificativosLoading(true);
    try {
      const pendientes = await fetchJustificativosPendientes();
      setJustificativosPendientes(pendientes);
    } catch {
      setJustificativosPendientes([]);
    } finally {
      setJustificativosLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadJustificativos();
  }, [loadJustificativos]);

  const loadData = useCallback(async (): Promise<void> => {
    setLoading(true);
    setLoadError(null);
    try {
      const { niveles: nivelesData, accounts: members } = await fetchMembers();
      setNiveles(nivelesData);
      const students: StudentRef[] = members.flatMap((account) =>
        account.estudiantes.map((estudiante) => ({
          id: estudiante.id,
          nombres: estudiante.nombres,
          apellidos: estudiante.apellidos,
          grupoId: estudiante.grupoId,
          activo: estudiante.activo,
        })),
      );
      setAllStudents(students);
    } catch {
      setLoadError("No se pudieron cargar los grupos. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const unassigned = getUnassignedStudents(allStudents);
  const inactiveStudents = allStudents.filter((s) => !s.activo && !reingresados.has(s.id));
  const cardData = buildGroupCardsFromNiveles(niveles);
  const selectedNivel = selectedGroupId ? niveles.find((n) => String(n.id) === selectedGroupId) ?? null : null;
  const assignedStudentsForSelected = selectedGroupId
    ? allStudents.filter((s) => s.grupoId === selectedGroupId)
    : [];

  const showNotification = useCallback((type: "success" | "error", message: string): void => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  async function handleEvaluarJustificativo(
    id: number,
    estado: "APROBADO" | "RECHAZADO",
    motivoRechazo?: string,
  ): Promise<void> {
    setEvaluandoId(id);
    try {
      const dto: EvaluarJustificativoDTO =
        motivoRechazo !== undefined ? { estado, motivoRechazo } : { estado };
      await evaluarJustificativo(id, dto);
      setJustificativosPendientes((prev) => prev.filter((j) => j.id !== id));
      showNotification("success", estado === "APROBADO" ? "Justificativo aprobado." : "Justificativo rechazado.");
    } catch (err) {
      showNotification("error", extractErrorMessage(err, "No se pudo evaluar el justificativo."));
    } finally {
      setEvaluandoId(null);
    }
  }

  function handleRejectClick(id: number): void {
    setRejectingJustificativoId(id);
    setRejectionReason("");
    setRejectionValidationError(null);
  }

  function handleRejectCancel(): void {
    setRejectingJustificativoId(null);
    setRejectionReason("");
    setRejectionValidationError(null);
  }

  async function handleRejectSubmit(id: number): Promise<void> {
    if (!rejectionReason.trim()) {
      setRejectionValidationError("El motivo de rechazo es obligatorio.");
      return;
    }
    const motivo = rejectionReason.trim();
    await handleEvaluarJustificativo(id, "RECHAZADO", motivo);
    setRejectingJustificativoId(null);
    setRejectionReason("");
    setRejectionValidationError(null);
  }

  async function handleAssignStudent(estudianteId: string, targetGroupId: string): Promise<void> {
    const student = allStudents.find((s) => s.id === estudianteId);
    if (!student) return;
    setActionPending(true);
    try {
      if (student.grupoId === null) {
        await assignStudentToNivel(Number(estudianteId), Number(targetGroupId));
      } else {
        await moveStudentToNivel(Number(estudianteId), Number(targetGroupId));
      }
      showNotification("success", "Estudiante asignado al grupo correctamente.");
      await loadData();
    } catch (err) {
      showNotification("error", extractErrorMessage(err, "No se pudo asignar el estudiante al grupo."));
    } finally {
      setActionPending(false);
    }
  }

  async function handleReingresar(estudianteId: string): Promise<void> {
    setReingresandoId(estudianteId);
    try {
      await reingresar(estudianteId);
      setReingresados((prev) => new Set(prev).add(estudianteId));
      showNotification("success", "Estudiante reingresado al ranking correctamente.");
    } catch (err) {
      console.error("[groups] reingresar failed", err);
      showNotification(
        "error",
        err instanceof ApiClientError ? err.message : "Error al reingresar al estudiante.",
      );
    } finally {
      setReingresandoId(null);
    }
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AppShell
        eyebrow="Grupos de Entrenamiento"
        title="Gestión de Grupos"
        subtitle="Grupos de entrenamiento, asignación de estudiantes y horarios. El nivel técnico pertenece al grupo, no al estudiante."
      >
        {loadError && (
          <div
            className="mb-4 flex items-center gap-2 rounded-xl border border-cata-red/30 bg-cata-red/10 px-4 py-3 text-sm text-cata-red"
            role="alert"
          >
            <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" />
            {loadError}
            <button type="button" onClick={() => void loadData()} className="btn-ghost ml-auto text-xs">
              Reintentar
            </button>
          </div>
        )}

        {/* Notification */}
        {notification && (
          <div
            className={`mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
              notification.type === "success"
                ? "border border-cata-state-ok/30 bg-cata-state-ok/10 text-cata-state-ok"
                : "border border-cata-red/30 bg-cata-red/10 text-cata-red"
            }`}
            role="alert"
          >
            {notification.type === "success" ? (
              <CheckCircle2 size={14} strokeWidth={2} aria-hidden="true" />
            ) : (
              <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" />
            )}
            {notification.message}
          </div>
        )}

        {/* Two-column layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column: Group cards */}
          <div className="space-y-4 lg:col-span-2">
            <div className="mb-5 flex items-center gap-2">
              <GraduationCap size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
              <h2 className="text-lg font-bold text-cata-text">
                Grupos ({cardData.length})
              </h2>
            </div>

            {loading ? (
              <div className="card flex flex-col items-center py-12 text-center">
                <p className="text-sm text-cata-text/50">Cargando grupos…</p>
              </div>
            ) : cardData.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {cardData.map((card) => {
                  const isSelected = selectedGroupId === card.id;

                  return (
                    <button
                      key={card.id}
                      type="button"
                      aria-pressed={isSelected}
                      aria-label={`${card.name} — ${card.levelLabel}, ${card.studentCount} estudiantes, ${card.capacityPercent}% de capacidad`}
                      onClick={() =>
                        setSelectedGroupId(
                          isSelected ? null : card.id,
                        )
                      }
                      className={`card-hover p-5 text-left transition-all ${
                        isSelected
                          ? "ring-2 ring-cata-red/30 border-cata-red/20"
                          : ""
                      }`}
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cata-red/15">
                            <GraduationCap size={18} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-cata-text">
                              {card.name}
                            </h3>
                            <LevelBadge level={card.level} />
                          </div>
                        </div>
                      </div>

                      {/* Student count */}
                      <div className="mb-2 flex items-center gap-1.5 text-xs text-cata-text/65">
                        <Users size={12} strokeWidth={1.5} aria-hidden="true" />
                        {card.studentCount} estudiante
                        {card.studentCount !== 1 ? "s" : ""}
                      </div>

                      {/* Capacity bar */}
                      <div className="mb-2">
                        <CapacityBar
                          percent={card.capacityPercent}
                          total={card.capacity}
                        />
                      </div>

                      {/* Schedules — backend gap: no API links Horario to NivelRanking */}
                      <span className="text-[11px] text-cata-text/45">
                        Horarios no disponibles
                      </span>

                      {isSelected && (
                        <div className="mt-3 flex items-center gap-1 text-xs font-medium text-cata-red">
                          <ArrowRight
                            size={12}
                            strokeWidth={1.5}
                            aria-hidden="true"
                          />
                          Gestionar estudiantes
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="card flex flex-col items-center py-12 text-center">
                <Users
                  size={32}
                  strokeWidth={1.5}
                  className="mb-3 text-cata-text/20"
                  aria-hidden="true"
                />
                <p className="text-sm text-cata-text/50">
                  No hay grupos configurados.
                </p>
              </div>
            )}

            {/* Unassigned students section */}
            <div className="card p-5">
              <div className="mb-4 flex items-center gap-2">
                <UserPlus size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                <h3 className="text-sm font-bold text-cata-text">
                  Estudiantes sin grupo ({unassigned.length})
                </h3>
              </div>

              {unassigned.length > 0 ? (
                <div className="space-y-2">
                  {unassigned.map((student) => (
                    <div
                      key={student.id}
                      className="card-hover flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                          <UserPlus
                            size={16}
                            strokeWidth={1.5}
                            className="text-amber-700"
                            aria-hidden="true"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-cata-text">
                            {student.nombres} {student.apellidos}
                          </p>
                          <p className="text-[11px] text-amber-700">
                            Sin grupo &middot; Sin nivel técnico asignado
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <label className="sr-only" htmlFor={`assign-nivel-${student.id}`}>
                          Nivel para {student.nombres} {student.apellidos}
                        </label>
                        <select
                          id={`assign-nivel-${student.id}`}
                          className="input-field text-xs"
                          value={pendingAssignment[student.id] ?? ""}
                          onChange={(e) =>
                            setPendingAssignment((prev) => ({ ...prev, [student.id]: e.target.value }))
                          }
                        >
                          <option value="">Seleccionar nivel...</option>
                          {niveles.map((nivel) => (
                            <option key={nivel.id} value={nivel.id}>
                              {nivel.nombre ?? `Nivel ${nivel.numeroNivel}`}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={actionPending || !pendingAssignment[student.id]}
                          onClick={() =>
                            void handleAssignStudent(student.id, pendingAssignment[student.id])
                          }
                          className="rounded-lg border border-cata-border px-2.5 py-1 text-[10px] font-medium transition-colors hover:bg-cata-red/15 hover:text-cata-red disabled:opacity-50 whitespace-nowrap"
                        >
                          Asignar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 py-4">
                  <CheckCircle2 size={14} strokeWidth={1.5} className="text-cata-state-ok" aria-hidden="true" />
                  <p className="text-xs text-cata-text/40">
                    Todos los estudiantes tienen un grupo asignado.
                  </p>
                </div>
              )}
            </div>

            {/* Reingreso al ranking — inactive/dropped students (Ranking track) */}
            <div className="card p-5">
              <div className="mb-4 flex items-center gap-2">
                <RotateCcw size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                <h3 className="text-sm font-bold text-cata-text">
                  Estudiantes inactivos ({inactiveStudents.length})
                </h3>
              </div>

              {inactiveStudents.length > 0 ? (
                <div className="space-y-2">
                  {inactiveStudents.map((student) => (
                    <div
                      key={student.id}
                      className="card-hover flex items-center justify-between px-4 py-3"
                    >
                      <span className="text-sm text-cata-text">
                        {student.nombres} {student.apellidos}
                      </span>
                      <button
                        type="button"
                        disabled={reingresandoId === student.id}
                        onClick={() => handleReingresar(student.id)}
                        className="btn-ghost text-xs"
                      >
                        <RotateCcw size={12} strokeWidth={1.5} aria-hidden="true" />
                        {reingresandoId === student.id ? "Reingresando..." : "Reingresar"}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 py-4">
                  <CheckCircle2 size={14} strokeWidth={1.5} className="text-cata-state-ok" aria-hidden="true" />
                  <p className="text-xs text-cata-text/40">
                    No hay estudiantes inactivos pendientes de reingreso.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right column: Group detail panel — sticky on desktop so it
              stays visible while the left column scrolls further. */}
          <div className="space-y-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
            {selectedNivel ? (
              <>
                {/* Group detail */}
                <div className="card p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <GraduationCap size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                    <h3 className="text-sm font-bold text-cata-text">
                      {selectedNivel.nombre ?? `Nivel ${selectedNivel.numeroNivel}`}
                    </h3>
                  </div>

                  <div className="mb-4 space-y-2 text-sm text-cata-text/65">
                    <div className="flex items-center justify-between">
                      <span>Nivel técnico</span>
                      <LevelBadge level={selectedNivel.nivelCategoria} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Estudiantes asignados</span>
                      <span className="font-medium text-cata-text">
                        {assignedStudentsForSelected.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Capacidad</span>
                      <span className="font-medium text-cata-text">
                        {selectedNivel.capacidadMinima}–{selectedNivel.capacidadMaxima}
                      </span>
                    </div>
                  </div>

                  {/* Assigned students list */}
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <Users size={14} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                      <p className="text-xs font-medium uppercase tracking-wider text-cata-text/45">
                        Estudiantes
                      </p>
                    </div>
                    {assignedStudentsForSelected.length > 0 ? (
                      <div className="space-y-1">
                        {assignedStudentsForSelected.map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between rounded-lg bg-cata-bg px-3 py-2"
                          >
                            <span className="text-sm text-cata-text">
                              {s.nombres} {s.apellidos}
                            </span>
                            <button
                              type="button"
                              disabled
                              className="text-cata-text/25"
                              title="No disponible: el backend no permite remover a un estudiante de su nivel sin reasignarlo a otro."
                              aria-label={`Remover a ${s.nombres} del grupo (no disponible)`}
                            >
                              <UserMinus
                                size={13}
                                strokeWidth={1.5}
                                aria-hidden="true"
                              />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 py-3">
                        <Users size={14} strokeWidth={1.5} className="text-cata-text/20" aria-hidden="true" />
                        <p className="text-xs text-cata-text/40">
                          Sin estudiantes asignados.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Linked schedules — backend gap, see file header */}
                <div className="card p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Calendar size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                    <h3 className="text-sm font-bold text-cata-text">
                      Horarios vinculados
                    </h3>
                  </div>

                  <div className="flex items-start gap-2 py-3">
                    <MapPin size={14} strokeWidth={1.5} className="mt-0.5 shrink-0 text-cata-text/20" aria-hidden="true" />
                    <p className="text-xs text-cata-text/40">
                      No disponible: el backend aún no expone la relación entre horarios y niveles/grupos.
                    </p>
                  </div>
                </div>

                {/* Quick assign from unassigned */}
                {unassigned.length > 0 && (
                  <div className="card p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <UserPlus size={14} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                      <h3 className="text-sm font-bold text-cata-text">
                        Asignar estudiante sin grupo
                      </h3>
                    </div>
                    <div className="space-y-1.5">
                      {unassigned.slice(0, 5).map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          disabled={actionPending}
                          onClick={() => void handleAssignStudent(s.id, selectedNivel ? String(selectedNivel.id) : "")}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-cata-red/15 disabled:opacity-50"
                        >
                          <span className="text-cata-text">
                            {s.nombres} {s.apellidos}
                          </span>
                          <UserPlus
                            size={13}
                            strokeWidth={1.5}
                            className="text-cata-red"
                            aria-hidden="true"
                          />
                        </button>
                      ))}
                      {unassigned.length > 5 && (
                        <p className="text-xs text-cata-text/45">
                          +{unassigned.length - 5} más sin grupo
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Empty state — no group selected */
              <div className="card flex flex-col items-center py-12 text-center">
                <Users
                  size={32}
                  strokeWidth={1.5}
                  className="mb-3 text-cata-text/20"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium text-cata-text">
                  Seleccioná un grupo
                </p>
                <p className="mt-1 text-xs text-cata-text/50">
                  Hacé clic en un grupo para ver su detalle
                  y gestionar la asignación de estudiantes.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Justificativos pendientes (Ranking track) — admin review queue for
            E03-RF006b, independent of the Reingreso panel above and the
            dedicated Selección Oficial page (/groups/seleccion-oficial). See
            the `justificativosPendientes` state doc comment: the listing is
            mock-only (no backend GET yet), evaluating is real. */}
        <div id="justificativos-pendientes" className="card mt-8 scroll-mt-24 p-6">
          <div className="mb-4 flex items-center gap-2">
            <FileText size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
            <h3 className="text-sm font-bold text-cata-text">
              Justificativos Pendientes ({justificativosPendientes.length})
            </h3>
          </div>
          <p className="mb-4 text-sm leading-relaxed text-cata-text/65">
            Justificativos de ausencia al ranking mensual enviados por estudiantes, a la espera de
            aprobación o rechazo.
          </p>

          {justificativosLoading ? (
            <div className="flex items-center gap-2 py-4">
              <Loader2 size={14} className="animate-spin text-cata-text/40" aria-hidden="true" />
              <p className="text-xs text-cata-text/40">Cargando justificativos…</p>
            </div>
          ) : justificativosPendientes.length > 0 ? (
            <div className="space-y-2">
              {justificativosPendientes.map((j) => {
                const student = allStudents.find((s) => Number(s.id) === j.personaId);
                const isEvaluando = evaluandoId === j.id;
                const isRejecting = rejectingJustificativoId === j.id;
                return (
                  <div
                    key={j.id}
                    className="card-hover flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-cata-text">
                        {student ? `${student.nombres} ${student.apellidos}` : `Persona #${j.personaId}`}
                        {" — "}
                        {j.mes}/{j.anio}
                      </p>
                      <p className="text-xs text-cata-text/65">{j.motivo}</p>
                    </div>
                    {isRejecting ? (
                      <div className="w-full space-y-2 sm:max-w-xs">
                        <div>
                          <label
                            htmlFor={`motivo-rechazo-${j.id}`}
                            className="mb-1 block text-xs font-medium text-cata-text"
                          >
                            Motivo de Rechazo <span className="text-cata-red">*</span>
                          </label>
                          <textarea
                            id={`motivo-rechazo-${j.id}`}
                            rows={2}
                            value={rejectionReason}
                            onChange={(e) => {
                              setRejectionReason(e.target.value);
                              setRejectionValidationError(null);
                            }}
                            placeholder="Explique por qué se rechaza el justificativo..."
                            className="input-field resize-y text-xs"
                            disabled={isEvaluando}
                          />
                          {rejectionValidationError && (
                            <p className="mt-1 text-xs text-cata-red">{rejectionValidationError}</p>
                          )}
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            disabled={isEvaluando}
                            onClick={() => void handleRejectSubmit(j.id)}
                            className="btn-primary flex-1 py-1.5 text-xs"
                          >
                            {isEvaluando ? "Procesando..." : "Confirmar"}
                          </button>
                          <button
                            type="button"
                            disabled={isEvaluando}
                            onClick={handleRejectCancel}
                            className="btn-secondary py-1.5 text-xs"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          disabled={isEvaluando}
                          onClick={() => setConfirmingApproveId(j.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                        >
                          <CheckCircle2 size={12} strokeWidth={1.5} aria-hidden="true" />
                          Aprobar
                        </button>
                        <button
                          type="button"
                          disabled={isEvaluando}
                          onClick={() => handleRejectClick(j.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-cata-red transition-colors hover:bg-red-100 disabled:opacity-50"
                        >
                          <XCircle size={12} strokeWidth={1.5} aria-hidden="true" />
                          Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2 py-4">
              <CheckCircle2 size={14} strokeWidth={1.5} className="text-cata-state-ok" aria-hidden="true" />
              <p className="text-xs text-cata-text/40">No hay justificativos pendientes de revisión.</p>
            </div>
          )}
        </div>

        {/* Domain info card */}
        <div className="card mt-8 p-6">
          <div className="mb-3 flex items-center gap-2">
            <GraduationCap size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
            <h3 className="text-sm font-bold text-cata-text">Modelo de dominio</h3>
          </div>
          <p className="text-sm leading-relaxed text-cata-text/65">
            El <strong className="text-cata-text">nivel técnico</strong> pertenece al grupo, no al estudiante.
            Un estudiante adquiere su nivel al ser asignado a un grupo.
            Los estudiantes sin grupo asignado no tienen nivel técnico — está
            pendiente de evaluación por el entrenador. La asignación inicial de un
            estudiante a un grupo requiere un rol de Entrenador (regla del backend);
            un Administrador puede mover a un estudiante ya asignado entre grupos.
          </p>
        </div>

        <ConfirmDialog
          open={confirmingApproveId !== null}
          variant="state-ok"
          title="Aprobar justificativo"
          message="¿Confirma que aprueba este justificativo de ausencia?"
          onConfirm={() => {
            if (confirmingApproveId === null) return;
            const id = confirmingApproveId;
            setConfirmingApproveId(null);
            void handleEvaluarJustificativo(id, "APROBADO");
          }}
          onCancel={() => setConfirmingApproveId(null)}
        />
      </AppShell>
    </ProtectedRoute>
  );
}
