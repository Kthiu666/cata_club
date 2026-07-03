/**
 * Payment List — Table with filters, loading, error, and empty states.
 * Keyboard accessible rows for screen readers and keyboard navigation.
 */

"use client";

import {
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  User,
  ShieldCheck,
} from "lucide-react";
import type {
  PaymentValidationRequest,
  ValidationStatus,
} from "@/services/api";
import { formatCurrency, formatDate } from "../lib/utils";
import PaymentSkeleton from "./PaymentSkeleton";

type FilterKey = "all" | "pendiente" | "validado" | "rechazado";

const filters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "pendiente", label: "Pendientes" },
  { key: "validado", label: "Validadas" },
  { key: "rechazado", label: "Rechazadas" },
];

const validationStatusStyles: Record<ValidationStatus, string> = {
  pendiente: "badge-warning",
  validado: "badge-success",
  rechazado: "badge-error",
};

const validationStatusLabels: Record<ValidationStatus, string> = {
  pendiente: "Pendiente",
  validado: "Validado",
  rechazado: "Rechazado",
};

interface PaymentListProps {
  requests: PaymentValidationRequest[];
  loading: boolean;
  error: string | null;
  activeFilter: FilterKey;
  onFilterChange: (filter: FilterKey) => void;
  onSelect: (request: PaymentValidationRequest) => void;
  onRetry: () => void;
}

export default function PaymentList({
  requests,
  loading,
  error,
  activeFilter,
  onFilterChange,
  onSelect,
  onRetry,
}: PaymentListProps) {
  const filtered =
    activeFilter === "all"
      ? requests
      : requests.filter((r) => r.validationStatus === activeFilter);

  const counts = {
    total: requests.length,
    pending: requests.filter((r) => r.validationStatus === "pendiente").length,
    approved: requests.filter((r) => r.validationStatus === "validado").length,
    rejected: requests.filter((r) => r.validationStatus === "rechazado").length,
  };

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLTableRowElement>,
    request: PaymentValidationRequest
  ) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(request);
    }
  }

  return (
    <>
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

      {/* Filters */}
      <div className="mb-6 flex items-center gap-2">
        <Filter size={14} strokeWidth={1.5} className="text-cata-gray" aria-hidden="true" />
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => onFilterChange(f.key)}
            aria-pressed={activeFilter === f.key}
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
      {loading && <PaymentSkeleton />}

      {/* Error state */}
      {error && !loading && (
        <div className="card border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-cata-red">{error}</p>
          <button
            type="button"
            onClick={onRetry}
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
                  : `No hay solicitudes ${activeFilter === "pendiente" ? "pendientes" : activeFilter === "validado" ? "validadas" : "rechazadas"}.`}
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
                    onClick={() => onSelect(req)}
                    onKeyDown={(e) => handleKeyDown(e, req)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Ver detalle de ${req.studentName}, estado ${validationStatusLabels[req.validationStatus]}`}
                    className="cursor-pointer transition-colors hover:bg-cata-warm/60 focus:outline-none focus:ring-2 focus:ring-cata-red/30 focus:ring-inset"
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
                        {req.validationStatus === "pendiente" && (
                          <Clock size={12} strokeWidth={2} aria-hidden="true" />
                        )}
                        {req.validationStatus === "validado" && (
                          <CheckCircle2 size={12} strokeWidth={2} aria-hidden="true" />
                        )}
                        {req.validationStatus === "rechazado" && (
                          <XCircle size={12} strokeWidth={2} aria-hidden="true" />
                        )}
                        {req.validationStatus === "pendiente"
                          ? "Pendiente"
                          : req.validationStatus === "validado"
                            ? "Validado"
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
  );
}


