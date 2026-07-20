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
  Award,
} from "lucide-react";
import {
  fetchMembers,
  fetchNivelesConOcupacion,
  assignStudentToNivel,
  moveStudentToNivel,
  reingresar,
  seleccionOficial,
  ApiClientError,
} from "@/services/api";
import type { NivelConOcupacion } from "@/services/api";
import type { CategoriaRanking, SeleccionOficial } from "@/types/domain";
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

  // Selección Oficial (Ranking track) — frontend-only session list, same
  // reasoning as above. See src/app/api/ranking/seleccion-oficial/route.ts.
  const [seleccionEstudianteId, setSeleccionEstudianteId] = useState("");
  const [seleccionCategoria, setSeleccionCategoria] = useState<CategoriaRanking | "">("");
  const [seleccionPeriodo, setSeleccionPeriodo] = useState("");
  const [seleccionLoading, setSeleccionLoading] = useState(false);
  const [seleccionError, setSeleccionError] = useState<string | null>(null);
  const [seleccionesOficiales, setSeleccionesOficiales] = useState<SeleccionOficial[]>([]);

  const loadData = useCallback(async (): Promise<void> => {
    setLoading(true);
    setLoadError(null);
    try {
      const [nivelesData, members] = await Promise.all([fetchNivelesConOcupacion(), fetchMembers()]);
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

  async function handleSeleccionOficialSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSeleccionError(null);

    if (!seleccionEstudianteId || !seleccionCategoria || !seleccionPeriodo) {
      setSeleccionError("Completá estudiante, categoría y período.");
      return;
    }

    setSeleccionLoading(true);
    try {
      const entry = await seleccionOficial({
        estudianteId: seleccionEstudianteId,
        categoria: seleccionCategoria,
        periodo: seleccionPeriodo,
      });
      setSeleccionesOficiales((prev) => [entry, ...prev]);
      setSeleccionEstudianteId("");
      setSeleccionCategoria("");
      setSeleccionPeriodo("");
      showNotification("success", "Estudiante agregado a la selección oficial.");
    } catch (err) {
      console.error("[groups] seleccionOficial failed", err);
      setSeleccionError(
        err instanceof ApiClientError ? err.message : "Error al registrar la selección oficial.",
      );
    } finally {
      setSeleccionLoading(false);
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

                      <div className="flex gap-1.5">
                        {niveles.map((nivel) => (
                          <button
                            key={nivel.id}
                            type="button"
                            disabled={actionPending}
                            onClick={() =>
                              void handleAssignStudent(student.id, String(nivel.id))
                            }
                            className="rounded-lg border border-cata-border px-2 py-1 text-[10px] font-medium transition-colors hover:bg-cata-red/15 hover:text-cata-red disabled:opacity-50 whitespace-nowrap"
                            title={`Asignar a ${nivel.nombre ?? `Nivel ${nivel.numeroNivel}`}`}
                          >
                            {nivel.nombre ?? `Nivel ${nivel.numeroNivel}`}
                          </button>
                        ))}
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

          {/* Right column: Group detail panel */}
          <div className="space-y-4">
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

        {/* Selección Oficial (Ranking track) — admin-managed roster, independent of the trainer-managed monthly ranking flow */}
        <div id="seleccion-oficial" className="card mt-8 scroll-mt-24 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Award size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
            <h3 className="text-sm font-bold text-cata-text">Selección Oficial</h3>
          </div>
          <p className="mb-4 text-sm leading-relaxed text-cata-text/65">
            Roster de selección oficial gestionado por administración — independiente del flujo
            mensual de ranking a cargo del entrenador.
          </p>

          {seleccionError && (
            <div className="alert-error mb-4" role="alert">
              {seleccionError}
            </div>
          )}

          <form
            onSubmit={handleSeleccionOficialSubmit}
            className="mb-5 grid gap-3 sm:grid-cols-4"
          >
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-cata-text/65">Estudiante</span>
              <select
                className="input-field"
                value={seleccionEstudianteId}
                onChange={(e) => setSeleccionEstudianteId(e.target.value)}
              >
                <option value="">Seleccionar...</option>
                {allStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombres} {s.apellidos}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-cata-text/65">Categoría</span>
              <select
                className="input-field"
                value={seleccionCategoria}
                onChange={(e) =>
                  setSeleccionCategoria(e.target.value ? Number(e.target.value) : "")
                }
              >
                <option value="">—</option>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-cata-text/65">Período</span>
              <input
                type="month"
                className="input-field"
                value={seleccionPeriodo}
                onChange={(e) => setSeleccionPeriodo(e.target.value)}
              />
            </label>
            <div className="sm:col-span-4">
              <button type="submit" disabled={seleccionLoading} className="btn-primary">
                {seleccionLoading ? "Guardando..." : "Agregar a selección oficial"}
              </button>
            </div>
          </form>

          {seleccionesOficiales.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cata-border bg-cata-bg text-xs font-medium uppercase tracking-wider text-cata-text/65">
                    <th className="px-4 py-2 font-medium">Estudiante</th>
                    <th className="px-4 py-2 font-medium">Categoría</th>
                    <th className="px-4 py-2 font-medium">Período</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cata-border">
                  {seleccionesOficiales.map((entry) => {
                    const student = allStudents.find((s) => s.id === entry.estudianteId);
                    return (
                      <tr key={entry.id}>
                        <td className="px-4 py-2 text-cata-text">
                          {student ? `${student.nombres} ${student.apellidos}` : entry.estudianteId}
                        </td>
                        <td className="px-4 py-2 text-cata-text/65">{entry.categoria}</td>
                        <td className="px-4 py-2 text-cata-text/65">{entry.periodo}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
      </AppShell>
    </ProtectedRoute>
  );
}
