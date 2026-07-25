/**
 * /student/payments — the family-facing payment screen.
 *
 * One of the two things a student or a parent actually opens this portal to do
 * ("hay que hacer pago y ver asistencias"). It arrived from upstream visually
 * unmigrated — raw `cata-*` classes, ISO dates printed straight from the API,
 * `$35.00` amounts, a red "selected" filter chip and Argentine voseo in its
 * copy ("Adjuntá", "tenés", "Consultá") — and this pass puts it on the same
 * system as the rest of the product:
 *
 * - `Badge`, `FilterPill`, `Button`, `EmptyState`, `ErrorState`,
 *   `LoadingState`, and the `card` / `h-ctl` / `h-drow` / `rounded-card`
 *   tokens, instead of eight bespoke pill and card shapes.
 * - `formatCurrency` / `formatDate` / `formatDateRange` from
 *   `src/lib/format-utils.ts` — this screen was the second currency grammar
 *   and the third date grammar in the product.
 * - Neutral Ecuadorian Spanish, usted. The student portal is not tuteo and it
 *   is certainly not voseo.
 * - Selection is coal plus the yellow ball dot (`FilterPill`), never red. Red
 *   is the primary CTA and destructive intent only, so a red "Aprobados" chip
 *   read as an alarm about approved payments.
 *
 * ## Two facts this screen deliberately does NOT show
 *
 * - **"Vigente hasta" from the membership.** `MembershipSummary.fechaFin` is
 *   declared on the client type but `MembershipView` in
 *   src/lib/server/student-adapter.ts never populates it — the field is
 *   `undefined` for every real payload, and the old status bar's "Vigente
 *   hasta: {fechaFin}" therefore rendered nothing at all while its `isExpired`
 *   branch silently never fired. The real, computable coverage date is the
 *   furthest `fechaFin` among APPROVED payments (`resolveCoverageEnd`), which
 *   is what the card shows and what the renewal form starts from.
 * - **An amount due.** There is no debt concept in the backend: a Membresia
 *   carries a `montoAplicado` (the plan's price), not a balance. The card
 *   reports the monthly price it can prove and lets the reader enter what they
 *   are paying.
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/shell/AppShell";
import BackLink from "@/components/BackLink";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchStudentPortal,
  fetchPagosDePersona,
  subirVoucherPago,
  registrarPago,
} from "@/services/api";
import type {
  StudentPortalSummary,
  StudentProfileSummary,
  PagoPersona,
  MembershipSummary,
  RegistrarPagoInput,
} from "@/services/api";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  FilterPill,
  LoadingState,
  buttonClasses,
} from "@/components/ui";
import { formatCurrency, formatDate, formatDateRange } from "@/lib/format-utils";
import { calendarIsoDate, clubToday } from "@/lib/club-date";
import { describeMembershipState, isMinor, resolveCoverageEnd } from "../student-utils";
import ManagedStudentPicker, { useManagedProfiles } from "../ManagedStudentPicker";
import {
  filterPagosByStatus,
  sortPagosByDate,
  formatPagoMonto,
  getEmptyStateMessage,
  describePagoEstado,
  countPagosByStatus,
  wholeMonthsFor,
  addMonthsIso,
  TIPO_PAGO_LABEL,
  PAGO_FILTER_LABELS,
  type PagoStatusFilter,
} from "./payments-utils";
import { CreditCard, Loader2, Paperclip, Plus, Upload, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Load state
// ---------------------------------------------------------------------------

type PortalLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: StudentPortalSummary };

type PagosLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; pagos: PagoPersona[] };

const FILTERS: PagoStatusFilter[] = ["TODOS", "PENDIENTE_VALIDACION", "APROBADO", "RECHAZADO"];

/** Shared empty list, so "not loaded yet" is a stable reference for the memos below. */
const NO_PAGOS: PagoPersona[] = [];

/** `_sistema.css` `.fld` — the one input shape, 40px like every other control. */
const FIELD_CLASSES =
  "h-ctl w-full rounded-ctl border border-line-2 bg-paper px-3.5 text-[13px] text-ink " +
  "placeholder:text-ink-3 focus-visible:outline focus-visible:outline-2 " +
  "focus-visible:outline-offset-2 focus-visible:outline-ball disabled:cursor-not-allowed disabled:opacity-45";

