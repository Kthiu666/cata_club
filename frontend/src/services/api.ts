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
  SolicitudClaseExtra,
  SolicitudClaseExtraCreate,
  SolicitudClaseExtraResolver,
  RolesResponse,
  BackendTipoRol,
  FichaMedicaEditable,
  FichaMedicaUpdatePayload,
  ResultadoMensual,
  CierreMensual,
  SeleccionOficial,
  PersonaReporte,
  Notificacion,
  Justificativo,
} from "@/types/domain";
import type { EnrollmentRequest, EnrollmentResponse } from "@/types/enrollment";
import type { AttendanceRecord, TrainingSchedule } from "@/app/attendance/attendance-utils";
import type { MemberAccount } from "@/app/members/members-utils";
import { MOCK_JUSTIFICATIVOS_PENDIENTES } from "@/mocks/justificativos";

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
// Horarios (Training Schedules) CRUD
// ---------------------------------------------------------------------------

export interface Horario {
  id: number;
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
  entrenadorId: number;
  nivelRankingId: number | null;
}

export interface CrearHorarioDTO {
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  entrenador_id: number;
  nivel_ranking_id?: number | null;
}

export interface ActualizarHorarioDTO {
  dia_semana?: string;
  hora_inicio?: string;
  hora_fin?: string;
  entrenador_id?: number;
  nivel_ranking_id?: number | null;
}

/** Fetch all training schedules. */
export async function fetchHorarios(): Promise<Horario[]> {
  const mockHeaders = isMockMode() ? getMockRoleHeader() : {};
  return request<Horario[]>(apiEndpoint("/asistencias/horarios"), {
    headers: mockHeaders,
  });
}

/** Create a new training schedule. */
export async function crearHorario(data: CrearHorarioDTO): Promise<Horario> {
  const mockHeaders = isMockMode() ? getMockRoleHeader() : {};
  return request<Horario>(apiEndpoint("/asistencias/horarios"), {
    method: "POST",
    body: JSON.stringify(data),
    headers: mockHeaders,
  });
}

/** Update an existing training schedule. */
export async function actualizarHorario(id: number, data: ActualizarHorarioDTO): Promise<Horario> {
  const mockHeaders = isMockMode() ? getMockRoleHeader() : {};
  return request<Horario>(apiEndpoint(`/asistencias/horarios/${id}`), {
    method: "PUT",
    body: JSON.stringify(data),
    headers: mockHeaders,
  });
}

/** Delete a training schedule. */
export async function eliminarHorario(id: number): Promise<void> {
  const mockHeaders = isMockMode() ? getMockRoleHeader() : {};
  await request<unknown>(apiEndpoint(`/asistencias/horarios/${id}`), {
    method: "DELETE",
    headers: mockHeaders,
  });
}

// ---------------------------------------------------------------------------
// Members & Groups API Methods (Fase 4)
// ---------------------------------------------------------------------------

/** List every account (responsible payer + managed students) and ranking niveles with occupancy, aggregated server-side — see src/lib/server/members-adapter.ts. */
export async function fetchMembers(): Promise<{ accounts: MemberAccount[]; niveles: NivelConOcupacion[] }> {
  return request<{ accounts: MemberAccount[]; niveles: NivelConOcupacion[] }>(apiEndpoint("/members"));
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
  personaId: number;
  anio: number;
  mes: number;
  posicion?: number;
  participo: boolean;
}

/** DTO for POST /ranking/niveles/:id/cerrar-mes — close out a ranking month. */
export interface CerrarMesDTO {
  anio: number;
  mes: number;
}

