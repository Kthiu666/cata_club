/**
 * Pure utility functions for the Student portal page.
 *
 * Extracted from page.tsx for testability — no React dependencies. Follows
 * the same pattern as attendance-utils.ts / members-utils.ts.
 */

import type {
  MembershipSummary,
  PagoPersona,
  StudentRankingSummary,
  StudentSessionSummary,
} from "@/services/api";

const MAJORITY_AGE = 18;

// ---------------------------------------------------------------------------
// Age gate
// ---------------------------------------------------------------------------

/**
 * True when the persona is younger than 18 as of today. Uses the same
 * component-wise calculation as `enroll-utils.ts::calculateAge` (avoids
 * UTC midnight shifts in Ecuador timezone). Returns `false` for
 * invalid/empty dates so the portal does not accidentally restrict access.
 */
export function isMinor(fechaNacimiento: string | null | undefined): boolean {
  if (!fechaNacimiento) return false;
  const parts = fechaNacimiento.split("-");
  if (parts.length !== 3) return false;
  const [y, m, d] = parts.map(Number);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  const today = new Date();
  let age = today.getFullYear() - y;
  const monthDiff = today.getMonth() - (m - 1);
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) age--;
  return age < MAJORITY_AGE;
}

// ---------------------------------------------------------------------------
// Portal mode
// ---------------------------------------------------------------------------

/**
 * The honest intermediate state for an authenticated persona with no
 * recognized backend role (`UserRole === "unsupported"`, see
 * src/lib/server/auth.ts's `mapBackendRoleToUserRole`).
 *
 * Role assignment for ALUMNO is lazy (see backend
 * `rol_servicio.py::asignar_alumno_si_corresponde`'s docstring: granted only
 * once a Membresia is created, not at account creation) — so a freshly
 * self-enrolled persona genuinely has zero roles until someone (an admin,
 * today) creates their membership. `"pending"` names that state explicitly
 * instead of routing through the generic /unauthorized page. A persona who
 * has already added a dependent (representados.length > 0) is NOT pending —
 * they're an active representante account, even without an ALUMNO role of
 * their own.
 */
export type StudentPortalMode = "pending" | "active";

export function derivePortalMode(hasAlumnoRole: boolean, representadosCount: number): StudentPortalMode {
  return !hasAlumnoRole && representadosCount === 0 ? "pending" : "active";
}

/** True when the account manages one or more dependents — independent of whether it also has its own ALUMNO profile. */
export function isRepresentative(representadosCount: number): boolean {
  return representadosCount > 0;
}

import type { BadgeTone } from "@/components/ui/Badge";

// ---------------------------------------------------------------------------
// Ranking display
// ---------------------------------------------------------------------------

export interface RankingDisplay {
  label: string;
  detail: string;
  /** `Badge` tone, not a class string — colour lives in the primitive. */
  tone: BadgeTone;
}

/**
 * Human-readable label + badge class for a `StudentRankingSummary` — one
 * place to keep the three states (available/in-ranking, available/
 * not-yet-ranked, unavailable) consistent.
 *
 * No longer shows "Posición #X · Y pts": the backend stopped exposing
 * `posicionActual`/`puntajeAcumulado` because they were frozen forever (no
 * writer since `cerrar_mes()` was removed) — showing a frozen number as if
 * it were live was the actual reliability bug this addresses. See
 * apply-progress of `limpieza-asistencia-y-nivel-entrenador` slice E.
 */
export function describeRanking(ranking: StudentRankingSummary): RankingDisplay {
  if (ranking.status === "unavailable") {
    return ranking.reason === "forbidden"
      ? { label: "No disponible", detail: "Solo el propio alumno puede ver este perfil.", tone: "warn" }
      : { label: "No disponible", detail: "No se pudo consultar el ranking en este momento.", tone: "warn" };
  }
  if (!ranking.estaEnRanking) {
    return { label: "Sin nivel asignado", detail: "Aún no fue asignado a un nivel de ranking.", tone: "warn" };
  }
  return {
    label: ranking.nivelNombre ?? "Nivel sin nombre",
    detail: "Activo en este nivel.",
    tone: "ok",
  };
}

// ---------------------------------------------------------------------------
// Carnet — the membership card
//
// Every field the club card shows must come from the portal payload. Three
// fields the approved prototype (`docs/ux/prototipos/22-alumno-cuenta.html`)
// draws have no source and are therefore NOT rendered:
//
//   - "Miembro nº" — no member-number concept exists anywhere in the backend
//     (`PersonaResponseDTO` carries a surrogate `id`, which is not an
//     externally-meaningful membership number).
//   - "Desde"      — `MembresiaResponseDTO.fecha_activacion` exists backend-side
//     but is dropped by `BackendMembresiaPropia`/`MembershipView` in
//     src/lib/server/student-adapter.ts, so it never reaches this client.
//   - "Renueva"    — no renewal date exists on a Membresia at all. The card
//     shows "Cobertura hasta" instead, derived from the furthest `fechaFin`
//     among the persona's APPROVED payments, which is a real coverage end.
// ---------------------------------------------------------------------------

/**
 * The rung number behind a backend level name, or `null` when it cannot be
 * read as one of the ten ladder rungs.
 *
 * `NivelRanking.nombre` is free text: the seed data uses "Nivel 9", but an
 * admin may rename a level to "Intermedios". Only a real 1–10 rung earns the
 * `LevelChip`; anything else falls back to the plain name, never a guessed
 * number.
 */
