/**
 * Shared pure helpers for the trainer panel's new filter/search UI:
 *  - `/trainer` (Task 1): default "recent attendance" date-range window.
 *  - `/trainer/ranking` (Task 2): client-side student search filtering and
 *    nivel-categoria resolution for the level-color badge.
 *
 * No React dependencies — pure functions for testability, following this
 * repo's established page.tsx + *-utils.ts convention (see
 * src/app/trainer/ranking/ranking-utils.ts, src/app/groups/groups-page-utils.ts).
 */

// ---------------------------------------------------------------------------
// Recent-attendance default date range (Task 1)
// ---------------------------------------------------------------------------

export interface RecentDateRange {
  fechaInicio: string;
  fechaFin: string;
}

/** "YYYY-MM-DD" for a given Date — same UTC-slice convention already used by `todayIsoDate` on this page. */
function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Default "recent attendance" window for the trainer dashboard list: the
 * last 7 days (inclusive of `referenceDate`, today by default) — long
 * enough to span every weekly-recurring Horario at least once, short enough
 * to stay a genuinely "recent" list (the full history remains reachable via
 * the date-range filter).
 */
export function recentDateRange(
  referenceDate: Date = new Date(),
  days = 7,
): RecentDateRange {
  const start = new Date(referenceDate);
  start.setDate(start.getDate() - (days - 1));
  return {
    fechaInicio: toIsoDate(start),
    fechaFin: toIsoDate(referenceDate),
  };
}

// ---------------------------------------------------------------------------
// Student search filtering (Task 2)
// ---------------------------------------------------------------------------

export interface SearchableStudent {
  nombres: string;
  apellidos: string;
}

/**
 * Filter students by a case-insensitive substring match against nombres or
 * apellidos. An empty/whitespace-only query returns the full list unchanged
 * — client-side filtering only, no new API call.
 */
export function filterStudentsByQuery<T extends SearchableStudent>(
  students: T[],
  query: string,
): T[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return students;
  return students.filter(
    (s) =>
      s.nombres.toLowerCase().includes(trimmed) ||
      s.apellidos.toLowerCase().includes(trimmed),
  );
}

// ---------------------------------------------------------------------------
// Nivel-categoria resolution for the level-color badge (Task 2)
// ---------------------------------------------------------------------------

export type NivelCategoria = "principiante" | "intermedio" | "avanzado";

export interface NivelWithCategoria {
  id: number;
  nivelCategoria: NivelCategoria;
}

/**
 * Resolve a student's current `nivelCategoria` from their `nivelRankingId`,
 * for the level-color badge on the "Nivel actual" column. Returns `null`
 * when unassigned or when the id has no matching nivel — never throws
 * (defensive, same pattern as `nivelLabel` in ranking/page.tsx).
 */
export function resolveNivelCategoria(
  nivelRankingId: number | null,
  niveles: NivelWithCategoria[],
): NivelCategoria | null {
  if (nivelRankingId === null) return null;
  return niveles.find((n) => n.id === nivelRankingId)?.nivelCategoria ?? null;
}
