"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/shell/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { fetchStudentPortal, registrarPago, subirVoucherPago } from "@/services/api";
import type { StudentPortalSummary, StudentProfileSummary, MembershipSummary, RegistrarPagoInput } from "@/services/api";
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
  Clock,
  Plus,
  Loader2,
  Upload,
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

/**
 * Inline "register payment" / "renew membership" form rendered inside
 * MembershipCard when the membership is INACTIVA (first payment) or has
 * expired (VENCIDA / fecha_fin < today). Calls `registrarPago` (POST
 * /api/membresias/pagos), which the backend authorizes for the owner,
 * their representative, or ADMIN — so the student themselves can trigger
 * the renewal cycle without admin intervention. On success, `onRenewed`
 * refreshes the portal so the new PENDIENTE_VALIDACION row appears in
 * PagosSection and the MembershipCard shows the new state.
 */
function RenewPaymentForm({
  membership,
  personaId,
  onRenewed,
  label,
}: {
  membership: MembershipSummary;
  personaId: string;
  onRenewed: () => void;
  label: string;
}): React.ReactElement {
  const [showForm, setShowForm] = useState(false);
  const [monto, setMonto] = useState<string>(membership.montoAplicado ?? "");
  const [tipoPago, setTipoPago] = useState<"EFECTIVO" | "TRANSFERENCIA">("TRANSFERENCIA");
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleOpen(): void {
    setShowForm(true);
    setError(null);
    setVoucherFile(null);
    const hoy = new Date();
    const prevFin = membership.fechaFin ? new Date(membership.fechaFin + "T12:00:00") : null;
    const base = prevFin && prevFin.getTime() > hoy.getTime() ? prevFin : hoy;
    const fin = new Date(base);
    fin.setMonth(fin.getMonth() + 1);
    setFechaInicio(base.toISOString().slice(0, 10));
    setFechaFin(fin.toISOString().slice(0, 10));
  }

  async function handleSubmit(): Promise<void> {
    const montoNum = Number(monto);
    if (!montoNum || montoNum <= 0) {
      setError("El monto debe ser mayor a 0.");
      return;
    }
    if (!fechaInicio || !fechaFin) {
      setError("Las fechas son obligatorias.");
      return;
    }
    if (fechaInicio >= fechaFin) {
      setError("La fecha de inicio debe ser anterior a la fecha de fin.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nuevoPago = await registrarPago({
        monto: montoNum,
        tipoPago,
        fechaInicio,
        fechaFin,
        personaId: Number(personaId),
        membresiaId: membership.id,
      } satisfies RegistrarPagoInput);

      if (voucherFile && nuevoPago?.id) {
        await subirVoucherPago(nuevoPago.id, voucherFile);
      }

      setShowForm(false);
      setVoucherFile(null);
      onRenewed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el pago.");
    } finally {
      setLoading(false);
    }
  }

  if (!showForm) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-cata-red px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-cata-red/85"
      >
        <Plus size={14} strokeWidth={1.5} aria-hidden="true" />
        {label}
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-2.5 rounded-lg bg-cata-bg/60 p-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-medium text-cata-text/65">
          Monto
          <input
            type="number"
            step="0.01"
            min="0"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="mt-0.5 w-full rounded-lg border border-cata-border bg-cata-surface px-2.5 py-1.5 text-xs text-cata-text"
            placeholder="0.00"
          />
        </label>
        <label className="text-xs font-medium text-cata-text/65">
          Método
          <select
            value={tipoPago}
            onChange={(e) => {
              const val = e.target.value as "EFECTIVO" | "TRANSFERENCIA";
              setTipoPago(val);
              if (val !== "TRANSFERENCIA") setVoucherFile(null);
            }}
            className="mt-0.5 w-full rounded-lg border border-cata-border bg-cata-surface px-2.5 py-1.5 text-xs text-cata-text"
          >
            <option value="TRANSFERENCIA">Transferencia</option>
            <option value="EFECTIVO">Efectivo</option>
          </select>
        </label>
        <label className="text-xs font-medium text-cata-text/65">
          Inicio
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="mt-0.5 w-full rounded-lg border border-cata-border bg-cata-surface px-2.5 py-1.5 text-xs text-cata-text"
          />
        </label>
        <label className="text-xs font-medium text-cata-text/65">
          Fin
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="mt-0.5 w-full rounded-lg border border-cata-border bg-cata-surface px-2.5 py-1.5 text-xs text-cata-text"
          />
        </label>
      </div>

      {tipoPago === "TRANSFERENCIA" && (
        <label className="block text-xs font-medium text-cata-text/65">
          Comprobante de pago
          <div className="mt-0.5 flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              onChange={(e) => setVoucherFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-cata-border bg-cata-surface px-2.5 py-1.5 text-xs text-cata-text/65 transition-colors hover:border-cata-red/30 hover:text-cata-text"
            >
              <Upload size={12} strokeWidth={1.5} aria-hidden="true" />
              {voucherFile ? voucherFile.name : "Seleccionar archivo"}
            </button>
            {voucherFile && (
              <button
                type="button"
                onClick={() => setVoucherFile(null)}
                className="text-[10px] text-cata-text/45 hover:text-cata-red"
              >
                Quitar
              </button>
            )}
          </div>
          <span className="mt-0.5 block text-[10px] text-cata-text/40">PDF, JPG o PNG</span>
        </label>
      )}

      {error && <p className="text-xs text-cata-red">{error}</p>}
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={loading || !monto || !fechaInicio || !fechaFin}
          className="inline-flex items-center gap-1 rounded-lg bg-cata-red px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-cata-red/80 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <CreditCard size={12} strokeWidth={1.5} />
          )}
          Registrar pago
        </button>
        <button
          type="button"
          onClick={() => { setShowForm(false); setVoucherFile(null); }}
          className="rounded-lg border border-cata-border px-2.5 py-1.5 text-xs text-cata-text/65 transition-colors hover:bg-cata-surface"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function MembershipCard({
  membership,
  personaId,
  onRenewed,
}: {
  membership: MembershipSummary | null;
  personaId: string;
  onRenewed: () => void;
}): React.ReactElement {
  if (!membership) {
    return (
      <section className="card-hover p-4 sm:p-5" aria-labelledby="membership-unavailable-title">
        <div className="mb-2 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cata-red/15">
            <ShieldCheck size={18} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-cata-text/65">Membresía</p>
            <h2 id="membership-unavailable-title" className="text-lg font-bold tracking-tight text-cata-text">Sin membresía</h2>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-cata-text/55">
          Aún no tenés una membresía registrada. Consulte con administración.
        </p>
      </section>
    );
  }

  if (membership.estado === "INACTIVA") {
    return (
      <section className="card-hover p-4 sm:p-5" aria-labelledby="membership-inactive-title">
        <div className="mb-2 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100">
            <Clock size={18} strokeWidth={1.5} className="text-amber-600" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-cata-text/65">Membresía</p>
            <h2 id="membership-inactive-title" className="text-lg font-bold tracking-tight text-cata-text">Pendiente de activación</h2>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-cata-text/55">
          Tu membresía fue creada pero espera la validación del primer pago.
        </p>
        {membership.categoria && (
          <p className="mt-1 text-xs text-cata-text/65">
            Plan: {membership.categoria} {membership.franjaHoraria ? `(${membership.franjaHoraria})` : ""}
            {membership.montoAplicado ? ` — $${membership.montoAplicado}` : ""}
          </p>
        )}
        <RenewPaymentForm
          membership={membership}
          personaId={personaId}
          onRenewed={onRenewed}
          label="Registrar primer pago"
        />
      </section>
    );
  }

  const hoyIso = new Date().toISOString().slice(0, 10);
  const isExpired = membership.estado === "VENCIDA"
    || (membership.fechaFin !== null && membership.fechaFin < hoyIso);

  return (
    <section className="card-hover p-4 sm:p-5" aria-labelledby="membership-status-title">
      <div className="mb-2 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cata-red/15">
          <ShieldCheck size={18} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-cata-text/65">Membresía</p>
          <h2 id="membership-status-title" className="text-lg font-bold tracking-tight text-cata-text">
            {isExpired ? "Vencida" : "Activa"}
          </h2>
        </div>
        <span className={isExpired ? "badge-error" : "badge-success"}>
          {isExpired ? "Vencida" : "Activa"}
        </span>
      </div>
      {membership.categoria && (
        <div className="space-y-0.5 text-xs text-cata-text/65">
          <p>Plan: {membership.categoria} {membership.franjaHoraria ? `(${membership.franjaHoraria})` : ""}</p>
          <p>Modalidad: {membership.modalidad === "PERSONALIZADA" ? "Personalizada" : "Mensual"}</p>
          {membership.montoAplicado && <p>Monto: ${membership.montoAplicado}</p>}
          {membership.fechaFin && <p>Vigencia hasta: {membership.fechaFin}</p>}
        </div>
      )}
      {isExpired && (
        <RenewPaymentForm
          membership={membership}
          personaId={personaId}
          onRenewed={onRenewed}
          label="Renovar membresía"
        />
      )}
    </section>
  );
}

