/**
 * Date-range helpers for the trainer dashboard's "Historial de Asistencias"
 * filter. Pure functions, no React — extracted for testability following the
 * repo's *-utils.ts convention (see src/app/attendance/attendance-utils.ts).
 *
 * Uses LOCAL date components (not `toISOString`, which is UTC-based) to
 * avoid silently shifting the range by a day on non-UTC timezones.
 */

export type DateRangePreset = "today" | "this_week" | "this_month" | "custom";

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Resolve a preset to `{ fechaInicio, fechaFin }` in YYYY-MM-DD form.
 * `custom` returns empty strings (must be filled in by the caller).
 * For `this_week`, week start is Sunday (matches `Date.getDay()` semantics).
 */
export function buildDateRange(preset: DateRangePreset): { fechaInicio: string; fechaFin: string } {
  const today = new Date();
  switch (preset) {
    case "today":
      return { fechaInicio: toIsoDate(today), fechaFin: toIsoDate(today) };
    case "this_week": {
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      return { fechaInicio: toIsoDate(start), fechaFin: toIsoDate(today) };
    }
    case "this_month": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { fechaInicio: toIsoDate(start), fechaFin: toIsoDate(today) };
    }
    case "custom":
      return { fechaInicio: "", fechaFin: "" };
  }
}
