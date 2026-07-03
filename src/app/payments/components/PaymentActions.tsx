/**
 * Payment Actions — Approve / Reject buttons and reject form.
 */

"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, ThumbsUp, ThumbsDown } from "lucide-react";
import type { PaymentValidationRequest } from "@/services/api";

interface PaymentActionsProps {
  request: PaymentValidationRequest;
  actionLoading: string | null;
  actionError: string | null;
  onApprove: () => void;
  onReject: (reason: string) => void;
}

export default function PaymentActions({
  request,
  actionLoading,
  actionError,
  onApprove,
  onReject,
}: PaymentActionsProps) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionValidationError, setRejectionValidationError] = useState<string | null>(null);

  // Clear rejection form only when the request has been successfully processed
  useEffect(() => {
    if (request.validationStatus !== "pendiente") {
      setShowRejectForm(false);
      setRejectionReason("");
      setRejectionValidationError(null);
    }
  }, [request.validationStatus]);

  function handleRejectClick() {
    setShowRejectForm(true);
    setRejectionValidationError(null);
  }

  function handleRejectCancel() {
    setShowRejectForm(false);
    setRejectionReason("");
    setRejectionValidationError(null);
  }

  function handleRejectSubmit() {
    if (!rejectionReason.trim()) {
      setRejectionValidationError("El motivo de rechazo es obligatorio.");
      return;
    }
    onReject(rejectionReason.trim());
  }

  // Already resolved — show validado/rechazado badge
  if (request.validationStatus !== "pendiente") {
    return (
      <div className="card p-6 text-center">
        <div className={`mb-3 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ${
          request.validationStatus === "validado"
            ? "bg-emerald-50 text-emerald-700"
            : "bg-red-50 text-cata-red"
        }`}>
          {request.validationStatus === "validado" ? (
            <CheckCircle2 size={16} strokeWidth={2} aria-hidden="true" />
          ) : (
            <XCircle size={16} strokeWidth={2} aria-hidden="true" />
          )}
          {request.validationStatus === "validado" ? "Validado" : "Rechazado"}
        </div>
        <p className="text-xs text-cata-gray">
          Esta solicitud ya ha sido procesada.
        </p>
      </div>
    );
  }

  return (
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
            onClick={onApprove}
            disabled={actionLoading !== null}
            className="btn-primary w-full shadow-soft min-h-[44px]"
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
            className="btn-secondary w-full border-red-200 text-cata-red hover:bg-red-50 hover:border-red-300 min-h-[44px]"
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
              className="btn-primary flex-1 shadow-soft min-h-[44px]"
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
              className="btn-secondary min-h-[44px]"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
