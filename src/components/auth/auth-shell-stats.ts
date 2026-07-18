/**
 * Pure helper for the marketing highlight stats shown on the public auth
 * screens' brand panel (login, register, forgot-password).
 *
 * These are NOT invented numbers — they are derived from the same typed
 * mock data (`src/mocks/members.ts`, `src/mocks/attendance.ts`) and the
 * same aggregate utilities (`buildMemberStats`, `buildAttendanceStats`)
 * the admin dashboard/members/attendance screens already use. This keeps
 * the mockup's visual composition (two highlight stats) without
 * fabricating standalone marketing copy.
 */

import type { MemberStats } from "@/app/members/members-utils";
import type { AttendanceDayStats } from "@/app/attendance/attendance-utils";

export interface AuthBrandHighlights {
  /** Total enrolled students across all payer accounts. */
  activeStudents: number;
  /** Share of attendance records marked "present", 0-100, rounded. */
  attendanceRatePercent: number;
}

/**
 * Combine member and attendance aggregates into the two highlight stats
 * shown on the auth screens' brand panel.
 *
 * Returns 0% (not NaN) when there are no attendance records to derive a
 * rate from.
 */
export function computeAuthBrandHighlights(
  memberStats: MemberStats,
  attendanceStats: AttendanceDayStats,
): AuthBrandHighlights {
  const attendanceRatePercent =
    attendanceStats.totalStudents === 0
      ? 0
      : Math.round(
          (attendanceStats.totalPresent / attendanceStats.totalStudents) * 100,
        );

  return {
    activeStudents: memberStats.totalStudents,
    attendanceRatePercent,
  };
}