/** Real `TipoMembresia` catalog cards for the pending-enrollment view — replaces the old hardcoded `membershipPlans` array. */
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

function formatSessionDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("es-EC", { weekday: "long", day: "numeric", month: "short" });
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
                    <p className="text-sm font-semibold text-cata-text">{formatSessionDate(session.fecha)}</p>
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
// Pagos section — read-only payment history (`GET
// /membresias/pagos/persona/:personaId`), any status, so a student can see
// every payment on record including a rejected one with the admin's
// `motivoRechazo`. Uploading a new comprobante / registering a payment is a
// separate, bigger feature not built here (see `POST /membresias/pagos` and
// `.../voucher`, both already exist backend-side but have no student-facing
// UI yet).
// ---------------------------------------------------------------------------

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
  onRenewed,
}: {
  data: StudentPortalSummary;
  hasAlumnoRole: boolean;
  onRenewed: () => void;
}): React.ReactElement {
  const managedProfiles: StudentProfileSummary[] =
    hasAlumnoRole && data.self ? [data.self, ...data.representados] : data.representados;

  const [selectedId, setSelectedId] = useState<string>(managedProfiles[0]?.personaId ?? "");

  function handleRenewed(): void {
    onRenewed();
  }

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
          href={representative ? "/student/add-dependent" : "/student/enroll?type=child"}
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
            <MembershipCard
              membership={selectedProfile.membership}
              personaId={selectedProfile.personaId}
              onRenewed={handleRenewed}
            />
          </div>

          <RecentSessionsSection profile={selectedProfile} />

          <div className="mt-6">
            <Link
              href="/student/payments"
              className="inline-flex items-center gap-2 rounded-xl border border-cata-border bg-cata-surface px-4 py-3 text-sm font-medium text-cata-text transition-colors hover:border-cata-red/30 hover:text-cata-red"
            >
              <CreditCard size={16} strokeWidth={1.5} aria-hidden="true" />
              Ver historial de pagos
              <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
            </Link>
          </div>
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
          <ActivePortalView data={state.data} hasAlumnoRole={hasAlumnoRole} onRenewed={() => setReloadToken((n) => n + 1)} />
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
