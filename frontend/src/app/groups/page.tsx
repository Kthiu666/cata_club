/**
 * Gestión de Grupos — Admin page for managing group membership.
 *
 * Displays all training groups (Grupo) with their technical level, assigned
 * students, linked schedules, and capacity. Shows unassigned students and
 * allows frontend-only group assignment.
 *
 * Domain: Technical level (NivelTecnico) belongs to the group, NOT to the
 * student. A student's level is determined by which group they belong to.
 * Students with no group assignment have no technical level yet — pending
 * trainer evaluation.
 *
 * Frontend-only mock — no backend integration. Data resets on server restart.
 */

"use client";

import { useState, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
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
  RefreshCw,
  RotateCcw,
  Award,
} from "lucide-react";
import {
  MOCK_MEMBER_ACCOUNTS,
  MOCK_GRUPOS,
} from "@/mocks/members";
import { MOCK_SCHEDULES } from "@/mocks/attendance";
import {
  assignStudentToGroup,
  removeStudentFromAllGroups,
  getStudentsByGroup,
  getSchedulesByGroup,
  getUnassignedStudents,
  buildGroupCards,
  getLevelLabel,
  type GroupCardData,
} from "@/lib/groups-utils";
import {
  buildStudentRefs,
  getLevelBadgeClass,
  getCapacityBarColor,
} from "./groups-page-utils";
import type { CategoriaRanking, SeleccionOficial } from "@/types/domain";
import { reingresar, seleccionOficial, ApiClientError } from "@/services/api";

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

