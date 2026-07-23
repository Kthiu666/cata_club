/**
 * Gestionar Miembros — Admin overview of responsible payers and their students.
 *
 * Displays all MemberAccount records (account owners / responsible payers)
 * with their associated students. Shows membership status, payment summary,
 * and contact/identity information for each.
 *
 * Connected to the real backend (Fase 4): `GET /api/members` aggregates
 * `/personas`, `/membresias/pagos*` and `/ranking/niveles*` server-side —
 * see src/lib/server/members-adapter.ts for the DTO translation and the
 * backend gaps found while building it (no `email`/`roles`/account-active
 * flag exposed on Persona).
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/shell/AppShell";
import ContextualHelp from "@/components/ContextualHelp";
import BackLink from "@/components/BackLink";
import { useToast } from "@/contexts/ToastContext";
import {
  Users,
  UserCheck,
  Clock,
  ShieldCheck,
  Search,
  User,
  Phone,
  Mail,
  GraduationCap,
  CheckCircle2,
  XCircle,
  Building2,
  AlertTriangle,
  Stethoscope,
  Loader2,
  Plus,
  CreditCard,
  ToggleLeft,
  ToggleRight,
  Pencil,
  X,
  ChevronLeft,
  ChevronRight,
  Upload,
} from "lucide-react";
import { fetchMembers, asignarRol, quitarRol, cambiarEstadoCuenta, fetchFichaMedica, actualizarFichaMedica, fetchTiposMembresia, crearMembresia, registrarPago, subirVoucherPago, actualizarPersona } from "@/services/api";
import type { TipoMembresiaCatalogo } from "@/services/api";
import { nivelToGrupo } from "@/app/groups/groups-page-utils";
import { getUserInitials } from "@/lib/auth-utils";
import {
  buildMemberStats,
  formatMembershipPeriod,
  filterAccounts,
  accountMatchesFlag,
  countAccountsMatchingFlag,
  getAccountStatusBadge,
  getNivelLabelFromGrupo,
  paginateAccounts,
  getTotalPages,
  MEMBERS_AGGREGATE_LIMIT,
  MEMBERSHIP_STATUS_LABELS,
  MEMBERSHIP_STATUS_BADGE,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_BADGE,
  getPayerTypeLabel,
  type MemberAccount,
  type MemberStudentSummary,
  type MemberFilterFlag,
  type PaymentStatus,
} from "./members-utils";
import type { Grupo, BackendTipoRol, FichaMedicaEditable, TipoSangre } from "@/types/domain";
import { formatCurrency, formatDate } from "@/lib/format-utils";
import MedicalRecordEditor from "./MedicalRecordEditor";

const FILTER_CHIPS: { flag: MemberFilterFlag; label: string }[] = [
  { flag: "all", label: "Todos" },
  { flag: "vencida", label: "Membresía vencida" },
  { flag: "pendiente", label: "Pago pendiente" },
  { flag: "sin-grupo", label: "Sin grupo asignado" },
];

// ---------------------------------------------------------------------------
// Payment status icon helper
// ---------------------------------------------------------------------------

interface PaymentStatusIconProps {
  estado: PaymentStatus;
}

function PaymentStatusIcon({ estado }: PaymentStatusIconProps): React.ReactElement | null {
  switch (estado) {
    case "aprobado":
      return <CheckCircle2 size={12} strokeWidth={2} aria-hidden="true" />;
    case "pendiente_validacion":
      return <Clock size={12} strokeWidth={2} aria-hidden="true" />;
    case "rechazado":
      return <XCircle size={12} strokeWidth={2} aria-hidden="true" />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
}

function StatCard({ icon, label, value }: StatCardProps): React.ReactElement {
  return (
    <div className="card-hover flex items-center gap-3 p-4 sm:p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cata-red/15">
        {icon}
      </div>
      <p className="min-w-0 flex-1 truncate text-xs font-medium uppercase tracking-wider text-cata-text/65">
        {label}
      </p>
      <p className="shrink-0 text-2xl font-bold tracking-tight text-cata-text">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Medical record editor (expanded within a student row)
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// Student edit panel — rendered inside the account's edit modal, one per
// `account.estudiantes` entry. Was previously a `<tr>` shown by expanding
// the account row; the row no longer expands, so all of this content
// (and its editing actions) now lives exclusively in the modal.
// ---------------------------------------------------------------------------

interface StudentRowProps {
  student: MemberStudentSummary;
  grupos: Grupo[];
}


function calculateAge(fechaNacimiento: string | undefined): number | null {
  if (!fechaNacimiento) return null;
  const birth = new Date(fechaNacimiento);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function StudentEditPanel({ student, grupos }: StudentRowProps): React.ReactElement {
  const { showSuccess, showError } = useToast();
  const [showMedical, setShowMedical] = useState(false);
  const [showCreateMembership, setShowCreateMembership] = useState(false);
  const [tiposMembresia, setTiposMembresia] = useState<TipoMembresiaCatalogo[]>([]);
  const [selectedTipoId, setSelectedTipoId] = useState<number | "">("");
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [membershipError, setMembershipError] = useState<string | null>(null);
  const [membershipSuccess, setMembershipSuccess] = useState(false);

  const [showLabels, setShowLabels] = useState(false);
  const [prioridadMunicipal, setPrioridadMunicipal] = useState(student.prioridadMunicipal ?? false);
  const [porcentajeBeca, setPorcentajeBeca] = useState<string>(String(student.porcentajeBeca ?? 0));
  const [motivoBeca, setMotivoBeca] = useState(student.motivoBeca ?? "");
  const [labelsSaving, setLabelsSaving] = useState(false);
  const [labelsError, setLabelsError] = useState<string | null>(null);
  const [labelsSuccess, setLabelsSuccess] = useState(false);

  // --- Payment registration state — shown when the student already has a
  //     membership (initial payment or renewal). The backend requires a
  //     valid `membresia_id` so this only renders when `student.membresia`
  //     is non-null (we surface its `id` now — see members-adapter.ts). ---
  const [showCreatePayment, setShowCreatePayment] = useState(false);
  const [paymentMonto, setPaymentMonto] = useState<string>("");
  const [paymentTipo, setPaymentTipo] = useState<"EFECTIVO" | "TRANSFERENCIA">("TRANSFERENCIA");
  const [paymentFechaInicio, setPaymentFechaInicio] = useState<string>("");
  const [paymentFechaFin, setPaymentFechaFin] = useState<string>("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentVoucherFile, setPaymentVoucherFile] = useState<File | null>(null);

  /** Monthly price from the current membership — used to auto-calc fechaFin. */
  const paymentMonthlyPrice = student.membresia?.monto ?? 0;
  const paymentFileInputRef = useRef<HTMLInputElement>(null);

  const membershipLabel = student.membresia
    ? MEMBERSHIP_STATUS_LABELS[student.membresia.estado]
    : "Sin membresía";
  const membershipBadge = student.membresia
    ? MEMBERSHIP_STATUS_BADGE[student.membresia.estado]
    : "badge-neutral";

  const paymentLabel = student.ultimoPago
    ? PAYMENT_STATUS_LABELS[student.ultimoPago.estado]
    : "Sin pagos";
  const paymentBadge = student.ultimoPago
    ? PAYMENT_STATUS_BADGE[student.ultimoPago.estado]
    : "badge-neutral";

  const nivelDisplay = getNivelLabelFromGrupo(student.grupoId, grupos);
  const personaId = Number(student.id);
  const age = calculateAge(student.fechaNacimiento);

  async function handleOpenCreateMembership(): Promise<void> {
    setShowCreateMembership(true);
    setMembershipError(null);
    setMembershipSuccess(false);
    if (tiposMembresia.length === 0) {
      try {
        const tipos = await fetchTiposMembresia();
        setTiposMembresia(tipos);
      } catch {
        setMembershipError("No se pudieron cargar los tipos de membresía.");
      }
    }
  }

  async function handleCreateMembership(): Promise<void> {
    if (!selectedTipoId || !personaId) return;
    const tipo = tiposMembresia.find((t) => t.id === selectedTipoId);
    if (!tipo) return;

    setMembershipLoading(true);
    setMembershipError(null);
    try {
      await crearMembresia({
        personaId,
        tipoMembresiaId: selectedTipoId,
        montoAplicado: Number(tipo.precio),
      });
      setMembershipSuccess(true);
      setShowCreateMembership(false);
      showSuccess("Membresía creada correctamente.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al crear la membresía.";
      setMembershipError(message);
      showError(message);
    } finally {
      setMembershipLoading(false);
    }
  }

  async function handleSaveLabels(): Promise<void> {
    setLabelsSaving(true);
    setLabelsError(null);
    setLabelsSuccess(false);
    try {
      const beca = Number(porcentajeBeca);
      await actualizarPersona(personaId, {
        prioridadMunicipal,
        porcentajeBeca: Number.isFinite(beca) && beca >= 0 && beca <= 100 ? beca : 0,
        motivoBeca: motivoBeca.trim() || undefined,
      });
      setLabelsSuccess(true);
    } catch (err) {
      setLabelsError(err instanceof Error ? err.message : "No se pudieron guardar las etiquetas.");
    } finally {
      setLabelsSaving(false);
    }
  }

  /**
   * Open the inline "register payment" form. Pre-fills sensible defaults:
   * monto from current membership, fechaInicio = today (or the day after
   * the previous period's fechaFin for renewals), fechaFin auto-calculated
   * from monto / monthlyPrice. The admin can override dates before submitting.
   */
  function handleOpenCreatePayment(): void {
    setShowCreatePayment(true);
    setPaymentError(null);
    setPaymentSuccess(false);
    setPaymentVoucherFile(null);
    setPaymentTipo("TRANSFERENCIA");
    const monto = student.membresia?.monto ?? 0;
    setPaymentMonto(monto > 0 ? String(monto) : "");

    const hoy = new Date();
    const inicio = student.membresia?.fechaFin
      ? new Date(student.membresia.fechaFin + "T12:00:00")
      : hoy;
    const base = inicio.getTime() > hoy.getTime() ? inicio : hoy;
    setPaymentFechaInicio(base.toISOString().slice(0, 10));

    if (monto > 0 && paymentMonthlyPrice > 0) {
      const months = Math.ceil(monto / paymentMonthlyPrice);
      const fin = new Date(base);
      fin.setMonth(fin.getMonth() + months);
      setPaymentFechaFin(fin.toISOString().slice(0, 10));
    } else {
      const fin = new Date(base);
      fin.setMonth(fin.getMonth() + 1);
      setPaymentFechaFin(fin.toISOString().slice(0, 10));
    }
  }

  /** Recalculate paymentFechaFin when paymentMonto changes. */
  function handlePaymentMontoChange(value: string): void {
    setPaymentMonto(value);
    if (!paymentFechaInicio || paymentMonthlyPrice <= 0) return;
    const amount = parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
    if (amount > 0) {
      const months = Math.ceil(amount / paymentMonthlyPrice);
      const fin = new Date(paymentFechaInicio + "T12:00:00");
      fin.setMonth(fin.getMonth() + months);
      setPaymentFechaFin(fin.toISOString().slice(0, 10));
    }
  }

  async function handleCreatePayment(): Promise<void> {
    if (!student.membresia || !personaId) return;
    const monto = Number(paymentMonto);
    if (!monto || monto <= 0) {
      setPaymentError("El monto debe ser mayor a 0.");
      return;
    }
    if (!paymentFechaInicio || !paymentFechaFin) {
      setPaymentError("Las fechas de inicio y fin son obligatorias.");
      return;
    }
    if (paymentFechaInicio >= paymentFechaFin) {
      setPaymentError("La fecha de inicio debe ser anterior a la fecha de fin.");
      return;
    }

    setPaymentLoading(true);
    setPaymentError(null);
    try {
      const nuevoPago = await registrarPago({
        monto,
        tipoPago: paymentTipo,
        fechaInicio: paymentFechaInicio,
        fechaFin: paymentFechaFin,
        personaId,
        membresiaId: student.membresia.id,
      });

      if (paymentVoucherFile && nuevoPago?.id) {
        await subirVoucherPago(nuevoPago.id, paymentVoucherFile);
      }

      setPaymentSuccess(true);
      setShowCreatePayment(false);
      setPaymentVoucherFile(null);
      showSuccess("Pago registrado. Quedó pendiente de validación.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al registrar el pago.";
      setPaymentError(message);
      showError(message);
    } finally {
      setPaymentLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-cata-border bg-white p-4">
      {/* Identity */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cata-bg text-sm font-bold text-cata-text/70">
            {getUserInitials(`${student.nombres} ${student.apellidos}`)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-cata-text">
              {student.nombres} {student.apellidos}
            </p>
            {age !== null && <p className="text-xs text-cata-text/55">{age} años</p>}
          </div>
        </div>
        {(student.prioridadMunicipal || (student.porcentajeBeca ?? 0) > 0) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {student.prioridadMunicipal && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                Prioridad municipal
              </span>
            )}
            {(student.porcentajeBeca ?? 0) > 0 && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700"
                title={student.motivoBeca || undefined}
              >
                Beca {student.porcentajeBeca ?? 0}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* Ficha — full-width row (card is now the modal's full content width,
          not squeezed into a half-width grid column), four stats side by
          side on larger screens instead of a cramped two-up layout. */}
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-cata-border pt-3 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-cata-text/50">Estado</dt>
          <dd className="mt-1">
            <span className={student.activo ? "badge-success" : "badge-error"}>
              {student.activo ? "Activo" : "Inactivo"}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-cata-text/50">Grupo</dt>
          <dd className="mt-1 font-medium text-cata-text">
            {nivelDisplay ?? "Sin grupo asignado"}
          </dd>
        </div>
        <div>
          <dt className="text-cata-text/50">Membresía</dt>
          <dd className="mt-1">
            {student.membresia ? (
              <span className={membershipBadge}>{membershipLabel}</span>
            ) : (
              <span className="text-cata-text/40">Sin membresía</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-cata-text/50">Último pago</dt>
          <dd className="mt-1">
            {student.ultimoPago ? (
              <span className={paymentBadge}>
                <PaymentStatusIcon estado={student.ultimoPago.estado} />
                {paymentLabel}
              </span>
            ) : (
              <span className="text-cata-text/40">No registrado</span>
            )}
          </dd>
        </div>
      </dl>

      {student.membresia && (
        <p className="mt-1.5 text-[11px] text-cata-text/55">
          {student.membresia.tipo} &middot;{" "}
          {formatMembershipPeriod(student.membresia.fechaInicio, student.membresia.fechaFin)}
          {" "}&middot; {formatCurrency(student.membresia.monto)}
        </p>
      )}
      {student.ultimoPago && (
        <p className="mt-0.5 text-[11px] text-cata-text/55">
          {formatCurrency(student.ultimoPago.monto)} &middot; {student.ultimoPago.periodo}
        </p>
      )}

      {!student.membresia &&
        (membershipSuccess ? (
          <p className="mt-2 flex items-center gap-1 text-xs text-cata-state-ok">
            <CheckCircle2 size={11} strokeWidth={2} aria-hidden="true" />
            Membresía creada. Recarga para verla.
          </p>
        ) : showCreateMembership ? (
          <div className="mt-2.5 space-y-2 rounded-lg bg-cata-bg/60 p-2.5">
            <select
              value={selectedTipoId}
              onChange={(e) => setSelectedTipoId(e.target.value ? Number(e.target.value) : "")}
              className="w-full rounded-lg border border-cata-border bg-cata-surface px-2.5 py-1.5 text-xs text-cata-text"
            >
              <option value="">Seleccionar tipo...</option>
              {tiposMembresia.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.categoria} — ${tipo.precio} ({tipo.modalidad})
                </option>
              ))}
            </select>
            {membershipError && <p className="text-xs text-cata-red">{membershipError}</p>}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleCreateMembership()}
                disabled={!selectedTipoId || membershipLoading}
                className="inline-flex items-center gap-1 rounded-lg bg-cata-red px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-cata-red/80 disabled:opacity-50"
              >
                {membershipLoading ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Plus size={11} />
                )}
                Crear
              </button>
              <button
                type="button"
                onClick={() => setShowCreateMembership(false)}
                className="rounded-lg border border-cata-border px-2.5 py-1 text-xs text-cata-text/65 transition-colors hover:bg-cata-surface"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => handleOpenCreateMembership()}
            className="mt-2.5 inline-flex items-center gap-1 rounded-lg bg-cata-red/15 px-2.5 py-1 text-xs font-medium text-cata-red transition-colors hover:bg-cata-red/25"
          >
            <Plus size={11} strokeWidth={2} aria-hidden="true" />
            Crear membresía
          </button>
        ))}

      {/* Register payment (only when the student already has a membership):
          initial payment (Membresia INACTIVA) or a renewal (VENCIDA, or
          APROBADO whose fecha_fin already passed). The backend endpoint
          POST /membresias/pagos creates the Pago in PENDIENTE_VALIDACION,
          after which the student can upload their transfer voucher. */}
      {student.membresia &&
        (paymentSuccess ? (
          <p className="mt-2 flex items-center gap-1 text-xs text-cata-state-ok">
            <CheckCircle2 size={11} strokeWidth={2} aria-hidden="true" />
            Pago registrado. Quedó pendiente de validación.
          </p>
        ) : showCreatePayment ? (
          <div className="mt-2.5 space-y-2 rounded-lg bg-cata-bg/60 p-2.5">
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] font-medium text-cata-text/65">
                Monto
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentMonto}
                  onChange={(e) => handlePaymentMontoChange(e.target.value)}
                  className="mt-0.5 w-full rounded-lg border border-cata-border bg-cata-surface px-2.5 py-1.5 text-xs text-cata-text"
                  placeholder="0.00"
                />
              </label>
              <label className="text-[11px] font-medium text-cata-text/65">
                Método
                <select
                  value={paymentTipo}
                  onChange={(e) => {
                    const val = e.target.value as "EFECTIVO" | "TRANSFERENCIA";
                    setPaymentTipo(val);
                    if (val !== "TRANSFERENCIA") setPaymentVoucherFile(null);
                  }}
                  className="mt-0.5 w-full rounded-lg border border-cata-border bg-cata-surface px-2.5 py-1.5 text-xs text-cata-text"
                >
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="EFECTIVO">Efectivo</option>
                </select>
              </label>
              <label className="text-[11px] font-medium text-cata-text/65">
                Inicio
                <input
                  type="date"
                  value={paymentFechaInicio}
                  onChange={(e) => setPaymentFechaInicio(e.target.value)}
                  className="mt-0.5 w-full rounded-lg border border-cata-border bg-cata-surface px-2.5 py-1.5 text-xs text-cata-text"
                />
              </label>
              <label className="text-[11px] font-medium text-cata-text/65">
                Fin
                <input
                  type="date"
                  value={paymentFechaFin}
                  onChange={(e) => setPaymentFechaFin(e.target.value)}
                  className="mt-0.5 w-full rounded-lg border border-cata-border bg-cata-surface px-2.5 py-1.5 text-xs text-cata-text"
                />
              </label>
            </div>
            {paymentMonthlyPrice > 0 && Number(paymentMonto) > 0 && (
              <p className="text-[10px] text-cata-text/45">
                {(() => {
                  const months = Math.ceil(Number(paymentMonto) / paymentMonthlyPrice);
                  return `${months === 1 ? "1 mes" : `${months} meses`} de vigencia (precio mensual: $${paymentMonthlyPrice})`;
                })()}
              </p>
            )}
            {paymentTipo === "TRANSFERENCIA" && (
              <label className="block text-[11px] font-medium text-cata-text/65">
                Comprobante de pago
                <div className="mt-0.5 flex items-center gap-2">
                  <input
                    ref={paymentFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    onChange={(e) => setPaymentVoucherFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => paymentFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-lg border border-dashed border-cata-border bg-cata-surface px-2.5 py-1.5 text-xs text-cata-text/65 transition-colors hover:border-cata-red/30 hover:text-cata-text"
                  >
                    <Upload size={11} strokeWidth={1.5} aria-hidden="true" />
                    {paymentVoucherFile ? paymentVoucherFile.name : "Seleccionar archivo"}
                  </button>
                  {paymentVoucherFile && (
                    <button
                      type="button"
                      onClick={() => setPaymentVoucherFile(null)}
                      className="text-[10px] text-cata-text/45 hover:text-cata-red"
                    >
                      Quitar
                    </button>
                  )}
                </div>
                <span className="mt-0.5 block text-[10px] text-cata-text/40">PDF, JPG o PNG</span>
              </label>
            )}
            {paymentError && <p className="text-xs text-cata-red">{paymentError}</p>}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => void handleCreatePayment()}
                disabled={paymentLoading || !paymentMonto || !paymentFechaInicio || !paymentFechaFin}
                className="inline-flex items-center gap-1 rounded-lg bg-cata-red px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-cata-red/80 disabled:opacity-50"
              >
                {paymentLoading ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <CreditCard size={11} strokeWidth={1.5} />
                )}
                Registrar pago
              </button>
              <button
                type="button"
                onClick={() => { setShowCreatePayment(false); setPaymentVoucherFile(null); }}
                className="rounded-lg border border-cata-border px-2.5 py-1 text-xs text-cata-text/65 transition-colors hover:bg-cata-surface"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleOpenCreatePayment}
            className="mt-2.5 inline-flex items-center gap-1 rounded-lg bg-cata-red/15 px-2.5 py-1 text-xs font-medium text-cata-red transition-colors hover:bg-cata-red/25"
          >
            <CreditCard size={11} strokeWidth={1.5} aria-hidden="true" />
            Registrar pago
          </button>
        ))}

      {/* Actions */}
      <div className="mt-3 flex flex-wrap gap-2 border-t border-cata-border pt-3">
        <button
          type="button"
          onClick={() => setShowLabels((v) => !v)}
          className="inline-flex items-center gap-1 rounded-lg bg-cata-red/15 px-2.5 py-1 text-[11px] font-medium text-cata-red transition-colors hover:bg-cata-red/25"
        >
          <Pencil size={11} strokeWidth={1.5} aria-hidden="true" />
          Etiquetas
        </button>
        <button
          type="button"
          onClick={() => setShowMedical((v) => !v)}
          className="inline-flex items-center gap-1 rounded-lg bg-cata-red/15 px-2.5 py-1 text-[11px] font-medium text-cata-red transition-colors hover:bg-cata-red/25"
        >
          <Stethoscope size={11} strokeWidth={1.5} aria-hidden="true" />
          Ficha médica
        </button>
      </div>

      {showLabels && (
        <div className="mt-2.5 space-y-2 rounded-lg bg-cata-bg/60 p-2.5">
          <label className="flex items-center gap-2 text-xs text-cata-text">
            <input
              type="checkbox"
              checked={prioridadMunicipal}
              onChange={(e) => setPrioridadMunicipal(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-cata-border text-cata-red focus:ring-cata-red"
            />
            Prioridad municipal
          </label>
          <label className="block text-[11px] font-medium text-cata-text/65">
            Porcentaje de beca (%)
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={porcentajeBeca}
              onChange={(e) => setPorcentajeBeca(e.target.value)}
              className="mt-0.5 w-full rounded-lg border border-cata-border bg-cata-surface px-2.5 py-1.5 text-xs text-cata-text"
            />
          </label>
          <label className="block text-[11px] font-medium text-cata-text/65">
            Motivo de beca
            <input
              type="text"
              value={motivoBeca}
              onChange={(e) => setMotivoBeca(e.target.value)}
              className="mt-0.5 w-full rounded-lg border border-cata-border bg-cata-surface px-2.5 py-1.5 text-xs text-cata-text"
              placeholder="Opcional"
            />
          </label>
          {labelsError && <p className="text-xs text-cata-red">{labelsError}</p>}
          {labelsSuccess && (
            <p className="text-xs text-cata-state-ok">Etiquetas guardadas.</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => void handleSaveLabels()}
              disabled={labelsSaving}
              className="inline-flex items-center gap-1 rounded-lg bg-cata-red px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-cata-red/80 disabled:opacity-50"
            >
              {labelsSaving ? "Guardando..." : "Guardar etiquetas"}
            </button>
            <button
              type="button"
              onClick={() => setShowLabels(false)}
              className="rounded-lg border border-cata-border px-2.5 py-1 text-xs text-cata-text/65 transition-colors hover:bg-cata-surface"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {showMedical && <MedicalRecordEditor personaId={personaId} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Account row — all editing (roles, estado, per-student etiquetas/ficha
// médica/membresía) happens in the edit modal; the row itself never expands.
// ---------------------------------------------------------------------------

interface AccountRowProps {
  account: MemberAccount;
  grupos: Grupo[];
  editModalOpen: boolean;
  onToggleEditModal: () => void;
}

const ALL_BACKEND_ROLES: BackendTipoRol[] = ["ADMINISTRADOR", "ENTRENADOR", "REPRESENTANTE", "ALUMNO"];

const ROLE_LABELS: Record<BackendTipoRol, string> = {
  ADMINISTRADOR: "Admin",
  ENTRENADOR: "Entrenador",
  REPRESENTANTE: "Representante",
  ALUMNO: "Alumno",
};

const ROLE_ICONS: Record<BackendTipoRol, typeof ShieldCheck> = {
  ADMINISTRADOR: ShieldCheck,
  ENTRENADOR: GraduationCap,
  REPRESENTANTE: Building2,
  ALUMNO: User,
};

function AccountRow({
  account,
  grupos,
  editModalOpen,
  onToggleEditModal,
}: AccountRowProps): React.ReactElement {
  const { showSuccess, showError } = useToast();
  const [roles, setRoles] = useState<BackendTipoRol[]>([]);
  const [activo, setActivo] = useState(true);
  const [roleLoading, setRoleLoading] = useState<BackendTipoRol | null>(null);
  const [stateLoading, setStateLoading] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [stateError, setStateError] = useState<string | null>(null);
  const statusBadge = getAccountStatusBadge(account);
  const personaId = Number(account.id);

  async function toggleRole(role: BackendTipoRol): Promise<void> {
    setRoleLoading(role);
    setRoleError(null);
    const hasRole = roles.includes(role);

    try {
      if (hasRole) {
        await quitarRol(personaId, role);
        setRoles((prev) => prev.filter((r) => r !== role));
        showSuccess(`Rol ${ROLE_LABELS[role]} quitado correctamente.`);
      } else {
        await asignarRol(personaId, role);
        setRoles((prev) => [...prev, role]);
        showSuccess(`Rol ${ROLE_LABELS[role]} asignado correctamente.`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar el rol.";
      // If the backend says the role is already present/absent, reconcile local state.
      if (message.toLowerCase().includes("ya tiene el rol")) {
        setRoles((prev) => (prev.includes(role) ? prev : [...prev, role]));
      } else if (message.toLowerCase().includes("no tiene el rol")) {
        setRoles((prev) => prev.filter((r) => r !== role));
      } else {
        setRoleError(message);
        showError(message);
      }
    } finally {
      setRoleLoading(null);
    }
  }

  async function toggleEstado(): Promise<void> {
    setStateLoading(true);
    setStateError(null);
    const next = !activo;

    try {
      await cambiarEstadoCuenta(personaId, next);
      setActivo(next);
      showSuccess(next ? "Cuenta activada correctamente." : "Cuenta desactivada correctamente.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo cambiar el estado.";
      setStateError(message);
      showError(message);
    } finally {
      setStateLoading(false);
    }
  }

  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  // Two "Editar" triggers exist per row — a desktop one (in the sm-only
  // contact/status column) and a mobile one (next to the status badge in
  // the always-visible name column), since the desktop column is entirely
  // CSS-hidden below `sm` and mobile would otherwise have no way to open
  // the modal at all. Neither needs its own ref: focus-restoration below
  // captures whichever element was actually focused (i.e. whichever
  // trigger the user actually clicked) right before the dialog opens.

  // Native <dialog> shown via showModal(): the browser traps Tab focus and
  // renders the ::backdrop for us, so no manual focus trap is needed (unlike
  // ConfirmDialog.tsx's older role="dialog" div convention). Escape is still
  // wired manually (rather than relying solely on the dialog's native
  // "cancel" event) so open/closed stays driven by `editModalOpen` alone —
  // the dialog is conditionally rendered, not toggled via its `open`
  // attribute, so the JSX onCancel handler only preventDefaults the native
  // auto-close to avoid it and this listener double-toggling React state.
  // The backdrop-click listener is attached imperatively (not as a JSX
  // onClick on the <dialog>) since the element itself is non-interactive.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!editModalOpen || !dialog) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    setRoleError(null);
    setStateError(null);
    if (!dialog.open) dialog.showModal();
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") onToggleEditModal();
    }
    function handleBackdropClick(event: MouseEvent): void {
      if (event.target === dialog) onToggleEditModal();
    }

    document.addEventListener("keydown", handleKeyDown);
    dialog.addEventListener("click", handleBackdropClick);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      dialog.removeEventListener("click", handleBackdropClick);
      previouslyFocused?.focus();
    };
  }, [editModalOpen, onToggleEditModal]);

  return (
    <>
      <tr className="transition-colors hover:bg-cata-bg">
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cata-red/15">
              {account.role === "representante" ? (
                <Building2 size={14} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
              ) : (
                <GraduationCap size={14} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
              )}
            </div>
            <div>
              <p className="font-medium text-cata-text">
                {account.nombres} {account.apellidos}
              </p>
              <p className="text-xs text-cata-text/65">
                {getPayerTypeLabel(account.role)}
              </p>
              <div className="mt-1 flex items-center gap-2 sm:hidden">
                <span className={statusBadge.className}>{statusBadge.label}</span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.currentTarget.focus();
                    onToggleEditModal();
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-cata-border p-1.5 text-cata-text/50 transition-colors hover:bg-cata-red/10 hover:text-cata-red"
                  aria-label="Editar"
                  title="Editar miembro"
                >
                  <Pencil size={13} strokeWidth={1.5} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </td>
        <td className="hidden px-4 py-3.5 text-xs text-cata-text/65 sm:table-cell">
          {account.email && (
            <div className="flex items-center gap-1.5">
              <Mail size={11} strokeWidth={1.5} aria-hidden="true" />
              {account.email}
            </div>
          )}
          <div className="mt-0.5 flex items-center gap-1.5">
            <Phone size={11} strokeWidth={1.5} aria-hidden="true" />
            {account.telefono}
          </div>
        </td>
        <td className="hidden px-4 py-3.5 text-center sm:table-cell">
          <span className="text-sm font-medium text-cata-text">
            {account.estudiantes.length}
          </span>
        </td>
        <td className="hidden px-4 py-3.5 sm:table-cell">
          <span className={`badge ${statusBadge.className}`}>
            {statusBadge.label}
          </span>
        </td>
        <td className="hidden px-4 py-3.5 text-right sm:table-cell">
          <button
            type="button"
            onClick={(event) => {
              event.currentTarget.focus();
              onToggleEditModal();
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-cata-border p-1.5 text-cata-text/50 transition-colors hover:bg-cata-red/10 hover:text-cata-red"
            aria-label="Editar"
            title="Editar miembro"
          >
            <Pencil size={13} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </td>
      </tr>
      {editModalOpen &&
        createPortal(
          <dialog
            ref={dialogRef}
            aria-modal="true"
            aria-labelledby={`edit-member-title-${account.id}`}
            onCancel={(event) => event.preventDefault()}
            className="fixed inset-0 z-50 m-auto flex h-fit max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-cata-border bg-white p-0 shadow-elevated backdrop:bg-cata-black/40"
          >
            {/* Header — avatar, name, phone, status badge, close */}
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-cata-border px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cata-red/15 text-sm font-bold text-cata-red">
                  {getUserInitials(`${account.nombres} ${account.apellidos}`)}
                </div>
                <div className="min-w-0">
                  <h2
                    id={`edit-member-title-${account.id}`}
                    className="truncate text-lg font-bold leading-tight text-cata-text"
                  >
                    {account.nombres} {account.apellidos}
                  </h2>
                  <p className="text-sm text-cata-text/65">{account.telefono}</p>
                  <p className="mt-0.5 text-xs text-cata-text/50">{getPayerTypeLabel(account.role)}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={activo ? "badge-success" : "badge-error"}>
                  {activo ? "Activo" : "Inactivo"}
                </span>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={onToggleEditModal}
                  aria-label="Cerrar"
                  className="rounded-lg p-1.5 text-cata-text/50 transition-colors hover:bg-cata-bg hover:text-cata-text"
                >
                  <X size={16} strokeWidth={1.5} aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Información general */}
                <section className="rounded-xl border border-cata-border bg-cata-bg/50 p-4">
                  <h3 className="mb-3 text-sm font-bold text-cata-text">Información general</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-cata-text/55">Nombre</dt>
                      <dd className="truncate text-right font-medium text-cata-text">
                        {account.nombres} {account.apellidos}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-cata-text/55">Teléfono</dt>
                      <dd className="flex items-center gap-1.5 font-medium text-cata-text">
                        <Phone size={11} strokeWidth={1.5} aria-hidden="true" />
                        {account.telefono}
                      </dd>
                    </div>
                    {/* Email deliberately read-only, no editable input: see the
                        gap noted below the dl — no admin endpoint mutates it. */}
                    {account.email && (
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-cata-text/55">Correo</dt>
                        <dd className="flex min-w-0 items-center gap-1.5 truncate font-medium text-cata-text">
                          <Mail size={11} strokeWidth={1.5} aria-hidden="true" />
                          <span className="truncate">{account.email}</span>
                        </dd>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-cata-text/55">Estado</dt>
                      <dd>
                        <button
                          type="button"
                          onClick={() => void toggleEstado()}
                          disabled={stateLoading}
                          className={`${activo ? "badge-success" : "badge-error"} cursor-pointer disabled:opacity-50`}
                          aria-pressed={activo}
                        >
                          {stateLoading ? (
                            <Loader2 size={11} className="animate-spin" aria-hidden="true" />
                          ) : activo ? (
                            <ToggleRight size={12} aria-hidden="true" />
                          ) : (
                            <ToggleLeft size={12} aria-hidden="true" />
                          )}
                          {stateLoading ? "Actualizando..." : activo ? "Activa" : "Inactiva"}
                        </button>
                      </dd>
                    </div>
                  </dl>
                  {stateError && (
                    <p className="mt-2 text-xs text-cata-red" role="alert">
                      {stateError}
                    </p>
                  )}
                </section>

                {/* Roles — settings-style switches, two columns, one icon each */}
                <section className="rounded-xl border border-cata-border bg-cata-bg/50 p-4">
                  <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-cata-text">
                    <ShieldCheck size={14} strokeWidth={1.5} className="text-cata-text/50" aria-hidden="true" />
                    Roles
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_BACKEND_ROLES.map((role) => {
                      const selected = roles.includes(role);
                      const isLoading = roleLoading === role;
                      const RoleIcon = ROLE_ICONS[role];
                      return (
                        <label
                          key={role}
                          className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors ${
                            selected
                              ? "border-cata-red/30 bg-cata-red/5 text-cata-red"
                              : "border-cata-border bg-white text-cata-text hover:bg-cata-bg"
                          }`}
                        >
                          <RoleIcon size={14} strokeWidth={1.5} className="shrink-0" aria-hidden="true" />
                          <span className="flex-1 truncate">{ROLE_LABELS[role]}</span>
                          {isLoading && (
                            <Loader2 size={12} className="shrink-0 animate-spin" aria-hidden="true" />
                          )}
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => void toggleRole(role)}
                            disabled={roleLoading !== null}
                            className="sr-only"
                          />
                          <span
                            aria-hidden="true"
                            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                              selected ? "bg-cata-red" : "bg-cata-border"
                            }`}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                                selected ? "translate-x-5" : "translate-x-1"
                              }`}
                            />
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {roleError && (
                    <p className="mt-2 text-xs text-cata-red" role="alert">
                      {roleError}
                    </p>
                  )}
                </section>
              </div>

              {account.estudiantes.length > 0 && (
                <section>
                  <h3 className="mb-3 text-sm font-bold text-cata-text">Estudiantes a cargo</h3>
                  <div className="space-y-3">
                    {account.estudiantes.map((estudiante) => (
                      <StudentEditPanel key={estudiante.id} student={estudiante} grupos={grupos} />
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Footer — everything above already saves per-action (roles,
                estado, etiquetas, ficha médica each call their own endpoint
                immediately); these two just dismiss the modal, matching the
                existing close behavior (X / Escape / backdrop). */}
            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-cata-border px-5 py-3.5">
              <button type="button" onClick={onToggleEditModal} className="btn-ghost text-sm">
                Cancelar
              </button>
              <button type="button" onClick={onToggleEditModal} className="btn-primary text-sm">
                Guardar cambios
              </button>
            </div>
          </dialog>,
          document.body,
        )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function MembersPage(): React.ReactElement {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFlag, setActiveFlag] = useState<MemberFilterFlag>("all");
  const [accounts, setAccounts] = useState<MemberAccount[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [personasCapped, setPersonasCapped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const toggleEditModal = useCallback((accountId: string) => {
    setEditingAccountId((prev) => (prev === accountId ? null : accountId));
  }, []);

  const loadMembers = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    setPersonasCapped(false);
    try {
      const { accounts: membersData, niveles, personasCapped: upstreamPersonasCapped } = await fetchMembers();
      setAccounts(membersData);
      setGrupos(niveles.map(nivelToGrupo));
      setPersonasCapped(upstreamPersonasCapped);
    } catch {
      setError("No se pudieron cargar los miembros. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  // Reset to page 1 whenever the search term or filter chip changes, so the
  // paginator never gets stuck on a stale/out-of-range page.
  useEffect(() => {
    setPage(1);
  }, [searchTerm, activeFlag]);

  const stats = buildMemberStats(accounts);
  const filteredAccounts = filterAccounts(accounts, searchTerm).filter((account) =>
    accountMatchesFlag(account, activeFlag),
  );
  const aggregateIsCapped = personasCapped;

  const totalPages = useMemo(() => getTotalPages(filteredAccounts.length), [filteredAccounts]);
  const paginatedAccounts = useMemo(
    () => paginateAccounts(filteredAccounts, page),
    [filteredAccounts, page],
  );

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AppShell
        eyebrow="Gestión de Miembros"
        title="Miembros del Club"
      >
        <BackLink href="/dashboard" label="Volver al Panel" />

        {error && (
          <div
            className="mb-6 flex items-center gap-2 rounded-xl border border-cata-red/30 bg-cata-red/10 px-4 py-3 text-sm text-cata-red"
            role="alert"
          >
            <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" />
            {error}
            <button type="button" onClick={() => void loadMembers()} className="btn-ghost ml-auto text-xs">
              Reintentar
            </button>
          </div>
        )}

        {/* Stats grid */}
        <div className="mb-6 flex items-center gap-2">
          <ShieldCheck size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
          <h2 className="text-lg font-bold text-cata-text">Resumen</h2>
        </div>
        <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            icon={<Users size={20} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />}
            label="Cuentas"
            value={stats.totalAccounts}
          />
          <StatCard
            icon={<UserCheck size={20} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />}
            label="Estudiantes"
            value={stats.totalStudents}
          />
          <StatCard
            icon={<ShieldCheck size={20} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />}
            label="Membresías activas"
            value={stats.activeMemberships}
          />
          <StatCard
            icon={<Clock size={20} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />}
            label="Pagos pendientes"
            value={stats.pendingPayments}
          />
        </div>

        {/* Search + filter chips */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search
              size={14}
              strokeWidth={1.5}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cata-text/65"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o correo..."
              className="input-field pl-9"
              aria-label="Buscar miembros"
            />
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar miembros">
            {FILTER_CHIPS.map((chip) => {
              const isActive = activeFlag === chip.flag;
              const count = countAccountsMatchingFlag(accounts, chip.flag);
              return (
                <button
                  key={chip.flag}
                  type="button"
                  onClick={() => setActiveFlag(chip.flag)}
                  aria-pressed={isActive}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isActive
                      ? "border-cata-red bg-cata-red/10 text-cata-red"
                      : "border-cata-border text-cata-text/65 hover:bg-cata-bg"
                  }`}
                >
                  {chip.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                      isActive ? "bg-cata-red/20" : "bg-cata-bg"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Members table */}
        {!loading && (
          <ContextualHelp title="Ayuda sobre límite de resultados">
            <p>Este listado puede incluir hasta {MEMBERS_AGGREGATE_LIMIT} registros y no confirma que se hayan cargado todos los miembros.</p>
          </ContextualHelp>
        )}
        {loading ? (
          <div className="card flex flex-col items-center py-16 text-center">
            <p className="text-sm text-cata-text/50">Cargando miembros…</p>
          </div>
        ) : filteredAccounts.length > 0 ? (
          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cata-border px-4 py-3 text-xs text-cata-text/65">
              <p role="status" aria-label="Resultados mostrados">
                {filteredAccounts.length} resultados mostrados
              </p>
              {aggregateIsCapped && (
                <p role="alert" className="max-w-md text-cata-red">
                  La fuente devuelve hasta {MEMBERS_AGGREGATE_LIMIT} registros; este listado puede estar incompleto.
                </p>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cata-border bg-cata-bg text-xs font-medium uppercase tracking-wider text-cata-text/65">
                    <th className="px-4 py-3 font-medium">Responsable de pago</th>
                    <th className="hidden px-4 py-3 font-medium sm:table-cell">Contacto</th>
                    <th className="hidden px-4 py-3 text-center font-medium sm:table-cell">Estudiantes</th>
                    <th className="hidden px-4 py-3 font-medium sm:table-cell">Estado de membresía</th>
                    <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">
                      <span className="sr-only">Editar</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cata-border">
                  {paginatedAccounts.map((account) => (
                    <AccountRow
                      key={account.id}
                      account={account}
                      grupos={grupos}
                      editModalOpen={editingAccountId === account.id}
                      onToggleEditModal={() => toggleEditModal(account.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {!loading && filteredAccounts.length > 0 && totalPages > 1 && (
          <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm font-semibold text-cata-text">
              Página {page} de {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn-secondary px-4 py-2 text-xs"
              >
                <ChevronLeft size={14} strokeWidth={1.5} aria-hidden="true" />
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="btn-secondary px-4 py-2 text-xs"
              >
                Siguiente
                <ChevronRight size={14} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {!loading && filteredAccounts.length === 0 && (
          /* Empty state */
          <div className="card flex flex-col items-center py-16 text-center">
            <Users
              size={32}
              strokeWidth={1.5}
              className="mb-3 text-cata-text/20"
              aria-hidden="true"
            />
            <p className="text-sm text-cata-text/50">
              {searchTerm || activeFlag !== "all"
                ? "No se encontraron miembros con ese criterio de búsqueda."
                : "Aún no hay miembros registrados."}
            </p>
            {(searchTerm || activeFlag !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setActiveFlag("all");
                }}
                className="btn-ghost mt-3 text-xs"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}
