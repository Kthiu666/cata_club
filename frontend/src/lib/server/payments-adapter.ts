/**
 * Translates FastAPI's `/membresias/pagos*` DTOs (camelCase, see backend
 * app/presentacion/schemas/membresia_pago_schemas.py) into the
 * `PaymentValidationRequest` shape `src/app/payments/page.tsx` already
 * consumes — server-only, used by the Route Handlers under
 * `src/app/api/payments/**`.
 *
 * `PagoListItemDTO` (the queue list) doesn't carry the membership's current
 * status or plan type — those live on `Membresia`/`TipoMembresia`, fetched
 * separately per row. Acceptable for an admin validation queue (small,
 * infrequent, not a hot path); revisit if the queue grows large enough for
 * N+1 to matter.
 */

import type { MembershipStatus, PaymentValidationRequest, ProofFileType, ValidationStatus } from "@/services/api";

export type BackendEstadoPago = "APROBADO" | "PENDIENTE_VALIDACION" | "RECHAZADO";
export type BackendEstadoMembresia = "INACTIVA" | "ACTIVA" | "VENCIDA";
export type BackendTipoPago = "EFECTIVO" | "TRANSFERENCIA";

const VALIDATION_STATUS_BY_ESTADO_PAGO: Record<BackendEstadoPago, ValidationStatus> = {
  APROBADO: "validado",
  PENDIENTE_VALIDACION: "pendiente",
  RECHAZADO: "rechazado",
};

// PaymentValidationRequest.currentMembershipStatus has no "inactiva" value.
// INACTIVA (membership created, never had an approved payment) reads
// closest to "vencida" (needs a payment to become current) for this queue.
// Exported: src/lib/server/members-adapter.ts reuses this exact mapping —
// `EstadoMembresia` (domain.ts) is the same 3-value union as `MembershipStatus`.
export const MEMBERSHIP_STATUS_BY_ESTADO: Record<BackendEstadoMembresia, MembershipStatus> = {
  ACTIVA: "activa",
  VENCIDA: "vencida",
  INACTIVA: "vencida",
};

const PAYMENT_METHOD_BY_TIPO_PAGO: Record<BackendTipoPago, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
};

function proofFileType(voucherFormato?: string | null): ProofFileType {
  return voucherFormato?.toLowerCase().includes("pdf") ? "pdf" : "image";
}

function proofFileName(voucherUrl?: string | null): string {
  if (!voucherUrl) return "Sin comprobante adjunto";
  const lastSegment = voucherUrl.split("/").pop();
  return lastSegment || "Comprobante";
}

/** Fields common to both `PagoListItemDTO` and `PagoResponseDTO` (camelCase, as received from FastAPI). */
export interface BackendPagoCore {
  id: number;
  monto: string;
  estadoPago: BackendEstadoPago;
  tipoPago: BackendTipoPago;
  fechaRegistro: string;
  fechaValidacion?: string | null;
  fechaInicio: string;
  fechaFin: string;
  personaId: number;
  membresiaId: number;
  voucherUrl?: string | null;
  voucherFormato?: string | null;
}

/** `PagoListItemDTO` — the queue list adds the student's name (denormalized server-side; not present on `PagoResponseDTO`). */
export interface BackendPagoListItem extends BackendPagoCore {
  personaNombreCompleto: string;
}

export interface BackendMembresia {
  estado: BackendEstadoMembresia;
  tipoMembresiaId: number;
}

export interface BackendTipoMembresia {
  id: number;
  categoria: string;
  franjaHoraria: string;
}

/** Fields of `PersonaResponseDTO` this feature needs — `PagoResponseDTO` (returned by the validar endpoint) doesn't carry the student's name, unlike `PagoListItemDTO`. */
export interface BackendPersona {
  nombres: string;
  apellidos: string;
}

export function personaFullName(persona: BackendPersona | undefined): string {
  return persona ? `${persona.nombres} ${persona.apellidos}`.trim() : "Estudiante";
}

export function buildPaymentValidationRequest(
  pago: BackendPagoCore,
  studentName: string,
  membresia: BackendMembresia,
  tipoMembresia: BackendTipoMembresia | undefined,
): PaymentValidationRequest {
  return {
    id: String(pago.id),
    studentName,
    membershipPeriod: `${pago.fechaInicio} – ${pago.fechaFin}`,
    membershipType: tipoMembresia ? `${tipoMembresia.categoria} (${tipoMembresia.franjaHoraria})` : "Sin tipo",
    expectedAmount: Number(pago.monto),
    paymentMethod: PAYMENT_METHOD_BY_TIPO_PAGO[pago.tipoPago],
    uploadedAt: pago.fechaRegistro,
    currentMembershipStatus: MEMBERSHIP_STATUS_BY_ESTADO[membresia.estado],
    proofFileName: proofFileName(pago.voucherUrl),
    proofFileType: proofFileType(pago.voucherFormato),
    proofPreviewUrl: pago.voucherUrl ?? undefined,
    validationStatus: VALIDATION_STATUS_BY_ESTADO_PAGO[pago.estadoPago],
    validatedAt: pago.fechaValidacion ?? undefined,
  };
}