export default function GroupsPage(): React.ReactElement {
  const [grupos, setGrupos] = useState(() =>
    MOCK_GRUPOS.map((g) => ({ ...g, estudiantesIds: [...g.estudiantesIds] })),
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
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

  const allStudents = buildStudentRefs(grupos, MOCK_MEMBER_ACCOUNTS);
  const unassigned = getUnassignedStudents(allStudents);
  const inactiveStudents = allStudents.filter((s) => !s.activo && !reingresados.has(s.id));
  const cardData = buildGroupCards(grupos, MOCK_SCHEDULES);
  const selectedGrupo = selectedGroupId
    ? grupos.find((g) => g.id === selectedGroupId) ?? null
    : null;

  const showNotification = useCallback(
    (type: "success" | "error", message: string): void => {
      setNotification({ type, message });
      setTimeout(() => setNotification(null), 4000);
    },
    [],
  );

  function handleAssignStudent(estudianteId: string, targetGroupId: string): void {
    const result = assignStudentToGroup(estudianteId, targetGroupId, grupos);
    if (result.success) {
      setGrupos(result.updatedGrupos);
      showNotification("success", result.message);
    } else {
      showNotification("error", result.message);
    }
  }

  function handleClearAssignment(estudianteId: string): void {
    const updated = removeStudentFromAllGroups(estudianteId, grupos);
    setGrupos(updated);
    showNotification("success", "Estudiante removido del grupo.");
  }

  function handleResetToMock(): void {
    setGrupos(MOCK_GRUPOS.map((g) => ({ ...g, estudiantesIds: [...g.estudiantesIds] })));
    setSelectedGroupId(null);
    showNotification("success", "Datos restablecidos a valores de demostración.");
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

  const assignedStudentsForSelected = selectedGrupo
    ? getStudentsByGroup(selectedGrupo, allStudents)
    : [];

  const schedulesForSelected = selectedGrupo
    ? getSchedulesByGroup(selectedGrupo, MOCK_SCHEDULES)
    : [];

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div>
        {/* Hero Banner */}
        <div className="relative mb-10 overflow-hidden rounded-3xl border border-cata-border bg-cata-surface px-6 py-10 shadow-elevated sm:px-10 sm:py-12">
          <div className="absolute inset-0 bg-logo-glow" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-cata-red">
              <Users size={14} strokeWidth={2} aria-hidden="true" />
              Grupos de Entrenamiento
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-cata-text sm:text-4xl">
              Gestión de Grupos
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-cata-text/60">
              Grupos de entrenamiento, asignación de estudiantes y horarios. El nivel técnico
              pertenece al grupo, no al estudiante.
            </p>
          </div>
        </div>

        {/* Demo badge */}
        <div className="mb-6 flex items-center gap-2">
          <span className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
            Demo
          </span>
          <span className="text-xs text-cata-text/40">
            Las asignaciones son simuladas en memoria
          </span>
        </div>

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

        {/* Reset button */}
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={handleResetToMock}
            className="btn-ghost text-xs"
          >
            <RefreshCw size={12} strokeWidth={1.5} aria-hidden="true" />
            Restablecer datos demo
          </button>
        </div>

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

            {cardData.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {cardData.map((card) => {
                  const isSelected = selectedGroupId === card.id;
                  const grupo = grupos.find((g) => g.id === card.id);
                  if (!grupo) {
                    return null;
                  }
                  const linkedSchedules = getSchedulesByGroup(
                    grupo,
                    MOCK_SCHEDULES,
                  );

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

                      {/* Schedules */}
                      <div className="space-y-1">
                        {linkedSchedules.length > 0 ? (
                          linkedSchedules.slice(0, 3).map((sched) => (
                            <div
                              key={sched.id}
                              className="flex items-center gap-1.5 text-[11px] text-cata-text/45"
                            >
                              <Calendar
                                size={10}
                                strokeWidth={1.5}
                                aria-hidden="true"
                              />
                              <span>
                                {sched.diaSemana.slice(0, 3).replace(".", "")}{" "}
                                {sched.horaInicio} &middot; {sched.cancha}
                              </span>
                              {!sched.activo && (
                                <span className="rounded bg-cata-bg px-1 py-0.5 text-[9px] font-medium text-cata-text/45">
                                  Inactivo
                                </span>
                              )}
                            </div>
                          ))
                        ) : (
                          <span className="text-[11px] text-cata-text/45">
                            Sin horarios asignados
                          </span>
                        )}
                        {linkedSchedules.length > 3 && (
                          <span className="text-[11px] text-cata-text/45">
                            +{linkedSchedules.length - 3} más
                          </span>
                        )}
                      </div>

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
                        {grupos.map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() =>
                              handleAssignStudent(student.id, g.id)
                            }
                            className="rounded-lg border border-cata-border px-2 py-1 text-[10px] font-medium transition-colors hover:bg-cata-red/15 hover:text-cata-red whitespace-nowrap"
                            title={`Asignar a ${g.nombre}`}
                          >
                            {g.nombre}
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
            {selectedGrupo ? (
              <>
                {/* Group detail */}
                <div className="card p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <GraduationCap size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                    <h3 className="text-sm font-bold text-cata-text">
                      {selectedGrupo.nombre}
                    </h3>
                  </div>

                  <div className="mb-4 space-y-2 text-sm text-cata-text/65">
                    <div className="flex items-center justify-between">
                      <span>Nivel técnico</span>
                      <LevelBadge level={selectedGrupo.nivel} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Estudiantes asignados</span>
                      <span className="font-medium text-cata-text">
                        {selectedGrupo.estudiantesIds.length}
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
                              onClick={() =>
                                handleClearAssignment(s.id)
                              }
                              className="text-cata-text/45 transition-colors hover:text-cata-red"
                              title="Remover del grupo"
                              aria-label={`Remover a ${s.nombres} del grupo`}
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

                {/* Linked schedules */}
                <div className="card p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Calendar size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                    <h3 className="text-sm font-bold text-cata-text">
                      Horarios vinculados
                    </h3>
                  </div>

                  {schedulesForSelected.length > 0 ? (
                    <div className="space-y-2">
                      {schedulesForSelected.map((sched) => (
                        <div
                          key={sched.id}
                          className="card-hover flex items-start gap-3 p-3"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cata-red/15">
                            <Calendar size={14} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5 text-sm font-medium text-cata-text">
                              {sched.diaSemana.slice(0, 3).replace(".", "")}{" "}
                              {sched.horaInicio} — {sched.horaFin}
                              {!sched.activo && (
                                <span className="ml-auto rounded bg-cata-bg px-1.5 py-0.5 text-[10px] font-medium text-cata-text/45">
                                  Inactivo
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 text-xs text-cata-text/45">
                              <MapPin
                                size={10}
                                strokeWidth={1.5}
                                aria-hidden="true"
                              />
                              {sched.cancha}
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 text-xs text-cata-text/45">
                              <Users
                                size={10}
                                strokeWidth={1.5}
                                aria-hidden="true"
                              />
                              Cupo: {sched.cupoMaximo} personas
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 py-3">
                      <Calendar size={14} strokeWidth={1.5} className="text-cata-text/20" aria-hidden="true" />
                      <p className="text-xs text-cata-text/40">
                        Sin horarios vinculados. Los horarios se asignan desde la
                        configuración del grupo.
                      </p>
                    </div>
                  )}
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
                          onClick={() => handleAssignStudent(s.id, selectedGrupo.id)}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-cata-red/15"
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
            <h3 className="text-sm font-bold text-cata-text">Modelo de dominio (Demo)</h3>
          </div>
          <p className="text-sm leading-relaxed text-cata-text/65">
            El <strong className="text-cata-text">nivel técnico</strong> pertenece al grupo, no al estudiante.
            Un estudiante adquiere su nivel al ser asignado a un grupo.
            Los estudiantes sin grupo asignado no tienen nivel técnico — está
            pendiente de evaluación por el entrenador.
            Los <strong className="text-cata-text">horarios</strong> se vinculan al grupo, y la{" "}
            <strong className="text-cata-text">asistencia</strong> se registra por sesión (grupo + horario).
          </p>
        </div>

        {/* Demo footer */}
        <p className="mt-8 text-center text-xs text-cata-text/30">
          Los datos de grupos, estudiantes y horarios son de demostración.
          Las asignaciones se simulan en memoria y se reinician al recargar.
        </p>
      </div>
    </ProtectedRoute>
  );
}
