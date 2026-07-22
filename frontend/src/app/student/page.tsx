"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/shell/AppShell";
import ContextualHelp from "@/components/ContextualHelp";
import { useAuth } from "@/contexts/AuthContext";
import { fetchStudentPortal, fetchMisMembresias, fetchTrainingSchedules, listarClasesExtra, solicitarClaseExtra, submitJustificativo, fetchJustificativosDePersona, fetchPagosDePersona, ApiClientError } from "@/services/api";
import type { StudentPortalSummary, StudentProfileSummary, MembresiaPorPersona, PagoPersona } from "@/services/api";
import type { SolicitudClaseExtra, Justificativo } from "@/types/domain";
import type { TrainingSchedule } from "@/app/attendance/attendance-utils";
import { ATTENDANCE_LABELS, ATTENDANCE_BADGE_TOKENS } from "@/app/attendance/attendance-utils";
import { derivePortalMode, isRepresentative, describeRanking } from "./student-utils";
import {
  Calendar,
  ShieldCheck,
  CreditCard,
  AlertTriangle,
  User,
  ChevronDown,
  GraduationCap,
  UserPlus,
  ArrowRight,
  Trophy,
  RefreshCw,
  BookOpen,
  Clock,
  History,
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Load state
// ---------------------------------------------------------------------------

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: StudentPortalSummary };

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------

function LoadingCard(): React.ReactElement {
  return (
    <div className="card flex min-h-[40vh] items-center justify-center p-6 text-center">
      <p className="text-sm text-cata-text/50">Cargando su cuenta...</p>
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }): React.ReactElement {
  return (
    <div className="card p-6 text-center">
      <AlertTriangle size={28} strokeWidth={1.5} className="mx-auto mb-3 text-cata-red" aria-hidden="true" />
      <p className="mb-4 text-sm text-cata-text/65">{message}</p>
      <button type="button" onClick={onRetry} className="btn-secondary mx-auto inline-flex items-center gap-2">
        <RefreshCw size={14} strokeWidth={1.5} aria-hidden="true" />
        Reintentar
      </button>
    </div>
  );
}

/** Shows the JWT-scoped membership state without fabricating payment data. */
function MembershipCard({ memberships }: { memberships: StudentPortalSummary["memberships"] }): React.ReactElement {
  const activeMembership = memberships.find((membership) => membership.estado === "ACTIVA" || membership.estado === "VENCIDA");
  if (activeMembership) {
    return (
      <section className="card-hover p-4 sm:p-5" aria-labelledby="membership-status-title">
        <div className="mb-2 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cata-red/15">
            <ShieldCheck size={18} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-cata-text/65">Membresía</p>
            <h2 id="membership-status-title" className="text-lg font-bold tracking-tight text-cata-text">Membresía {activeMembership.estado.toLowerCase()}</h2>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-cata-text/55">Tu membresía está disponible desde este portal.</p>
      </section>
    );
  }
  return (
    <section className="card-hover p-4 sm:p-5" aria-labelledby="membership-unavailable-title">
      <div className="mb-2 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cata-red/15">
          <ShieldCheck size={18} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-cata-text/65">Membresía</p>
          <h2 id="membership-unavailable-title" className="text-lg font-bold tracking-tight text-cata-text">Membresía no disponible</h2>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-cata-text/55">
        No disponible desde este portal por el momento. Consulte con administración del club.
      </p>
      <ContextualHelp title="Ayuda sobre membresía no disponible">
        <p>La membresía no está disponible desde este portal por el momento. Consulte con administración para conocer las opciones disponibles.</p>
      </ContextualHelp>
      <a href="mailto:administracion@cataclub.local" className="mt-3 inline-flex text-xs font-medium text-cata-red hover:text-cata-red-light">
        Consultar con administración
      </a>
    </section>
  );
}

function RankingCard({ profile }: { profile: StudentProfileSummary }): React.ReactElement {
  const display = describeRanking(profile.ranking);
  return (
    <div className="card-hover p-4 sm:p-5">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cata-red/15">
          <Trophy size={18} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-cata-text/65">Ranking</p>
          <p className="text-lg font-bold tracking-tight text-cata-text">{display.label}</p>
        </div>
        <span className={display.badgeClass}>{profile.ranking.status === "available" ? "Disponible" : "No disponible"}</span>
      </div>
      <p className="text-sm text-cata-text/65">{display.detail}</p>
    </div>
  );
}