const FIELD_LABEL_CLASSES = "text-[10.5px] font-bold uppercase tracking-[0.13em] text-ink-3";

/** Parse an ISO date at local noon — the same anchoring `format-utils` uses, for the same reason. */
function fromIsoDate(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

// ---------------------------------------------------------------------------
// Membership status — everything the club can actually prove about coverage
// ---------------------------------------------------------------------------

function MembershipCard({
  membership,
  coverageEnd,
  children,
}: {
  membership: MembershipSummary | null;
  coverageEnd: string | null;
  children?: React.ReactNode;
}): React.ReactElement {
  const state = describeMembershipState(membership?.estado);

  const facts: { label: string; value: string }[] = [];
  if (membership?.categoria) facts.push({ label: "Plan", value: membership.categoria });
  if (membership?.montoAplicado) {
    facts.push({ label: "Valor mensual", value: formatCurrency(membership.montoAplicado) });
  }
  if (membership?.franjaHoraria) facts.push({ label: "Franja", value: membership.franjaHoraria });

  return (
    <section
      data-testid="membership-status"
      className="card overflow-hidden"
      aria-labelledby="membership-status-title"
    >
      {/* The badge carries the `estado`; the heading carries the fact the
          reader came for. The badge used to say the same thing as the heading
          in coarser words ("Al día"), which is a second, weaker judgement of
          data that already speaks for itself. */}
      <div className="px-5 py-[18px]">
        <div className="mb-2 flex flex-wrap items-center gap-2.5">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-ink-3">
            Su membresía
          </p>
          <Badge tone={state.tone}>{state.label}</Badge>
        </div>
        <h2 id="membership-status-title" className="text-[17px] font-bold tracking-tight text-ink">
          {coverageEnd ? (
            <>
              Pagado hasta el <span className="tabular-nums">{formatDate(coverageEnd)}</span>
            </>
          ) : (
            "Todavía no hay ningún pago aprobado"
          )}
        </h2>
        <p className="mt-1.5 text-[13px] text-ink-3">
          {coverageEnd
            ? "Es la fecha del pago aprobado que llega más lejos en su historial."
            : "En cuanto el club apruebe un pago, aquí aparecerá hasta qué fecha queda cubierto."}
        </p>
      </div>

      {facts.length > 0 && (
        <dl className="flex flex-wrap gap-x-8 gap-y-3 border-t border-line bg-sunken px-5 py-3.5">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-3-strong">
                {fact.label}
              </dt>
              <dd className="mt-0.5 text-[13.5px] font-bold tabular-nums text-ink">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {children && <div className="border-t border-line px-5 py-4">{children}</div>}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Registering a payment
// ---------------------------------------------------------------------------

function RenewPaymentForm({
  membership,
  personaId,
  coverageEnd,
  hasPendingPago,
  onRegistered,
}: {
  membership: MembershipSummary;
  personaId: string;
  coverageEnd: string | null;
  hasPendingPago: boolean;
  onRegistered: () => void;
}): React.ReactElement {
  const [showForm, setShowForm] = useState(false);
  const [monto, setMonto] = useState<string>(membership.montoAplicado ?? "");
  const [tipoPago, setTipoPago] = useState<"EFECTIVO" | "TRANSFERENCIA">("TRANSFERENCIA");
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const monthlyPrice = Number(membership.montoAplicado ?? "") || 0;
  const amount = Number(monto) || 0;
  const months = wholeMonthsFor(amount, monthlyPrice);

  /**
   * Coverage resumes where the paid period ends, not today — otherwise a family
   * paying early loses the days they already paid for. `coverageEnd` is the
   * furthest approved `fechaFin`; `membership.fechaFin`, which the old form
   * read, never reaches this client.
   */
  const fechaFin = useMemo(
    () => (fechaInicio && months !== null ? addMonthsIso(fechaInicio, months) : ""),
    [fechaInicio, months],
  );

  function handleOpen(): void {
    setShowForm(true);
    setError(null);
    setVoucherFile(null);
    // Both sides must be CALENDAR dates before they are compared: mixing an
    // instant with a noon-anchored date made the comparison depend on the
    // hour of day.
    const today = clubToday();
    const paidThrough = coverageEnd ? fromIsoDate(coverageEnd) : null;
    setFechaInicio(
      calendarIsoDate(paidThrough && paidThrough.getTime() > today.getTime() ? paidThrough : today),
    );
  }

  function handleCancel(): void {
    setShowForm(false);
    setVoucherFile(null);
    setError(null);
  }

  async function handleSubmit(): Promise<void> {
    if (amount <= 0) {
      setError("Ingrese un monto mayor a 0.");
      return;
    }
    if (monthlyPrice > 0 && months === null) {
      setError(
        `El monto debe ser un múltiplo del valor mensual (${formatCurrency(monthlyPrice)}): pague uno o más meses completos.`,
      );
      return;
    }
    if (!fechaInicio || !fechaFin) {
      setError("No se pudo calcular el período que cubre este pago.");
      return;
    }
    if (tipoPago === "TRANSFERENCIA" && !voucherFile) {
      setError("Adjunte el comprobante de la transferencia para que el club pueda validarla.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nuevoPago = await registrarPago({
        monto: amount,
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
      onRegistered();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el pago.");
    } finally {
      setLoading(false);
    }
  }

  if (hasPendingPago) {
    return (
      <p className="text-[13px] text-ink-2">
        Ya tiene un pago esperando validación. Espere a que el club lo apruebe para registrar otro.
      </p>
    );
  }

  if (!showForm) {
    return (
      <Button variant="primary" onClick={handleOpen}>
        <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
        Registrar un pago
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL_CLASSES}>Monto</span>
          <input
            type="number"
            step={monthlyPrice > 0 ? monthlyPrice : "0.01"}
            min="0"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className={FIELD_CLASSES}
            placeholder="0,00"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL_CLASSES}>Forma de pago</span>
          <select
            value={tipoPago}
            onChange={(e) => {
              const value = e.target.value as "EFECTIVO" | "TRANSFERENCIA";
              setTipoPago(value);
              if (value !== "TRANSFERENCIA") setVoucherFile(null);
            }}
            className={FIELD_CLASSES}
          >
            <option value="TRANSFERENCIA">Transferencia</option>
            <option value="EFECTIVO">Efectivo</option>
          </select>
        </label>
      </div>

      {/* The consequence of the amount, stated before the reader commits to it. */}
      <div className="rounded-ctl bg-sunken px-3.5 py-3">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-ink-3-strong">
          Período que cubre
        </p>
        <p className="mt-1 text-[13.5px] font-bold tabular-nums text-ink">
          {fechaInicio && fechaFin ? formatDateRange(fechaInicio, fechaFin) : "—"}
        </p>
        {months !== null && (
          <p className="mt-0.5 text-[12.5px] text-ink-3-strong">
            {months === 1 ? "1 mes" : `${months} meses`} a {formatCurrency(monthlyPrice)} por mes.
          </p>
        )}
        {months === null && monthlyPrice > 0 && amount > 0 && (
          <p className="mt-0.5 text-[12.5px] text-state-bad">
            El monto debe ser un múltiplo de {formatCurrency(monthlyPrice)}.
          </p>
        )}
      </div>

      {tipoPago === "TRANSFERENCIA" && (
        <div className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL_CLASSES}>Comprobante</span>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              onChange={(e) => setVoucherFile(e.target.files?.[0] ?? null)}
              className="hidden"
              data-testid="renew-voucher-input"
            />
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload size={16} strokeWidth={1.5} aria-hidden="true" />
              {voucherFile ? "Cambiar archivo" : "Seleccionar archivo"}
            </Button>
            {voucherFile && (
              <span className="inline-flex min-w-0 items-center gap-1.5 text-[13px] text-ink-2">
                <Paperclip size={14} strokeWidth={1.5} aria-hidden="true" />
                <span className="truncate">{voucherFile.name}</span>
                <button
                  type="button"
                  onClick={() => setVoucherFile(null)}
                  aria-label="Quitar el comprobante seleccionado"
                  className="rounded text-ink-3 hover:text-state-bad focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ball"
                >
                  <X size={14} strokeWidth={2} aria-hidden="true" />
                </button>
              </span>
            )}
          </div>
          <span className="text-[12.5px] text-ink-3-strong">PDF, JPG o PNG — máximo 5 MB.</span>
        </div>
      )}

      {error && (
        <p role="alert" className="text-[13px] font-semibold text-state-bad">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          onClick={() => void handleSubmit()}
          disabled={loading || !monto || !fechaInicio || !fechaFin}
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <CreditCard size={16} strokeWidth={1.5} aria-hidden="true" />
          )}
          {loading ? "Registrando…" : "Registrar pago"}
        </Button>
        <Button variant="ghost" onClick={handleCancel} disabled={loading}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// One payment in the history
// ---------------------------------------------------------------------------

function PagoRow({
  pago,
  onUploadFile,
  uploadingId,
}: {
  pago: PagoPersona;
  onUploadFile: (pagoId: number) => void;
  uploadingId: number | null;
}): React.ReactElement {
  const estado = describePagoEstado(pago.estadoPago);
  const canUpload = !pago.voucherUrl && pago.estadoPago !== "APROBADO";

  return (
    <li className="flex min-h-drow flex-wrap items-start gap-x-4 gap-y-2 border-b border-line px-5 py-3.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[15px] font-bold tabular-nums text-ink">
            {formatPagoMonto(pago.monto)}
          </span>
          <Badge tone={estado.tone}>{estado.label}</Badge>
        </div>
        <p className="mt-1 text-[12.5px] text-ink-3-strong">
          {TIPO_PAGO_LABEL[pago.tipoPago]} · Registrado el{" "}
          <span className="tabular-nums">{formatDate(pago.fechaRegistro)}</span> · Cubre{" "}
          <span className="tabular-nums">{formatDateRange(pago.fechaInicio, pago.fechaFin)}</span>
        </p>

        {pago.voucherUrl && (
          <a
            href={pago.voucherUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-flex items-center gap-1.5 rounded text-[12.5px] font-semibold text-ink underline decoration-line-2 decoration-2 underline-offset-4 hover:decoration-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ball"
          >
            <Paperclip size={13} strokeWidth={1.5} aria-hidden="true" />
            Ver el comprobante
          </a>
        )}

        {/* The rejection reason is the one thing on this screen that asks the
            reader to act, so it is stated in full rather than truncated into
            the meta line. */}
        {pago.estadoPago === "RECHAZADO" && pago.motivoRechazo && (
          <div className="mt-2 rounded-ctl bg-state-bad-bg px-3.5 py-2.5">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-state-bad">
              Motivo del rechazo
            </p>
            <p className="mt-0.5 text-[13px] text-ink-2">{pago.motivoRechazo}</p>
          </div>
        )}
      </div>

      {canUpload && (
        <Button size="sm" onClick={() => onUploadFile(pago.id)} disabled={uploadingId === pago.id}>
          {uploadingId === pago.id ? (
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          ) : (
            <Upload size={14} strokeWidth={1.5} aria-hidden="true" />
          )}
          {uploadingId === pago.id ? "Subiendo…" : "Subir comprobante"}
        </Button>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Main content
// ---------------------------------------------------------------------------

function PaymentsContent({
  data,
  hasAlumnoRole,
  accountPersonaId,
  onRegistered,
}: {
  data: StudentPortalSummary;
  hasAlumnoRole: boolean;
  /** The persona behind the SESSION — not the profile being viewed. */
  accountPersonaId: string;
  onRegistered: () => void;
}): React.ReactElement {
  const { managedProfiles, selectedId, setSelectedId, selectedProfile } = useManagedProfiles(
    data,
    hasAlumnoRole,
  );

  const [reloadToken, setReloadToken] = useState(0);
  const [filter, setFilter] = useState<PagoStatusFilter>("TODOS");
  const [pagosState, setPagosState] = useState<PagosLoadState>({ status: "loading" });
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUploadPagoId, setPendingUploadPagoId] = useState<number | null>(null);

  const selectedPersonaId = selectedProfile?.personaId ?? null;

  /**
   * A minor cannot register a payment on their OWN account — but their
   * representative can, from theirs, and the backend agrees: `registrarPago`
   * authorizes "the owner, their representative, or an ADMINISTRADOR" at the
   * service layer.
   *
   * The gate used to read `isMinor(selectedProfile)` alone, which locked a
   * guardian out of paying for their own child — the single most common thing
   * a representante account exists to do — and told them to ask the minor's
   * representative, i.e. themselves.
   */
  const viewingOwnProfile = selectedPersonaId !== null && selectedPersonaId === accountPersonaId;
  const blockedAsMinor = viewingOwnProfile && isMinor(selectedProfile?.fechaNacimiento);

  useEffect(() => {
    if (!selectedPersonaId) return;
    let cancelled = false;
    setPagosState({ status: "loading" });
    fetchPagosDePersona(selectedPersonaId)
      .then((pagos) => {
        if (!cancelled) setPagosState({ status: "ready", pagos });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setPagosState({
          status: "error",
          message:
            error instanceof Error ? error.message : "No se pudo cargar el historial de pagos.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPersonaId, reloadToken]);

  // Memoised so the empty-list branch does not hand a fresh array to the three
  // derivations below on every render.
  const pagos = useMemo(
    () => (pagosState.status === "ready" ? pagosState.pagos : NO_PAGOS),
    [pagosState],
  );
  const coverageEnd = useMemo(() => resolveCoverageEnd(pagos), [pagos]);
  const counts = useMemo(() => countPagosByStatus(pagos), [pagos]);
  const filteredPagos = useMemo(
    () => sortPagosByDate(filterPagosByStatus(pagos, filter)),
    [pagos, filter],
  );
  const hasPendingPago = pagos.some((pago) => pago.estadoPago === "PENDIENTE_VALIDACION");

  function handleSelectFile(pagoId: number): void {
    setUploadError(null);
    setPendingUploadPagoId(pagoId);
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file || !pendingUploadPagoId) return;
    setUploadingId(pendingUploadPagoId);
    setUploadError(null);
    try {
      await subirVoucherPago(pendingUploadPagoId, file);
      setReloadToken((n) => n + 1);
    } catch (err) {
      // Inline, not `alert()`: a browser dialog cannot be styled, cannot be
      // read by the surrounding context, and blocks the page it interrupts.
      setUploadError(err instanceof Error ? err.message : "No se pudo subir el comprobante.");
    } finally {
      setUploadingId(null);
      setPendingUploadPagoId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleRegistered(): void {
    setReloadToken((n) => n + 1);
    onRegistered();
  }

  if (selectedProfile === null) {
    return (
      <div className="mx-auto w-full max-w-[760px]">
        <div className="card">
          <EmptyState
            icon={<CreditCard size={21} strokeWidth={1.5} aria-hidden="true" />}
            title="No se encontraron estudiantes asociados a esta cuenta"
            description="Inscríbase como jugador o agregue un hijo o dependiente para registrar pagos."
            action={
              <Link href="/student" className={buttonClasses("secondary", "sm")}>
                Ir a mi cuenta
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[760px] space-y-5">
      <ManagedStudentPicker
        id="student-select-payments"
        profiles={managedProfiles}
        value={selectedId}
        onChange={(id) => {
          setSelectedId(id);
          setFilter("TODOS");
        }}
      />

      <MembershipCard membership={selectedProfile.membership} coverageEnd={coverageEnd}>
        {blockedAsMinor ? (
          <p className="text-[13px] text-ink-2">
            Un estudiante menor de edad no registra pagos desde su propia cuenta. Lo hace su
            representante desde la suya, o el club en administración.
          </p>
        ) : selectedProfile.membership ? (
          <RenewPaymentForm
            membership={selectedProfile.membership}
            personaId={selectedProfile.personaId}
            coverageEnd={coverageEnd}
            hasPendingPago={hasPendingPago}
            onRegistered={handleRegistered}
          />
        ) : (
          <p className="text-[13px] text-ink-2">
            El club crea la membresía al registrar el primer pago. Acérquese a administración para
            activarla y después podrá renovarla desde aquí.
          </p>
        )}
      </MembershipCard>

      {/* Selection is coal plus the ball dot — `FilterPill` owns that rule. */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar pagos por estado">
        {FILTERS.map((option) => (
          <FilterPill
            key={option}
            label={PAGO_FILTER_LABELS[option]}
            count={counts[option]}
            active={filter === option}
            onClick={() => setFilter(option)}
          />
        ))}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        className="hidden"
        data-testid="pago-voucher-input"
        onChange={(e) => {
          void handleFileChange(e);
        }}
      />

      {uploadError && (
        <p role="alert" className="text-[13px] font-semibold text-state-bad">
          {uploadError}
        </p>
      )}

      {pagosState.status === "loading" && (
        <div className="card">
          <LoadingState label="Cargando sus pagos…" />
        </div>
      )}
      {pagosState.status === "error" && (
        <ErrorState message={pagosState.message} onRetry={() => setReloadToken((n) => n + 1)} />
      )}
      {pagosState.status === "ready" && (
        <section className="card overflow-hidden" aria-labelledby="pagos-title">
          <div className="flex items-center gap-3 border-b border-line px-5 py-4">
            <h2 id="pagos-title" className="flex-1 text-[13px] font-bold text-ink">
              Historial de pagos
            </h2>
            {filteredPagos.length > 0 && (
              <span className="text-[12.5px] font-semibold tabular-nums text-ink-3">
                {filteredPagos.length}
              </span>
            )}
          </div>
          {filteredPagos.length === 0 ? (
            <EmptyState
              icon={<CreditCard size={21} strokeWidth={1.5} aria-hidden="true" />}
              title={getEmptyStateMessage(filter)}
              description={
                filter === "TODOS"
                  ? "Cuando registre un pago aparecerá aquí, junto con el resultado de su validación."
                  : "Pruebe con otro estado para ver el resto de su historial."
              }
              action={
                filter === "TODOS" ? undefined : (
                  <Button size="sm" onClick={() => setFilter("TODOS")}>
                    Ver todos los pagos
                  </Button>
                )
              }
            />
          ) : (
            <ul className="flex flex-col">
              {filteredPagos.map((pago) => (
                <PagoRow
                  key={pago.id}
                  pago={pago}
                  onUploadFile={handleSelectFile}
                  uploadingId={uploadingId}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      <BackLink
        href="/student"
        label="Volver a mi cuenta"
        className="btn-ghost -ml-2 mt-1 inline-flex items-center gap-1 text-xs"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

function PaymentsPageContent(): React.ReactElement {
  const { session } = useAuth();
  const personaId = session?.user.id ?? "";
  const hasAlumnoRole = session?.user.role === "estudiante";

  const [state, setState] = useState<PortalLoadState>({ status: "loading" });
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
          message: error instanceof Error ? error.message : "No se pudo cargar la información.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [personaId, reloadToken]);

  return (
    <AppShell
      eyebrow="Área de estudiantes"
      title="Mis pagos"
      subtitle="Registre un pago, siga su validación y consulte lo que ya pagó."
    >
      {state.status === "loading" && (
        <div className="card">
          <LoadingState label="Cargando sus pagos…" />
        </div>
      )}
      {state.status === "error" && (
        <ErrorState message={state.message} onRetry={() => setReloadToken((n) => n + 1)} />
      )}
      {state.status === "ready" && (
        <PaymentsContent
          data={state.data}
          hasAlumnoRole={hasAlumnoRole}
          accountPersonaId={personaId}
          onRegistered={() => setReloadToken((n) => n + 1)}
        />
      )}
    </AppShell>
  );
}

export default function StudentPaymentsPage(): React.ReactElement {
  return (
    <ProtectedRoute allowedRoles={["representante", "estudiante", "unsupported"]}>
      <PaymentsPageContent />
    </ProtectedRoute>
  );
}
