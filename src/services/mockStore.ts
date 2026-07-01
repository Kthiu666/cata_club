/**
 * In-Memory Mock Store
 *
 * Shared mutable store for local development mocks.
 * Data resets on server restart — never used in production.
 */

import type { Product, PaymentValidationRequest } from "./api";

// ---------------------------------------------------------------------------
// Product Mock Data (legacy — hidden from nav, kept for existing tests)
// ---------------------------------------------------------------------------

const initialProducts: Product[] = [
  {
    id: "1",
    name: "Laptop Gamer X1",
    description: "High-performance laptop with dedicated GPU and 16 GB RAM.",
    price: 1299.99,
    stock: 15,
    category: "Electrónica",
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-15T14:30:00Z",
  },
  {
    id: "2",
    name: 'Monitor 27" 4K',
    description: "27-inch 4K UHD monitor with IPS panel.",
    price: 449.5,
    stock: 30,
    category: "Electrónica",
    createdAt: "2026-05-20T08:00:00Z",
    updatedAt: "2026-06-10T12:00:00Z",
  },
  {
    id: "3",
    name: "Teclado Mecánico RGB",
    description: "Mechanical keyboard with Cherry MX Blue switches.",
    price: 89.99,
    stock: 50,
    category: "Accesorios",
    createdAt: "2026-06-05T09:00:00Z",
    updatedAt: "2026-06-12T16:00:00Z",
  },
  {
    id: "4",
    name: "Mouse Inalámbrico",
    description: "Ergonomic wireless mouse with 6 programmable buttons.",
    price: 39.99,
    stock: 100,
    category: "Accesorios",
    createdAt: "2026-06-08T11:00:00Z",
    updatedAt: "2026-06-14T10:00:00Z",
  },
  {
    id: "5",
    name: "Webcam HD 1080p",
    description: "Full HD webcam with built-in microphone and auto-focus.",
    price: 59.99,
    stock: 25,
    category: "Accesorios",
    createdAt: "2026-06-10T13:00:00Z",
    updatedAt: "2026-06-10T13:00:00Z",
  },
];

let products: Product[] = [...initialProducts];
let nextProductId = 6;

export function getProducts(): Product[] {
  return products;
}

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function addProduct(product: Product): void {
  products.push(product);
}

export function updateProduct(id: string, updates: Partial<Product>): Product | undefined {
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return undefined;

  products[index] = { ...products[index], ...updates, id };
  return products[index];
}

export function removeProduct(id: string): boolean {
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return false;
  products.splice(index, 1);
  return true;
}

export function getNextProductId(): string {
  return String(nextProductId++);
}

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
    currentMembershipStatus: "pending_validation",
    proofFileName: "comprobante_pago_sofia_julio.pdf",
    proofFileType: "pdf",
    validationStatus: "pending",
  },
  {
    id: "pv-002",
    studentName: "Mateo Rodriguez",
    membershipPeriod: "Julio 2026",
    membershipType: "Mensual",
    expectedAmount: 85.0,
    paymentMethod: "Efectivo",
    uploadedAt: "2026-06-27T14:15:00Z",
    currentMembershipStatus: "pending_validation",
    proofFileName: "pago_mateo_julio.jpeg",
    proofFileType: "image",
    proofPreviewUrl: "/brand/cata-club-logo.jpeg",
    validationStatus: "pending",
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
    currentMembershipStatus: "active",
    proofFileName: "comprobante_valentina_q3.pdf",
    proofFileType: "pdf",
    validationStatus: "approved",
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
    currentMembershipStatus: "pending_payment",
    proofFileName: "pago_benjamin_junio.png",
    proofFileType: "image",
    validationStatus: "rejected",
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
    currentMembershipStatus: "pending_validation",
    proofFileName: "pago_camila_julio.pdf",
    proofFileType: "pdf",
    validationStatus: "pending",
  },
  {
    id: "pv-006",
    studentName: "Nicolas Acosta",
    membershipPeriod: "Julio 2026",
    membershipType: "Anual",
    expectedAmount: 720.0,
    paymentMethod: "Transferencia Bancaria",
    uploadedAt: "2026-06-24T13:20:00Z",
    currentMembershipStatus: "active",
    proofFileName: "comprobante_nicolas_anual.pdf",
    proofFileType: "pdf",
    validationStatus: "approved",
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
    currentMembershipStatus: "pending_validation",
    proofFileName: "comprobante_emilia_agosto.pdf",
    proofFileType: "pdf",
    validationStatus: "pending",
  },
  {
    id: "pv-008",
    studentName: "Santiago Ramirez",
    membershipPeriod: "Julio 2026",
    membershipType: "Mensual",
    expectedAmount: 85.0,
    paymentMethod: "Efectivo",
    uploadedAt: "2026-06-26T12:00:00Z",
    currentMembershipStatus: "pending_validation",
    proofFileName: "pago_santiago_julio.jpeg",
    proofFileType: "image",
    validationStatus: "pending",
  },
];

let payments: PaymentValidationRequest[] = [...initialPayments];

export function getPaymentValidations(): PaymentValidationRequest[] {
  return payments;
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
  products = initialProducts.map((p) => ({ ...p }));
  payments = initialPayments.map((p) => ({ ...p }));
  nextProductId = 6;
}

export interface TransitionVerdict {
  valid: boolean;
  message?: string;
}

/**
 * Validate whether a payment validation request may transition to the given
 * action (approved / rejected).  Only requests whose current validationStatus
 * is "pending" may be acted upon.
 *
 * This is a pure domain guard used by the PUT /api/payments/:id route handler.
 */
export function validatePaymentValidationTransition(
  current: Pick<PaymentValidationRequest, "validationStatus" | "id">,
  action: "approved" | "rejected",
): TransitionVerdict {
  if (current.validationStatus !== "pending") {
    return {
      valid: false,
      message:
        `Cannot ${action} request "${current.id}": current status is ` +
        `"${current.validationStatus}". Only pending requests can be validated.`,
    };
  }
  return { valid: true };
}
