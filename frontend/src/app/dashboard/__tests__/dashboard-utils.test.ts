/**
 * Unit tests for the dashboard's pure chart helpers.
 *
 * Pure functions — no React dependencies, easy to test.
 */

import { describe, it, expect } from "vitest";
import {
  buildAttendanceStatusSegments,
  buildDonutArcs,
  ATTENDANCE_STATUS_CHART_COLORS,
} from "../dashboard-utils";
import type { AttendanceDayStats } from "@/app/attendance/attendance-utils";

function buildStats(overrides: Partial<AttendanceDayStats> = {}): AttendanceDayStats {
  return {
    totalPresent: 0,
    totalAbsent: 0,
    totalLate: 0,
    totalJustified: 0,
    totalUnknown: 0,
    totalStudents: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// buildAttendanceStatusSegments
// ---------------------------------------------------------------------------

describe("buildAttendanceStatusSegments", () => {
  it("computes rounded percentages against the total record count, in present/late/justified/absent order", () => {
    const stats = buildStats({
      totalPresent: 60,
      totalLate: 20,
      totalJustified: 10,
      totalAbsent: 10,
      totalStudents: 100,
    });
    const segments = buildAttendanceStatusSegments(stats);
    expect(segments.map((s) => s.estado)).toEqual(["present", "late", "justified", "absent"]);
    expect(segments.map((s) => s.percentage)).toEqual([60, 20, 10, 10]);
    expect(segments.map((s) => s.value)).toEqual([60, 20, 10, 10]);
  });

  it("returns 0% for every segment when there are no records at all (never divides by zero)", () => {
    const segments = buildAttendanceStatusSegments(buildStats());
    expect(segments.every((s) => s.percentage === 0)).toBe(true);
  });

  it("assigns each estado its validated chart color", () => {
    const segments = buildAttendanceStatusSegments(buildStats({ totalPresent: 1, totalStudents: 1 }));
    for (const segment of segments) {
      expect(segment.color).toBe(ATTENDANCE_STATUS_CHART_COLORS[segment.estado]);
    }
  });

  it("includes a segment even when its count is zero, so the legend always shows all 4 states", () => {
    const segments = buildAttendanceStatusSegments(buildStats({ totalPresent: 5, totalStudents: 5 }));
    expect(segments).toHaveLength(4);
    expect(segments.find((s) => s.estado === "absent")?.value).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// buildDonutArcs
// ---------------------------------------------------------------------------

describe("buildDonutArcs", () => {
  const CIRCUMFERENCE = 100;

  it("splits the circumference proportionally, offsetting each arc by the cumulative length of the previous ones", () => {
    const arcs = buildDonutArcs([50, 30, 20], CIRCUMFERENCE);
    expect(arcs[0].dashOffset).toBe(-0);
    expect(arcs[1].dashOffset).toBe(-50);
    expect(arcs[2].dashOffset).toBe(-80);
  });

  it("leaves a visual gap between segments when more than one is non-zero", () => {
    const [first] = buildDonutArcs([50, 50], CIRCUMFERENCE);
    const [visibleLength] = first.dashArray.split(" ").map(Number);
    expect(visibleLength).toBeLessThan(50);
  });

  it("renders a full ring with no gap when only one segment is non-zero", () => {
    const [first] = buildDonutArcs([100, 0, 0], CIRCUMFERENCE);
    const [visibleLength] = first.dashArray.split(" ").map(Number);
    expect(visibleLength).toBe(100);
  });

  it("renders every segment as invisible (never NaN) when the total is zero", () => {
    const arcs = buildDonutArcs([0, 0, 0], CIRCUMFERENCE);
    for (const arc of arcs) {
      expect(arc.dashArray).toBe(`0 ${CIRCUMFERENCE}`);
      expect(arc.dashOffset).toBe(0);
    }
  });

  it("renders a zero-length arc for a zero-value segment mixed with non-zero ones", () => {
    const arcs = buildDonutArcs([100, 0], CIRCUMFERENCE);
    const [zeroLength] = arcs[1].dashArray.split(" ").map(Number);
    expect(zeroLength).toBe(0);
  });
});
