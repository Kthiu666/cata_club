/**
 * Shared formatting utilities.
 */

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
 * Format an ISO date string to a display date.
 *
 * Returns an empty string for invalid or empty date inputs.
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = parseDateStringLocal(dateStr);
  if (!date) return "";

  return date.toLocaleDateString("es-EC", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format an ISO date string to a display date with time.
 *
 * Returns an empty string for invalid or empty date inputs.
 */
export function formatDateTime(dateStr: string): string {
  if (!dateStr) return "";
  const date = parseDateStringLocal(dateStr);
  if (!date) return "";

  const datePart = date.toLocaleDateString("es-EC", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const timePart = date.toLocaleTimeString("es-EC", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${datePart} · ${timePart}`;
}