/** DTO for POST /ranking/seleccion-oficial — register/update the official-selection roster. */
export interface SeleccionOficialDTO {
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

/** Close out the ranking month for a given nivel (CU — Cierre de Mes). Irreversible. */
export async function cerrarMes(
  nivelRankingId: number,
  data: CerrarMesDTO,
): Promise<CierreMensual> {
  const mockHeaders = isMockMode() ? getMockRoleHeader() : {};
  return request<CierreMensual>(apiEndpoint(`/ranking/niveles/${nivelRankingId}/cerrar-mes`), {
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

/** Fetch the persisted official-selection roster. */
export async function fetchSeleccionOficial(): Promise<SeleccionOficialRosterItem[]> {
  const mockHeaders = isMockMode() ? getMockRoleHeader() : {};
  return request<SeleccionOficialRosterItem[]>(apiEndpoint("/ranking/seleccion-oficial"), {
    headers: mockHeaders,
  });
}

/** Remove a student from the official-selection roster. */
export async function quitarDeSeleccionOficial(personaId: number): Promise<void> {
  const mockHeaders = isMockMode() ? getMockRoleHeader() : {};
  await request<unknown>(apiEndpoint(`/ranking/seleccion-oficial/${personaId}`), {
    method: "DELETE",
    headers: mockHeaders,
  });
}

export interface SeleccionOficialRosterItem {
  persona_id: number;
  persona_nombre_completo: string;
  anio_seleccion: number | null;
}

// ---------------------------------------------------------------------------
// Ranking Data Fetching (GET endpoints — replace mock data)
// ---------------------------------------------------------------------------

export interface AsignacionRanking {
  persona_id: number;
  persona_nombre_completo: string;
  nivel_ranking_id: number;
  nivel_ranking_nombre: string | null;
  nivel_ranking_numero: number;
  posicion_actual: number | null;
  puntaje_acumulado: number;
  esta_en_ranking: boolean;
}

export interface ResultadoMensualRanking {
  id: number;
  persona_id: number;
  persona_nombre_completo: string;
  nivel_ranking_id: number;
  nivel_ranking_nombre: string | null;
  anio: number;
  mes: number;
  posicion: number | null;
  puntos_obtenidos: number;
  participo: boolean;
  ausencia_justificada: boolean;
}

export interface CierreMensualRanking {
  id: number;
  nivel_ranking_id: number;
  nivel_ranking_nombre: string | null;
  nivel_ranking_numero: number;
  anio: number;
  mes: number;
  personas_procesadas: number;
  cerrado_por_id: number;
  cerrado_por_nombre: string;
  cerrado_en: string;
}

export async function fetchAsignacionesRanking(): Promise<AsignacionRanking[]> {
  return request<AsignacionRanking[]>(apiEndpoint("/ranking/asignaciones"));
}

export async function fetchResultadosMensualesRanking(
  filtros?: { nivel_id?: number; anio?: number; mes?: number },
): Promise<ResultadoMensualRanking[]> {
  const qs = new URLSearchParams();
  if (filtros?.nivel_id !== undefined) qs.set("nivel_id", String(filtros.nivel_id));
  if (filtros?.anio !== undefined) qs.set("anio", String(filtros.anio));
  if (filtros?.mes !== undefined) qs.set("mes", String(filtros.mes));
  const query = qs.toString();
  return request<ResultadoMensualRanking[]>(apiEndpoint(`/ranking/resultados-mensuales${query ? `?${query}` : ""}`));
}

export async function fetchCierresMensualesRanking(
  nivel_id?: number,
): Promise<CierreMensualRanking[]> {
  const qs = nivel_id !== undefined ? `?nivel_id=${nivel_id}` : "";
  return request<CierreMensualRanking[]>(apiEndpoint(`/ranking/cierres-mensuales${qs}`));
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


/**
 * Request a password-recovery link (POST /auth/recuperar-contrasenia).
 * The backend deliberately returns the same success message whether or not
 * the email is registered (anti-enumeration) — callers should show a
 * generic "check your email" message regardless of the response content.
 */
export async function solicitarRecuperacion(correo: string): Promise<{ mensaje: string }> {
  return request<{ mensaje: string }>(apiEndpoint('/auth/recuperar-contrasenia'), {
    method: 'POST',
    body: JSON.stringify({ correo }),
  });
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

// ---------------------------------------------------------------------------
// Types & API Methods — Extra Classes, Roles & Medical Record (Grupo B)
// ---------------------------------------------------------------------------

/**
 * Memberships owned by a persona. Needed to discover `membresia_id` for
 * `POST /clases-extra/` and for the admin create-membership flow.
 */
export interface MembresiaPorPersona {
  id: number;
  estado: "INACTIVA" | "ACTIVA" | "VENCIDA";
  montoAplicado: string;
  fechaActivacion: string;
  personaId: number;
  tipoMembresiaId: number;
  tipo?: {
    id: number;
    categoria: string;
    franjaHoraria: string;
    precio: string;
    modalidad: "PERSONALIZADA" | "MENSUAL";
  };
}

/** Fetch a persona's memberships — `GET /api/membresias/persona/[id]`. */
export async function fetchMembresiasPorPersona(personaId: number): Promise<MembresiaPorPersona[]> {
  return request<MembresiaPorPersona[]>(apiEndpoint(`/membresias/persona/${personaId}`));
}

/**
 * `PagoResponseDTO` (see backend app/presentacion/schemas/membresia_pago_schemas.py)
 * — a persona's own payment, any status. Distinct from `PaymentValidationRequest`
 * (the enriched admin-only validation queue shape): this is a lean passthrough
 * for the student's own read-only history.
 */
export interface PagoPersona {
  id: number;
  monto: string;
  motivoRechazo: string | null;
  estadoPago: "PENDIENTE_VALIDACION" | "APROBADO" | "RECHAZADO";
  tipoPago: "EFECTIVO" | "TRANSFERENCIA";
  fechaRegistro: string;
  fechaValidacion: string | null;
  fechaInicio: string;
  fechaFin: string;
  personaId: number;
  membresiaId: number;
  voucherUrl: string | null;
  voucherFormato: string | null;
}

/**
 * A persona's own payment history, any status (mirrors `fetchJustificativosDePersona`'s
 * "always real, not mock-gated" pattern — mock mode only adds the `x-mock-role`
 * header) — `GET /membresias/pagos/persona/:personaId`.
 */
export async function fetchPagosDePersona(personaId: string): Promise<PagoPersona[]> {
  const mockHeaders = isMockMode() ? getMockRoleHeader() : {};
  return request<PagoPersona[]>(apiEndpoint(`/membresias/pagos/persona/${personaId}`), {
    headers: mockHeaders,
  });
}

/** Catalog entry for a membership plan type. */
export interface TipoMembresiaCatalogo {
  id: number;
  categoria: string;
  franjaHoraria: string;
  precio: string;
  modalidad: "PERSONALIZADA" | "MENSUAL";
}

/** List all available membership plan types — `GET /api/membresias/tipos`. */
export async function fetchTiposMembresia(): Promise<TipoMembresiaCatalogo[]> {
  return request<TipoMembresiaCatalogo[]>(apiEndpoint("/membresias/tipos"));
}

/** Create and assign a membership to a persona — `POST /api/membresias/`. */
export async function crearMembresia(data: {
  personaId: number;
  tipoMembresiaId: number;
  montoAplicado: number;
}): Promise<MembresiaPorPersona> {
  return request<MembresiaPorPersona>(apiEndpoint("/membresias/"), {
    method: "POST",
    body: JSON.stringify({
      persona_id: data.personaId,
      tipo_membresia_id: data.tipoMembresiaId,
      monto_aplicado: data.montoAplicado,
    }),
  });
}

/** Create an extra-class request. Valid only for PERSONALIZED memberships. */
export async function solicitarClaseExtra(
  data: SolicitudClaseExtraCreate,
): Promise<SolicitudClaseExtra> {
  const body = {
    fecha_clase_solicitada: data.fechaClaseSolicitada,
    persona_id: data.personaId,
    membresia_id: data.membresiaId,
    horario_id: data.horarioId,
    ...(data.observaciones ? { observaciones: data.observaciones } : {}),
  };
  return request<SolicitudClaseExtra>(apiEndpoint("/clases-extra"), {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** List extra-class requests for a given persona. */
export async function listarClasesExtra(personaId: number): Promise<SolicitudClaseExtra[]> {
  return request<SolicitudClaseExtra[]>(apiEndpoint(`/clases-extra/persona/${personaId}`));
}

/** Admin-only: approve or reject an extra-class request. */
export async function resolverClaseExtra(
  id: number,
  data: SolicitudClaseExtraResolver,
): Promise<SolicitudClaseExtra> {
  const body = {
    estado: data.estado,
    ...(data.costoAdicional !== undefined ? { costo_adicional: data.costoAdicional } : {}),
    ...(data.observaciones ? { observaciones: data.observaciones } : {}),
  };
  return request<SolicitudClaseExtra>(apiEndpoint(`/clases-extra/${id}/resolver`), {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/** Admin-only: assign a backend role to a persona. */
export async function asignarRol(personaId: number, tipoRol: BackendTipoRol): Promise<RolesResponse> {
  return request<RolesResponse>(apiEndpoint(`/personas/${personaId}/roles`), {
    method: "POST",
    body: JSON.stringify({ tipoRol }),
  });
}

/** Admin-only: remove a backend role from a persona. */
export async function quitarRol(personaId: number, tipoRol: BackendTipoRol): Promise<RolesResponse> {
  return request<RolesResponse>(apiEndpoint(`/personas/${personaId}/roles/${tipoRol}`), {
    method: "DELETE",
  });
}

/** Admin-only: activate or deactivate a person's account. */
export async function cambiarEstadoCuenta(personaId: number, activo: boolean): Promise<RolesResponse> {
  return request<RolesResponse>(apiEndpoint(`/personas/${personaId}/cuenta/estado`), {
    method: "PATCH",
    body: JSON.stringify({ activo }),
  });
}

/** Admin-only: fetch a person's medical record. */
export async function fetchFichaMedica(personaId: number): Promise<FichaMedicaEditable> {
  return request<FichaMedicaEditable>(apiEndpoint(`/fichas-medicas/persona/${personaId}`));
}

/** Admin-only: update a person's medical record. `enfermedades` replaces the full list. */
export async function actualizarFichaMedica(
  personaId: number,
  data: FichaMedicaUpdatePayload,
): Promise<FichaMedicaEditable> {
  const body: Record<string, unknown> = {};
  if (data.tipoSangre !== undefined) body.tipo_sangre = data.tipoSangre;
  if (data.enfermedades !== undefined) body.enfermedades = data.enfermedades;
  if (data.alergias !== undefined) body.alergias = data.alergias;
  if (data.contactoEmergencia !== undefined) body.contacto_emergencia = data.contactoEmergencia;
  if (data.telefonoEmergencia !== undefined) body.telefono_emergencia = data.telefonoEmergencia;

  return request<FichaMedicaEditable>(apiEndpoint(`/fichas-medicas/persona/${personaId}`), {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Ranking — Notificaciones & Justificativos
//
// Notificaciones and the justificativo submit/evaluate actions proxy a real,
// confirmed backend contract (see ranking_router.py: GET/PATCH
// notificaciones/*, POST/PATCH justificativos/*) — same "always real"
// pattern as the other ranking BFF routes above, not mock-gated.
// `fetchJustificativosPendientes` is the one exception: no backend endpoint
// lists pending justificativos at all (see src/mocks/justificativos.ts),
// so it stays mock-only until the backend team exposes one.
// ---------------------------------------------------------------------------

/** List the logged-in persona's own in-app ranking notifications — `GET /ranking/notificaciones/mias`. */
export async function fetchNotificaciones(): Promise<Notificacion[]> {
  const mockHeaders = isMockMode() ? getMockRoleHeader() : {};
  return request<Notificacion[]>(apiEndpoint("/ranking/notificaciones/mias"), {
    headers: mockHeaders,
  });
}

/** Mark one of the caller's own notifications as read — `PATCH /ranking/notificaciones/:id/leer`. */
export async function marcarNotificacionLeida(id: number): Promise<Notificacion> {
  const mockHeaders = isMockMode() ? getMockRoleHeader() : {};
  return request<Notificacion>(apiEndpoint(`/ranking/notificaciones/${id}/leer`), {
    method: "PATCH",
    headers: mockHeaders,
  });
}

/** DTO for submitting a justificativo — `personaId` becomes a URL segment server-side, not a body field (see the BFF route's doc comment). */
export interface SubmitJustificativoDTO {
  personaId: number;
  anio: number;
  mes: number;
  motivo: string;
  archivoUrl?: string;
  observaciones?: string;
}

/** Submit a justificativo for a missed ranking month (E03-RF006a) — `POST /ranking/:personaId/justificativos`. */
export async function submitJustificativo(data: SubmitJustificativoDTO): Promise<Justificativo> {
  const mockHeaders = isMockMode() ? getMockRoleHeader() : {};
  return request<Justificativo>(apiEndpoint("/ranking/justificativos"), {
    method: "POST",
    body: JSON.stringify(data),
    headers: mockHeaders,
  });
}

/** DTO for evaluating (approving/rejecting) a pending justificativo. */
export interface EvaluarJustificativoDTO {
  estado: "APROBADO" | "RECHAZADO";
  motivoRechazo?: string;
}

/**
 * Mutable in-memory copy of the pending-justificativos mock list. Mock mode
 * has no real backend to PATCH against (see `fetchJustificativosPendientes`
 * below), so `evaluarJustificativo`'s mock path simulates the decision
 * against this array instead — removing the evaluated entry so a
 * subsequent `fetchJustificativosPendientes()` call reflects the change,
 * same as a real backend would after approve/reject.
 */
let mockJustificativosPendientes: Justificativo[] = [...MOCK_JUSTIFICATIVOS_PENDIENTES];

/** Admin-only: approve or reject a pending justificativo (E03-RF006b) — `PATCH /ranking/justificativos/:id/evaluar`. */
export async function evaluarJustificativo(
  id: number,
  data: EvaluarJustificativoDTO,
): Promise<Justificativo> {
  if (isMockMode()) {
    const target = mockJustificativosPendientes.find((j) => j.id === id);
    const evaluado: Justificativo = {
      id,
      personaId: target?.personaId ?? 0,
      anio: target?.anio ?? new Date().getFullYear(),
      mes: target?.mes ?? new Date().getMonth() + 1,
      motivo: target?.motivo ?? "",
      archivoUrl: target?.archivoUrl ?? null,
      observaciones: target?.observaciones ?? null,
      estado: data.estado,
      motivoRechazo: data.motivoRechazo ?? null,
      fechaSolicitud: target?.fechaSolicitud ?? new Date().toISOString(),
      fechaEvaluacion: new Date().toISOString(),
      evaluadoPorId: -1,
    };
    mockJustificativosPendientes = mockJustificativosPendientes.filter((j) => j.id !== id);
    return evaluado;
  }
  return request<Justificativo>(apiEndpoint(`/ranking/justificativos/${id}/evaluar`), {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/**
 * List pending justificativos for admin review (E03-RF006b) — `GET
 * /ranking/justificativos/pendientes`. Mock mode returns the (mutable)
 * curated sample data from src/mocks/justificativos.ts — evaluated entries
 * are removed by `evaluarJustificativo` above so a subsequent call reflects
 * the change, same as the real backend would after approve/reject.
 */
export async function fetchJustificativosPendientes(): Promise<Justificativo[]> {
  if (isMockMode()) return mockJustificativosPendientes;
  return request<Justificativo[]>(apiEndpoint("/ranking/justificativos/pendientes"));
}

/**
 * A persona's own justificativo history, any status (E04-RF012 ampliado) —
 * `GET /ranking/:personaId/justificativos`. Confirmed real backend contract
 * (`listar_justificativos_de_persona` in ranking_router.py — dueño-or-
 * representante authorization enforced server-side), same "always real"
 * pattern as `submitJustificativo`/`fetchNotificaciones` above — not
 * mock-gated like `fetchJustificativosPendientes`.
 */
export async function fetchJustificativosDePersona(personaId: string): Promise<Justificativo[]> {
  const mockHeaders = isMockMode() ? getMockRoleHeader() : {};
  return request<Justificativo[]>(apiEndpoint(`/ranking/${personaId}/justificativos`), {
    headers: mockHeaders,
  });
}
