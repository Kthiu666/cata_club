import { describe, it, expect } from "vitest";
import { computeAuthBrandHighlights } from "../auth-shell-stats";

describe("computeAuthBrandHighlights", () => {
  it("carries totalStudents through as activeStudents", () => {
    const result = computeAuthBrandHighlights(
      { totalAccounts: 10, totalStudents: 42, activeMemberships: 30, pendingPayments: 2 },
      { totalPresent: 0, totalAbsent: 0, totalLate: 0, totalJustified: 0, totalUnknown: 0, totalStudents: 0 },
    );
    expect(result.activeStudents).toBe(42);
  });

  it("computes the rounded present-rate percentage", () => {
    const result = computeAuthBrandHighlights(
      { totalAccounts: 1, totalStudents: 1, activeMemberships: 1, pendingPayments: 0 },
      { totalPresent: 89, totalAbsent: 11, totalLate: 0, totalJustified: 0, totalUnknown: 0, totalStudents: 100 },
    );
    expect(result.attendanceRatePercent).toBe(89);
  });

  it("returns 0% instead of NaN when there are no attendance records", () => {
    const result = computeAuthBrandHighlights(
      { totalAccounts: 0, totalStudents: 0, activeMemberships: 0, pendingPayments: 0 },
      { totalPresent: 0, totalAbsent: 0, totalLate: 0, totalJustified: 0, totalUnknown: 0, totalStudents: 0 },
    );
    expect(result.attendanceRatePercent).toBe(0);
  });
});
