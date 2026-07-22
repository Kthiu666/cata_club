/**
 * Pure utility functions and mock data for the Gestionar Miembros admin page.
 *
 * Extracted from page.tsx for testability — no React dependencies.
 * Follows the same pattern as attendance-utils.ts and proof-utils.ts.
 */

import type {
  Grupo,
  TipoMembresia,
  EstadoMembresia,
} from "@/types/domain";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Lifecycle state of a payment — mirrors the domain union from Pago.estado. */
export type PaymentStatus =
  | "pendiente_validacion"
  | "aprobado"
  | "rechazado";

/**
 * Account-owner roles that can appear in the members list — a narrow subset
 * of `UserRole` (admin/trainer never own a member row here), so the compiler
 * rejects any value `PAYER_TYPE_LABELS` doesn't have a label for.
 */
export type PayerType = "representante" | "estudiante";

/** A student summary visible in the admin members list. */
export interface MemberStudentSummary {
  id: string;
  nombres: string;
  apellidos: string;
  /**
   * Optional: `PersonaResponseDTO` (backend) has no `email` field — email
   * lives on `Usuario` (login credentials), and there is no bulk endpoint
   * to resolve it per Persona. Omitted (not fabricated) when unavailable.
   */
  email?: string;
  /** The group this student belongs to (if assigned). Technical level is carried by the group, not the student. */
  grupoId: string | null;
  fechaNacimiento?: string;
  activo: boolean;
  prioridadMunicipal?: boolean;
  porcentajeBeca?: number;
  motivoBeca?: string;
  membresia: {
    /**
     * Display label for the membership plan. Was `TipoMembresia` (a strict
     * "mensual"|"trimestral"|"semestral"|"anual" union) — the real backend
     * `TipoMembresia` model has no such field (only `categoria` free text +
     * `modalidad`: "PERSONALIZADA"|"MENSUAL"), so this is now a plain
     * display string built server-side (see members-adapter.ts) instead of
     * guessing a mapping into the old union. Mock fixtures still use the
     * old literal values ("mensual", etc.) — those remain valid strings.
     */
    tipo: string;
    estado: EstadoMembresia;
    fechaInicio: string;
    fechaFin: string;
    monto: number;
  } | null;
  ultimoPago: {
    estado: PaymentStatus;
    fechaPago: string;
    monto: number;
    periodo: string;
  } | null;
}

/**
 * An account-owner row — a `Usuario` with `role: "representante"` or a
 * self-managed `role: "estudiante"` (`representanteId: null`) — with its
 * managed students. `estudiantes` is the derived list of `UsuarioEstudiante`
 * accounts whose `representanteId` points to this account (self-managed
 * accounts include themselves).
 */
export interface MemberAccount {
  id: string;
  role: PayerType;
  nombres: string;
  apellidos: string;
  /** Optional — see `MemberStudentSummary.email`'s doc comment for why. */
  email?: string;
  telefono: string;
  estudiantes: MemberStudentSummary[];
}

/** Aggregate statistics for the members overview. */
export interface MemberStats {
  totalAccounts: number;
  totalStudents: number;
  activeMemberships: number;
  pendingPayments: number;
}

// Mock data has moved to src/mocks/members.ts.
// Import MOCK_MEMBER_ACCOUNTS and MOCK_GRUPOS from @/mocks/members.

// ---------------------------------------------------------------------------
// Configuration maps
// ---------------------------------------------------------------------------

export const MEMBERSHIP_STATUS_LABELS: Record<EstadoMembresia, string> = {
  activa: "Activa",
  vencida: "Vencida",
  suspendida: "Suspendida",
};

export const MEMBERSHIP_STATUS_BADGE: Record<EstadoMembresia, string> = {
  activa: "badge-success",
  vencida: "badge-error",
  suspendida: "badge-error",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  aprobado: "Aprobado",
  pendiente_validacion: "Pendiente",
  rechazado: "Rechazado",
};

export const PAYMENT_STATUS_BADGE: Record<PaymentStatus, string> = {
  aprobado: "badge-success",
  pendiente_validacion: "badge-warning",
  rechazado: "badge-error",
};

export const PAYER_TYPE_LABELS: Record<PayerType, string> = {
  representante: "Representante",
  estudiante: "Estudiante",
};

