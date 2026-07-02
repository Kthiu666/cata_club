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
} from "lucide-react";
import {
  MOCK_MEMBER_ACCOUNTS,
  MOCK_GRUPOS,
} from "@/app/members/members-utils";
import { MOCK_SCHEDULES } from "@/app/attendance/attendance-utils";
import {
  assignStudentToGroup,
  removeStudentFromAllGroups,
  getStudentsByGroup,
  getSchedulesByGroup,
  getUnassignedStudents,
  buildGroupCards,
  getLevelLabel,
  type GroupCardData,
  type StudentRef,
} from "@/lib/groups-utils";
import type { Grupo } from "@/types/domain";
import type { ScheduleSlot } from "@/app/attendance/attendance-utils";

// ---------------------------------------------------------------------------
// Build flattened student list from member accounts
// ---------------------------------------------------------------------------

function buildStudentRefs(grupos: Grupo[]): StudentRef[] {
  const refs: StudentRef[] = [];
  for (const account of MOCK_MEMBER_ACCOUNTS) {
    for (const alumno of account.alumnos) {
      // Derive grupoId from current grupos state, NOT from static alumno.grupoId.
      // This keeps the unassigned list in sync with actual group assignments.
      const grupoId = findStudentGroupId(alumno.id, grupos);
      refs.push({
        id: alumno.id,
        nombres: alumno.nombres,
        apellidos: alumno.apellidos,
        grupoId,
        activo: alumno.activo,
      });
    }
  }
  return refs;
}

