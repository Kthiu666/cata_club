/**
 * Payment Detail Panel — Shows membership status, payment details,
 * validation checklist, rejection reason, and metadata.
 */

"use client";

import {
  BadgeCheck,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  User,
  Building2,
  Calendar,
  CreditCard,
  AlertTriangle,
} from "lucide-react";
import type {
  PaymentValidationRequest,
  MembershipStatus,
  ValidationStatus,
} from "@/services/api";
import { formatCurrency, formatDate } from "../lib/utils";

const membershipStatusLabels: Record<MembershipStatus, string> = {
  activa: "Activa",
  vencida: "Vencida",
  suspendida: "Suspendida",
};

const membershipStatusStyles: Record<MembershipStatus, string> = {
  activa: "badge-success",
  vencida: "badge-error",
  suspendida: "badge-error",
};

interface PaymentDetailProps {
  request: PaymentValidationRequest;
}

export default function PaymentDetail({ request }: PaymentDetailProps) {
  return (
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
            <span className={`mt-1 inline-flex items-center gap-1.5 ${membershipStatusStyles[request.currentMembershipStatus]}`}>
              {request.currentMembershipStatus === "activa" && (
                <CheckCircle2 size={12} strokeWidth={2} aria-hidden="true" />
              )}
              {(request.currentMembershipStatus === "vencida" || request.currentMembershipStatus === "suspendida") && (
                <XCircle size={12} strokeWidth={2} aria-hidden="true" />
              )}
              {membershipStatusLabels[request.currentMembershipStatus]}
            </span>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-cata-gray/60">Tipo de Membresía</p>
            <p className="mt-1 text-sm font-medium text-cata-charcoal">{request.membershipType}</p>
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
              {request.studentName}
            </div>
          </div>
          {(request.responsablePagoName || request.representativeName) && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-cata-gray/60">Responsable de pago</p>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-cata-charcoal">
                <Building2 size={14} strokeWidth={1.5} className="shrink-0 text-cata-gray" aria-hidden="true" />
                {request.responsablePagoName || request.representativeName}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-cata-gray/60">Período</p>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-cata-charcoal">
              <Calendar size={14} strokeWidth={1.5} className="shrink-0 text-cata-gray" aria-hidden="true" />
              {request.membershipPeriod}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-cata-gray/60">Monto Esperado</p>
            <div className="mt-1 flex items-center gap-1.5 text-lg font-bold text-cata-charcoal">
              <DollarSign size={16} strokeWidth={2} className="shrink-0 text-cata-gray" aria-hidden="true" />
              {formatCurrency(request.expectedAmount)}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-cata-gray/60">Método de Pago</p>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-cata-charcoal">
              <CreditCard size={14} strokeWidth={1.5} className="shrink-0 text-cata-gray" aria-hidden="true" />
              {request.paymentMethod}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-cata-gray/60">Subido el</p>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-cata-gray">
              <Clock size={14} strokeWidth={1.5} className="shrink-0" aria-hidden="true" />
              {formatDate(request.uploadedAt)}
            </div>
          </div>
        </div>
      </div>

      {/* Validation criteria */}
      {request.validationStatus === "pendiente" && (
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
      {request.validationStatus === "rechazado" && request.rejectionReason && (
        <div className="card border-red-200 bg-red-50 p-5">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-cata-red">
            <XCircle size={14} strokeWidth={1.5} aria-hidden="true" />
            Motivo de Rechazo
          </h3>
          <p className="text-sm text-cata-red/80">{request.rejectionReason}</p>
          {request.validatedBy && request.validatedAt && (
            <p className="mt-2 text-xs text-cata-gray">
              Rechazado por {request.validatedBy} el {formatDate(request.validatedAt)}
            </p>
          )}
        </div>
      )}

      {/* Validation metadata */}
      {(request.validationStatus === "validado" || request.validationStatus === "rechazado") && (
        <div className="text-xs text-cata-gray/60">
          {request.validatedBy && (
            <p>Validado por: {request.validatedBy}</p>
          )}
          {request.validatedAt && (
            <p>Fecha de validación: {formatDate(request.validatedAt)}</p>
          )}
        </div>
      )}
    </div>
  );
}
