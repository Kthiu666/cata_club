/**
 * Pure utility functions and configuration for the Ranking (Track Ranking)
 * trainer page.
 *
 * Extracted from page.tsx for testability — no React dependencies. Not part
 * of the original file list in the ticket; added following this repo's
 * established page.tsx + page-utils.ts convention (see
 * src/app/groups/groups-page-utils.ts, src/app/attendance/attendance-utils.ts).
 *
 * `CategoriaRanking` (1–10) is a separate, unrelated taxonomy from
 * `NivelTecnico` — do not conflate the two. See the doc comment on
 * `CategoriaRanking` in src/types/domain.ts.
 */

import type { CategoriaRanking } from "@/types/domain";

// ---------------------------------------------------------------------------
// Category range validation
// ---------------------------------------------------------------------------

export const CATEGORIA_MIN = 1;
export const CATEGORIA_MAX = 10;

/** True when `value` is an integer within the valid ranking-category range (1–10). */
export function isValidCategoria(value: number): value is CategoriaRanking {
  return Number.isInteger(value) && value >= CATEGORIA_MIN && value <= CATEGORIA_MAX;
}

/** All valid ranking categories, 1 through 10, for building a select/dropdown. */
export const CATEGORIA_OPTIONS: CategoriaRanking[] = Array.from(
  { length: CATEGORIA_MAX - CATEGORIA_MIN + 1 },
  (_, i) => i + CATEGORIA_MIN,
);

// ---------------------------------------------------------------------------
// Period ("YYYY-MM") validation and derivation
// ---------------------------------------------------------------------------

const PERIODO_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** True when `value` matches the "YYYY-MM" ranking period format. */
export function isValidPeriodo(value: string): boolean {
  return PERIODO_PATTERN.test(value);
}

/** The current period ("YYYY-MM"), for defaulting form inputs. */
export function currentPeriodo(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

// ---------------------------------------------------------------------------
// Student list derivation
// ---------------------------------------------------------------------------

/** A lightweight student reference for ranking operations. */
export interface RankingStudentRef {
  id: string;
  nombres: string;
  apellidos: string;
  activo: boolean;
  categoria: CategoriaRanking | null;
}

/**
 * Build the ranking student list from the shared member-accounts mock data,
 * joined with the page's local `categoria` assignments (keyed by student
 * id). No backend GET endpoint exists yet for ranking-category assignments
 * — see the "Files to CREATE" gap noted for niveles/:id — so this list is
 * frontend-only, matching how src/app/groups/page.tsx derives its own
 * student list from the same mock source.
 */
export function buildRankingStudents(
  memberAccounts: ReadonlyArray<{
    estudiantes: ReadonlyArray<{ id: string; nombres: string; apellidos: string; activo: boolean }>;
  }>,
  categorias: Readonly<Record<string, CategoriaRanking>>,
): RankingStudentRef[] {
  const refs: RankingStudentRef[] = [];
  for (const account of memberAccounts) {
    for (const estudiante of account.estudiantes) {
      refs.push({
        id: estudiante.id,
        nombres: estudiante.nombres,
        apellidos: estudiante.apellidos,
        activo: estudiante.activo,
        categoria: categorias[estudiante.id] ?? null,
      });
    }
  }
  return refs;
}