function RecentSessionsSection({ profile }: { profile: StudentProfileSummary }): React.ReactElement {
  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center gap-2">
        <Calendar size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
        <h2 className="text-lg font-bold text-cata-text">Actividad Reciente — {profile.nombres}</h2>
      </div>
      {profile.recentSessions.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="text-sm text-cata-text/50">Aún no hay asistencias registradas.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {profile.recentSessions.map((session) => {
            const tokens = ATTENDANCE_BADGE_TOKENS[session.estado];
            return (
              <div key={`${session.fecha}-${session.horario}`} className="card-hover p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cata-red/15">
                    <Calendar size={18} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-cata-text">{session.fecha}</p>
                    <p className="mt-0.5 text-xs text-cata-text/55">{session.horario}</p>
                    <span className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${tokens.badgeClass}`}>
                      {ATTENDANCE_LABELS[session.estado]}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Extra-class requests section — visible only for PERSONALIZED memberships
// ---------------------------------------------------------------------------

type ExtraClassesState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "unavailable"; reason: "not-personalized" | "no-membership" | "discovery-failed" | "forbidden" }
  | { status: "ready"; membership: MembresiaPorPersona; schedules: TrainingSchedule[]; history: SolicitudClaseExtra[] };

function ExtraClassesSection({ personaId }: { personaId: string }): React.ReactElement {
  const [state, setState] = useState<ExtraClassesState>({ status: "loading" });
  const [fechaClase, setFechaClase] = useState("");
  const [horarioId, setHorarioId] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const numericPersonaId = Number(personaId);
  const numericHorarioId = Number(horarioId);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    setSubmitError(null);
    setSubmitSuccess(false);

    Promise.all([
      fetchMisMembresias(numericPersonaId),
      fetchTrainingSchedules(),
      listarClasesExtra(numericPersonaId),
    ])
      .then(([memberships, schedules, history]) => {
        if (cancelled) return;
        const activeMembership = memberships.find((m) => m.estado === "ACTIVA" || m.estado === "VENCIDA");
        const personalized = activeMembership?.tipo?.modalidad === "PERSONALIZADA";

        if (!activeMembership) {
          setState({ status: "unavailable", reason: "no-membership" });
        } else if (!personalized) {
          setState({ status: "unavailable", reason: "not-personalized" });
        } else {
          setState({ status: "ready", membership: activeMembership, schedules, history });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiClientError && error.status === 403) {
          setState({ status: "unavailable", reason: "forbidden" });
          return;
        }
        const is404 = error instanceof Error && error.message.toLowerCase().includes("not found");
        if (is404) {
          setState({ status: "unavailable", reason: "discovery-failed" });
        } else {
          setState({ status: "error", message: error instanceof Error ? error.message : "No se pudo cargar la sección de clases extra." });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [numericPersonaId, reloadToken]);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (state.status !== "ready" || !fechaClase || !horarioId) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      await solicitarClaseExtra({
        fechaClaseSolicitada: fechaClase,
        personaId: numericPersonaId,
        membresiaId: state.membership.id,
        horarioId: numericHorarioId,
        observaciones: observaciones.trim() || undefined,
      });
      setSubmitSuccess(true);
      setFechaClase("");
      setHorarioId("");
      setObservaciones("");
      setReloadToken((n) => n + 1);
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : "No se pudo enviar la solicitud.");
    } finally {
      setSubmitting(false);
    }
  }

  if (state.status === "loading") {
    return (
      <section className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          <BookOpen size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
          <h2 className="text-lg font-bold text-cata-text">Clases Extra</h2>
        </div>
        <div className="card flex min-h-[20vh] items-center justify-center p-6 text-center">
          <Loader2 size={20} className="animate-spin text-cata-text/50" aria-hidden="true" />
          <p className="ml-2 text-sm text-cata-text/50">Cargando clases extra...</p>
        </div>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          <BookOpen size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
          <h2 className="text-lg font-bold text-cata-text">Clases Extra</h2>
        </div>
        <ErrorCard message={state.message} onRetry={() => setReloadToken((n) => n + 1)} />
      </section>
    );
  }

  if (state.status === "unavailable") {
    const messages: Record<"not-personalized" | "no-membership" | "discovery-failed" | "forbidden", string> = {
      "not-personalized": "Las clases extra solo están disponibles para membresías personalizadas.",
      "no-membership": "No se encontró una membresía activa para solicitar clases extra.",
      "discovery-failed": "El listado de membresías no está disponible en este momento. Consulte con administración.",
      "forbidden": "No tenés permiso para ver las membresías de esta persona. Si sos representante, verificá que el alumno esté vinculado a tu cuenta.",
    };
    return (
      <section className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          <BookOpen size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
          <h2 className="text-lg font-bold text-cata-text">Clases Extra</h2>
        </div>
        <div className="card p-6 text-center">
          <BookOpen size={28} strokeWidth={1.5} className="mx-auto mb-3 text-cata-text/30" aria-hidden="true" />
          <p className="text-sm text-cata-text/65">{messages[state.reason]}</p>
          {state.reason === "discovery-failed" && (
            <button
              type="button"
              onClick={() => setReloadToken((n) => n + 1)}
              className="btn-secondary mx-auto mt-4 inline-flex items-center gap-2"
            >
              <RefreshCw size={14} strokeWidth={1.5} aria-hidden="true" />
              Reintentar
            </button>
          )}
        </div>
      </section>
    );
  }

  const { membership, schedules, history } = state;

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center gap-2">
        <BookOpen size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
        <h2 className="text-lg font-bold text-cata-text">Clases Extra</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
          <CheckCircle2 size={10} strokeWidth={2} aria-hidden="true" />
          Membresía personalizada
        </span>
      </div>

      <div className="mb-6 rounded-2xl border border-cata-border bg-cata-surface p-5 sm:p-6">
        <h3 className="mb-4 text-base font-bold text-cata-text">Solicitar una clase extra</h3>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="fecha-clase" className="mb-1 block text-xs font-medium text-cata-text/65">
              Fecha de la clase
            </label>
            <input
              id="fecha-clase"
              type="date"
              value={fechaClase}
              onChange={(e) => setFechaClase(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="input-field w-full"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="horario-clase" className="mb-1 block text-xs font-medium text-cata-text/65">
              Horario
            </label>
            <select
              id="horario-clase"
              value={horarioId}
              onChange={(e) => setHorarioId(e.target.value)}
              className="input-field w-full"
              required
            >
              <option value="">Seleccionar horario...</option>
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.diaSemana} {s.horaInicio}–{s.horaFin} · {s.entrenadorNombre}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label htmlFor="observaciones-clase" className="mb-1 block text-xs font-medium text-cata-text/65">
              Observaciones
            </label>
            <input
              id="observaciones-clase"
              type="text"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Opcional"
              className="input-field w-full"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              disabled={submitting || !fechaClase || !horarioId}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              ) : (
                <Send size={14} strokeWidth={1.5} aria-hidden="true" />
              )}
              {submitting ? "Enviando..." : "Solicitar clase extra"}
            </button>
            {submitError && (
              <p className="mt-2 text-sm text-cata-red" role="alert">
                {submitError}
              </p>
            )}
            {submitSuccess && (
              <p className="mt-2 flex items-center gap-1 text-sm text-cata-state-ok" role="status">
                <CheckCircle2 size={14} strokeWidth={2} aria-hidden="true" />
                Solicitud enviada correctamente.
              </p>
            )}
          </div>
        </form>
      </div>

      <div>
        <div className="mb-4 flex items-center gap-2">
          <History size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
          <h3 className="text-base font-bold text-cata-text">Historial de solicitudes</h3>
        </div>
        {history.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-sm text-cata-text/50">Aún no hay solicitudes de clases extra.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {history.map((solicitud) => (
              <div key={solicitud.id} className="card-hover flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cata-red/15">
                    <Clock size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-cata-text">
                      {solicitud.fechaClaseSolicitada}
                    </p>
                    <p className="text-xs text-cata-text/65">
                      Horario #{solicitud.horarioId} · {solicitud.observaciones || "Sin observaciones"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {solicitud.estado === "PENDIENTE" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/20 px-2 py-0.5 text-xs font-medium text-amber-400">
                      <Clock size={10} strokeWidth={2} aria-hidden="true" /> Pendiente
                    </span>
                  )}
                  {solicitud.estado === "APROBADA" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      <CheckCircle2 size={10} strokeWidth={2} aria-hidden="true" /> Aprobada
                    </span>
                  )}
                  {solicitud.estado === "RECHAZADA" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-cata-red">
                      <XCircle size={10} strokeWidth={2} aria-hidden="true" /> Rechazada
                    </span>
                  )}
                  {solicitud.costoAdicional && (
                    <span className="text-xs text-cata-text/65">+${solicitud.costoAdicional}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Pagos section — read-only payment history (`GET
// /membresias/pagos/persona/:personaId`), any status, so a student can see
// every payment on record including a rejected one with the admin's
// `motivoRechazo` — mirrors JustificativosSection's structure. Uploading a
// new comprobante / registering a payment is a separate, bigger feature not
// built here (see `POST /membresias/pagos` and `.../voucher`, both already
// exist backend-side but have no student-facing UI yet).
// ---------------------------------------------------------------------------

const TIPO_PAGO_LABEL: Record<PagoPersona["tipoPago"], string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
};

function PagoEstadoBadge({ estado }: { estado: PagoPersona["estadoPago"] }): React.ReactElement {
  if (estado === "APROBADO") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
        <CheckCircle2 size={10} strokeWidth={2} aria-hidden="true" /> Aprobado
      </span>
    );
  }
  if (estado === "RECHAZADO") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-cata-red">
        <XCircle size={10} strokeWidth={2} aria-hidden="true" /> Rechazado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/20 px-2 py-0.5 text-xs font-medium text-amber-400">
      <Clock size={10} strokeWidth={2} aria-hidden="true" /> Pendiente
    </span>
  );
}

type PagosState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; pagos: PagoPersona[] };

function PagosSection({ personaId }: { personaId: string }): React.ReactElement {
  const [state, setState] = useState<PagosState>({ status: "loading" });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    fetchPagosDePersona(personaId)
      .then((pagos) => {
        if (!cancelled) setState({ status: "ready", pagos });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "No se pudo cargar el historial de pagos.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [personaId, reloadToken]);

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center gap-2">
        <CreditCard size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
        <h2 className="text-lg font-bold text-cata-text">Pagos</h2>
      </div>
      <p className="mb-4 text-xs text-cata-text/65">
        Historial de pagos registrados en su cuenta. La carga de comprobantes y el registro de nuevos
        pagos no están disponibles desde este portal por el momento — consulte con administración del
        club.
      </p>

      {state.status === "loading" && (
        <div className="card p-6 text-center">
          <p className="text-sm text-cata-text/50">Cargando historial de pagos...</p>
        </div>
      )}

      {state.status === "error" && (
        <ErrorCard message={state.message} onRetry={() => setReloadToken((n) => n + 1)} />
      )}

      {state.status === "ready" &&
        (state.pagos.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-sm text-cata-text/50">Todavía no hay pagos registrados.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {state.pagos.map((pago) => (
              <div
                key={pago.id}
                className="card-hover flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cata-red/15">
                    <CreditCard size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-cata-text">
                      ${pago.monto} · {pago.fechaInicio} – {pago.fechaFin}
                    </p>
                    <p className="text-xs text-cata-text/65">{TIPO_PAGO_LABEL[pago.tipoPago]}</p>
                    {pago.estadoPago === "RECHAZADO" && pago.motivoRechazo && (
                      <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                        <p className="text-xs font-semibold text-cata-red">Motivo de rechazo</p>
                        <p className="text-xs text-cata-red/80">{pago.motivoRechazo}</p>
                      </div>
                    )}
                  </div>
                </div>
                <PagoEstadoBadge estado={pago.estadoPago} />
              </div>
            ))}
          </div>
        ))}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Justificativos section — submit + full history (Ranking track,
// E03-RF006a/E04-RF012 ampliado). The history is fetched from the backend
// (`GET /ranking/:personaId/justificativos`) so a student can see every
// justificativo they've ever submitted, including rejected ones with the
// admin's `motivoRechazo` — not just what was submitted this session.
// ---------------------------------------------------------------------------

const MESES_LABEL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function JustificativoEstadoBadge({ estado }: { estado: Justificativo["estado"] }): React.ReactElement {
  if (estado === "APROBADO") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
        <CheckCircle2 size={10} strokeWidth={2} aria-hidden="true" /> Aprobado
      </span>
    );
  }
  if (estado === "RECHAZADO") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-cata-red">
        <XCircle size={10} strokeWidth={2} aria-hidden="true" /> Rechazado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/20 px-2 py-0.5 text-xs font-medium text-amber-400">
      <Clock size={10} strokeWidth={2} aria-hidden="true" /> Pendiente
    </span>
  );
}

