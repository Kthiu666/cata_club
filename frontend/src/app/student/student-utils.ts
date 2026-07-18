/**
 * Pure utility functions for the Student portal page.
 *
 * Extracted from page.tsx for testability — no React dependencies. Follows
 * the same pattern as attendance-utils.ts / members-utils.ts.
 */

import type { StudentRankingSummary } from "@/services/api";

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

export function buildAccountLabel(hasAlumnoRole: boolean, representadosCount: number): string {
  if (derivePortalMode(hasAlumnoRole, representadosCount) === "pending") return "Pendiente de Matrícula";
  if (isRepresentative(representadosCount)) return "Representante";
  return "Estudiante";
}

// ---------------------------------------------------------------------------
// Ranking display
// ---------------------------------------------------------------------------

export interface RankingDisplay {
  label: string;
  detail: string;
  badgeClass: string;
}

/** Human-readable label + badge class for a `StudentRankingSummary` — one place to keep the three states (available/in-ranking, available/not-yet-ranked, unavailable) consistent. */
export function describeRanking(ranking: StudentRankingSummary): RankingDisplay {
  if (ranking.status === "unavailable") {
    return ranking.reason === "forbidden"
      ? { label: "No disponible", detail: "Solo el propio alumno puede ver este perfil.", badgeClass: "badge-warning" }
      : { label: "No disponible", detail: "No se pudo consultar el ranking en este momento.", badgeClass: "badge-warning" };
  }
  if (!ranking.estaEnRanking) {
    return { label: "Sin nivel asignado", detail: "Aún no fue asignado a un nivel de ranking.", badgeClass: "badge-warning" };
  }
  const posicion = ranking.posicionActual !== null ? `Posición #${ranking.posicionActual}` : "Sin posición aún";
  return {
    label: ranking.nivelNombre ?? "Nivel sin nombre",
    detail: `${posicion} · ${ranking.puntajeAcumulado} pts`,
    badgeClass: "badge-success",
  };
}
