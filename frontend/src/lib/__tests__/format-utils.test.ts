/**
 * Tests for shared formatting utilities (formatCurrency, formatDate).
 */

import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate, formatDateTime } from "../format-utils";

// ---------------------------------------------------------------------------
// formatCurrency
// ---------------------------------------------------------------------------

describe("formatCurrency", () => {
  it("formats whole dollars with two decimal places", () => {
    expect(formatCurrency(85)).toMatch(/^\$\d+,\d{2}$/);
  });

  it("formats cents correctly", () => {
    expect(formatCurrency(240.5)).toMatch(/^\$\d+,\d{2}$/);
    expect(formatCurrency(720)).toMatch(/^\$\d+,\d{2}$/);
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0,00");
  });

  it("handles NaN gracefully", () => {
    expect(formatCurrency(NaN)).toBe("$0,00");
  });

  it("handles Infinity and -Infinity gracefully", () => {
    expect(formatCurrency(Infinity)).toBe("$0,00");
    expect(formatCurrency(-Infinity)).toBe("$0,00");
  });
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------

describe("formatDate", () => {
  it("returns empty string for empty input", () => {
    expect(formatDate("")).toBe("");
  });

  it("returns empty string for invalid date string", () => {
    expect(formatDate("not-a-date")).toBe("");
    expect(formatDate("2026-13-01")).toBe("");
    expect(formatDate("2021-02-29")).toBe("");
  });

  it("formats a valid ISO date string", () => {
    const result = formatDate("2026-06-28T10:30:00Z");
    expect(result).toContain("2026");
    expect(result).toMatch(/junio/i);
    expect(result).toContain("28");
  });

  it("renders a date-only string as the correct calendar day", () => {
    const result = formatDate("2014-03-15");
    expect(result).toContain("15");
    expect(result).toMatch(/marzo/i);
    expect(result).toContain("2014");
  });
});

// ---------------------------------------------------------------------------
// formatDateTime
// ---------------------------------------------------------------------------

describe("formatDateTime", () => {
  it("returns empty string for empty input", () => {
    expect(formatDateTime("")).toBe("");
  });

  it("returns empty string for invalid date string", () => {
    expect(formatDateTime("not-a-date")).toBe("");
    expect(formatDateTime("2026-13-01")).toBe("");
  });

  it("formats a valid ISO date string with time", () => {
    const result = formatDateTime("2026-06-28T10:30:00Z");
    expect(result).toContain("2026");
    expect(result).toMatch(/junio/i);
    expect(result).toContain("28");
    expect(result).toContain("·");
    // Time part should be present in HH:MM format
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it("includes time for afternoon timestamps", () => {
    const result = formatDateTime("2026-06-28T14:15:00Z");
    expect(result).toContain("·");
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});