export const MEMBERSHIP_TYPE_LABELS: Record<TipoMembresia, string> = {
  mensual: "Mensual",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

// ---------------------------------------------------------------------------
// Group helpers — technical level is carried by the group, not the student.
// ---------------------------------------------------------------------------

/**
 * Look up a mock group by ID.
 */
export function getGrupoById(
  grupoId: string | null,
  grupos: Grupo[],
): Grupo | undefined {
  if (!grupoId) return undefined;
  return grupos.find((g) => g.id === grupoId);
}

/**
 * Get the human-readable technical-level label for a student based on their
 * group assignment. Returns `null` when the student has no group (level
 * pending evaluation).
 */
export function getNivelLabelFromGrupo(
  grupoId: string | null,
  grupos: Grupo[],
): string | null {
  const grupo = getGrupoById(grupoId, grupos);
  if (!grupo) return null;
  return capitalize(grupo.nivel);
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export { formatCurrency, formatDate } from "@/lib/format-utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a date string, handling date-only values ("YYYY-MM-DD") as stable
 * calendar dates instead of UTC midnight.
 *
 * Returns `null` for invalid or empty inputs.
 */
function parseDateStringLocal(dateStr: string): Date | null {
  if (!dateStr) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const d = new Date(Date.UTC(year, month, day, 12, 0, 0));
    if (d.getUTCMonth() !== month || d.getUTCDate() !== day) return null;
    return d;
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Build aggregate statistics from the member accounts list.
 */
export function buildMemberStats(accounts: MemberAccount[]): MemberStats {
  let totalStudents = 0;
  let activeMemberships = 0;
  let pendingPayments = 0;

  for (const account of accounts) {
    for (const estudiante of account.estudiantes) {
      totalStudents++;
      if (estudiante.membresia?.estado === "activa") {
        activeMemberships++;
      }
      if (estudiante.ultimoPago?.estado === "pendiente_validacion") {
        pendingPayments++;
      }
    }
  }

  return {
    totalAccounts: accounts.length,
    totalStudents,
    activeMemberships,
    pendingPayments,
  };
}

/**
 * Build a human-readable summary string for a student's membership period.
 *
 * Returns an empty string when either date is invalid or empty.
 */
export function formatMembershipPeriod(
  fechaInicio: string,
  fechaFin: string,
): string {
  const start = parseDateStringLocal(fechaInicio);
  const end = parseDateStringLocal(fechaFin);
  if (!start || !end) return "";

  const startStr = start.toLocaleDateString("es-EC", {
    timeZone: "America/Guayaquil",
    month: "short",
    day: "numeric",
  });
  const endStr = end.toLocaleDateString("es-EC", {
    timeZone: "America/Guayaquil",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startStr} — ${endStr}`;
}

/**
 * Get the full display name for an account owner's role.
 */
export function getPayerTypeLabel(role: PayerType): string {
  return PAYER_TYPE_LABELS[role];
}

/**
 * Normalize text for accent-insensitive comparison.
 *
 * Strips diacritic accent marks via NFD decomposition, lowercases the
 * result, and trims leading/trailing whitespace. This allows "Martinez"
 * to match "Martínez", "Perez" to match "Pérez", etc.
 *
 * Preserves the letter ñ (U+00F1) — it is a distinct Spanish letter, not an
 * accented n. The combining tilde (U+0303) is NOT removed.
 */
export function normalizeText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, (char) => (char === "\u0303" ? char : ""))
    .normalize("NFC");
}

/**
 * Filter member accounts by a search term.
 *
 * Matches against account full name, email, and any associated student names.
 * Uses accent-insensitive comparison — "Martinez" matches "Martínez".
 * Returns a shallow copy of the input array when the search term is empty or blank.
 */
export function filterAccounts(
  accounts: MemberAccount[],
  searchTerm: string,
): MemberAccount[] {
  const term = normalizeText(searchTerm.trim());
  if (!term) return [...accounts];

  return accounts.filter((account) => {
    if (normalizeText(`${account.nombres} ${account.apellidos}`).includes(term)) {
      return true;
    }
    if (account.email && normalizeText(account.email).includes(term)) {
      return true;
    }
    return account.estudiantes.some((a) =>
      normalizeText(`${a.nombres} ${a.apellidos}`).includes(term),
    );
  });
}

/**
 * Quick-filter chips shown above the members table
 * (design/admin-members-mockup-v1.html's `.chip-filters`).
 */
export type MemberFilterFlag = "all" | "vencida" | "pendiente" | "sin-grupo";

/**
 * Does this account have at least one student matching the given filter
 * flag? "all" always matches. Used alongside `filterAccounts` (text
 * search) — the two compose, they don't replace each other.
 */
export function accountMatchesFlag(
  account: MemberAccount,
  flag: MemberFilterFlag,
): boolean {
  switch (flag) {
    case "all":
      return true;
    case "vencida":
      return account.estudiantes.some((s) => s.membresia?.estado === "vencida");
    case "pendiente":
      return account.estudiantes.some((s) => s.ultimoPago?.estado === "pendiente_validacion");
    case "sin-grupo":
      return account.estudiantes.some((s) => !s.grupoId);
  }
}

/**
 * Count accounts matching a filter flag — powers the chip's count badge.
 */
export function countAccountsMatchingFlag(
  accounts: MemberAccount[],
  flag: MemberFilterFlag,
): number {
  return accounts.filter((account) => accountMatchesFlag(account, flag)).length;
}

/**
 * Count the number of students with active membership for a given account.
 */
export function countActiveStudents(account: MemberAccount): number {
  return account.estudiantes.filter(
    (a) => a.membresia?.estado === "activa",
  ).length;
}

/**
 * Get the account status badge label and variant for the members table.
 *
 * Returns:
 *  - "Activo" + "badge-success" when at least one student has an active membership.
 *  - "Requiere atención" + "badge-warning" when no active memberships but any
 *    student has a pending-validaton payment.
 *  - "Requiere atención" + "badge-error" otherwise.
 */
export function getAccountStatusBadge(account: MemberAccount): {
  label: string;
  className: string;
} {
  const activeCount = countActiveStudents(account);
  if (activeCount > 0) {
    return { label: "Activo", className: "badge-success" };
  }
  // Un pago pendiente de validación es la situación más accionable: mostrar
  // eso primero aunque la membresía esté vencida/suspendida.
  if (
    account.estudiantes.some(
      (a) => a.ultimoPago?.estado === "pendiente_validacion",
    )
  ) {
    return { label: "Pago pendiente de validación", className: "badge-warning" };
  }
  if (account.estudiantes.some((a) => a.membresia?.estado === "vencida")) {
    return { label: "Membresía vencida", className: "badge-error" };
  }
  if (account.estudiantes.some((a) => a.membresia?.estado === "suspendida")) {
    return { label: "Cuenta suspendida", className: "badge-error" };
  }
  return { label: "Sin membresía activa", className: "badge-error" };
}
