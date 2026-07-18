/**
 * API Client — Cata Club Admin Frontend
 *
 * Centralised HTTP client. Every call goes same-origin to a Next.js Route
 * Handler under /api/* (see `getBaseUrl`/`apiEndpoint` below for why this
 * client never talks to the backend directly). Each resource's Route
 * Handler independently decides whether it's still backed by mock data or
 * already proxies to the real FastAPI backend — that's tracked per screen,
 * not by a single global flag here anymore.
 *
 * `NEXT_PUBLIC_USE_MOCKS` still exists only to pick the `x-mock-role`
 * header (see `isMockMode`/`getMockRoleHeader`) for the Route Handlers that
 * are still mock-backed. It no longer affects which URL this client calls.
 *
 * Timeout: every request aborts after 10 seconds by default (see `request`).
 *          If the caller provides their own `signal`, the caller manages
 *          timeout instead — so provide one if you need timeout guarantees.
 */

import type { UserRole } from "@/types/domain";
import type { EnrollmentRequest, EnrollmentResponse } from "@/types/enrollment";

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
 * Every request goes same-origin, to a Next.js Route Handler under /api/*
 * — never directly to the backend from the browser.
 *
 * The access/refresh tokens live only in HttpOnly cookies set by the BFF
 * (see src/lib/server/auth.ts). Those cookies are invisible to browser JS
 * and scoped to this origin, so a cross-origin fetch straight to
 * NEXT_PUBLIC_API_URL (the old "direct backend" mode this used to support)
 * could never carry auth — it would 401/404 regardless of path. Protected
 * data must be proxied server-side: the Route Handler reads the cookie and
 * attaches `Authorization: Bearer` itself (see
 * src/lib/server/backend-client.ts's `backendFetchAuthed`).
 */
function getBaseUrl(): string {
  return "";
}

/**
 * Resolve the endpoint path — always a same-origin Route Handler under /api/.
 *
 * @param resource — the resource path, e.g. "/payments" or "/payments/:id"
 */
function apiEndpoint(resource: string): string {
  return `/api${resource}`;
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

/**
 * Current auth role, mirrored here from AuthContext (see `setCurrentMockRole`)
 * whenever the session changes. Replaces a prior localStorage-based read —
 * nothing has persisted a session to localStorage since auth moved to the
 * BFF/HttpOnly-cookie model, so that read always came back empty.
 */
let currentMockRole: UserRole | null = null;

/**
 * Called by AuthContext whenever its session changes, so the mock-mode
 * `x-mock-role` header reflects the real, current auth session instead of a
 * dead localStorage key.
 */
export function setCurrentMockRole(role: UserRole | null): void {
  currentMockRole = role;
}

function isMockRoleSession(value: unknown): value is { user: { role: UserRole } } {
  return (
    typeof value === "object" &&
    value !== null &&
    "user" in value &&
    typeof (value as { user: unknown }).user === "object" &&
    (value as { user: { role: unknown } }).user !== null &&
    typeof (value as { user: { role: unknown } }).user.role === "string"
  );
}

/**
 * Legacy fallback: before AuthContext started mirroring the current role via
 * `setCurrentMockRole` on every session change, this read a role snapshot
 * directly out of localStorage. Nothing writes that key anymore in the real
 * auth flow, so this branch is unreachable in practice — kept only so
 * pre-existing localStorage-stubbing tests keep exercising a defined code
 * path rather than being rewritten.
 */
function legacyLocalStorageRoleHeader(): Record<string, string> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem("cata-club-auth-session");
    if (!raw) return {};
    const session: unknown = JSON.parse(raw);
    if (isMockRoleSession(session)) {
      return { "x-mock-role": session.user.role };
    }
  } catch {
    return {};
  }
  return {};
}

function getMockRoleHeader(): Record<string, string> {
  if (currentMockRole) return { "x-mock-role": currentMockRole };
  return legacyLocalStorageRoleHeader();
}

function isMockMode(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCKS !== "false";
}

