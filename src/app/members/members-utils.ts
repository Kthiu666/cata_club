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

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

export const MOCK_MEMBER_ACCOUNTS: MemberAccount[] = [
  {
    id: "rp-001",
    tipo: "representante",
    nombres: "Carlos",
    apellidos: "Martínez",
    email: "carlos.martinez@email.com",
    telefono: "+593 99 123 4567",
    alumnos: [
      {
        id: "stu-001",
        nombres: "Sofía",
        apellidos: "Martínez",
        grupoId: "grupo-001",
        fechaNacimiento: "2014-03-15",
        activo: true,
        membresia: {
          tipo: "mensual",
          estado: "activa",
          fechaInicio: "2026-07-01",
          fechaFin: "2026-07-31",
          monto: 85,
        },
        ultimoPago: {
          estado: "aprobado",
          fechaPago: "2026-06-28",
          monto: 85,
          periodo: "Julio 2026",
        },
      },
      {
        id: "stu-002",
        nombres: "Mateo",
        apellidos: "Martínez",
        grupoId: "grupo-002",
        fechaNacimiento: "2012-08-22",
        activo: true,
        membresia: {
          tipo: "mensual",
          estado: "activa",
          fechaInicio: "2026-07-01",
          fechaFin: "2026-07-31",
          monto: 85,
        },
        ultimoPago: {
          estado: "pendiente_validacion",
          fechaPago: "2026-06-27",
          monto: 85,
          periodo: "Julio 2026",
        },
      },
      {
        id: "stu-003",
        nombres: "Emilia",
        apellidos: "Martínez",
        grupoId: "grupo-001",
        fechaNacimiento: "2016-11-05",
        activo: true,
        membresia: {
          tipo: "mensual",
          estado: "vencida",
          fechaInicio: "2026-06-01",
          fechaFin: "2026-06-30",
          monto: 85,
        },
        ultimoPago: {
          estado: "pendiente_validacion",
          fechaPago: "2026-06-29",
          monto: 85,
          periodo: "Agosto 2026",
        },
      },
    ],
  },
  {
    id: "rp-002",
    tipo: "representante",
    nombres: "Ana",
    apellidos: "López",
    email: "ana.lopez@email.com",
    telefono: "+593 98 765 4321",
    alumnos: [
      {
        id: "stu-004",
        nombres: "Valentina",
        apellidos: "López",
        grupoId: "grupo-003",
        fechaNacimiento: "2010-02-10",
        activo: true,
        membresia: {
          tipo: "trimestral",
          estado: "activa",
          fechaInicio: "2026-07-01",
          fechaFin: "2026-09-30",
          monto: 240,
        },
        ultimoPago: {
          estado: "aprobado",
          fechaPago: "2026-06-26",
          monto: 240,
          periodo: "Julio — Septiembre 2026",
        },
      },
    ],
  },
  {
    id: "rp-003",
    tipo: "representante",
    nombres: "Diego",
    apellidos: "Flores",
    email: "diego.flores@email.com",
    telefono: "+593 97 654 3210",
    alumnos: [
      {
        id: "stu-005",
        nombres: "Camila",
        apellidos: "Flores",
        grupoId: "grupo-001",
        fechaNacimiento: "2015-06-18",
        activo: true,
        membresia: {
          tipo: "mensual",
          estado: "vencida",
          fechaInicio: "2026-06-01",
          fechaFin: "2026-06-30",
          monto: 85,
        },
        ultimoPago: null,
      },
    ],
  },
  {
    id: "rp-004",
    tipo: "autogestionado",
    nombres: "Nicolás",
    apellidos: "Acosta",
    email: "nicolas.acosta@email.com",
    telefono: "+593 96 543 2109",
    alumnos: [
      {
        id: "stu-006",
        nombres: "Nicolás",
        apellidos: "Acosta",
        grupoId: "grupo-002",
        activo: true,
        membresia: {
          tipo: "anual",
          estado: "activa",
          fechaInicio: "2026-01-01",
          fechaFin: "2026-12-31",
          monto: 720,
        },
        ultimoPago: {
          estado: "aprobado",
          fechaPago: "2025-12-20",
          monto: 720,
          periodo: "Anual 2026",
        },
      },
    ],
  },
  {
    id: "rp-005",
    tipo: "representante",
    nombres: "Carlos",
    apellidos: "Ramírez",
    email: "carlos.ramirez@email.com",
    telefono: "+593 95 432 1098",
    alumnos: [
      {
        id: "stu-007",
        nombres: "Santiago",
        apellidos: "Ramírez",
        grupoId: "grupo-001",
        fechaNacimiento: "2013-09-30",
        activo: true,
        membresia: {
          tipo: "mensual",
          estado: "vencida",
          fechaInicio: "2026-06-01",
          fechaFin: "2026-06-30",
          monto: 85,
        },
        ultimoPago: {
          estado: "pendiente_validacion",
          fechaPago: "2026-06-26",
          monto: 85,
          periodo: "Julio 2026",
        },
      },
      {
        id: "stu-008",
        nombres: "Isabella",
        apellidos: "Morales",
        grupoId: "grupo-001",
        fechaNacimiento: "2014-12-12",
        activo: true,
        membresia: {
          tipo: "mensual",
          estado: "vencida",
          fechaInicio: "2026-05-01",
          fechaFin: "2026-05-31",
          monto: 85,
        },
        ultimoPago: null,
      },
    ],
  },
  {
    id: "rp-006",
    tipo: "representante",
    nombres: "Lucía",
    apellidos: "Mendoza",
    email: "lucia.mendoza@email.com",
    telefono: "+593 94 321 0987",
    alumnos: [
      {
        id: "stu-009",
        nombres: "Joaquín",
        apellidos: "Mendoza",
        grupoId: null,
        fechaNacimiento: "2017-04-20",
        activo: true,
        membresia: null,
        ultimoPago: null,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Mock Groups — technical level is carried by the group, not the student.
// ---------------------------------------------------------------------------

export const MOCK_GRUPOS: Grupo[] = [
  {
    id: "grupo-001",
    nombre: "Principiantes",
    nivel: "principiante",
    alumnosIds: ["stu-001", "stu-003", "stu-005", "stu-007", "stu-008"],
    horariosIds: ["hor-001", "hor-004", "hor-007"],
    activo: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "grupo-002",
    nombre: "Intermedios",
    nivel: "intermedio",
    alumnosIds: ["stu-002", "stu-006"],
    horariosIds: ["hor-002", "hor-005"],
    activo: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "grupo-003",
    nombre: "Avanzados",
    nivel: "avanzado",
    alumnosIds: ["stu-004"],
    horariosIds: ["hor-003", "hor-006", "hor-008"],
    activo: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
];

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
 * Parse a date string, handling date-only values ("YYYY-MM-DD") as local
 * calendar dates instead of UTC midnight.
 *
 * Date-only strings like "2014-03-15" passed to `new Date("2014-03-15")`
 * are interpreted as UTC midnight, which becomes the previous day at
 * 19:00 in America/Guayaquil (UTC-5). Parsing components avoids this.
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
    const d = new Date(year, month, day);
    // Reject overflow (month 13 → Jan, day 32 → Feb 1, etc.)
    if (d.getMonth() !== month || d.getDate() !== day) return null;
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
