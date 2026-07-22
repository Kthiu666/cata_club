/**
 * Cata Club Domain Types
 *
 * Shared TypeScript types for the core domain model.
 * Frontend-only — these define the shape of data used across components,
 * services, and mock data. They will align with the backend API schema
 * when the Python/FastAPI service is connected.
 *
 * Naming convention: Spanish for domain concepts (matching existing UI),
 * English for technical constructs. All identifiers are camelCase.
 */

// ---------------------------------------------------------------------------
// Users & Roles
// ---------------------------------------------------------------------------

/**
 * The actor roles in the Cata Club system.
 *
 * Backend alignment (2026-07): the backend models a single `Persona` entity
 * with a `role` field (`ADMINISTRADOR`, `ENTRENADOR`, `TESORERO`, `ALUMNO`)
 * and a self-referencing `representante_id` (a Persona pointing to the adult
 * who manages them — e.g. a parent). All four backend roles now map to a
 * frontend `UserRole` (see `mapBackendRoleToUserRole` in
 * src/lib/server/auth.ts): `ADMINISTRADOR` -> `"admin"`, `ENTRENADOR` ->
 * `"trainer"`, `TESORERO` -> `"tesorero"`, `ALUMNO` -> `"estudiante"`.
 *
 * `"representante"` is NOT a role the backend sends as a literal string —
 * it is DERIVED at the data-adapter layer: a Persona with no
 * `representante_id` of its own, but that other Personas reference via
 * THEIR `representante_id`, and with no `ALUMNO` role itself. It's kept as
 * an explicit frontend `UserRole` value so switch-based routing/nav logic
 * stays exhaustive. It is a relationship, not an authenticated backend
 * role — never used as a fallback for unmapped/unknown backend roles.
 *
 * `"unsupported"` is the explicit landing state for an authenticated user
 * whose backend `roles` array is empty or contains only strings this
 * frontend doesn't recognize. It is a real `UserRole` (not a crash, not a
 * silent redirect loop, not miscategorized as any of the roles above) —
 * `getDefaultRoute` sends it to `/unauthorized`, a dedicated page.
 */
export type UserRole = "admin" | "trainer" | "tesorero" | "representante" | "estudiante" | "unsupported";

interface UsuarioBase {
  id: string;
  name: string;
  email: string;
  /** Self-ref: when set, this account is managed by another Usuario (e.g. a parent). */
  representanteId: string | null;
  avatarUrl?: string;
  createdAt?: string;
}

/** Account with an active student profile. */
export interface UsuarioEstudiante extends UsuarioBase {
  role: "estudiante";
  fechaNacimiento?: string;
  telefono?: string;
  /** The group this student is assigned to (if any). Technical level is carried by the group, not the student. */
  grupoId: string | null;
  activo: boolean;
}

/** Staff account, a pure representante account with no student profile of its own, or an authenticated-but-unsupported-role account. */
export interface UsuarioStaff extends UsuarioBase {
  role: "admin" | "trainer" | "tesorero" | "representante" | "unsupported";
}

export type Usuario = UsuarioEstudiante | UsuarioStaff;

// ---------------------------------------------------------------------------
// Actors (role-specific profiles)
// ---------------------------------------------------------------------------

/** Training level / technical category for students. */
export type NivelTecnico = "principiante" | "intermedio" | "avanzado";

