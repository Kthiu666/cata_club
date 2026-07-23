"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/shell/AppShell";
import StudentSearch from "@/components/StudentSearch";
import { ChevronLeft, Calendar, Users, ClipboardList } from "lucide-react";
import { fetchTrainingSchedules, fetchAttendanceRecords } from "@/services/api";
import type { TrainingSchedule, AttendanceRecord } from "@/app/attendance/attendance-utils";
import type { PersonaBusqueda } from "@/types/domain";
import {
  type DateRangePreset,
  buildDateRange,
  ATTENDANCE_STATUS_LABELS,
  attendanceStatusBadgeClass,
} from "./history-utils";

const DATE_PRESETS: { key: DateRangePreset; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "this_week", label: "Esta semana" },
  { key: "this_month", label: "Este mes" },
  { key: "custom", label: "Rango personalizado" },
];

function HistoryPageContent(): React.ReactElement {
  const [schedules, setSchedules] = useState<TrainingSchedule[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [datePreset, setDatePreset] = useState<DateRangePreset>("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<PersonaBusqueda | null>(null);

  const loadSchedules = useCallback(async () => {
    try {
      const data = await fetchTrainingSchedules();
      setSchedules(data);
    } catch {
      setLoadError("Error al cargar horarios.");
    }
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const range = datePreset === "custom"
        ? { fechaInicio: customStart, fechaFin: customEnd }
        : buildDateRange(datePreset);

      const params: {
        fechaInicio?: string;
        fechaFin?: string;
        horarioId?: number;
        personaId?: number;
      } = {};
      if (range.fechaInicio) params.fechaInicio = range.fechaInicio;
      if (range.fechaFin) params.fechaFin = range.fechaFin;
      if (selectedScheduleId !== null) params.horarioId = selectedScheduleId;
      if (selectedStudent !== null) params.personaId = selectedStudent.id;

      const data = await fetchAttendanceRecords(
        Object.keys(params).length > 0 ? params : undefined,
      );
      setRecords(data);
    } catch {
      setLoadError("No se pudieron cargar los registros de asistencia.");
    } finally {
      setLoading(false);
    }
  }, [datePreset, customStart, customEnd, selectedScheduleId, selectedStudent]);

  useEffect(() => {
    if (datePreset !== "custom" || (customStart && customEnd)) {
      loadRecords();
    }
  }, [datePreset, customStart, customEnd, selectedScheduleId, selectedStudent, loadRecords]);

  function handleStudentSelect(alumno: PersonaBusqueda): void {
    setSelectedStudent(alumno);
  }

  return (
    <AppShell eyebrow="Área de entrenadores" title="Historial de Asistencia">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/trainer"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-cata-border text-cata-text/60 hover:bg-cata-surface transition-colors"
            aria-label="Volver al panel"
          >
            <ChevronLeft size={16} strokeWidth={1.5} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-cata-text">Historial de Asistencia</h1>
            <p className="text-sm text-cata-text/65">Consulta registros de asistencia por fecha, horario o alumno.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-cata-border bg-cata-surface p-4 space-y-4">
          {/* Date range presets */}
          <div>
            <label className="block text-xs font-medium text-cata-text/65 mb-2">Rango de fechas</label>
            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => setDatePreset(preset.key)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    datePreset === preset.key
                      ? "border-cata-red bg-cata-red/10 text-cata-red"
                      : "border-cata-border text-cata-text/65 hover:bg-cata-surface"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {datePreset === "custom" && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="rounded-lg border border-cata-border bg-white px-3 py-1.5 text-sm text-cata-text focus:border-cata-red focus:outline-none focus:ring-1 focus:ring-cata-red"
                  aria-label="Fecha de inicio"
                />
                <span className="text-cata-text/45">—</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="rounded-lg border border-cata-border bg-white px-3 py-1.5 text-sm text-cata-text focus:border-cata-red focus:outline-none focus:ring-1 focus:ring-cata-red"
                  aria-label="Fecha de fin"
                />
              </div>
            )}
          </div>

          {/* Schedule filter */}
          <div>
            <label htmlFor="schedule-filter" className="block text-xs font-medium text-cata-text/65 mb-2">
              Horario
            </label>
            <select
              id="schedule-filter"
              value={selectedScheduleId ?? ""}
              onChange={(e) => setSelectedScheduleId(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-lg border border-cata-border bg-white px-3 py-2 text-sm text-cata-text focus:border-cata-red focus:outline-none focus:ring-1 focus:ring-cata-red"
            >
              <option value="">Todos los horarios</option>
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.diaSemana} {s.horaInicio} — {s.horaFin} ({s.entrenadorNombre})
                </option>
              ))}
            </select>
          </div>

          {/* Student filter */}
          <div>
            <label className="block text-xs font-medium text-cata-text/65 mb-2">Alumno</label>
            <StudentSearch onSelect={handleStudentSelect} placeholder="Buscar alumno..." />
            {selectedStudent && (
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="mt-2 text-xs text-cata-red hover:underline"
              >
                Limpiar selección
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {loadError && (
          <div className="rounded-xl border border-cata-red/30 bg-cata-red/10 px-4 py-3 text-sm text-cata-red" role="alert">
            {loadError}
          </div>
        )}

        {/* Results */}
        <div className="rounded-xl border border-cata-border bg-cata-surface">
          {loading ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-cata-text/20 border-t-cata-red" />
              <p className="text-sm text-cata-text/50">Cargando registros...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <ClipboardList size={32} strokeWidth={1.5} className="mb-3 text-cata-text/20" aria-hidden="true" />
              <p className="text-sm text-cata-text/50">No se encontraron registros de asistencia para los filtros seleccionados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cata-border text-xs font-medium text-cata-text/65">
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Alumno</th>
                    <th className="px-4 py-3">Horario</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Entrenador</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-b border-cata-border/50 last:border-0">
                      <td className="px-4 py-3 text-cata-text">{record.fecha}</td>
                      <td className="px-4 py-3 font-medium text-cata-text">{record.estudiante}</td>
                      <td className="px-4 py-3 text-cata-text/65">{record.horario}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${attendanceStatusBadgeClass(record.estado)}`}>
                          {ATTENDANCE_STATUS_LABELS[record.estado] ?? record.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-cata-text/65">{record.entrenador}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Record count */}
        {!loading && records.length > 0 && (
          <p className="text-xs text-cata-text/45 text-right">
            {records.length} registro{records.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </AppShell>
  );
}

export default function HistoryPage(): React.ReactElement {
  return (
    <ProtectedRoute allowedRoles={["trainer", "admin"]}>
      <HistoryPageContent />
    </ProtectedRoute>
  );
}
