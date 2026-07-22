/**
 * Grupos y Horarios — Admin page for managing training schedules.
 *
 * Lists all HorarioEntrenamiento records with day, time, trainer, and
 * assigned training level. Shows which students belong to each schedule
 * based on their ranking level assignment. Allows creating, editing, and
 * deleting schedules.
 *
 * Rebuilt for issue #43 — replaces the old NivelRanking-as-Grupo placeholder
 * with real HorarioEntrenamiento management.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/shell/AppShell";
import {
  Calendar,
  Plus,
  Pencil,
  Trash2,
  Users,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Clock,
  GraduationCap,
} from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  fetchHorarios,
  crearHorario,
  actualizarHorario,
  eliminarHorario,
  fetchMembers,
  fetchNivelesConOcupacion,
  ApiClientError,
} from "@/services/api";
import type { Horario, CrearHorarioDTO, ActualizarHorarioDTO, NivelConOcupacion } from "@/services/api";
import type { StudentRef } from "@/lib/groups-utils";

const DIA_LABELS: Record<string, string> = {
  LUNES: "Lunes",
  MARTES: "Martes",
  MIERCOLES: "Miércoles",
  JUEVES: "Jueves",
  VIERNES: "Viernes",
  SABADO: "Sábado",
  DOMINGO: "Domingo",
};

const DIA_OPTIONS = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":");
  return `${h}:${m}`;
}

function extractErrorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : fallback;
}

interface HorarioFormData {
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  entrenador_id: number | null;
  nivel_ranking_id: number | null;
}

const EMPTY_FORM: HorarioFormData = {
  dia_semana: "LUNES",
  hora_inicio: "08:00",
  hora_fin: "10:00",
  entrenador_id: null,
  nivel_ranking_id: null,
};

export default function GroupsPage(): React.ReactElement {
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [niveles, setNiveles] = useState<NivelConOcupacion[]>([]);
  const [allStudents, setAllStudents] = useState<StudentRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<HorarioFormData>(EMPTY_FORM);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showNotification = useCallback((type: "success" | "error", message: string): void => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const loadData = useCallback(async (): Promise<void> => {
    setLoading(true);
    setLoadError(null);
    try {
      const [horariosData, nivelesData, membersData] = await Promise.all([
        fetchHorarios(),
        fetchNivelesConOcupacion(),
        fetchMembers(),
      ]);
      setHorarios(horariosData);
      setNiveles(nivelesData);
      const students: StudentRef[] = membersData.accounts.flatMap((account) =>
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
      setLoadError("No se pudieron cargar los horarios. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function openCreateForm(): void {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  function openEditForm(horario: Horario): void {
    setEditingId(horario.id);
    setFormData({
      dia_semana: horario.diaSemana,
      hora_inicio: horario.horaInicio.slice(0, 5),
      hora_fin: horario.horaFin.slice(0, 5),
      entrenador_id: horario.entrenadorId,
      nivel_ranking_id: horario.nivelRankingId,
    });
    setFormError(null);
    setShowForm(true);
  }

  function closeForm(): void {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!formData.entrenador_id) {
      setFormError("Seleccioná un entrenador.");
      return;
    }
    setFormSubmitting(true);
    setFormError(null);
    try {
      if (editingId !== null) {
        const dto: ActualizarHorarioDTO = {
          dia_semana: formData.dia_semana,
          hora_inicio: formData.hora_inicio + ":00",
          hora_fin: formData.hora_fin + ":00",
          entrenador_id: formData.entrenador_id,
          nivel_ranking_id: formData.nivel_ranking_id,
        };
        await actualizarHorario(editingId, dto);
        showNotification("success", "Horario actualizado correctamente.");
      } else {
        const dto: CrearHorarioDTO = {
          dia_semana: formData.dia_semana,
          hora_inicio: formData.hora_inicio + ":00",
          hora_fin: formData.hora_fin + ":00",
          entrenador_id: formData.entrenador_id,
          nivel_ranking_id: formData.nivel_ranking_id,
        };
        await crearHorario(dto);
        showNotification("success", "Horario creado correctamente.");
      }
      closeForm();
      await loadData();
    } catch (err) {
      setFormError(extractErrorMessage(err, "Error al guardar el horario."));
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleDelete(id: number): Promise<void> {
    setDeletingId(id);
    setConfirmDeleteId(null);
    try {
      await eliminarHorario(id);
      showNotification("success", "Horario eliminado correctamente.");
      await loadData();
    } catch (err) {
      showNotification("error", extractErrorMessage(err, "Error al eliminar el horario."));
    } finally {
      setDeletingId(null);
    }
  }

  const entrenadores = allStudents.length > 0 ? [] : [];

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AppShell
        eyebrow="Gestión Operativa"
        title="Grupos y Horarios"
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

        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
            <h2 className="text-lg font-bold text-cata-text">
              Horarios de Entrenamiento ({horarios.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={openCreateForm}
            className="btn-primary inline-flex items-center gap-1.5 text-xs"
          >
            <Plus size={14} strokeWidth={2} aria-hidden="true" />
            Nuevo Horario
          </button>
        </div>

        {showForm && (
          <div className="card mb-6 p-5">
            <h3 className="mb-4 text-sm font-bold text-cata-text">
              {editingId !== null ? "Editar Horario" : "Nuevo Horario"}
            </h3>
            {formError && (
              <div className="alert-error mb-4" role="alert">{formError}</div>
            )}
            <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="horario-dia" className="mb-1 block text-xs font-medium text-cata-text/65">
                  Día de la semana
                </label>
                <select
                  id="horario-dia"
                  className="input-field w-full"
                  value={formData.dia_semana}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dia_semana: e.target.value }))}
                  required
                >
                  {DIA_OPTIONS.map((dia) => (
                    <option key={dia} value={dia}>{DIA_LABELS[dia]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="horario-inicio" className="mb-1 block text-xs font-medium text-cata-text/65">
                  Hora inicio
                </label>
                <input
                  id="horario-inicio"
                  type="time"
                  className="input-field w-full"
                  value={formData.hora_inicio}
                  onChange={(e) => setFormData((prev) => ({ ...prev, hora_inicio: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label htmlFor="horario-fin" className="mb-1 block text-xs font-medium text-cata-text/65">
                  Hora fin
                </label>
                <input
                  id="horario-fin"
                  type="time"
                  className="input-field w-full"
                  value={formData.hora_fin}
                  onChange={(e) => setFormData((prev) => ({ ...prev, hora_fin: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label htmlFor="horario-nivel" className="mb-1 block text-xs font-medium text-cata-text/65">
                  Nivel de ranking <span className="text-cata-text/40">(opcional)</span>
                </label>
                <select
                  id="horario-nivel"
                  className="input-field w-full"
                  value={formData.nivel_ranking_id ?? ""}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    nivel_ranking_id: e.target.value ? Number(e.target.value) : null,
                  }))}
                >
                  <option value="">Sin nivel asignado</option>
                  {niveles.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.nombre ?? `Nivel ${n.numeroNivel}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-4 flex gap-2">
                <button type="submit" disabled={formSubmitting} className="btn-primary inline-flex items-center gap-1.5 text-xs">
                  {formSubmitting && <Loader2 size={12} className="animate-spin" aria-hidden="true" />}
                  {editingId !== null ? "Guardar cambios" : "Crear horario"}
                </button>
                <button type="button" onClick={closeForm} className="btn-secondary text-xs">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="card flex flex-col items-center py-12 text-center">
            <Loader2 size={24} className="mb-3 animate-spin text-cata-text/30" aria-hidden="true" />
            <p className="text-sm text-cata-text/50">Cargando horarios…</p>
          </div>
        ) : horarios.length > 0 ? (
          <div className="space-y-3">
            {horarios.map((h) => {
              const nivel = niveles.find((n) => n.id === h.nivelRankingId);
              const studentsInNivel = h.nivelRankingId
                ? allStudents.filter((s) => s.grupoId === String(h.nivelRankingId))
                : [];
              const isDeleting = deletingId === h.id;

              return (
                <div key={h.id} className="card p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cata-red/10">
                        <Calendar size={20} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-cata-text">
                          {DIA_LABELS[h.diaSemana] ?? h.diaSemana}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-cata-text/60">
                          <Clock size={11} strokeWidth={1.5} aria-hidden="true" />
                          {formatTime(h.horaInicio)} – {formatTime(h.horaFin)}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-cata-text/50">
                          <GraduationCap size={11} strokeWidth={1.5} aria-hidden="true" />
                          {nivel ? (nivel.nombre ?? `Nivel ${nivel.numeroNivel}`) : "Sin nivel asignado"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {h.nivelRankingId && (
                        <div className="flex items-center gap-1 rounded-lg bg-cata-bg px-2.5 py-1 text-xs text-cata-text/60">
                          <Users size={11} strokeWidth={1.5} aria-hidden="true" />
                          {studentsInNivel.length} alumno{studentsInNivel.length !== 1 ? "s" : ""}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditForm(h)}
                        disabled={isDeleting}
                        className="rounded-lg border border-cata-border p-1.5 text-cata-text/50 transition-colors hover:bg-cata-red/10 hover:text-cata-red disabled:opacity-50"
                        title="Editar horario"
                      >
                        <Pencil size={13} strokeWidth={1.5} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(h.id)}
                        disabled={isDeleting}
                        className="rounded-lg border border-cata-border p-1.5 text-cata-text/50 transition-colors hover:bg-red-50 hover:text-cata-red disabled:opacity-50"
                        title="Eliminar horario"
                      >
                        {isDeleting ? (
                          <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                        ) : (
                          <Trash2 size={13} strokeWidth={1.5} aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>

                  {h.nivelRankingId && studentsInNivel.length > 0 && (
                    <div className="mt-3 border-t border-cata-border pt-3">
                      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-cata-text/40">
                        Alumnos asignados
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {studentsInNivel.map((s) => (
                          <span
                            key={s.id}
                            className="inline-flex items-center rounded-full bg-cata-bg px-2 py-0.5 text-[11px] text-cata-text/70"
                          >
                            {s.nombres} {s.apellidos}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card flex flex-col items-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cata-red/10">
              <Calendar size={28} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
            </div>
            <h3 className="mb-1 text-base font-bold text-cata-text">
              No hay horarios configurados
            </h3>
            <p className="mb-4 max-w-sm text-sm text-cata-text/50">
              Creá un horario de entrenamiento para empezar a gestionar los grupos.
            </p>
            <button
              type="button"
              onClick={openCreateForm}
              className="btn-primary inline-flex items-center gap-1.5 text-xs"
            >
              <Plus size={14} strokeWidth={2} aria-hidden="true" />
              Crear primer horario
            </button>
          </div>
        )}

        <ConfirmDialog
          open={confirmDeleteId !== null}
          variant="danger"
          title="Eliminar horario"
          message="¿Confirma que desea eliminar este horario de entrenamiento? Esta acción no se puede deshacer."
          onConfirm={() => {
            if (confirmDeleteId === null) return;
            void handleDelete(confirmDeleteId);
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      </AppShell>
    </ProtectedRoute>
  );
}