const DEFAULT_TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// 401 refresh-and-retry (Phase 4)
// ---------------------------------------------------------------------------

/**
 * Methods considered safe to silently retry after a refreshed access token.
 * GET/HEAD have no side effects; PUT is idempotent by HTTP semantics (a full
 * resource replace — repeating it is safe). POST/PATCH are NOT retried
 * automatically since a generic client can't guarantee the original request
 * had no side effect yet — replaying it could double it (e.g. resubmitting
 * a payment action). A caller needing a retryable POST should special-case
 * it explicitly rather than relying on this generic client.
 */
const RETRYABLE_METHODS = new Set(["GET", "HEAD", "PUT", "DELETE"]);

function isRetryableMethod(method: string | undefined): boolean {
  return RETRYABLE_METHODS.has((method ?? "GET").toUpperCase());
}

let refreshPromise: Promise<boolean> | null = null;
let refreshController: AbortController | null = null;

/**
 * De-duplicated refresh: concurrent 401s across requests share one
 * in-flight /api/auth/refresh call instead of each independently
 * triggering a refresh (avoids a refresh storm).
 */
function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshController = new AbortController();
    refreshPromise = fetch("/api/auth/refresh", { method: "POST", signal: refreshController.signal })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
        refreshController = null;
      });
  }
  return refreshPromise;
}

/**
 * Abort any in-flight refresh so it can never land a Set-Cookie after an
 * explicit logout has cleared the access-token cookie (Max-Age=0) — call
 * this right before POSTing /api/auth/logout. This only closes the race on
 * the client; a full server-side guarantee would need session versioning,
 * which is out of scope here.
 */
export function discardInFlightRefresh(): void {
  refreshController?.abort();
  refreshPromise = null;
}

type AuthFailureListener = () => void;
const authFailureListeners = new Set<AuthFailureListener>();

/**
 * Subscribe to "the session could not be recovered" notifications — used by
 * AuthContext to clear local session state (trigger logout/redirect-to-login)
 * when a refresh-and-retry ultimately fails. Returns an unsubscribe function.
 */
export function subscribeAuthFailure(listener: AuthFailureListener): () => void {
  authFailureListeners.add(listener);
  return () => authFailureListeners.delete(listener);
}

function notifyAuthFailure(): void {
  authFailureListeners.forEach((listener) => listener());
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  isRetry = false,
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

    if (response.status === 401) {
      if (!isRetry) {
        const refreshed = await refreshAccessToken();
        if (refreshed && isRetryableMethod(options.method)) {
          return request<T>(endpoint, options, timeoutMs, true);
        }
        if (!refreshed) {
          notifyAuthFailure();
        }
        // else: refresh succeeded but this method isn't safe to auto-retry —
        // let THIS call fail below; the session itself is fine going forward.
      } else {
        // Already retried once with a refreshed token and still 401 — give up.
        notifyAuthFailure();
      }
    }

    if (!response.ok) {
      let message = `Request failed with status ${response.status}`;
      try {
        const errorBody: unknown = await response.json();
        if (isApiErrorBody(errorBody)) {
          message = errorBody.detail ?? errorBody.message ?? message;
        }
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

/** Submit one public, backend-transactional enrollment request. */
export async function enrollStudent(data: EnrollmentRequest): Promise<EnrollmentResponse> {
  const response: unknown = await request<unknown>(apiEndpoint("/enrollment/"), {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!isEnrollmentResponse(response)) {
    throw new ApiClientError("La respuesta de inscripción no es válida.", 502);
  }
  return { enrolled: true };
}

function isApiErrorBody(value: unknown): value is { message?: string; detail?: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const body = value as Record<string, unknown>;
  return (typeof body.message === "string" && body.message.length > 0) ||
    (typeof body.detail === "string" && body.detail.length > 0);
}

function isEnrollmentResponse(value: unknown): value is EnrollmentResponse {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const response = value as Record<string, unknown>;
  return Object.keys(response).length === 1 && response.enrolled === true;
}
