/**
 * Pure utility functions and mock data for the Gestionar Miembros admin page.
 *
 * Extracted from page.tsx for testability — no React dependencies.
 * Follows the same pattern as attendance-utils.ts and proof-utils.ts.
 */

import type {
  Grupo,
  TipoResponsable,
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

/** A student summary visible in the admin members list. */
export interface MemberStudentSummary {
  id: string;
  nombres: string;
  apellidos: string;
  /** The group this student belongs to (if assigned). Technical level is carried by the group, not the student. */
  grupoId: string | null;
  fechaNacimiento?: string;
  activo: boolean;
  membresia: {
    tipo: TipoMembresia;
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

/** A responsible payer / account owner with their managed students. */
export interface MemberAccount {
  id: string;
  tipo: TipoResponsable;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  alumnos: MemberStudentSummary[];
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

export const PAYER_TYPE_LABELS: Record<TipoResponsable, string> = {
  representante: "Representante",
  autogestionado: "Alumno autogestionado",
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a date string, handling date-only values ("YYYY-MM-DD") as stable
 * calendar dates instead of UTC midnight.
 *
 * Date-only strings like "2014-03-15" passed to `new Date("2014-03-15")`
 * are interpreted as UTC midnight, which becomes the previous day at
 * 19:00 in America/Guayaquil (UTC-5). Anchoring at noon UTC preserves the
 * intended calendar date across local machines and CI runners.
 *
 * Returns `null` for invalid or empty inputs.
 */
function parseDateStringLocal(dateStr: string): Date | null {
  if (!dateStr) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1; // 0-indexed
    const day = Number(match[3]);
    const d = new Date(Date.UTC(year, month, day, 12, 0, 0));
    // Reject overflow (month 13 → Jan, day 32 → Feb 1, etc.)
    if (d.getUTCMonth() !== month || d.getUTCDate() !== day) return null;
    return d;
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format a numeric amount as USD currency per Ecuadorian locale.
 *
 * Normalizes ICU-version-dependent whitespace/literal parts by assembling
 * via `formatToParts`. Returns `"$0,00"` for non-finite or NaN inputs.
 */
export function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) return "$0,00";

  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
  })
    .formatToParts(amount)
    .filter((p) => p.type !== "literal")
    .map((p) => p.value)
    .join("");
}

/**
 * Format an ISO date string to a short display date, in Ecuador timezone.
 *
 * Date-only strings ("YYYY-MM-DD") are parsed as local calendar dates
 * to avoid the UTC-midnight offset shifting the day back by one.
 *
 * Returns an empty string for invalid or empty date inputs.
 */
export function formatDate(dateStr: string): string {
  const date = parseDateStringLocal(dateStr);
  if (!date) return "";

  return date.toLocaleDateString("es-EC", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Build aggregate statistics from the member accounts list.
 */
export function buildMemberStats(accounts: MemberAccount[]): MemberStats {
  let totalStudents = 0;
  let activeMemberships = 0;
  let pendingPayments = 0;

  for (const account of accounts) {
    for (const alumno of account.alumnos) {
      totalStudents++;
      if (alumno.membresia?.estado === "activa") {
        activeMemberships++;
      }
      if (alumno.ultimoPago?.estado === "pendiente_validacion") {
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
 * Get the full display name for a responsible payer type.
 */
export function getPayerTypeLabel(tipo: TipoResponsable): string {
  return PAYER_TYPE_LABELS[tipo];
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
    if (normalizeText(account.email).includes(term)) {
      return true;
    }
    return account.alumnos.some((a) =>
      normalizeText(`${a.nombres} ${a.apellidos}`).includes(term),
    );
  });
}

/**
 * Count the number of students with active membership for a given account.
 */
export function countActiveStudents(account: MemberAccount): number {
  return account.alumnos.filter(
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
  if (
    account.alumnos.some(
      (a) => a.ultimoPago?.estado === "pendiente_validacion",
    )
  ) {
    return { label: "Requiere atención", className: "badge-warning" };
  }
  return { label: "Requiere atención", className: "badge-error" };
}
