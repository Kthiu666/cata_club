/**
 * Pure chart helpers for the "Distribución de Asistencias" donut on the
 * admin Panel de Control. No React dependencies — easy to test.
 *
 * Colors are NOT the badge tokens attendance-utils.ts uses elsewhere
 * (bg-cata-state-ok / red-700 / amber-700 / blue-700) — those fail the
 * dataviz skill's adjacent-pair CVD/normal-vision checks when placed side
 * by side in a chart. This palette (green/yellow/blue/red, in this exact
 * order) is validated: `node validate_palette.js
 * "#008300,#eda100,#2a78d6,#e34948" --mode light --surface "#FFFFFF"` — all
 * checks pass, including --pairs all.
 */

import { ATTENDANCE_LABELS, type AttendanceDayStats } from "@/app/attendance/attendance-utils";
import type { EstadoAsistencia } from "@/types/domain";

export const ATTENDANCE_STATUS_CHART_COLORS: Record<EstadoAsistencia, string> = {
  present: "#008300",
  late: "#eda100",
  justified: "#2a78d6",
  absent: "#e34948",
};

/** Fixed render order — also the validated adjacent-pair order (do not reorder without re-running the validator). */
const ATTENDANCE_STATUS_ORDER: EstadoAsistencia[] = ["present", "late", "justified", "absent"];

export interface AttendanceStatusSegment {
  estado: EstadoAsistencia;
  label: string;
  value: number;
  /** Rounded 0-100 share of `stats.totalStudents` (the total record count — see buildAttendanceStats). */
  percentage: number;
  color: string;
}

/**
 * One segment per known attendance state, in `ATTENDANCE_STATUS_ORDER`. Always
 * returns all 4 states (even at 0 count) so the legend shows the full picture.
 * Percentage is 0 for every segment when there are no records — never NaN.
 */
export function buildAttendanceStatusSegments(stats: AttendanceDayStats): AttendanceStatusSegment[] {
  const countByEstado: Record<EstadoAsistencia, number> = {
    present: stats.totalPresent,
    late: stats.totalLate,
    justified: stats.totalJustified,
    absent: stats.totalAbsent,
  };

  return ATTENDANCE_STATUS_ORDER.map((estado) => {
    const value = countByEstado[estado];
    return {
      estado,
      label: ATTENDANCE_LABELS[estado],
      value,
      percentage: stats.totalStudents > 0 ? Math.round((value / stats.totalStudents) * 100) : 0,
      color: ATTENDANCE_STATUS_CHART_COLORS[estado],
    };
  });
}

/** Visual gap between donut segments, in degrees of arc. */
const GAP_DEGREES = 3;

export interface DonutArc {
  /** SVG `stroke-dasharray`: "<visible length> <remainder>". */
  dashArray: string;
  /** SVG `stroke-dashoffset`. */
  dashOffset: number;
}

/**
 * Compute `stroke-dasharray`/`stroke-dashoffset` pairs for a donut chart's
 * `<circle>` segments, in the same order as `values`.
 *
 * No gap is rendered when only one value is non-zero (a lone 100% segment
 * draws a full, unbroken ring) — gaps only make sense *between* segments.
 * When every value is 0 (no data yet), every arc is fully invisible instead
 * of throwing or rendering NaN.
 */
export function buildDonutArcs(values: number[], circumference: number): DonutArc[] {
  const total = values.reduce((sum, v) => sum + v, 0);
  if (total === 0) {
    return values.map(() => ({ dashArray: `0 ${circumference}`, dashOffset: 0 }));
  }

  const nonZeroCount = values.filter((v) => v > 0).length;
  const gapLength = nonZeroCount > 1 ? (GAP_DEGREES / 360) * circumference : 0;

  let cumulativeOffset = 0;
  return values.map((value) => {
    const rawLength = (value / total) * circumference;
    const visibleLength = value > 0 ? Math.max(rawLength - gapLength, 0) : 0;
    const arc: DonutArc = {
      dashArray: `${visibleLength} ${circumference - visibleLength}`,
      dashOffset: -cumulativeOffset,
    };
    cumulativeOffset += rawLength;
    return arc;
  });
}
