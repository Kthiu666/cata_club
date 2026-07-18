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
  RefreshCw,
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

  const allStudents = buildStudentRefs(grupos, MOCK_MEMBER_ACCOUNTS);
  const unassigned = getUnassignedStudents(allStudents);
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

  const assignedStudentsForSelected = selectedGrupo
    ? getStudentsByGroup(selectedGrupo, allStudents)
    : [];

  const schedulesForSelected = selectedGrupo
    ? getSchedulesByGroup(selectedGrupo, MOCK_SCHEDULES)
    : [];

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AppShell
        eyebrow="Grupos de entrenamiento"
        title="Gestión de Grupos"
        subtitle="Asignación de estudiantes y horarios — el nivel técnico pertenece al grupo, no al estudiante."
      >
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
      </AppShell>
    </ProtectedRoute>
  );
}