export function parseLevelNumber(nivelNombre: string | null): number | null {
  if (!nivelNombre) return null;
  const match = /(\d{1,2})\s*$/.exec(nivelNombre.trim());
  if (!match) return null;
  const rung = Number(match[1]);
  return Number.isInteger(rung) && rung >= 1 && rung <= 10 ? rung : null;
}

/**
 * A level name with the word "Nivel" in front of it when the backend name is a
 * bare rung number.
 *
 * `NivelRanking.nombre` is free text and the seed data uses both conventions:
 * "Nivel 9" in one place and a bare "3" in another. Printed raw next to a
 * student's name — as the dependants list on /profile does — a lone "3" reads
 * as a count of something, not as a rank.
 */
export function formatLevelName(nivelNombre: string | null | undefined): string | null {
  if (!nivelNombre) return null;
  const name = nivelNombre.trim();
  if (!name) return null;
  const rung = parseLevelNumber(name);
  return rung !== null ? `Nivel ${rung}` : name;
}

/** First letter of the first given name plus first letter of the first surname — the avatar disc. */
export function personInitials(nombres: string, apellidos: string): string {
  const first = nombres.trim().split(/\s+/)[0]?.[0] ?? "";
  const last = apellidos.trim().split(/\s+/)[0]?.[0] ?? "";
  return `${first}${last}`.toUpperCase();
}

// ---------------------------------------------------------------------------
// Next-training panel
// ---------------------------------------------------------------------------

export interface AttendanceRecap {
  attended: number;
  total: number;
}

/**
 * How many of the persona's recorded sessions they actually turned up to.
 *
 * The scope is deliberately "las últimas N sesiones registradas", NOT "este
 * mes": `buildRecentSessions` in src/lib/server/student-adapter.ts caps the
 * payload at the five most recent records, so a month-scoped figure cannot be
 * computed here without inventing the denominator.
 *
 * `late` counts as attended — the student came. `justified` does not: it is an
 * excused absence, and counting it would overstate the figure a parent reads.
 */
export function summarizeRecentAttendance(
  sessions: StudentSessionSummary[],
): AttendanceRecap | null {
  if (sessions.length === 0) return null;
  const attended = sessions.filter((s) => s.estado === "present" || s.estado === "late").length;
  return { attended, total: sessions.length };
}

/**
 * How the persona's recorded sessions split across the four attendance states.
 *
 * `summarizeRecentAttendance` answers "did they come?"; this answers "what
 * happened", which is the question `/student/attendance` exists to show. The
 * two are kept apart on purpose: collapsing `justified` into `absent` in the
 * ratio is correct (an excused absence is still an absence), but collapsing it
 * in the breakdown would hide the one state a parent most wants to verify.
 *
 * `total` counts every record, including an `estado` this build does not know
 * about, so the four categories never silently add up to less than the list
 * the reader is looking at.
 */
export interface AttendanceBreakdown {
  present: number;
  late: number;
  justified: number;
  absent: number;
  total: number;
}

export function breakdownAttendance(sessions: StudentSessionSummary[]): AttendanceBreakdown {
  return {
    present: sessions.filter((s) => s.estado === "present").length,
    late: sessions.filter((s) => s.estado === "late").length,
    justified: sessions.filter((s) => s.estado === "justified").length,
    absent: sessions.filter((s) => s.estado === "absent").length,
    total: sessions.length,
  };
}

// ---------------------------------------------------------------------------
// Membership state
// ---------------------------------------------------------------------------

export interface MembershipState {
  label: string;
  tone: BadgeTone;
  /** True only for a membership the club has actually activated. */
  active: boolean;
}

/**
 * The single reading of a `Membresia.estado` for the family-facing screens.
 *
 * The carnet on `/student` and the status card on `/student/payments` used to
 * each spell their own version of this — one said "Membresía pendiente", the
 * other rendered the raw `INACTIVA` enum, and the payments one painted expiry
 * in red text on the page field. One function, so a parent reading the two
 * screens back to back never has to decide which of them is right.
 *
 * Anything the backend may add later falls through to "vencida", never to
 * "activa": over-reporting coverage is the one error that costs the family
 * money.
 */
export function describeMembershipState(estado: string | null | undefined): MembershipState {
  if (!estado) return { label: "Sin membresía", tone: "neutral", active: false };
  if (estado === "ACTIVA") return { label: "Membresía activa", tone: "ok", active: true };
  if (estado === "INACTIVA") return { label: "Membresía pendiente", tone: "warn", active: false };
  return { label: "Membresía vencida", tone: "bad", active: false };
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------


/**
 * Whole days from today to an ISO `YYYY-MM-DD` date — negative once it is past.
 *
 * Not an estimate and not a projection: it is arithmetic on a date the club
 * already approved, and it is the reading a family actually wants from
 * "cobertura hasta el 28/07/2026". Both ends are compared at local midnight so
 * "today" is a calendar day, not a 24-hour window — a payment ending today
 * returns 0, never -1 because of the hour.
 *
 * Returns `null` for an unparseable date rather than a number that would be
 * rendered as "hace NaN días".
 */
export function daysUntil(isoDate: string | null | undefined, today: Date = new Date()): number | null {
  if (!isoDate) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return null;
  const target = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(target.getTime())) return null;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

/** The furthest `fechaFin` among APPROVED payments — the real end of paid coverage, or `null` when nothing is approved yet. */
export function resolveCoverageEnd(pagos: PagoPersona[]): string | null {
  return pagos
    .filter((pago) => pago.estadoPago === "APROBADO")
    .reduce<string | null>(
      (furthest, pago) => (furthest === null || pago.fechaFin > furthest ? pago.fechaFin : furthest),
      null,
    );
}

