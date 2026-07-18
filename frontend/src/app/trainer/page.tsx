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
import {
  Calendar,
  Users,
  UserCheck,
  GraduationCap,
  TrendingUp,
  CheckCircle2,
  ClipboardList,
  ArrowRight,
  Clock,
  XCircle,
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
      <div>
        {/* Hero Banner */}
        <div className="relative mb-10 overflow-hidden rounded-3xl border border-cata-border bg-cata-surface px-6 py-10 shadow-elevated sm:px-10 sm:py-12">
          <div className="absolute inset-0 bg-logo-glow" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-cata-red">
              <GraduationCap size={14} strokeWidth={2} aria-hidden="true" />
              Área de Entrenadores
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-cata-text sm:text-4xl">
              Panel del Entrenador
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-cata-text/60">
              Resumen de entrenamiento de hoy — {new Date().toLocaleDateString("es-EC", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Interactive Attendance CTA */}
        <div className="mb-6">
          <Link
            href="/trainer/attendance"
            className="inline-flex items-center gap-2 rounded-xl bg-cata-red/15 px-4 py-2.5 text-sm font-medium text-cata-red transition-all duration-200 hover:bg-cata-red/25"
          >
            <ClipboardList size={16} strokeWidth={1.5} aria-hidden="true" />
            Registrar Asistencia
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
          <div className="mb-10 grid gap-5 sm:grid-cols-3">
            <div className="card-hover p-5 sm:p-6">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cata-red/15">
                  <Calendar size={22} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-cata-state-ok/10 px-2 py-0.5 text-[10px] font-semibold text-cata-state-ok">
                  <CheckCircle2 size={10} strokeWidth={2} aria-hidden="true" />
                  Hoy
                </span>
              </div>
              <p className="text-xs font-medium uppercase tracking-wider text-cata-text/65">Horarios de Hoy</p>
              <p className="mt-1 text-3xl font-extrabold tracking-tight text-cata-text">
                {todaySchedules.length}
              </p>
            </div>
            <div className="card-hover p-5 sm:p-6">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cata-red/15">
                  <Users size={22} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                </div>
              </div>
              <p className="text-xs font-medium uppercase tracking-wider text-cata-text/65">Asistencias Registradas Hoy</p>
              <p className="mt-1 text-3xl font-extrabold tracking-tight text-cata-text">
                {stats.totalStudents}
              </p>
            </div>
            <div className="card-hover p-5 sm:p-6">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cata-red/15">
                  <UserCheck size={22} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-cata-state-ok/10 px-2 py-0.5 text-[10px] font-semibold text-cata-state-ok">
                  <TrendingUp size={10} strokeWidth={2} aria-hidden="true" />
                  {presentPercent}%
                </span>
              </div>
              <p className="text-xs font-medium uppercase tracking-wider text-cata-text/65">Presentes Hoy</p>
              <p className="mt-1 text-3xl font-extrabold tracking-tight text-cata-text">
                {stats.totalPresent}/{stats.totalStudents}
              </p>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
