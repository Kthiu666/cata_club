/**
 * Trainer Dashboard — Today's real schedules and attendance summary.
 *
 * Backend gap (see src/lib/server/attendance-adapter.ts): there's no API
 * exposing which NivelRanking (Grupo) a Horario belongs to, so a per-schedule
 * roster count ("Estudiantes Asignados") can't be derived honestly. Instead
 * this dashboard shows real, directly-queryable numbers: how many real
 * schedules fall on today (`GET /asistencias/horarios`) and how many
 * attendance records exist for today (`GET /asistencias/reportes?fecha_inicio=
 * fecha_fin=hoy`), reusing the same `buildAttendanceStats` the admin
 * `/attendance` page uses.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/shell/AppShell";
import {
  Calendar,
  Users,
  UserCheck,
  ClipboardList,
  ArrowRight,
  Clock,
  XCircle,
  Trophy,
} from "lucide-react";
import { fetchTrainingSchedules, fetchAttendanceRecords } from "@/services/api";
import {
  buildAttendanceStats,
  jsDayIndexToDiaSemana,
  type AttendanceRecord,
  type TrainingSchedule,
} from "@/app/attendance/attendance-utils";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function TrainerPage(): React.ReactElement {
  const [schedules, setSchedules] = useState<TrainingSchedule[]>([]);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const today = todayIsoDate();
      const [scheduleData, recordData] = await Promise.all([
        fetchTrainingSchedules(),
        fetchAttendanceRecords({ fechaInicio: today, fechaFin: today }),
      ]);
      setSchedules(scheduleData);
      setTodayRecords(recordData);
    } catch (err) {
      console.error("[trainer] loadData failed", err);
      setError("Error al cargar el resumen de hoy");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const todayDia = jsDayIndexToDiaSemana(new Date().getDay());
  const todaySchedules = schedules.filter((s) => s.diaSemana === todayDia);
  const stats = buildAttendanceStats(todayRecords);
  const presentPercent = stats.totalStudents > 0 ? Math.round((stats.totalPresent / stats.totalStudents) * 100) : 0;

  return (
    <ProtectedRoute allowedRoles={["trainer"]}>
      <AppShell
        eyebrow="Área de entrenadores"
        title="Panel del Entrenador"
      >
        {/* Interactive Attendance CTA */}
        <div className="mb-6 flex flex-wrap gap-3">
          <Link
            href="/trainer/attendance"
            className="flex items-center justify-between gap-3 rounded-2xl border border-cata-red/20 bg-cata-red/10 px-5 py-4 text-cata-red transition-colors hover:bg-cata-red/15"
          >
            <span className="flex items-center gap-3">
              <ClipboardList size={20} strokeWidth={1.5} aria-hidden="true" />
              <span>
                <span className="block text-sm font-bold">Registrar Asistencia Interactiva</span>
                <span className="block text-xs text-cata-red/75">
                  Tomá asistencia de las sesiones de hoy en unos pasos
                </span>
              </span>
            </span>
            <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
          </Link>
          <Link
            href="/trainer/nivel"
            className="inline-flex items-center gap-2 rounded-xl bg-cata-red/15 px-4 py-2.5 text-sm font-medium text-cata-red transition-all duration-200 hover:bg-cata-red/25"
          >
            <Trophy size={16} strokeWidth={1.5} aria-hidden="true" />
            Gestionar Nivel
            <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
          </Link>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-2">
              <Clock size={16} strokeWidth={1.5} className="animate-spin text-cata-text/65" aria-hidden="true" />
              <p className="text-sm text-cata-text/50">Cargando resumen de hoy...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="card mb-8 border border-red-200 bg-red-50 p-6 text-center">
            <XCircle size={32} strokeWidth={1.5} className="mx-auto mb-3 text-red-700" aria-hidden="true" />
            <p className="text-sm text-cata-red">{error}</p>
            <button type="button" onClick={() => loadData()} className="btn-ghost mt-3 text-xs text-cata-red">
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
          <div className="mb-10 grid gap-5 sm:grid-cols-3">
            <div className="card-hover flex items-center gap-3 p-4 sm:p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cata-red/15">
                <Calendar size={20} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
              </div>
              <p className="min-w-0 flex-1 truncate text-xs font-medium uppercase tracking-wider text-cata-text/65">
                Horarios de Hoy
              </p>
              <p className="shrink-0 text-2xl font-bold tracking-tight text-cata-text">{todaySchedules.length}</p>
            </div>
            <div className="card-hover flex items-center gap-3 p-4 sm:p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cata-red/15">
                <Users size={20} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
              </div>
              <p className="min-w-0 flex-1 truncate text-xs font-medium uppercase tracking-wider text-cata-text/65">
                Asistencias Registradas Hoy
              </p>
              <p className="shrink-0 text-2xl font-bold tracking-tight text-cata-text">{stats.totalStudents}</p>
            </div>
            <div className="card-hover flex items-center gap-3 p-4 sm:p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cata-red/15">
                <UserCheck size={20} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
              </div>
              <p className="min-w-0 flex-1 truncate text-xs font-medium uppercase tracking-wider text-cata-text/65">
                Presentes Hoy
              </p>
              <p className="flex shrink-0 items-baseline gap-1.5 text-2xl font-bold tracking-tight text-cata-text">
                {stats.totalPresent}/{stats.totalStudents}
                <span className="text-xs font-semibold text-cata-state-ok">{presentPercent}%</span>
              </p>
            </div>
          </div>
          </>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}
