/**
 * Pure utility functions and configuration for the Ranking (Track Ranking)
 * trainer page.
 *
 * Extracted from page.tsx for testability — no React dependencies. Not part
 * of the original file list in the ticket; added following this repo's
 * established page.tsx + page-utils.ts convention (see
 * src/app/groups/groups-page-utils.ts, src/app/attendance/attendance-utils.ts).
 *
 * The "ranking category" a student is assigned to IS the same `nivel_ranking`
 * record used by `NivelTecnico`/Grupo (src/app/groups/page.tsx) — the backend
 * has only one such table. There is no separate ranking-category taxonomy.
 */

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

/** Split a validated "YYYY-MM" period into its numeric año/mes parts for the backend. */
export function parsePeriodo(periodo: string): { anio: number; mes: number } {
  const [anio, mes] = periodo.split("-").map(Number);
  return { anio, mes };
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
  /** The student's current nivel_ranking id (null if not yet assigned). */
  nivelRankingId: number | null;
}

/**
 * Build the ranking student list from the real member accounts (fetched via
 * fetchMembers(), same source as src/app/groups/page.tsx). Each student's
 * `grupoId` (their current nivel_ranking id) doubles as their ranking
 * category — there's no separate concept on the backend.
 */
export function buildRankingStudents(
  memberAccounts: ReadonlyArray<{
    estudiantes: ReadonlyArray<{
      id: string;
      nombres: string;
      apellidos: string;
      activo: boolean;
      grupoId: string | null;
    }>;
  }>,
): RankingStudentRef[] {
  const refs: RankingStudentRef[] = [];
  for (const account of memberAccounts) {
    for (const estudiante of account.estudiantes) {
      refs.push({
        id: estudiante.id,
        nombres: estudiante.nombres,
        apellidos: estudiante.apellidos,
        activo: estudiante.activo,
        nivelRankingId: estudiante.grupoId !== null ? Number(estudiante.grupoId) : null,
      });
    }
  }
  return refs;
}
