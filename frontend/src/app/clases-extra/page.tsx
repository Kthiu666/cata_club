"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/shell/AppShell";
import ConfirmDialog from "@/components/ConfirmDialog";
import Pagination from "@/components/Pagination";
import { usePagination } from "@/hooks/usePagination";
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Calendar,
  Clock,
  User,
} from "lucide-react";
import { fetchClasesExtraPendientes, resolverClaseExtra, ApiClientError } from "@/services/api";
import type { SolicitudClaseExtra } from "@/types/domain";
import { formatDate } from "@/lib/format-utils";

const DIA_SEMANA_LABEL: Record<string, string> = {
  LUNES: "Lunes",
  MARTES: "Martes",
  MIERCOLES: "Miércoles",
  JUEVES: "Jueves",
  VIERNES: "Viernes",
  SABADO: "Sábado",
  DOMINGO: "Domingo",
};

type PageState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; solicitudes: SolicitudClaseExtra[] };

function extractErrorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : fallback;
}

// Stable empty-array reference for non-"ready" states — usePagination
// resets to page 1 whenever the `records` reference changes, so a fresh
// `[]` literal on every render would be harmless here (no items to page
// through either way) but is avoided for clarity/consistency.
const EMPTY_SOLICITUDES: SolicitudClaseExtra[] = [];