function JustificativosSection({ personaId }: { personaId: string }): React.ReactElement {
  const numericPersonaId = Number(personaId);
  const now = new Date();

  const [anio, setAnio] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [motivo, setMotivo] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [historial, setHistorial] = useState<Justificativo[]>([]);
  const [historialLoading, setHistorialLoading] = useState(true);

  async function cargarHistorial(): Promise<void> {
    setHistorialLoading(true);
    try {
      const data = await fetchJustificativosDePersona(personaId);
      setHistorial(data);
    } catch {
      // Best-effort: si falla la carga del historial, se deja la lista
      // previa (o vacía) en vez de romper el resto de la sección.
    } finally {
      setHistorialLoading(false);
    }
  }

  useEffect(() => {
    void cargarHistorial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personaId]);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!motivo.trim()) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitJustificativo({
        personaId: numericPersonaId,
        anio,
        mes,
        motivo: motivo.trim(),
        observaciones: observaciones.trim() || undefined,
      });
      setMotivo("");
      setObservaciones("");
      await cargarHistorial();
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : "No se pudo enviar el justificativo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center gap-2">
        <FileText size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
        <h2 className="text-lg font-bold text-cata-text">Justificativos</h2>
      </div>

      <div className="mb-6 rounded-2xl border border-cata-border bg-cata-surface p-5 sm:p-6">
        <h3 className="mb-1 text-base font-bold text-cata-text">Justificar una ausencia del ranking mensual</h3>
        <p className="mb-4 text-xs text-cata-text/65">
          Enviá un justificativo para el mes en que no participaste — un administrador lo evaluará.
        </p>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="justificativo-anio" className="mb-1 block text-xs font-medium text-cata-text/65">
              Año
            </label>
            <input
              id="justificativo-anio"
              type="number"
              min={2020}
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              className="input-field w-full"
              required
            />
          </div>
          <div>
            <label htmlFor="justificativo-mes" className="mb-1 block text-xs font-medium text-cata-text/65">
              Mes
            </label>
            <select
              id="justificativo-mes"
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="input-field w-full"
              required
            >
              {MESES_LABEL.map((label, i) => (
                <option key={label} value={i + 1}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-2">
            <label htmlFor="justificativo-motivo" className="mb-1 block text-xs font-medium text-cata-text/65">
              Motivo
            </label>
            <input
              id="justificativo-motivo"
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej. Viaje familiar"
              maxLength={255}
              className="input-field w-full"
              required
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label htmlFor="justificativo-observaciones" className="mb-1 block text-xs font-medium text-cata-text/65">
              Observaciones <span className="text-cata-text/40">(opcional)</span>
            </label>
            <textarea
              id="justificativo-observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Detalles adicionales sobre la ausencia..."
              maxLength={500}
              rows={3}
              className="input-field w-full resize-none"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              disabled={submitting || !motivo.trim()}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              ) : (
                <Send size={14} strokeWidth={1.5} aria-hidden="true" />
              )}
              {submitting ? "Enviando..." : "Enviar justificativo"}
            </button>
            {submitError && (
              <p className="mt-2 text-sm text-cata-red" role="alert">
                {submitError}
              </p>
            )}
          </div>
        </form>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <History size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
          <h3 className="text-base font-bold text-cata-text">Historial de justificativos</h3>
        </div>
        {historialLoading ? (
          <div className="card p-6 text-center">
            <p className="text-sm text-cata-text/50">Cargando historial...</p>
          </div>
        ) : historial.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-sm text-cata-text/50">Todavía no enviaste ningún justificativo.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {historial.map((j) => (
              <div
                key={j.id}
                className="card-hover flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cata-red/15">
                    <FileText size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-cata-text">
                      {MESES_LABEL[j.mes - 1]} {j.anio}
                    </p>
                    <p className="text-xs text-cata-text/65">{j.motivo}</p>
                    {j.estado === "RECHAZADO" && j.motivoRechazo && (
                      <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                        <p className="text-xs font-semibold text-cata-red">Motivo de rechazo</p>
                        <p className="text-xs text-cata-red/80">{j.motivoRechazo}</p>
                      </div>
                    )}
                  </div>
                </div>
                <JustificativoEstadoBadge estado={j.estado} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/** Real `TipoMembresia` catalog cards for the pending-enrollment view — replaces the old hardcoded `membershipPlans` array. */
function MembershipPlansGrid({ data }: { data: StudentPortalSummary }): React.ReactElement {
  if (data.membershipPlans.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="text-sm text-cata-text/50">No hay planes de membresía disponibles en este momento.</p>
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {data.membershipPlans.map((plan) => (
        <div key={plan.id} className="card-hover flex flex-col p-5 sm:p-6">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-cata-red/15">
            <ShieldCheck size={18} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
          </div>
          <h3 className="text-base font-bold text-cata-text">{plan.nombre}</h3>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-cata-text">${plan.precio.toFixed(2)}</span>
          </div>
          <p className="mt-1 text-xs text-cata-text/65">{plan.franjaHoraria}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pending-enrollment view — honest intermediate state for an authenticated
// persona with no ALUMNO role and no representados (see student-utils.ts's
// `derivePortalMode` doc comment for why this is not /unauthorized).
// ---------------------------------------------------------------------------

function PendingEnrollmentView({ data }: { data: StudentPortalSummary }): React.ReactElement {
  return (
    <div className="mb-8">
      <div className="mb-6 rounded-2xl border border-cata-border bg-cata-bg p-6">
        <div className="mb-3 flex items-center gap-2">
          <UserPlus size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
          <h2 className="text-lg font-bold text-cata-text">Bienvenido a Cata Club</h2>
        </div>
        <p className="text-sm leading-relaxed text-cata-text/65">
          Su cuenta está creada pero todavía no tiene una matrícula activa. Elija el plan que mejor se
          adapte a sus necesidades y complete su inscripción, o inscriba a un hijo/dependiente, para
          comenzar a entrenar.
        </p>
        <p className="mt-3 text-xs leading-relaxed text-cata-text/45">
          Una vez inscrito, desde su portal podrá agregar hijos o dependientes si necesita gestionar las
          membresías de su familia.
        </p>
      </div>

      <MembershipPlansGrid data={data} />

      <div className="mt-8 flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-center">
        <Link href="/student/enroll?type=self" className="btn-primary inline-flex items-center gap-2 shadow-soft">
          <UserPlus size={16} strokeWidth={1.5} aria-hidden="true" />
          Inscribirme como Jugador
          <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
        </Link>
        <Link href="/student/enroll?type=child" className="btn-secondary inline-flex items-center gap-2">
          <UserPlus size={16} strokeWidth={1.5} aria-hidden="true" />
          Inscribir hijo/dependiente
          <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Active portal view — self-managed student and/or representante
// ---------------------------------------------------------------------------

function ActivePortalView({
  data,
  hasAlumnoRole,
}: {
  data: StudentPortalSummary;
  hasAlumnoRole: boolean;
}): React.ReactElement {
  const managedProfiles: StudentProfileSummary[] =
    hasAlumnoRole && data.self ? [data.self, ...data.representados] : data.representados;

  const [selectedId, setSelectedId] = useState<string>(managedProfiles[0]?.personaId ?? "");

  useEffect(() => {
    if (!managedProfiles.some((p) => p.personaId === selectedId)) {
      setSelectedId(managedProfiles[0]?.personaId ?? "");
    }
    // Only re-run when the set of managed profile ids actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managedProfiles.map((p) => p.personaId).join(",")]);

  const representative = isRepresentative(data.representados.length);
  const selectedProfile = managedProfiles.find((p) => p.personaId === selectedId) ?? managedProfiles[0] ?? null;

  return (
    <>
      {representative && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs text-cata-text/65">Gestiona {managedProfiles.length} estudiante(s)</span>
        </div>
      )}

      {managedProfiles.length > 1 && (
        <div className="mb-4">
          <label htmlFor="student-select" className="text-xs font-medium text-cata-text/45">
            Seleccionar estudiante
          </label>
          <div className="relative mt-1 inline-block">
            <select
              id="student-select"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="appearance-none rounded-xl border border-cata-border bg-cata-surface px-4 py-2 pr-10 text-sm font-medium text-cata-text shadow-sm transition-colors hover:border-cata-red/30 focus:border-cata-red/40 focus:outline-none focus:ring-2 focus:ring-cata-red/10"
            >
              {managedProfiles.map((profile) => (
                <option key={profile.personaId} value={profile.personaId}>
                  {profile.nombres} {profile.apellidos}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              strokeWidth={1.5}
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-cata-text/65"
              aria-hidden="true"
            />
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href="/student/enroll?type=child"
          className="inline-flex items-center gap-2 rounded-xl bg-cata-red/15 px-4 py-2.5 text-sm font-medium text-cata-red transition-all duration-200 hover:bg-cata-red/25"
        >
          <UserPlus size={16} strokeWidth={1.5} aria-hidden="true" />
          {representative ? "Agregar hijo/dependiente" : "Inscribir hijo/dependiente"}
          <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
        </Link>
        {!hasAlumnoRole && (
          <Link
            href="/student/enroll?type=self"
            className="inline-flex items-center gap-2 rounded-xl bg-cata-red/15 px-4 py-2.5 text-sm font-medium text-cata-red transition-all duration-200 hover:bg-cata-red/25"
          >
            <GraduationCap size={16} strokeWidth={1.5} aria-hidden="true" />
            Unirme como jugador
            <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
          </Link>
        )}
      </div>

      {selectedProfile === null ? (
        <div className="card p-6 text-center">
          <User size={32} strokeWidth={1.5} className="mx-auto mb-3 text-cata-text/20" aria-hidden="true" />
          <p className="text-sm text-cata-text/50">No se encontraron estudiantes asociados a esta cuenta.</p>
        </div>
      ) : (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2">
            <RankingCard profile={selectedProfile} />
            <MembershipCard memberships={selectedProfile.personaId === data.self?.personaId ? data.memberships : []} />
          </div>

          <RecentSessionsSection profile={selectedProfile} />
          <ExtraClassesSection personaId={selectedProfile.personaId} />
          <PagosSection personaId={selectedProfile.personaId} />
          <JustificativosSection personaId={selectedProfile.personaId} />
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function StudentPortalContent(): React.ReactElement {
  const { session } = useAuth();
  const personaId = session?.user.id ?? "";
  const hasAlumnoRole = session?.user.role === "estudiante";

  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!personaId) return;
    let cancelled = false;
    setState({ status: "loading" });
    fetchStudentPortal(personaId)
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "No se pudo cargar su cuenta.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [personaId, reloadToken]);

  return (
    <AppShell eyebrow="Área de Estudiantes" title="Portal de Cuenta">
      {state.status === "loading" && <LoadingCard />}
      {state.status === "error" && <ErrorCard message={state.message} onRetry={() => setReloadToken((n) => n + 1)} />}
      {state.status === "ready" &&
        (derivePortalMode(hasAlumnoRole, state.data.representados.length) === "pending" ? (
          <PendingEnrollmentView data={state.data} />
        ) : (
          <ActivePortalView data={state.data} hasAlumnoRole={hasAlumnoRole} />
        ))}
    </AppShell>
  );
}

export default function StudentPage(): React.ReactElement {
  return (
    <ProtectedRoute allowedRoles={["representante", "estudiante", "unsupported"]}>
      <StudentPortalContent />
    </ProtectedRoute>
  );
}
