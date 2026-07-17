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
    if (g.estudiantesIds.includes(studentId)) return g.id;
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
  memberAccounts: ReadonlyArray<{ estudiantes: ReadonlyArray<{ id: string; nombres: string; apellidos: string; activo: boolean }> }>,
): StudentRef[] {
  const refs: StudentRef[] = [];
  for (const account of memberAccounts) {
    for (const estudiante of account.estudiantes) {
      const grupoId = findStudentGroupId(estudiante.id, grupos);
      refs.push({
        id: estudiante.id,
        nombres: estudiante.nombres,
        apellidos: estudiante.apellidos,
        grupoId,
        activo: estudiante.activo,
      });
    }
  }
  return refs;
}

// ---------------------------------------------------------------------------
// Level badge configuration
// ---------------------------------------------------------------------------

/**
 * CSS class sets for each technical level badge — B3 fix: `cata-*` brand
 * tokens only, no hardcoded hex/rgba. `principiante` reuses the `state-ok`
 * success token; `avanzado` reuses the brand red. There is no dedicated
 * "warning" hue declared in the `cata-*` namespace (same gap noted for the
 * Fase 1 demo-role chips), so `intermedio` reuses `cata-navy` as the third
 * distinct brand hue available, distinguished from the other two levels by
 * hue alone (red/green/navy are visually distinct).
 */
export const LEVEL_BADGE: Record<string, string> = {
  principiante: "bg-cata-state-ok/10 text-cata-state-ok ring-1 ring-cata-state-ok/30",
  intermedio: "bg-cata-navy/10 text-cata-navy ring-1 ring-cata-navy/20",
  avanzado: "bg-cata-red/10 text-cata-red ring-1 ring-cata-red/30",
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
