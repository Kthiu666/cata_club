/**
 * API Client — Cata Club Admin Frontend
 *
 * Centralised HTTP client that switches between local mock Route Handlers
 * and the real Python backend based on environment variables.
 *
 * Environment variables (NEXT_PUBLIC_*):
 *   NEXT_PUBLIC_USE_MOCKS  — Defaults to true (mocked) when unset.
 *                            Set to "false" explicitly to hit the real backend.
 *   NEXT_PUBLIC_API_URL    — Base URL of the real backend (used when mocks are off)
 *
 * IMPORTANT: NEXT_PUBLIC_* values are baked into the client bundle at
 *    build time. Changing them requires restarting the dev server or
 *    rebuilding for production. They are NOT read at runtime on the client.
 *
 * Timeout: every request aborts after 10 seconds by default (see `request`).
 *          If the caller provides their own `signal`, the caller manages
 *          timeout instead — so provide one if you need timeout guarantees.
 */

// ---------------------------------------------------------------------------
// Types — Membership Payment Validation (CU012)
// ---------------------------------------------------------------------------

/**
 * Membership lifecycle status — aligns with `EstadoMembresia` in domain.ts.
 * Membership is created/activated only after payment is approved.
 */
export type MembershipStatus =
  | "activa"
  | "vencida"
  | "suspendida";

/**
 * Payment proof validation status — aligns with `EstadoValidacion` in domain.ts.
 */
export type ValidationStatus = "pendiente" | "validado" | "rechazado";

export type ProofFileType = "image" | "pdf";

/**
 * PaymentValidationRequest — Represents a membership payment proof
 * submitted by a responsible payer (representative or self-managed student),
 * awaiting admin validation.
 *
 * Maps to CU012: "Validar o rechazar comprobante de pago".
 */
/**
 * PaymentValidationRequest — Represents a membership payment proof
 * submitted by a responsible payer (representative or self-managed student),
 * awaiting admin validation.
 *
 * Maps to CU012: "Validar o rechazar comprobante de pago".
 */
export interface PaymentValidationRequest {
  id: string;
  studentName: string;
  /** Name of the account owner / responsible payer who submitted this proof.
   *  Replaces the old `representativeName` concept. */
  responsablePagoName?: string;
  /** @deprecated Use `responsablePagoName` instead. */
  representativeName?: string;
  membershipPeriod: string;
  membershipType: string;
  expectedAmount: number;
  paymentMethod: string;
  uploadedAt: string;
  currentMembershipStatus: MembershipStatus;
  proofFileName: string;
  proofFileType: ProofFileType;
  proofPreviewUrl?: string;
  validationStatus: ValidationStatus;
  rejectionReason?: string;
  validatedAt?: string;
  validatedBy?: string;
}

/** DTO for approving a payment validation request. */
export interface ApprovePaymentDTO {
  action: "approved";
}

/** DTO for rejecting a payment validation request. */
export interface RejectPaymentDTO {
  action: "rejected";
  rejectionReason: string;
}

export type UpdatePaymentValidationDTO = ApprovePaymentDTO | RejectPaymentDTO;

export interface ApiError {
  message: string;
  status: number;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Resolve the API base URL at call time.
 *
 * Using a function instead of a module-level constant makes the behaviour
 * predictable in test environments where env vars may be set per-test.
 *
 * NEXT_PUBLIC_* values are replaced at build time by Next.js. Changing
 * .env.local requires restarting `pnpm dev` or rebuilding for production.
 *
 * Mock default: when NEXT_PUBLIC_USE_MOCKS is unset, local dev defaults to
 * mocked Route Handlers. Only set it to "false" explicitly for real backend.
 * Any other value (including "true", undefined, "1", etc.) resolves to mocks.
 */
function getBaseUrl(): string {
  const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  return useMocks ? "" : apiUrl;
}

/**
 * Resolve the correct endpoint for the current mode.
 *
 * In mock mode, Next.js Route Handlers live under /api/ so the full path
 * must start with /api/... In real backend mode, NEXT_PUBLIC_API_URL
 * already includes the /api/v1 prefix, so the resource path is appended
 * directly (e.g. "/payments").
 *
 * Mock default: when NEXT_PUBLIC_USE_MOCKS is unset, local dev defaults to
 * mocked Route Handlers. Only set it to "false" explicitly for real backend.
 *
 * @param resource — the resource path, e.g. "/payments" or "/payments/:id"
 */
function apiEndpoint(resource: string): string {
  const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";
  return useMocks ? `/api${resource}` : resource;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Merge one or more HeadersInit sources into a plain object.
 *
 * Handles every valid HeadersInit type:
 *  - Record<string, string>
 *  - [string, string][]   (tuples)
 *  - Headers instance
 *  - undefined (skipped)
 */
function toPlainHeaders(...sources: (HeadersInit | undefined)[]): Record<string, string> {
  const merged = new Headers();
  for (const source of sources) {
    if (!source) continue;
    const headers = new Headers(source);
    for (const [key, value] of headers.entries()) {
      merged.set(key, value);
    }
  }
  const result: Record<string, string> = {};
  merged.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

export class ApiClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
  }
}

function getMockRoleHeader(): Record<string, string> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem("cata-club-auth-session");
    if (!raw) return {};
    const session = JSON.parse(raw);
    const role = session?.user?.role;
    if (role) return { "x-mock-role": role };
  } catch (e) {
    console.error("Failed to read mock role from localStorage:", e);
    return {};
  }
  return {};
}

function isMockMode(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCKS !== "false";
}

const DEFAULT_TIMEOUT_MS = 10_000;

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const url = `${getBaseUrl()}${endpoint}`;

  // Timeout handling: if the caller provides their own AbortSignal they are
  // responsible for timeout; otherwise we set a default 10 s timeout.
  let controller: AbortController | undefined;
  let signal: AbortSignal;

  if (options.signal) {
    signal = options.signal;
  } else {
    controller = new AbortController();
    signal = controller.signal;
  }

  const timeoutId = controller !== undefined ? setTimeout(() => controller.abort(), timeoutMs) : undefined;

  const headers = toPlainHeaders(
    { "Content-Type": "application/json" },
    options.headers,
  );

  try {
    const response = await fetch(url, {
      ...options,
      signal,
      headers,
    });

    if (!response.ok) {
      let message = `Request failed with status ${response.status}`;
      try {
        const errorBody = await response.json();
        message = errorBody.message || message;
      } catch {
        // ignore parse errors — use default message
      }
      throw new ApiClientError(message, response.status);
    }

    return response.json() as Promise<T>;
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

// ---------------------------------------------------------------------------
// Membership Payment Validation API Methods
// ---------------------------------------------------------------------------

/**
 * Fetch all payment validation requests.
 */
export async function fetchPaymentValidations(): Promise<PaymentValidationRequest[]> {
  const mockHeaders = isMockMode() ? getMockRoleHeader() : {};
  return request<PaymentValidationRequest[]>(apiEndpoint("/payments"), {
    headers: mockHeaders,
  });
}

/**
 * Update a payment validation request (approve or reject).
 *
 * - Approve: `{ action: "approved" }`
 * - Reject:  `{ action: "rejected", rejectionReason: "..." }`
 */
export async function updatePaymentValidation(
  id: string,
  data: UpdatePaymentValidationDTO,
): Promise<PaymentValidationRequest> {
  const mockHeaders = isMockMode() ? getMockRoleHeader() : {};
  return request<PaymentValidationRequest>(apiEndpoint(`/payments/${id}`), {
    method: "PUT",
    body: JSON.stringify(data),
    headers: mockHeaders,
  });
}
