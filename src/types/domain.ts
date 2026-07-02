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
 * Notes on domain correction (2026-07):
 *  - `"responsable_pago"` replaces the old `"student"` and `"representative"`
 *    roles. The login identity is always an account owner / responsible payer,
 *    not the student themself. An account owner may be an external representative
 *    (managing one or more students) or a self-managed adult student.
 *  - See `TipoResponsable` and `ResponsablePago` for the subtype distinction.
 */
export type UserRole = "admin" | "trainer" | "responsable_pago";

/** Core user account — identity shared by all roles. */
export interface Usuario {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// Actors (role-specific profiles)
// ---------------------------------------------------------------------------

/** Training level / technical category for students. */
export type NivelTecnico = "principiante" | "intermedio" | "avanzado";

/**
 * Account owner type.
 *
 * - `"representante"`: external representative (parent/guardian) managing
 *   one or more minor students.
 * - `"autogestionado"`: adult student who manages their own account and
 *   pays for their own membership.
 */
export type TipoResponsable = "representante" | "autogestionado";

/**
 * Account owner / responsible payer — the person who holds the account
 * and is financially responsible for one or more students.
 *
 * Every login maps to one ResponsablePago (or an admin/trainer account).
 * This replaces the old assumption that every account is either a "student"
 * or a "representative".
 */
export interface ResponsablePago {
  id: string;
  usuarioId: string;
  tipo: TipoResponsable;
  nombres: string;
  apellidos: string;
  telefono: string;
  email: string;
  /** IDs of the students this account owner manages. */
  alumnosIds: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Student (Alumno) — a person who trains at the club.
 *
 * A student is always managed by a ResponsablePago (account owner).
 * - For minor students: the responsible party is an external representative
 *   (parent/guardian).
 * - For adult self-managed students: the responsible party is the student
 *   themself (reflected by `responsablePagoId` pointing to a
 *   ResponsablePago with `tipo: "autogestionado"`).
 *
 * Domain correction (2026-07): Students do NOT carry technical level (nivel)
 * directly. Technical level belongs to the group (Grupo) the student is
 * assigned to. See `Grupo.nivel`.
 */
export interface Alumno {
  id: string;
  usuarioId: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento?: string;
  telefono?: string;
  /** The account owner responsible for this student's membership payments. */
  responsablePagoId: string;
  /** The group this student is assigned to (if any). Technical level is carried by the group, not the student. */
  grupoId: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Representative (Representante) — a specific subtype of account owner.
 *
 * @deprecated Use `ResponsablePago` with `tipo: "representante"` instead.
 * Kept for backward compatibility with existing mock data.
 */
export interface Representante {
  id: string;
  usuarioId: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  email: string;
  alumnosIds: string[];
  createdAt: string;
  updatedAt: string;
}

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
export type TipoMembresia = "mensual" | "trimestral" | "anual";

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
  alumnoId: string;
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
  alumnoId: string;
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
  alumnosIds: string[];
  horariosIds?: string[];
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Schedule & Attendance
// ---------------------------------------------------------------------------

/** Day of week for training schedules. */
export type DiaSemana = "lun" | "mar" | "mie" | "jue" | "vie" | "sab";

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
// Health / Medical (Ficha Médica)
// ---------------------------------------------------------------------------

/**
 * Medical & emergency contact information for a student (Ficha Médica).
 *
 * Collected during enrollment and linked to an Alumno. This represents the
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
  alumnoId: string;
  fecha: string;  // ISO date
  estado: EstadoAsistencia;
  observacion?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Domain Helpers
// ---------------------------------------------------------------------------

/**
 * Check whether a responsible payer is a self-managed adult student.
 */
export function isSelfManaged(tipo: TipoResponsable): boolean {
  return tipo === "autogestionado";
}

/**
 * Human-readable label for a responsible payer type, in Spanish.
 */
export function getTipoResponsableLabel(tipo: TipoResponsable): string {
  switch (tipo) {
    case "representante":
      return "Representante";
    case "autogestionado":
      return "Alumno autogestionado";
  }
}

/**
 * Check whether the given responsible payer manages a specific student.
 */
export function canManageStudent(
  responsable: ResponsablePago,
  alumnoId: string,
): boolean {
  return responsable.alumnosIds.includes(alumnoId);
}
