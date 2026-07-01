/**
 * Memberships & Payments — Payment validation queue and detail panel (CU012).
 *
 * Implements CU012 "Validar o rechazar comprobante de pago":
 *   1. Admin enters Gestión de Membresías y Pagos.
 *   2. System shows list of proofs pending validation.
 *   3. Admin selects a pending proof.
 *   4. System shows payment request detail, current membership status,
 *      and attached proof file.
 *   5. Admin verifies the payment corresponds to student, period, amount,
 *      and method.
 *   6. Admin approves or rejects with required reason.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  Search,
  User,
  Calendar,
  DollarSign,
  FileText,
  CreditCard,
  BadgeCheck,
  AlertTriangle,
  Eye,
  ThumbsUp,
  ThumbsDown,
  ArrowLeft,
  Paperclip,
  Building2,
  Hash,
} from "lucide-react";
import type {
  PaymentValidationRequest,
  MembershipStatus,
  ValidationStatus,
} from "@/services/api";
import { fetchPaymentValidations, updatePaymentValidation } from "@/services/api";

type FilterKey = "all" | "pending" | "approved" | "rejected";

const filters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "pending", label: "Pendientes" },
  { key: "approved", label: "Aprobadas" },
  { key: "rejected", label: "Rechazadas" },
];

const membershipStatusLabels: Record<MembershipStatus, string> = {
  pending_payment: "Pendiente de Pago",
  pending_validation: "Pendiente de Validación",
  active: "Activo",
  expired: "Vencido",
};

const membershipStatusStyles: Record<MembershipStatus, string> = {
  pending_payment: "badge-warning",
  pending_validation: "badge-warning",
  active: "badge-success",
  expired: "badge-error",
};

const validationStatusStyles: Record<ValidationStatus, string> = {
  pending: "badge-warning",
  approved: "badge-success",
  rejected: "badge-error",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-EC", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PaymentsPage() {
  const [requests, setRequests] = useState<PaymentValidationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [selectedRequest, setSelectedRequest] = useState<PaymentValidationRequest | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionValidationError, setRejectionValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPaymentValidations();
      setRequests(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar las solicitudes de validación de pago",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const filtered =
    activeFilter === "all"
      ? requests
      : requests.filter((r) => r.validationStatus === activeFilter);

  const counts = {
    total: requests.length,
    pending: requests.filter((r) => r.validationStatus === "pending").length,
    approved: requests.filter((r) => r.validationStatus === "approved").length,
    rejected: requests.filter((r) => r.validationStatus === "rejected").length,
  };

  function handleSelect(request: PaymentValidationRequest) {
    setSelectedRequest(request);
    setShowRejectForm(false);
    setRejectionReason("");
    setRejectionValidationError(null);
    setActionError(null);
    setSuccessMessage(null);
  }

  function handleBack() {
    setSelectedRequest(null);
    setShowRejectForm(false);
    setRejectionReason("");
    setRejectionValidationError(null);
    setActionError(null);
    setSuccessMessage(null);
  }

  async function handleApprove() {
    if (!selectedRequest) return;
    setActionLoading("approve");
    setActionError(null);
    setSuccessMessage(null);
    try {
      const updated = await updatePaymentValidation(selectedRequest.id, {
        action: "approved",
      });
      setRequests((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r)),
      );
      setSelectedRequest(updated);
      setSuccessMessage("Demo — Pago aprobado. La membresía ahora está activa.");
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Error al aprobar el pago",
      );
    } finally {
      setActionLoading(null);
    }
  }

  function handleRejectClick() {
    setShowRejectForm(true);
    setRejectionValidationError(null);
    setActionError(null);
  }

  function handleRejectCancel() {
    setShowRejectForm(false);
    setRejectionReason("");
    setRejectionValidationError(null);
  }

  async function handleRejectSubmit() {
    if (!selectedRequest) return;

    // Client-side validation: rejection reason must not be empty
    if (!rejectionReason.trim()) {
      setRejectionValidationError("El motivo de rechazo es obligatorio.");
      return;
    }

    setActionLoading("reject");
    setActionError(null);
    setRejectionValidationError(null);
    setSuccessMessage(null);
    try {
      const updated = await updatePaymentValidation(selectedRequest.id, {
        action: "rejected",
        rejectionReason: rejectionReason.trim(),
      });
      setRequests((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r)),
      );
      setSelectedRequest(updated);
      setShowRejectForm(false);
      setSuccessMessage("Demo — Pago rechazado. El estado de la membresía se ha establecido como pendiente de pago.");
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Error al rechazar el pago",
      );
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cata-red/10">
            <ShieldCheck
              size={20}
              strokeWidth={1.5}
              className="text-cata-red"
              aria-hidden="true"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-cata-charcoal">
              Membresías y Pagos
            </h1>
            <p className="text-sm text-cata-gray">
              Valide comprobantes de pago de membresías y administre el estado de los miembros
            </p>
          </div>
        </div>
      </div>

      {/* Demo indicator */}
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
        <span className="font-medium">Demo</span> &mdash; Los datos de pagos son simulados
        con información local en memoria. No hay integración con un backend real.
        Los datos se reinician al recargar la página o reiniciar el servidor.
      </div>

      {/* Summary bar */}
      <div className="mb-6 flex flex-wrap items-center gap-4 text-sm">
        <span className="text-cata-gray">
          <span className="font-medium text-cata-charcoal">{counts.total}</span>{" "}
          total
        </span>
        <span className="flex items-center gap-1 text-amber-700">
          <Clock size={14} strokeWidth={1.5} aria-hidden="true" />
          <span className="font-medium">{counts.pending}</span> pendientes
        </span>
        <span className="flex items-center gap-1 text-emerald-700">
          <CheckCircle2 size={14} strokeWidth={1.5} aria-hidden="true" />
          <span className="font-medium">{counts.approved}</span> aprobadas
        </span>
        <span className="flex items-center gap-1 text-cata-red">
          <XCircle size={14} strokeWidth={1.5} aria-hidden="true" />
          <span className="font-medium">{counts.rejected}</span> rechazadas
        </span>
      </div>

      {/* Main content: split layout */}
      {!selectedRequest ? (
        <>
          {/* Filters */}
          <div className="mb-6 flex items-center gap-2">
            <Filter size={14} strokeWidth={1.5} className="text-cata-gray" aria-hidden="true" />
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setActiveFilter(f.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeFilter === f.key
                    ? "bg-cata-red/10 text-cata-red"
                    : "bg-cata-warm text-cata-gray hover:bg-cata-stone"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-cata-gray">Cargando solicitudes...</p>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="card border border-red-200 bg-red-50 p-6 text-center">
              <p className="text-sm text-cata-red">{error}</p>
              <button
                type="button"
                onClick={() => loadRequests()}
                className="btn-ghost mt-3 text-xs text-cata-red"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && filtered.length === 0 && (
            <div className="card flex flex-col items-center py-16 text-center">
              <ShieldCheck
                size={40}
                strokeWidth={1}
                className="mb-3 text-cata-stone"
                aria-hidden="true"
              />
              <p className="text-sm text-cata-gray">
                {activeFilter === "all"
                  ? "Aún no hay solicitudes de validación de pago."
                  : `No hay solicitudes ${activeFilter === "pending" ? "pendientes" : activeFilter === "approved" ? "aprobadas" : "rechazadas"}.`}
              </p>
            </div>
          )}

          {/* Request table */}
          {!loading && !error && filtered.length > 0 && (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-cata-stone/60 bg-cata-warm text-xs font-medium uppercase tracking-wider text-cata-gray">
                      <th className="px-4 py-3 font-medium">Estudiante</th>
                      <th className="px-4 py-3 font-medium">Responsable de pago</th>
                      <th className="px-4 py-3 font-medium">Período</th>
                      <th className="px-4 py-3 font-medium text-right">Monto</th>
                      <th className="px-4 py-3 font-medium">Método</th>
                      <th className="px-4 py-3 font-medium">Subido</th>
                      <th className="px-4 py-3 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cata-stone/40">
                    {filtered.map((req) => (
                      <tr
                        key={req.id}
                        onClick={() => handleSelect(req)}
                        className="cursor-pointer transition-colors hover:bg-cata-warm/60"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <User size={14} strokeWidth={1.5} className="shrink-0 text-cata-gray" aria-hidden="true" />
                            <span className="font-medium text-cata-charcoal">{req.studentName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-cata-gray">
                          {req.responsablePagoName || req.representativeName || (
                            <span className="text-cata-gray/40">&mdash;</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-cata-gray">{req.membershipPeriod}</td>
                        <td className="px-4 py-3 text-right font-medium text-cata-charcoal">
                          {formatCurrency(req.expectedAmount)}
                        </td>
                        <td className="px-4 py-3 text-cata-gray">{req.paymentMethod}</td>
                        <td className="px-4 py-3 text-xs text-cata-gray/60">
                          {formatDate(req.uploadedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={validationStatusStyles[req.validationStatus]}>
                            {req.validationStatus === "pending" && (
                              <Clock size={12} strokeWidth={2} aria-hidden="true" />
                            )}
                            {req.validationStatus === "approved" && (
                              <CheckCircle2 size={12} strokeWidth={2} aria-hidden="true" />
                            )}
                            {req.validationStatus === "rejected" && (
                              <XCircle size={12} strokeWidth={2} aria-hidden="true" />
                            )}
                            {req.validationStatus === "pending"
                              ? "Pendiente"
                              : req.validationStatus === "approved"
                                ? "Aprobado"
                                : "Rechazado"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Detail Panel */
        <div>
          {/* Back button */}
          <button
            type="button"
            onClick={handleBack}
            className="btn-ghost mb-6 -ml-2 gap-1 text-xs text-cata-gray"
          >
            <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" />
            Volver a la lista
          </button>

          {/* Success feedback */}
          {successMessage && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle2 size={16} strokeWidth={1.5} className="shrink-0" aria-hidden="true" />
              {successMessage}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-5">
            {/* Left: Payment details */}
            <div className="lg:col-span-3 space-y-6">
              {/* Membership status card */}
              <div className="card p-6">
                <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-cata-charcoal">
                  <BadgeCheck size={16} strokeWidth={1.5} aria-hidden="true" />
                  Estado de la Membresía
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-cata-gray/60">Estado Actual</p>
                    <span className={`mt-1 inline-flex items-center gap-1.5 ${membershipStatusStyles[selectedRequest.currentMembershipStatus]}`}>
                      {selectedRequest.currentMembershipStatus === "active" && (
                        <CheckCircle2 size={12} strokeWidth={2} aria-hidden="true" />
                      )}
                      {selectedRequest.currentMembershipStatus === "expired" && (
                        <XCircle size={12} strokeWidth={2} aria-hidden="true" />
                      )}
                      {(selectedRequest.currentMembershipStatus === "pending_payment" || selectedRequest.currentMembershipStatus === "pending_validation") && (
                        <Clock size={12} strokeWidth={2} aria-hidden="true" />
                      )}
                      {membershipStatusLabels[selectedRequest.currentMembershipStatus]}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-cata-gray/60">Tipo de Membresía</p>
                    <p className="mt-1 text-sm font-medium text-cata-charcoal">{selectedRequest.membershipType}</p>
                  </div>
                </div>
              </div>

              {/* Payment request detail */}
              <div className="card p-6">
                <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-cata-charcoal">
                  <DollarSign size={16} strokeWidth={1.5} aria-hidden="true" />
                  Detalle de Solicitud de Pago
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-cata-gray/60">Estudiante</p>
                    <div className="mt-1 flex items-center gap-1.5 text-sm text-cata-charcoal">
                      <User size={14} strokeWidth={1.5} className="shrink-0 text-cata-gray" aria-hidden="true" />
                      {selectedRequest.studentName}
                    </div>
                  </div>
                  {(selectedRequest.responsablePagoName || selectedRequest.representativeName) && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-cata-gray/60">Responsable de pago</p>
                      <div className="mt-1 flex items-center gap-1.5 text-sm text-cata-charcoal">
                        <Building2 size={14} strokeWidth={1.5} className="shrink-0 text-cata-gray" aria-hidden="true" />
                        {selectedRequest.responsablePagoName || selectedRequest.representativeName}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-cata-gray/60">Período</p>
                    <div className="mt-1 flex items-center gap-1.5 text-sm text-cata-charcoal">
                      <Calendar size={14} strokeWidth={1.5} className="shrink-0 text-cata-gray" aria-hidden="true" />
                      {selectedRequest.membershipPeriod}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-cata-gray/60">Monto Esperado</p>
                    <div className="mt-1 flex items-center gap-1.5 text-lg font-bold text-cata-charcoal">
                      <DollarSign size={16} strokeWidth={2} className="shrink-0 text-cata-gray" aria-hidden="true" />
                      {formatCurrency(selectedRequest.expectedAmount)}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-cata-gray/60">Método de Pago</p>
                    <div className="mt-1 flex items-center gap-1.5 text-sm text-cata-charcoal">
                      <CreditCard size={14} strokeWidth={1.5} className="shrink-0 text-cata-gray" aria-hidden="true" />
                      {selectedRequest.paymentMethod}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-cata-gray/60">Subido el</p>
                    <div className="mt-1 flex items-center gap-1.5 text-sm text-cata-gray">
                      <Clock size={14} strokeWidth={1.5} className="shrink-0" aria-hidden="true" />
                      {formatDate(selectedRequest.uploadedAt)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Validation criteria */}
              {selectedRequest.validationStatus === "pending" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800">
                    <AlertTriangle size={14} strokeWidth={1.5} aria-hidden="true" />
                    Lista de Verificación
                  </h3>
                  <ul className="space-y-1 text-sm text-amber-700">
                    <li className="flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-amber-500" />
                      Verifique que el nombre del estudiante corresponda a un miembro registrado
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-amber-500" />
                      Confirme que el período corresponda al ciclo de membresía actual
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-amber-500" />
                      Compruebe que el monto coincida con la cuota de membresía esperada
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-amber-500" />
                      Verifique que el método de pago sea correcto
                    </li>
                  </ul>
                </div>
              )}

              {/* Rejection reason (displayed when already rejected) */}
              {selectedRequest.validationStatus === "rejected" && selectedRequest.rejectionReason && (
                <div className="card border-red-200 bg-red-50 p-5">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-cata-red">
                    <XCircle size={14} strokeWidth={1.5} aria-hidden="true" />
                    Motivo de Rechazo
                  </h3>
                  <p className="text-sm text-cata-red/80">{selectedRequest.rejectionReason}</p>
                  {selectedRequest.validatedBy && selectedRequest.validatedAt && (
                    <p className="mt-2 text-xs text-cata-gray">
                      Rechazado por {selectedRequest.validatedBy} el {formatDate(selectedRequest.validatedAt)}
                    </p>
                  )}
                </div>
              )}

              {/* Validation metadata */}
              {(selectedRequest.validationStatus === "approved" || selectedRequest.validationStatus === "rejected") && (
                <div className="text-xs text-cata-gray/60">
                  {selectedRequest.validatedBy && (
                    <p>Validado por: {selectedRequest.validatedBy}</p>
                  )}
                  {selectedRequest.validatedAt && (
                    <p>Fecha de validación: {formatDate(selectedRequest.validatedAt)}</p>
                  )}
                </div>
              )}
            </div>

            {/* Right: Proof file and actions */}
            <div className="lg:col-span-2 space-y-6">
              {/* Proof file block */}
              <div className="card p-6">
                <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-cata-charcoal">
                  <Paperclip size={16} strokeWidth={1.5} aria-hidden="true" />
                  Comprobante de Pago
                </h2>

                <div className="mb-4 rounded-xl border-2 border-dashed border-cata-stone/70 bg-cata-warm/50 p-6 text-center">
                  {selectedRequest.proofPreviewUrl ? (
                    <div className="relative mx-auto mb-3 h-48 w-full overflow-hidden rounded-lg bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedRequest.proofPreviewUrl}
                        alt="Vista previa del comprobante de pago"
                        className="h-full w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="mb-3 flex items-center justify-center">
                      <div
                        className={`flex h-16 w-16 items-center justify-center rounded-full ${
                          selectedRequest.proofFileType === "pdf"
                            ? "bg-cata-red/8"
                            : "bg-cata-warm"
                        }`}
                      >
                        <FileText
                          size={28}
                          strokeWidth={1.5}
                          className={selectedRequest.proofFileType === "pdf" ? "text-cata-red" : "text-cata-gray"}
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-2">
                    <Hash size={12} strokeWidth={1.5} className="text-cata-gray" aria-hidden="true" />
                    <span className="text-sm font-medium text-cata-charcoal">
                      {selectedRequest.proofFileName}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-cata-gray">
                    {selectedRequest.proofFileType === "pdf" ? "Documento PDF" : "Archivo de imagen"}
                  </p>

                  <p className="mt-4 text-xs text-cata-gray/60">
                    <Eye size={12} strokeWidth={1.5} className="inline-block -mt-0.5 mr-1" aria-hidden="true" />
                    Vista previa del comprobante completo no disponible en modo demo.
                  </p>
                </div>
              </div>

              {/* Actions (only for pending requests) */}
              {selectedRequest.validationStatus === "pending" && (
                <div className="card p-6">
                  <h2 className="mb-4 text-base font-semibold text-cata-charcoal">
                    Acción de Validación
                  </h2>

                  {actionError && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-cata-red">
                      {actionError}
                    </div>
                  )}

                  {!showRejectForm ? (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={handleApprove}
                        disabled={actionLoading !== null}
                        className="btn-primary w-full shadow-soft"
                      >
                        {actionLoading === "approve" ? (
                          "Procesando..."
                        ) : (
                          <>
                            <ThumbsUp size={15} strokeWidth={2} aria-hidden="true" />
                            Aprobar Pago
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleRejectClick}
                        disabled={actionLoading !== null}
                        className="btn-secondary w-full border-red-200 text-cata-red hover:bg-red-50 hover:border-red-300"
                      >
                        <ThumbsDown size={15} strokeWidth={2} aria-hidden="true" />
                        Rechazar Pago
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label
                          htmlFor="rejection-reason"
                          className="mb-1.5 block text-xs font-medium text-cata-charcoal"
                        >
                          Motivo de Rechazo <span className="text-cata-red">*</span>
                        </label>
                        <textarea
                          id="rejection-reason"
                          rows={3}
                          value={rejectionReason}
                          onChange={(e) => {
                            setRejectionReason(e.target.value);
                            setRejectionValidationError(null);
                          }}
                          placeholder="Explique por qué se rechaza el comprobante de pago..."
                          className="input-field resize-y"
                          disabled={actionLoading !== null}
                        />
                        {rejectionValidationError && (
                          <p className="mt-1 text-xs text-cata-red">{rejectionValidationError}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleRejectSubmit}
                          disabled={actionLoading !== null}
                          className="btn-primary flex-1 shadow-soft"
                        >
                          {actionLoading === "reject" ? (
                            "Procesando..."
                          ) : (
                            "Confirmar Rechazo"
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleRejectCancel}
                          disabled={actionLoading !== null}
                          className="btn-secondary"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Already resolved — show approved/rejected badge */}
              {selectedRequest.validationStatus !== "pending" && (
                <div className="card p-6 text-center">
                  <div className={`mb-3 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ${
                    selectedRequest.validationStatus === "approved"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-cata-red"
                  }`}>
                    {selectedRequest.validationStatus === "approved" ? (
                      <CheckCircle2 size={16} strokeWidth={2} aria-hidden="true" />
                    ) : (
                      <XCircle size={16} strokeWidth={2} aria-hidden="true" />
                    )}
                    {selectedRequest.validationStatus === "approved" ? "Aprobado" : "Rechazado"}
                  </div>
                  <p className="text-xs text-cata-gray">
                    Esta solicitud ya ha sido procesada.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </ProtectedRoute>
  );
}
