/**
 * "Distribución de Asistencias" donut — admin dashboard summary of the
 * attendance records already fetched for /attendance, split by estado.
 *
 * Hand-rolled SVG (no chart library in this project) — a plain `<circle>`
 * per segment via `stroke-dasharray`/`stroke-dashoffset`, per
 * dashboard-utils.ts#buildDonutArcs. Legend rows carry every value as text
 * (not hidden behind hover), so the chart is fully readable without
 * pointer/keyboard interaction; hover/focus on either the arc or its legend
 * row highlights both.
 */

"use client";

import { useState } from "react";
import type { EstadoAsistencia } from "@/types/domain";
import type { AttendanceDayStats } from "@/app/attendance/attendance-utils";
import { buildAttendanceStatusSegments, buildDonutArcs } from "./dashboard-utils";

const SIZE = 140;
const STROKE_WIDTH = 20;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface AttendanceStatusChartProps {
  stats: AttendanceDayStats;
}

export default function AttendanceStatusChart({ stats }: AttendanceStatusChartProps): React.ReactElement {
  const [hovered, setHovered] = useState<EstadoAsistencia | null>(null);
  const segments = buildAttendanceStatusSegments(stats);
  const arcs = buildDonutArcs(
    segments.map((s) => s.value),
    CIRCUMFERENCE,
  );

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="shrink-0 -rotate-90"
        role="img"
        aria-label={`Distribución de asistencias: ${segments.map((s) => `${s.label} ${s.percentage}%`).join(", ")}`}
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--dashboard-donut-track, #e1e0d9)"
          strokeWidth={STROKE_WIDTH}
        />
        {segments.map((segment, i) => {
          const isHovered = hovered === segment.estado;
          return (
            <circle
              key={segment.estado}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={segment.color}
              strokeWidth={isHovered ? STROKE_WIDTH + 3 : STROKE_WIDTH}
              strokeDasharray={arcs[i].dashArray}
              strokeDashoffset={arcs[i].dashOffset}
              className="transition-[stroke-width] duration-150"
              onMouseEnter={() => setHovered(segment.estado)}
              onMouseLeave={() => setHovered((prev) => (prev === segment.estado ? null : prev))}
              onFocus={() => setHovered(segment.estado)}
              onBlur={() => setHovered((prev) => (prev === segment.estado ? null : prev))}
              tabIndex={segment.value > 0 ? 0 : -1}
            >
              <title>
                {segment.label}: {segment.value} ({segment.percentage}%)
              </title>
            </circle>
          );
        })}
        <text
          x={SIZE / 2}
          y={SIZE / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          className="rotate-90 fill-cata-text text-2xl font-bold"
          style={{ transformOrigin: "center", transformBox: "fill-box" }}
        >
          {stats.totalStudents}
        </text>
      </svg>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-cata-border text-xs font-medium uppercase tracking-wider text-cata-text/65">
            <th className="py-2 font-medium">Estado</th>
            <th className="py-2 text-right font-medium">Registros</th>
            <th className="py-2 text-right font-medium">Porcentaje</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-cata-border">
          {segments.map((segment) => {
            const isHovered = hovered === segment.estado;
            return (
              <tr
                key={segment.estado}
                onMouseEnter={() => setHovered(segment.estado)}
                onMouseLeave={() => setHovered((prev) => (prev === segment.estado ? null : prev))}
                className={`transition-colors ${isHovered ? "bg-cata-bg" : ""}`}
              >
                <td className="py-2">
                  <span className="flex items-center gap-2.5 text-cata-text/65">
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: segment.color }}
                    />
                    {segment.label}
                  </span>
                </td>
                <td className="py-2 text-right font-semibold text-cata-text">{segment.value}</td>
                <td className="py-2 text-right text-xs text-cata-text/50">{segment.percentage}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
