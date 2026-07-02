/**
 * Pure utility functions and configuration for the Gestion de Grupos admin page.
 *
 * Extracted from page.tsx for testability — no React dependencies.
 * Pure functions for business logic, config maps for UI constants.
 */

import type { Grupo } from "@/types/domain";
import type { StudentRef } from "@/lib/groups-utils";

// ---------------------------------------------------------------------------
// Student group resolution
// ---------------------------------------------------------------------------

/**
 * Find which group a student belongs to, based on current grupos state.
 */
export function findStudentGroupId(
  studentId: string,
  grupos: Grupo[],
): string | null {
  for (const g of grupos) {
    if (g.alumnosIds.includes(studentId)) return g.id;
  }
  return null;
}

/**
 * Build a flattened list of student references from member accounts,
 * deriving each student's current grupoId from the grupos state rather
 * than from static data. This keeps the unassigned list in sync with
 * actual group assignments.
 */
export function buildStudentRefs(
  grupos: Grupo[],
  memberAccounts: ReadonlyArray<{ alumnos: ReadonlyArray<{ id: string; nombres: string; apellidos: string; activo: boolean }> }>,
): StudentRef[] {
  const refs: StudentRef[] = [];
  for (const account of memberAccounts) {
    for (const alumno of account.alumnos) {
      const grupoId = findStudentGroupId(alumno.id, grupos);
      refs.push({
        id: alumno.id,
        nombres: alumno.nombres,
        apellidos: alumno.apellidos,
        grupoId,
        activo: alumno.activo,
      });
    }
  }
  return refs;
}

// ---------------------------------------------------------------------------
// Level badge configuration
// ---------------------------------------------------------------------------

/** CSS class sets for each technical level badge. */
export const LEVEL_BADGE: Record<string, string> = {
  principiante: "bg-green-50 text-green-700 ring-1 ring-green-200",
  intermedio: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  avanzado: "bg-red-50 text-red-700 ring-1 ring-red-200",
};

/**
 * Get the CSS class for a level badge, with a fallback for unknown levels.
 */
export function getLevelBadgeClass(level: string): string {
  return LEVEL_BADGE[level] ?? "bg-cata-warm text-cata-gray";
}

// ---------------------------------------------------------------------------
// Capacity bar configuration
// ---------------------------------------------------------------------------

/** Thresholds for capacity bar color, as [minPercent, colorClass] tuples.
 *  Checked in descending order — the first matching threshold wins. */
const CAPACITY_THRESHOLDS: Array<{ min: number; color: string }> = [
  { min: 90, color: "bg-red-500" },
  { min: 70, color: "bg-amber-500" },
  { min: 0, color: "bg-emerald-500" },
];

/**
 * Get the Tailwind color class for a capacity bar based on the usage percent.
 *
 *   - >= 90%: red (over capacity)
 *   - >= 70%: amber (near capacity)
 *   - < 70%:  emerald (healthy)
 */
export function getCapacityBarColor(percent: number): string {
  for (const threshold of CAPACITY_THRESHOLDS) {
    if (percent >= threshold.min) return threshold.color;
  }
  return "bg-emerald-500";
}