/** Trainer (Entrenador) — leads training sessions. */
export interface Entrenador {
  id: string;
  usuarioId: string;
  nombres: string;
  apellidos: string;
  especialidad?: string;
  telefono: string;
  email: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Membership & Payments
// ---------------------------------------------------------------------------

/** Membership plan types. */
export type TipoMembresia = "mensual" | "trimestral" | "semestral" | "anual";

/**
 * Lifecycle state of a membership.
 *
 * Membership is created/activated only after payment/comprobante is approved.
 * - `"activa"`: payment approved, membership is current.
 * - `"vencida"`: membership period has expired.
 * - `"suspendida"`: membership suspended by admin action.
 *
 * The old `"pending_payment"` / `"pending_validation"` states are no longer
 * membership states — those are Pago states. See `Pago.estado`.
 */
export type EstadoMembresia =
  | "activa"
  | "vencida"
  | "suspendida";

/** A membership (Membresía) held by a student. */
export interface Membresia {
  id: string;
  estudianteId: string;
  tipo: TipoMembresia;
  fechaInicio: string;
  fechaFin: string;
  estado: EstadoMembresia;
  monto: number;
  renovable: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Payment method options. */
export type MetodoPago =
  | "transferencia_bancaria"
  | "efectivo"
  | "tarjeta";

/**
 * A payment record (Pago).
 *
 * Each payment is associated with both the student whose membership is paid
 * and the account owner / responsible payer who made the payment.
 */
export interface Pago {
  id: string;
  estudianteId: string;
  membresiaId: string;
  /** The account owner who paid for this membership. */
  responsablePagoId: string;
  monto: number;
  metodoPago: MetodoPago;
  fechaPago: string;
  estado: "pendiente_validacion" | "aprobado" | "rechazado";
  comprobanteId?: string;
  createdAt: string;
  updatedAt: string;
}

/** File type for uploaded payment proofs. */
export type TipoComprobante = "image" | "pdf";

/** Validation status for a payment proof (ComprobantePago). */
export type EstadoValidacion = "pendiente" | "validado" | "rechazado";

/** A payment proof document (Comprobante de Pago). */
export interface ComprobantePago {
  id: string;
  pagoId: string;
  /** The account owner who submitted this proof (optional — defaults to the
   *  ResponsiblePago associated with the Pago). */
  responsablePagoId?: string;
  nombreArchivo: string;
  tipoArchivo: TipoComprobante;
  url?: string;
  fechaSubida: string;
  estadoValidacion: EstadoValidacion;
  motivoRechazo?: string;
  validadoPor?: string;
  validadoEn?: string;
}

// ---------------------------------------------------------------------------
// Groups (Grupos)
// ---------------------------------------------------------------------------

/**
 * A training group (Grupo) — the set of students assigned together.
 *
 * Technical level (NivelTecnico) belongs to the group, NOT to the student.
 * A student's technical level is determined by which group they belong to.
 * Students with no group assignment have no technical level yet — their
 * level is pending trainer evaluation.
 *
 * The group assignment screen (/admin/groups) will be built in a future slice.
 */
export interface Grupo {
  id: string;
  nombre: string;
  nivel: NivelTecnico;
  estudiantesIds: string[];
  horariosIds?: string[];
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Schedule & Attendance
// ---------------------------------------------------------------------------

/**
 * Day of week for training schedules.
 *
 * Backend alignment (Fase 3): the real `DiaSemana` enum (see
 * `app/dominio/enums.py`) deliberately covers the full civil week including
 * Sunday ("el Lunes-Domingo completa la semana civil real; no se trunca a
 * Sábado") — `"dom"` was added here to match. Existing mock data (which
 * never used a Sunday slot) is unaffected by this additive change.
 */
export type DiaSemana = "lun" | "mar" | "mie" | "jue" | "vie" | "sab" | "dom";

/**
 * A training session slot (Horario).
 *
 * Note: Horario does NOT own a trainer. Any trainer may register attendance
 * in any available session. See `Asistencia.entrenadorId`.
 */
export interface Horario {
  id: string;
  diaSemana: DiaSemana;
  horaInicio: string; // "HH:mm"
  horaFin: string;    // "HH:mm"
  nivel: NivelTecnico;
  cancha: string;
  cupoMaximo: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Extra classes, roles and editable medical record (Grupo B)
// ---------------------------------------------------------------------------

/** Backend blood-type enum values — matches TipoSangre in app/dominio/enums.py. */
export type TipoSangre =
  | "A_POSITIVO"
  | "A_NEGATIVO"
  | "B_POSITIVO"
  | "B_NEGATIVO"
  | "AB_POSITIVO"
  | "AB_NEGATIVO"
  | "O_POSITIVO"
  | "O_NEGATIVO"
  | "DESCONOCIDO";

/** Backend role enum values as sent/received by the personas router. */
export type BackendTipoRol = "ADMINISTRADOR" | "ENTRENADOR" | "TESORERO" | "ALUMNO";

/** States of a personalized-membership extra-class request. */
export type EstadoSolicitudExtra = "PENDIENTE" | "APROBADA" | "RECHAZADA";

/**
 * Extra-class request — returned by the backend already camelCase.
 * Backend source: SolicitudClaseExtraResponseDTO.
 */
export interface SolicitudClaseExtra {
  id: number;
  fechaClaseSolicitada: string;
  estado: EstadoSolicitudExtra;
  /** Decimal from backend serialized as string to preserve precision. */
  costoAdicional: string | null;
  fechaSolicitud: string;
  observaciones: string | null;
  personaId: number;
  personaNombreCompleto?: string;
  membresiaId: number;
  horarioId: number;
  horarioDiaSemana?: string;
  horarioHoraInicio?: string;
  horarioHoraFin?: string;
}

/** Payload to create an extra-class request (snake_case is sent to backend). */
export interface SolicitudClaseExtraCreate {
  fechaClaseSolicitada: string;
  personaId: number;
  membresiaId: number;
  horarioId: number;
  observaciones?: string;
}

/** Admin resolver payload for an extra-class request. */
export interface SolicitudClaseExtraResolver {
  estado: EstadoSolicitudExtra;
  costoAdicional?: string;
  observaciones?: string;
}

/** Response from the roles / account-state endpoints. */
export interface RolesResponse {
  personaId: number;
  roles: BackendTipoRol[];
  activo: boolean;
}

/**
 * The authenticated user's own profile — GET/PATCH `/auth/me` (self-service).
 * Deliberately distinct from the global `Usuario`/`ServerSession` shape (see
 * `src/lib/server/auth.ts`): only `/profile`'s dedicated fetch uses this, so
 * adding `telefono` here doesn't touch `AuthContext` or every session reader.
 * Backend source: `UsuarioMeResponseDTO` / `ActualizarPerfilPropioResponseDTO`.
 */
export interface PerfilPropio {
  correo: string;
  personaId: number;
  nombres: string;
  apellidos: string;
  roles: BackendTipoRol[];
  telefono: string;
}

/** Payload to update the logged-in user's own correo/teléfono — both optional (partial edit). */
export interface ActualizarPerfilPropioPayload {
  correo?: string;
  telefono?: string;
}

/** One disease item as returned by the backend (id + name). */
export interface Enfermedad {
  id: number;
  nombreEnfermedad: string;
}

/**
 * Editable medical record — distinct from the enrollment-time FichaMedica.
 * Backend GET/PATCH source: FichaMedicaResponseDTO / FichaMedicaUpdateDTO.
 * IMPORTANT: when PATCH sends `enfermedades`, the backend REPLACES the whole list.
 */
export interface FichaMedicaEditable {
  id: number;
  personaId: number;
  tipoSangre: TipoSangre;
  enfermedades: Enfermedad[];
  alergias: string | null;
  contactoEmergencia: string | null;
  telefonoEmergencia: string | null;
}

/** Payload to update a medical record (all fields optional). */
export interface FichaMedicaUpdatePayload {
  tipoSangre?: TipoSangre;
  /** If present, the backend replaces the entire disease list — no merge. */
  enfermedades?: string[];
  alergias?: string;
  contactoEmergencia?: string;
  telefonoEmergencia?: string;
}

// ---------------------------------------------------------------------------
// Health / Medical (Ficha Médica)
// ---------------------------------------------------------------------------

/**
 * Medical & emergency contact information for a student (Ficha Médica).
 *
 * Collected during enrollment and linked to a student. This represents the
 * health-related data the club needs for student safety — separate from
 * account registration data (which is minimal by design).
 */
export interface FichaMedica {
  /** Free-text health conditions (e.g. asthma, diabetes, injuries). */
  condicionesSalud: string;
  /** Free-text allergy information. */
  alergias: string;
  /** Emergency contact name. */
  contactoEmergencia: string;
  /** Emergency contact phone number. */
  telefonoEmergencia: string;
  /** Additional observations or notes. */
  observaciones?: string;
}

/** Attendance state for a single student in a session. */
export type EstadoAsistencia = "present" | "absent" | "late" | "justified";

/** An attendance record (Asistencia). */
export interface Asistencia {
  id: string;
  horarioId: string;
  entrenadorId: string;
  estudianteId: string;
  fecha: string;  // ISO date
  estado: EstadoAsistencia;
  observacion?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Domain Helpers
// ---------------------------------------------------------------------------

/** Students managed by the given account (via `representanteId`). */
export function getManagedAccounts(
  usuarioId: string,
  allUsuarios: Usuario[],
): UsuarioEstudiante[] {
  return allUsuarios.filter(
    (u): u is UsuarioEstudiante =>
      u.role === "estudiante" && u.representanteId === usuarioId,
  );
}

// ---------------------------------------------------------------------------
// Ranking (Track Ranking) — competitive ranking system managed by trainers.
//
// `CategoriaRanking` is an intentionally SEPARATE 1–10 numeric taxonomy from
// `NivelTecnico` above. `NivelTecnico` belongs to a Grupo (technical
// level/horario placement); `CategoriaRanking` belongs to a student directly
// and drives the competitive ranking ladder. Do not conflate the two — see
// project notes on the 2026-07-18 domain clarification.
// ---------------------------------------------------------------------------

/**
 * A student's competitive ranking category, 1 (highest) through 10 (lowest)
 * — confirmed by the club as a plain numeric scale, unrelated to
 * `NivelTecnico`. Kept as a documented `number` rather than a `1|2|...|10`
 * literal union (no numeric-literal-union convention exists elsewhere in
 * this file); range (1–10, integer) is validated at the UI/BFF boundary,
 * not enforced by the type system.
 */
export type CategoriaRanking = number;

/**
 * A monthly ranking result registered for a student within a nivel
 * (Resultado Mensual) — mirrors the backend's `ResultadoMensualResponseDTO`
 * (persona_id, nivel_ranking_id, anio, mes, posicion, puntos_obtenidos,
 * participo, ausencia_justificada).
 */
export interface ResultadoMensual {
  id: number;
  personaId: number;
  nivelRankingId: number;
  anio: number;
  mes: number;
  posicion: number | null;
  puntosObtenidos: number;
  participo: boolean;
  ausenciaJustificada: boolean;
}

/**
 * Record of a ranking-month closure (Cierre de Mes) for a given nivel — an
 * irreversible action that locks further result registration for that
 * nivel/period. Mirrors the backend's `CierreMensualResponseDTO`.
 */
export interface CierreMensual {
  nivelRankingId: number;
  anio: number;
  mes: number;
  personasProcesadas: number;
  personasEliminadas: number[];
}

/**
 * An entry in the official-selection roster (Selección Oficial) —
 * admin-managed, independent of the trainer-managed monthly ranking flow.
 */
export interface SeleccionOficial {
  id: string;
  estudianteId: string;
  seleccionadoPor: string;
  createdAt: string;
}

/**
 * Persona report entry — mirrors the camelCase output of PersonaResponseDTO
 * from the backend reportes endpoints (etiquetas & nuevos-por-periodo).
 */
export interface PersonaReporte {
  id: number;
  nombres: string;
  apellidos: string;
  cedula: string;
  fechaNacimiento: string;
  telefono: string;
  telefonoContacto?: string | null;
  prioridadMunicipal: boolean;
  porcentajeBeca: number;
  motivoBeca?: string | null;
  fechaRegistro?: string | null;
}

/** Basic Persona shape returned by PATCH /personas/{id}. */
export interface PersonaResponse {
  id: number;
  nombres: string;
  apellidos: string;
  cedula: string;
  fechaNacimiento: string;
  telefono: string;
  telefonoContacto?: string | null;
  fotoUrl?: string | null;
  representanteId?: number | null;
  prioridadMunicipal: boolean;
  porcentajeBeca: number;
  motivoBeca?: string | null;
}

// ---------------------------------------------------------------------------
// Ranking — Notificaciones & Justificativos (E03-RF006a/b + in-app
// notifications). Mirrors backend/app/dominio/enums.py's
// `TipoNotificacion`/`EstadoJustificativoRanking` and
// ranking_schemas.py's `NotificacionResponseDTO`/`JustificativoResponseDTO`
// — both confirmed live in ranking_router.py (GET/PATCH notificaciones,
// POST/PATCH justificativos), not speculative.
// ---------------------------------------------------------------------------

/** Notification type — mirrors backend's `TipoNotificacion` enum. */
export type TipoNotificacion =
  | "RANKING_ELIMINACION_PROXIMA"
  | "RANKING_ASCENSO_SUGERIDO"
  | "RANKING_DESCENSO_SUGERIDO"
  | "RANKING_REINGRESO_APROBADO"
  | "JUSTIFICATIVO_APROBADO"
  | "JUSTIFICATIVO_RECHAZADO";

/**
 * An in-app ranking notification (`GET /ranking/notificaciones/mias`) —
 * mirrors `NotificacionResponseDTO`, already camelCase via `ResponseBase`'s
 * alias_generator.
 */
export interface Notificacion {
  id: number;
  tipo: TipoNotificacion;
  mensaje: string;
  leida: boolean;
  fechaCreacion: string;
  entidadRelacionadaId: number | null;
}

/** Estado of a ranking justificativo — mirrors backend's `EstadoJustificativoRanking`. */
export type EstadoJustificativoRanking = "PENDIENTE" | "APROBADO" | "RECHAZADO";

/**
 * A justification for a missed ranking month (E03-RF006a/b) — mirrors
 * `JustificativoResponseDTO`. `motivoRechazo`/`fechaEvaluacion`/
 * `evaluadoPorId` are only populated once an admin evaluates it via
 * `PATCH /ranking/justificativos/:id/evaluar`, which returns this same DTO
 * (verified in ranking_router.py's `evaluar_justificativo`).
 */
export interface Justificativo {
  id: number;
  personaId: number;
  anio: number;
  mes: number;
  motivo: string;
  archivoUrl: string | null;
  observaciones: string | null;
  estado: EstadoJustificativoRanking;
  motivoRechazo: string | null;
  fechaSolicitud: string;
  fechaEvaluacion: string | null;
  evaluadoPorId: number | null;
}