export default function ClasesExtraPage(): React.ReactElement {
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [costoAdicional, setCostoAdicional] = useState<string>("");
  const [observaciones, setObservaciones] = useState<string>("");
  const [confirmingApproveId, setConfirmingApproveId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadSolicitudes(): Promise<void> {
    setState({ status: "loading" });
    try {
      const solicitudes = await fetchClasesExtraPendientes();
      setState({ status: "ready", solicitudes });
    } catch (err: unknown) {
      setState({
        status: "error",
        message: extractErrorMessage(err, "No se pudieron cargar las solicitudes de clases extra."),
      });
    }
  }

  useEffect(() => {
    void loadSolicitudes();
  }, []);

  const {
    page: solicitudesPage,
    totalPages: solicitudesTotalPages,
    currentItems: paginatedSolicitudes,
    setPage: setSolicitudesPage,
  } = usePagination({
    records: state.status === "ready" ? state.solicitudes : EMPTY_SOLICITUDES,
  });

  function handleApproveClick(id: number): void {
    setCostoAdicional("");
    setConfirmingApproveId(id);
  }

  function handleRejectClick(id: number): void {
    setResolvingId(id);
    setObservaciones("");
  }

  function cancelActions(): void {
    setResolvingId(null);
    setConfirmingApproveId(null);
    setCostoAdicional("");
    setObservaciones("");
  }

  async function submitApprove(id: number): Promise<void> {
    const costo = Number(costoAdicional);
    if (!Number.isFinite(costo) || costo < 0) {
      // Keep it simple: invalid input silently resets; real validation would surface an error.
      setCostoAdicional("");
      return;
    }
    setSubmitting(true);
    try {
      await resolverClaseExtra(id, { estado: "APROBADA", costoAdicional: costoAdicional.trim() || undefined });
      await loadSolicitudes();
      cancelActions();
    } catch (err: unknown) {
      setState({ status: "error", message: extractErrorMessage(err, "No se pudo aprobar la solicitud.") });
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReject(id: number): Promise<void> {
    setSubmitting(true);
    try {
      await resolverClaseExtra(id, { estado: "RECHAZADA", observaciones: observaciones.trim() || undefined });
      await loadSolicitudes();
      cancelActions();
    } catch (err: unknown) {
      setState({ status: "error", message: extractErrorMessage(err, "No se pudo rechazar la solicitud.") });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AppShell eyebrow="Administración" title="Clases Extra" subtitle="Revisá y resolve las solicitudes de clases adicionales.">
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen size={18} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
            <h2 className="text-base font-bold text-cata-text">Solicitudes pendientes</h2>
          </div>

          {state.status === "loading" ? (
            <div className="flex items-center gap-2 py-6">
              <Loader2 size={18} className="animate-spin text-cata-text/40" aria-hidden="true" />
              <p className="text-sm text-cata-text/50">Cargando solicitudes...</p>
            </div>
          ) : state.status === "error" ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <AlertTriangle size={28} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
              <p className="text-sm text-cata-text/65">{state.message}</p>
              <button
                type="button"
                onClick={() => void loadSolicitudes()}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <RefreshCw size={14} strokeWidth={1.5} aria-hidden="true" />
                Reintentar
              </button>
            </div>
          ) : state.solicitudes.length === 0 ? (
            <div className="flex items-center gap-2 py-6">
              <CheckCircle2 size={18} strokeWidth={1.5} className="text-cata-state-ok" aria-hidden="true" />
              <p className="text-sm text-cata-text/50">No hay solicitudes de clases extra pendientes.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedSolicitudes.map((s) => {
                const isResolving = resolvingId === s.id;
                const isApproving = confirmingApproveId === s.id;
                const diaLabel = s.horarioDiaSemana ? DIA_SEMANA_LABEL[s.horarioDiaSemana] ?? s.horarioDiaSemana : "—";
                const horarioLabel = s.horarioHoraInicio && s.horarioHoraFin
                  ? `${s.horarioHoraInicio.slice(0, 5)} – ${s.horarioHoraFin.slice(0, 5)}`
                  : "—";

                return (
                  <div
                    key={s.id}
                    className="card-hover flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <User size={14} strokeWidth={1.5} className="text-cata-text/50" aria-hidden="true" />
                        <p className="text-sm font-semibold text-cata-text">
                          {s.personaNombreCompleto ?? `Persona #${s.personaId}`}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-cata-text/65">
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={12} strokeWidth={1.5} aria-hidden="true" />
                          {formatDate(s.fechaClaseSolicitada)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={12} strokeWidth={1.5} aria-hidden="true" />
                          {diaLabel} {horarioLabel}
                        </span>
                      </div>
                      {s.observaciones && (
                        <p className="text-xs italic text-cata-text/50">“{s.observaciones}”</p>
                      )}
                    </div>

                    {isApproving ? (
                      <div className="w-full space-y-2 sm:w-auto sm:min-w-[240px]">
                        <label htmlFor={`costo-${s.id}`} className="block text-xs font-medium text-cata-text">
                          Costo adicional (USD) <span className="text-cata-red">*</span>
                        </label>
                        <input
                          id={`costo-${s.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={costoAdicional}
                          onChange={(e) => setCostoAdicional(e.target.value)}
                          placeholder="0.00"
                          className="input-field w-full text-xs"
                          disabled={submitting}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={submitting || costoAdicional.trim() === ""}
                            onClick={() => void submitApprove(s.id)}
                            className="btn-primary flex-1 py-1.5 text-xs"
                          >
                            {submitting ? "Procesando..." : "Confirmar aprobación"}
                          </button>
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={cancelActions}
                            className="btn-secondary py-1.5 text-xs"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : isResolving ? (
                      <div className="w-full space-y-2 sm:w-auto sm:min-w-[240px]">
                        <label htmlFor={`obs-${s.id}`} className="block text-xs font-medium text-cata-text">
                          Observaciones del rechazo
                        </label>
                        <textarea
                          id={`obs-${s.id}`}
                          rows={2}
                          value={observaciones}
                          onChange={(e) => setObservaciones(e.target.value)}
                          placeholder="Opcional: motivo del rechazo..."
                          className="input-field resize-y text-xs"
                          disabled={submitting}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => void submitReject(s.id)}
                            className="btn-secondary flex-1 border-cata-red/30 py-1.5 text-xs text-cata-red hover:bg-cata-red/10"
                          >
                            {submitting ? "Procesando..." : "Confirmar rechazo"}
                          </button>
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={cancelActions}
                            className="btn-secondary py-1.5 text-xs"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleApproveClick(s.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                        >
                          <CheckCircle2 size={12} strokeWidth={1.5} aria-hidden="true" />
                          Aprobar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectClick(s.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-cata-red transition-colors hover:bg-red-100"
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
          )}
          <Pagination page={solicitudesPage} totalPages={solicitudesTotalPages} onPageChange={setSolicitudesPage} />
        </div>

        <ConfirmDialog
          open={confirmingApproveId !== null}
          title="Aprobar clase extra"
          message="Al aprobar se habilita la clase extra solicitada. Asegurate de haber indicado el costo adicional correcto."
          variant="state-ok"
          confirmLabel="Aprobar"
          onConfirm={() => {
            if (confirmingApproveId !== null) {
              void submitApprove(confirmingApproveId);
            }
          }}
          onCancel={cancelActions}
        />
      </AppShell>
    </ProtectedRoute>
  );
}
