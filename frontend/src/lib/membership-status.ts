/**
 * Shared membership-status mapping, safe to import from both server-only
 * code (`lib/server/**`) and client components. Kept separate from
 * `lib/server/payments-adapter.ts` (which re-exports it for backward
 * compatibility) so no `"use client"` file has to reach into `lib/server/`.
 */
import type { MembershipStatus } from "@/services/api";

export type BackendEstadoMembresia = "INACTIVA" | "ACTIVA" | "VENCIDA";

// PaymentValidationRequest.currentMembershipStatus has no "inactiva" value.
// INACTIVA (membership created, never had an approved payment) reads
// closest to "vencida" (needs a payment to become current).
export const MEMBERSHIP_STATUS_BY_ESTADO: Record<BackendEstadoMembresia, MembershipStatus> = {
  ACTIVA: "activa",
  VENCIDA: "vencida",
  INACTIVA: "vencida",
};
