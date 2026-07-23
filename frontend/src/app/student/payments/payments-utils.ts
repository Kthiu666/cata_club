/**
 * Pure utility functions for the Student payments page.
 *
 * Extracted for testability — no React dependencies. Same pattern as
 * attendance-utils.ts / members-utils.ts.
 */

import type { PagoPersona } from "@/services/api";

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export type PagoStatusFilter = "TODOS" | "PENDIENTE_VALIDACION" | "APROBADO" | "RECHAZADO";

export const PAGO_FILTER_LABELS: Record<PagoStatusFilter, string> = {
  TODOS: "Todos",
  PENDIENTE_VALIDACION: "Pendientes",
  APROBADO: "Aprobados",
  RECHAZADO: "Rechazados",
};

/**
 * Filter a payment list by status. "TODOS" returns the full list.
 */
export function filterPagosByStatus(
  pagos: PagoPersona[],
  filter: PagoStatusFilter,
): PagoPersona[] {
  if (filter === "TODOS") return pagos;
  return pagos.filter((p) => p.estadoPago === filter);
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

/**
 * Sort payments newest-first by `fechaRegistro`.
 */
export function sortPagosByDate(pagos: PagoPersona[]): PagoPersona[] {
  return [...pagos].sort(
    (a, b) => new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime(),
  );
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** Human-readable payment method label. */
export const TIPO_PAGO_LABEL: Record<PagoPersona["tipoPago"], string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
};

/** Format a payment amount string for display. */
export function formatPagoMonto(monto: string): string {
  return `$${monto}`;
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

/**
 * Contextual message for the empty-state card depending on the active filter.
 */
export function getEmptyStateMessage(filter: PagoStatusFilter): string {
  switch (filter) {
    case "TODOS":
      return "Todavía no hay pagos registrados.";
    case "APROBADO":
      return "No hay pagos aprobados.";
    case "RECHAZADO":
      return "No hay pagos rechazados.";
    case "PENDIENTE_VALIDACION":
      return "No hay pagos pendientes de validación.";
  }
}
