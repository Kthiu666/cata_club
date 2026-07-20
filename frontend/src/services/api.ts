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

import type {
  UserRole,
  EstadoAsistencia,
  CategoriaRanking,
  ResultadoMensual,
  CierreMensual,
  SeleccionOficial,
  PersonaReporte,
} from "@/types/domain";
import type { EnrollmentRequest, EnrollmentResponse } from "@/types/enrollment";
import type { AttendanceRecord, TrainingSchedule } from "@/app/attendance/attendance-utils";
import type { MemberAccount } from "@/app/members/members-utils";

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

function getMockRoleHeader(): Record<string, string> {
  if (currentMockRole) return { "x-mock-role": currentMockRole };
  return {};
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

// ---------------------------------------------------------------------------
// Types — Attendance & Ranking (Fase 3)
// ---------------------------------------------------------------------------

/**
 * A ranking level with current occupancy — `GET /ranking/niveles`.
 * `NivelRanking` IS the "Grupo" concept for the frontend (see backend's
 * ranking_schemas.py module docstring); already camelCase, passed through
 * unmodified by the Route Handler.
 */
export interface NivelConOcupacion {
  id: number;
  numeroNivel: number;
  nombre: string | null;
  capacidadMinima: number;
  capacidadMaxima: number;
  personasActuales: number;
  cuposDisponibles: number;
  necesitaRevision: boolean;
  nivelCategoria: "principiante" | "intermedio" | "avanzado";
}

/** A row of a nivel's roster — `GET /ranking/niveles/:id/tabla`. */
export interface TablaRankingItem {
  personaId: number;
  personaNombreCompleto: string;
  posicionActual: number | null;
  puntajeAcumulado: number;
  estaEnRanking: boolean;
}

/** One student's attendance mark, part of a `registerAttendance` batch. */
export interface AttendanceStudentMark {
  personaId: number;
  estado: EstadoAsistencia;
}

/** Request body for `POST /api/attendance/records` — registers real attendance for a session. */
export interface RegisterAttendanceRequest {
  horarioId: number;
  entrenadorId: number;
  /** ISO "YYYY-MM-DD"; defaults to today (server clock) when omitted. */
  fechaEntrenamiento?: string;
  students: AttendanceStudentMark[];
}

/** Result of a `registerAttendance` batch — tolerates partial failure (one POST per student). */
export interface RegisterAttendanceResult {
  createdCount: number;
  failed: { personaId: number; message: string }[];
}

// ---------------------------------------------------------------------------
// Attendance & Ranking API Methods (Fase 3)
// ---------------------------------------------------------------------------

/** List real training schedules (Horario). */
export async function fetchTrainingSchedules(): Promise<TrainingSchedule[]> {
  return request<TrainingSchedule[]>(apiEndpoint("/attendance/schedules"));
}

/** Fetch attendance records (Asistencia), optionally filtered by date range/horario/persona. */
export async function fetchAttendanceRecords(params?: {
  fechaInicio?: string;
  fechaFin?: string;
  horarioId?: number;
  personaId?: number;
}): Promise<AttendanceRecord[]> {
  const qs = new URLSearchParams();
  if (params?.fechaInicio) qs.set("fechaInicio", params.fechaInicio);
  if (params?.fechaFin) qs.set("fechaFin", params.fechaFin);
  if (params?.horarioId !== undefined) qs.set("horarioId", String(params.horarioId));
  if (params?.personaId !== undefined) qs.set("personaId", String(params.personaId));
  const query = qs.toString();
  return request<AttendanceRecord[]>(apiEndpoint(`/attendance/records${query ? `?${query}` : ""}`));
}

/** List ranking levels (Grupo) with current occupancy. */
export async function fetchNivelesConOcupacion(): Promise<NivelConOcupacion[]> {
  return request<NivelConOcupacion[]>(apiEndpoint("/ranking/niveles"));
}

/** Fetch a nivel's roster (E03-RF010) — used to derive who to mark attendance for. */
export async function fetchNivelRoster(nivelId: number): Promise<TablaRankingItem[]> {
  return request<TablaRankingItem[]>(apiEndpoint(`/ranking/niveles/${nivelId}/tabla`));
}

/** Persist attendance for a session (one real `POST /asistencias` per student, partial-failure-tolerant). */
export async function registerAttendance(data: RegisterAttendanceRequest): Promise<RegisterAttendanceResult> {
  return request<RegisterAttendanceResult>(apiEndpoint("/attendance/records"), {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ---------------------------------------------------------------------------
// Members & Groups API Methods (Fase 4)
// ---------------------------------------------------------------------------

/** List every account (responsible payer + managed students), aggregated server-side — see src/lib/server/members-adapter.ts. */
export async function fetchMembers(): Promise<MemberAccount[]> {
  return request<MemberAccount[]>(apiEndpoint("/members"));
}

/**
 * Assign a student with no prior nivel/group (`grupoId === null`) to one —
 * `POST /ranking/asignar-nivel-inicial`. Backend-role-restricted to
 * ENTRENADOR; an admin caller gets a real 403 here (see
 * src/app/api/groups/assign/route.ts's doc comment) — this is not a client
 * bug, it reflects the actual backend authorization rule.
 */
export async function assignStudentToNivel(personaId: number, nivelRankingId: number): Promise<void> {
  await request<unknown>(apiEndpoint("/groups/assign"), {
    method: "POST",
    body: JSON.stringify({ personaId, nivelRankingId }),
  });
}

/** Move an already-ranked student to a different nivel/group — `PATCH /ranking/{id}/mover-de-nivel`. Works for admin and entrenador. */
export async function moveStudentToNivel(personaId: number, nivelRankingId: number): Promise<void> {
  await request<unknown>(apiEndpoint("/groups/move"), {
    method: "PATCH",
    body: JSON.stringify({ personaId, nivelRankingId }),
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

// ---------------------------------------------------------------------------
// Types & API Methods — Student Portal (Fase 6)
// ---------------------------------------------------------------------------

/**
 * Ranking profile for one student — `GET /ranking/{id}/perfil` is
 * ownership-checked server-side (self, or ADMINISTRADOR/ENTRENADOR), so a
 * representante viewing a represented child's profile legitimately gets
 * `"unavailable"/"forbidden"` instead of data. See
 * src/lib/server/student-adapter.ts for the full gap writeup.
 */
export type StudentRankingSummary =
  | {
      status: "available";
      posicionActual: number | null;
      puntajeAcumulado: number;
      nivelNombre: string | null;
      estaEnRanking: boolean;
    }
  | { status: "unavailable"; reason: "forbidden" | "error" };

/** One real past attendance record — shown as "recent activity" in place of a future schedule the API can't derive per-student (see student-adapter.ts). */
export interface StudentSessionSummary {
  fecha: string;
  horario: string;
  estado: EstadoAsistencia;
}

/** One student's own profile — used both for the logged-in persona (`self`) and for each `representado`. */
export interface StudentProfileSummary {
  personaId: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento: string;
  ranking: StudentRankingSummary;
  recentSessions: StudentSessionSummary[];
}

/** A real `TipoMembresia` catalog entry (`GET /membresias/tipos`) — replaces the old hardcoded `membershipPlans` array. */
export interface MembershipPlanSummary {
  id: string;
  nombre: string;
  precio: number;
  franjaHoraria: string;
  modalidad: string;
}

/**
 * Full `/student` portal payload for the logged-in persona.
 *
 * Deliberately has no per-student membership/payment field: no backend
 * endpoint lets a student/representante read their own or their dependents'
 * Membresia/Pago (see src/lib/server/student-adapter.ts) — the page renders
 * an explicit "not available" card instead of a fabricated one.
 */
export interface StudentPortalSummary {
  self: StudentProfileSummary | null;
  representados: StudentProfileSummary[];
  membershipPlans: MembershipPlanSummary[];
}

/** Fetch the logged-in persona's own portal data (profile, representados, ranking, recent attendance) — `GET /api/student`. */
export async function fetchStudentPortal(personaId: string): Promise<StudentPortalSummary> {
  return request<StudentPortalSummary>(apiEndpoint(`/student?personaId=${encodeURIComponent(personaId)}`));
}

// ---------------------------------------------------------------------------
// Dashboard API Methods (Fase 7)
// ---------------------------------------------------------------------------

/** Aggregate counts for the admin overview — see src/app/api/dashboard/route.ts for how each is composed. */
export interface DashboardStats {
  totalPersonas: number;
  activeMemberships: number;
  pendingPayments: number;
  todaySchedules: number;
}

/** Fetch aggregate dashboard stats, composed server-side from `/personas`, `/membresias/pagos*` and `/asistencias/horarios` — `GET /api/dashboard`. */
export async function fetchDashboardStats(): Promise<DashboardStats> {
  return request<DashboardStats>(apiEndpoint("/dashboard"));
}

// ---------------------------------------------------------------------------
// Ranking (Track Ranking) API Methods
//
// Unlike the mock-store-backed /payments routes above, these BFF routes
// (src/app/api/ranking/**) always proxy to the real backend via the
// access-token cookie — mirroring the auth routes' pattern, not the mock
// pattern. See src/app/api/ranking/* route handlers for the proxy logic.
// ---------------------------------------------------------------------------

/** DTO for POST /ranking/resultados-mensuales — register a monthly result. */
export interface RegistrarResultadoMensualDTO {
  estudianteId: string;
  categoria: CategoriaRanking;
  /** "YYYY-MM" */
  periodo: string;
  puntos: number;
  observacion?: string;
}

/** DTO for POST /ranking/niveles/:id/cerrar-mes — close out a ranking month. */
export interface CerrarMesDTO {
  /** "YYYY-MM" */
  periodo: string;
}

/** DTO for POST /ranking/seleccion-oficial — register/update the official-selection roster. */
export interface SeleccionOficialDTO {
  estudianteId: string;
  categoria: CategoriaRanking;
  /** "YYYY-MM" */
  periodo: string;
}

/**
 * DTO for PATCH /ranking/niveles/:id — assign a student to a ranking
 * category. `:id` is the target `categoria` (1–10); the student being
 * assigned travels in the body. See the route handler's doc comment for
 * why this shape was chosen (gap-fill, not in the original backend contract).
 */
export interface AsignarNivelDTO {
  estudianteId: string;
}

/** Register a monthly ranking result for a student (CU — Resultados Mensuales). */
export async function registrarResultadoMensual(
  data: RegistrarResultadoMensualDTO,
): Promise<ResultadoMensual> {
  const mockHeaders = isMockMode() ? getMockRoleHeader() : {};
  return request<ResultadoMensual>(apiEndpoint("/ranking/resultados-mensuales"), {
    method: "POST",
    body: JSON.stringify(data),
    headers: mockHeaders,
  });
}

/** Close out the ranking month for a given category (CU — Cierre de Mes). Irreversible. */
export async function cerrarMes(
  categoria: CategoriaRanking,
  data: CerrarMesDTO,
): Promise<CierreMensual> {
  const mockHeaders = isMockMode() ? getMockRoleHeader() : {};
  return request<CierreMensual>(apiEndpoint(`/ranking/niveles/${categoria}/cerrar-mes`), {
    method: "POST",
    body: JSON.stringify(data),
    headers: mockHeaders,
  });
}

/** Re-admit ("reingresar") a previously dropped/inactive student into the ranking. */
export async function reingresar(estudianteId: string): Promise<{ success: boolean }> {
  const mockHeaders = isMockMode() ? getMockRoleHeader() : {};
  return request<{ success: boolean }>(apiEndpoint(`/ranking/${estudianteId}/reingresar`), {
    method: "POST",
    headers: mockHeaders,
  });
}

/** Register/update an entry in the admin-managed official-selection roster. */
export async function seleccionOficial(
  data: SeleccionOficialDTO,
): Promise<SeleccionOficial> {
  const mockHeaders = isMockMode() ? getMockRoleHeader() : {};
  return request<SeleccionOficial>(apiEndpoint("/ranking/seleccion-oficial"), {
    method: "POST",
    body: JSON.stringify(data),
    headers: mockHeaders,
  });
}

/**
 * Assign a student to a ranking category ("Asignar Nivel"). Not part of the
 * original ticket — added to fill an obvious gap (the UI tab had no backend
 * action to call). Follows the `niveles/:id` URL-shape convention of its
 * `cerrar-mes` sibling; the real backend contract should be confirmed later.
 */
export async function asignarNivel(
  categoria: CategoriaRanking,
  data: AsignarNivelDTO,
): Promise<{ success: boolean }> {
  const mockHeaders = isMockMode() ? getMockRoleHeader() : {};
  return request<{ success: boolean }>(apiEndpoint(`/ranking/niveles/${categoria}`), {
    method: "PATCH",
    body: JSON.stringify(data),
    headers: mockHeaders,
  });
}

// ---------------------------------------------------------------------------
// Reports API Methods
// ---------------------------------------------------------------------------

/** Fetch personas filtered by etiquetas (prioridad municipal, becado). */
export async function fetchPersonasPorEtiquetas(filtros: {
  prioridadMunicipal?: boolean;
  becado?: boolean;
}): Promise<PersonaReporte[]> {
  const qs = new URLSearchParams();
  if (filtros.prioridadMunicipal !== undefined) qs.set("prioridad_municipal", String(filtros.prioridadMunicipal));
  if (filtros.becado !== undefined) qs.set("becado", String(filtros.becado));
  const query = qs.toString();
  return request<PersonaReporte[]>(apiEndpoint(`/personas/reportes${query ? `?${query}` : ""}`));
}

/** Fetch new personas registered within a given date range. */
export async function fetchNuevosPorPeriodo(
  fechaInicio: string,
  fechaFin: string,
): Promise<PersonaReporte[]> {
  const qs = new URLSearchParams({
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
  });
  return request<PersonaReporte[]>(apiEndpoint(`/personas/reportes/nuevos-por-periodo?${qs.toString()}`));
}


/** Reset password using a recovery token (POST /auth/restablecer-contrasenia). */
export async function restablecerContrasenia(
  token: string,
  nuevaContrasenia: string,
): Promise<void> {
  await request<void>(apiEndpoint('/auth/restablecer-contrasenia'), {
    method: 'POST',
    body: JSON.stringify({ token, nueva_contrasenia: nuevaContrasenia }),
  });
}
