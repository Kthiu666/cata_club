/**
 * In-Memory Mock Store
 *
 * Shared mutable store for local development mocks.
 * Data resets on server restart — never used in production.
 */

import type { PaymentValidationRequest } from "./api";

// ---------------------------------------------------------------------------
// Payment Validation Mock Data (CU012)
// ---------------------------------------------------------------------------

const initialPayments: PaymentValidationRequest[] = [
  {
    id: "pv-001",
    studentName: "Sofia Martinez",
    responsablePagoName: "Carlos Martinez",
    representativeName: "Carlos Martinez",
    membershipPeriod: "Julio 2026",
    membershipType: "Mensual",
    expectedAmount: 85.0,
    paymentMethod: "Transferencia Bancaria",
    uploadedAt: "2026-06-28T10:30:00Z",
    currentMembershipStatus: "vencida",
    proofFileName: "comprobante_pago_sofia_julio.pdf",
    proofFileType: "pdf",
    validationStatus: "pendiente",
  },
  {
    id: "pv-002",
    studentName: "Mateo Rodriguez",
    membershipPeriod: "Julio 2026",
    membershipType: "Mensual",
    expectedAmount: 85.0,
    paymentMethod: "Efectivo",
    uploadedAt: "2026-06-27T14:15:00Z",
    currentMembershipStatus: "vencida",
    proofFileName: "pago_mateo_julio.jpeg",
    proofFileType: "image",
    proofPreviewUrl: "/brand/cata-club-logo.jpeg",
    validationStatus: "pendiente",
  },
  {
    id: "pv-003",
    studentName: "Valentina Lopez",
    responsablePagoName: "Ana Lopez",
    representativeName: "Ana Lopez",
    membershipPeriod: "Julio 2026",
    membershipType: "Trimestral",
    expectedAmount: 240.0,
    paymentMethod: "Transferencia Bancaria",
    uploadedAt: "2026-06-26T09:00:00Z",
    currentMembershipStatus: "activa",
    proofFileName: "comprobante_valentina_q3.pdf",
    proofFileType: "pdf",
    validationStatus: "validado",
    validatedAt: "2026-06-26T11:20:00Z",
    validatedBy: "admin@cataclub.com",
  },
  {
    id: "pv-004",
    studentName: "Benjamin Torres",
    membershipPeriod: "Junio 2026",
    membershipType: "Mensual",
    expectedAmount: 85.0,
    paymentMethod: "Tarjeta",
    uploadedAt: "2026-06-25T16:45:00Z",
    currentMembershipStatus: "vencida",
    proofFileName: "pago_benjamin_junio.png",
    proofFileType: "image",
    validationStatus: "rechazado",
    rejectionReason: "El comprobante no corresponde al monto de la membresía mensual. El monto esperado es $85.00, el comprobante muestra $50.00.",
    validatedAt: "2026-06-25T17:30:00Z",
    validatedBy: "admin@cataclub.com",
  },
  {
    id: "pv-005",
    studentName: "Camila Flores",
    responsablePagoName: "Diego Flores",
    representativeName: "Diego Flores",
    membershipPeriod: "Julio 2026",
    membershipType: "Mensual",
    expectedAmount: 85.0,
    paymentMethod: "Transferencia Bancaria",
    uploadedAt: "2026-06-29T08:00:00Z",
    currentMembershipStatus: "vencida",
    proofFileName: "pago_camila_julio.pdf",
    proofFileType: "pdf",
    validationStatus: "pendiente",
  },
  {
    id: "pv-006",
    studentName: "Nicolas Acosta",
    membershipPeriod: "Julio 2026",
    membershipType: "Anual",
    expectedAmount: 720.0,
    paymentMethod: "Transferencia Bancaria",
    uploadedAt: "2026-06-24T13:20:00Z",
    currentMembershipStatus: "activa",
    proofFileName: "comprobante_nicolas_anual.pdf",
    proofFileType: "pdf",
    validationStatus: "validado",
    validatedAt: "2026-06-24T15:00:00Z",
    validatedBy: "admin@cataclub.com",
  },
  {
    id: "pv-007",
    studentName: "Emilia Castillo",
    responsablePagoName: "Carlos Martinez",
    representativeName: "Carlos Martinez",
    membershipPeriod: "Agosto 2026",
    membershipType: "Mensual",
    expectedAmount: 85.0,
    paymentMethod: "Transferencia Bancaria",
    uploadedAt: "2026-06-29T16:00:00Z",
    currentMembershipStatus: "vencida",
    proofFileName: "comprobante_emilia_agosto.pdf",
    proofFileType: "pdf",
    validationStatus: "pendiente",
  },
  {
    id: "pv-008",
    studentName: "Santiago Ramirez",
    membershipPeriod: "Julio 2026",
    membershipType: "Mensual",
    expectedAmount: 85.0,
    paymentMethod: "Efectivo",
    uploadedAt: "2026-06-26T12:00:00Z",
    currentMembershipStatus: "vencida",
    proofFileName: "pago_santiago_julio.jpeg",
    proofFileType: "image",
    validationStatus: "pendiente",
  },
];

let payments: PaymentValidationRequest[] = [...initialPayments];

export function getPaymentValidations(): PaymentValidationRequest[] {
  return [...payments];
}

export function getPaymentValidationById(id: string): PaymentValidationRequest | undefined {
  return payments.find((p) => p.id === id);
}

export function updatePaymentValidation(
  id: string,
  updates: Partial<PaymentValidationRequest>,
): PaymentValidationRequest | undefined {
  const index = payments.findIndex((p) => p.id === id);
  if (index === -1) return undefined;
  payments[index] = { ...payments[index], ...updates, id };
  return payments[index];
}

// ---------------------------------------------------------------------------
// Determinism helpers
// ---------------------------------------------------------------------------

/**
 * Reset the entire mock store to its initial seeded state.
 *
 * Call this in a `beforeEach` hook in every test suite that mutates the store
 * to guarantee test isolation and eliminate order-dependent failures.
 */
export function resetMockStore(): void {
  payments = initialPayments.map((p) => ({ ...p }));
}

export interface TransitionVerdict {
  valid: boolean;
  message?: string;
}

/**
 * Validate whether a payment validation request may transition to the given
 * action (approved / rejected).  Only requests whose current validationStatus
 * is "pendiente" may be acted upon.
 *
 * This is a pure domain guard used by the PUT /api/payments/:id route handler.
 */
export function validatePaymentValidationTransition(
  current: Pick<PaymentValidationRequest, "validationStatus" | "id">,
  action: "approved" | "rejected",
): TransitionVerdict {
  if (current.validationStatus !== "pendiente") {
    return {
      valid: false,
      message:
        `Cannot ${action} request "${current.id}": current status is ` +
        `"${current.validationStatus}". Only pending requests can be validated.`,
    };
  }
  return { valid: true };
}