/** Find which group a student belongs to, based on current grupos state. */
function findStudentGroupId(
  studentId: string,
  grupos: Grupo[],
): string | null {
  for (const g of grupos) {
    if (g.alumnosIds.includes(studentId)) return g.id;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Level badge colors
// ---------------------------------------------------------------------------

const LEVEL_BADGE: Record<string, string> = {
  principiante: "bg-green-50 text-green-700 ring-1 ring-green-200",
  intermedio: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  avanzado: "bg-red-50 text-red-700 ring-1 ring-red-200",
};

function LevelBadge({ level }: { level: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        LEVEL_BADGE[level] ?? "bg-cata-warm text-cata-gray"
      }`}
    >
      <GraduationCap size={10} strokeWidth={2} className="mr-1" aria-hidden="true" />
      {getLevelLabel(level as GroupCardData["level"])}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Capacity bar
// ---------------------------------------------------------------------------

function CapacityBar({ percent, total }: { percent: number; total: number }) {
  const color =
    percent >= 90
      ? "bg-red-500"
      : percent >= 70
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <div
      className="flex items-center gap-2"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Capacidad utilizada: ${percent}% de ${total}`}
    >
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-cata-stone/30">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <span className="text-[11px] font-medium text-cata-gray" aria-hidden="true">
        {percent}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function GroupsPage() {
  const [grupos, setGrupos] = useState(() =>
    MOCK_GRUPOS.map((g) => ({ ...g, alumnosIds: [...g.alumnosIds] })),
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const allStudents = buildStudentRefs(grupos);
  const unassigned = getUnassignedStudents(allStudents);
  const cardData = buildGroupCards(grupos, MOCK_SCHEDULES);
  const selectedGrupo = selectedGroupId
    ? grupos.find((g) => g.id === selectedGroupId) ?? null
    : null;

  const showNotification = useCallback(
    (type: "success" | "error", message: string) => {
      setNotification({ type, message });
      setTimeout(() => setNotification(null), 4000);
    },
    [],
  );

  function handleAssignStudent(alumnoId: string, targetGroupId: string) {
    const result = assignStudentToGroup(alumnoId, targetGroupId, grupos);
    if (result.success) {
      setGrupos(result.updatedGrupos);
      showNotification("success", result.message);
    } else {
      showNotification("error", result.message);
    }
  }

  function handleClearAssignment(alumnoId: string) {
    const updated = removeStudentFromAllGroups(alumnoId, grupos);
    setGrupos(updated);
    showNotification("success", "Alumno removido del grupo.");
  }

  function handleResetToMock() {
    setGrupos(MOCK_GRUPOS.map((g) => ({ ...g, alumnosIds: [...g.alumnosIds] })));
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
      <div>
        {/* ══ Header ══ */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cata-red/10">
              <Users
                size={20}
                strokeWidth={1.5}
                className="text-cata-red"
                aria-hidden="true"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-cata-charcoal">
                Gestión de Grupos
              </h1>
              <p className="text-sm text-cata-gray">
                Grupos de entrenamiento, asignación de alumnos y horarios
              </p>
            </div>
          </div>
        </div>

        {/* ══ Demo indicator ══ */}
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
          <span className="font-medium">Demo</span> &mdash; Las asignaciones
          son simuladas en memoria. No hay integración con un backend real.
          Los cambios se reinician al recargar la página.
        </div>

        {/* ══ Notification ══ */}
        {notification && (
          <div
            className={`mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
              notification.type === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border border-red-200 bg-red-50 text-red-700"
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

        {/* ══ Reset button ══ */}
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

        {/* ══ Two-column layout ══ */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Left column: Group cards ── */}
          <div className="space-y-4 lg:col-span-2">
            <h2 className="text-lg font-semibold text-cata-charcoal">
              Grupos ({cardData.length})
            </h2>

            {cardData.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {cardData.map((card) => {
                  const isSelected = selectedGroupId === card.id;
                  const grupo = grupos.find((g) => g.id === card.id)!;
                  const linkedSchedules = getSchedulesByGroup(
                    grupo,
                    MOCK_SCHEDULES,
                  );

                  return (
                    <button
                      key={card.id}
                      type="button"
                      aria-pressed={isSelected}
                      aria-label={`${card.name} — ${card.levelLabel}, ${card.studentCount} alumnos, ${card.capacityPercent}% de capacidad`}
                      onClick={() =>
                        setSelectedGroupId(
                          isSelected ? null : card.id,
                        )
                      }
                      className={`card-hover p-4 text-left transition-all ${
                        isSelected
                          ? "ring-2 ring-cata-red/30 border-cata-red/20"
                          : ""
                      }`}
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-cata-charcoal">
                            {card.name}
                          </h3>
                          <LevelBadge level={card.level} />
                        </div>
                      </div>

                      {/* Student count */}
                      <div className="mb-2 flex items-center gap-1.5 text-xs text-cata-gray">
                        <Users size={12} strokeWidth={1.5} aria-hidden="true" />
                        {card.studentCount} alumno
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
                              className="flex items-center gap-1.5 text-[11px] text-cata-gray-light"
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
                                <span className="rounded bg-gray-100 px-1 py-0.5 text-[9px] font-medium text-gray-500">
                                  Inactivo
                                </span>
                              )}
                            </div>
                          ))
                        ) : (
                          <span className="text-[11px] text-cata-gray-light">
                            Sin horarios asignados
                          </span>
                        )}
                        {linkedSchedules.length > 3 && (
                          <span className="text-[11px] text-cata-gray-light">
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
                          Gestionar alumnos
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="card flex flex-col items-center py-12 text-center">
                <Users
                  size={36}
                  strokeWidth={1}
                  className="mb-2 text-cata-stone"
                  aria-hidden="true"
                />
                <p className="text-sm text-cata-gray">
                  No hay grupos configurados.
                </p>
              </div>
            )}

            {/* ── Unassigned students section ── */}
            <div className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-cata-charcoal">
                  Alumnos sin grupo (
                  {unassigned.length})
                </h3>
              </div>

              {unassigned.length > 0 ? (
                <div className="space-y-2">
                  {unassigned.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between rounded-lg border border-cata-stone/40 bg-white px-3.5 py-2.5 transition-colors hover:border-cata-stone/70"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-50">
                          <UserPlus
                            size={12}
                            strokeWidth={1.5}
                            className="text-amber-600"
                            aria-hidden="true"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-cata-charcoal">
                            {student.nombres} {student.apellidos}
                          </p>
                          <p className="text-[11px] text-amber-600">
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
                            className="rounded-lg border border-cata-stone/40 px-2 py-1 text-[10px] font-medium transition-colors hover:bg-cata-red/8 hover:text-cata-red"
                            title={`Asignar a ${g.nombre}`}
                          >
                            {g.nombre.slice(0, 8)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-cata-gray/60">
                  Todos los alumnos tienen un grupo asignado.
                </p>
              )}
            </div>
          </div>

          {/* ── Right column: Group detail panel ── */}
          <div className="space-y-4">
            {selectedGrupo ? (
              <>
                {/* Group detail */}
                <div className="card p-5">
                  <h3 className="mb-3 text-sm font-semibold text-cata-charcoal">
                    {selectedGrupo.nombre}
                  </h3>

                  <div className="mb-4 space-y-2 text-sm text-cata-gray">
                    <div className="flex items-center justify-between">
                      <span>Nivel técnico</span>
                      <LevelBadge level={selectedGrupo.nivel} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Alumnos asignados</span>
                      <span className="font-medium text-cata-charcoal">
                        {selectedGrupo.alumnosIds.length}
                      </span>
                    </div>
                  </div>

                  {/* Assigned students list */}
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-cata-gray-light">
                      Alumnos
                    </p>
                    {assignedStudentsForSelected.length > 0 ? (
                      <div className="space-y-1">
                        {assignedStudentsForSelected.map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between rounded-lg bg-cata-warm/50 px-3 py-2"
                          >
                            <span className="text-sm text-cata-charcoal">
                              {s.nombres} {s.apellidos}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleClearAssignment(s.id)
                              }
                              className="text-cata-gray-light transition-colors hover:text-cata-red"
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
                      <p className="text-xs text-cata-gray/60">
                        Sin alumnos asignados.
                      </p>
                    )}
                  </div>
                </div>

                {/* Linked schedules */}
                <div className="card p-5">
                  <h3 className="mb-3 text-sm font-semibold text-cata-charcoal">
                    Horarios vinculados
                  </h3>

                  {schedulesForSelected.length > 0 ? (
                    <div className="space-y-2">
                      {schedulesForSelected.map((sched) => (
                        <div
                          key={sched.id}
                          className="rounded-lg border border-cata-stone/40 bg-white p-3 text-xs"
                        >
                          <div className="flex items-center gap-1.5 font-medium text-cata-charcoal">
                            <Calendar
                              size={12}
                              strokeWidth={1.5}
                              aria-hidden="true"
                            />
                            {sched.diaSemana.slice(0, 3).replace(".", "")}{" "}
                            {sched.horaInicio} — {sched.horaFin}
                            {!sched.activo && (
                              <span className="ml-auto rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                                Inactivo
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-cata-gray-light">
                            <MapPin
                              size={10}
                              strokeWidth={1.5}
                              aria-hidden="true"
                            />
                            {sched.cancha}
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-cata-gray-light">
                            <Users
                              size={10}
                              strokeWidth={1.5}
                              aria-hidden="true"
                            />
                            Cupo: {sched.cupoMaximo} personas
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-cata-gray/60">
                      Sin horarios vinculados. Los horarios se asignan desde la
                      configuración del grupo.
                    </p>
                  )}
                </div>

                {/* Quick assign from unassigned */}
                {unassigned.length > 0 && (
                  <div className="card p-5">
                    <h3 className="mb-3 text-sm font-semibold text-cata-charcoal">
                      Asignar alumno sin grupo
                    </h3>
                    <div className="space-y-1.5">
                      {unassigned.slice(0, 5).map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleAssignStudent(s.id, selectedGroupId!)}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-cata-red/8"
                        >
                          <span className="text-cata-charcoal">
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
                        <p className="text-xs text-cata-gray-light">
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
                  size={36}
                  strokeWidth={1}
                  className="mb-2 text-cata-stone"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium text-cata-charcoal">
                  Seleccioná un grupo
                </p>
                <p className="mt-1 text-xs text-cata-gray">
                  Hacé clic en un grupo para ver su detalle
                  y gestionar la asignación de alumnos.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ══ Domain info card ══ */}
        <div className="mt-8 rounded-xl border border-cata-stone/50 bg-white p-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-cata-gray-light">
            Modelo de dominio (Demo)
          </h3>
          <p className="text-xs leading-relaxed text-cata-gray">
            El <strong>nivel técnico</strong> pertenece al grupo, no al alumno.
            Un alumno adquiere su nivel al ser asignado a un grupo.
            Los alumnos sin grupo asignado no tienen nivel técnico — está
            pendiente de evaluación por el entrenador.
            Los <strong>horarios</strong> se vinculan al grupo, y la{" "}
            <strong>asistencia</strong> se registra por sesión (grupo + horario).
          </p>
        </div>

        {/* ══ Demo footer ══ */}
        <p className="mt-8 text-center text-xs text-cata-gray/40">
          Los datos de grupos, alumnos y horarios son de demostración.
          Las asignaciones se simulan en memoria y se reinician al recargar.
        </p>
      </div>
    </ProtectedRoute>
  );
}
