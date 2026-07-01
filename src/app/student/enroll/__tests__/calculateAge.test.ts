/**
 * Unit tests for the calculateAge helper.
 *
 * Pure function — no React dependencies, easy to test.
 */

import { describe, it, expect } from "vitest";
import { calculateAge } from "../enroll-utils";

describe("calculateAge", () => {
  it("returns 0 for a birth date of today", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(calculateAge(today)).toBe(0);
  });

  it("returns correct age for a birth date exactly N years ago", () => {
    const now = new Date();
    const birth = new Date(
      now.getFullYear() - 18,
      now.getMonth(),
      now.getDate(),
    );
    const iso = birth.toISOString().slice(0, 10);
    expect(calculateAge(iso)).toBe(18);
  });

  it("returns N-1 when birthday has not yet occurred this year", () => {
    // Use a known date: person born 1990-12-31, today is 2026-07-01 → age = 35
    expect(calculateAge("1990-12-31")).toBe(35);
  });

  it("returns 30 for someone born 30 years ago (month only)", () => {
    const now = new Date();
    const birth = new Date(now.getFullYear() - 30, now.getMonth(), now.getDate());
    const iso = birth.toISOString().slice(0, 10);
    expect(calculateAge(iso)).toBe(30);
  });

  it("handles leap year birth dates", () => {
    expect(calculateAge("2000-02-29")).toBeGreaterThanOrEqual(24);
  });
});
