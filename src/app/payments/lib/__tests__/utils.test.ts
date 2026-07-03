/**
 * Tests for payment utilities (formatCurrency, formatDate).
 */

import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate } from "../utils";

// ---------------------------------------------------------------------------
// formatCurrency
// ---------------------------------------------------------------------------

describe("formatCurrency", () => {
  it("formats USD with Ecuador Spanish locale", () => {
    expect(formatCurrency(85)).toMatch(/\$\s*85[,.]00/);
    expect(formatCurrency(1234.5)).toMatch(/\$\s*1[\s.]?234[,.]50/);
  });

  it("handles zero", () => {
    expect(formatCurrency(0)).toMatch(/\$\s*0[,.]00/);
  });

  it("handles negative amounts", () => {
    expect(formatCurrency(-50)).toMatch(/\$\s*-?50[,.]00/);
  });
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------

describe("formatDate", () => {
  it("formats an ISO date string with time", () => {
    const result = formatDate("2026-06-28T10:30:00Z");
    expect(result).toContain("2026");
    expect(result).toContain("28");
    expect(result).toContain(":"); // time separator
  });

  it("formats a local date string", () => {
    const result = formatDate("2026-01-15T12:00:00");
    expect(result).toContain("2026");
    expect(result).toContain("15");
  });
});
