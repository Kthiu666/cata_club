/**
 * Pure utility functions for the Reportes admin page.
 *
 * No React dependencies — pure functions for testability. Mirrors the
 * client-side pagination pattern established in members-utils.ts and
 * attendance-utils.ts: each report tab keeps its own page-size constant
 * and paginate/getTotalPages pair since they're independent datasets.
 */

import type { PersonaReporte } from "@/types/domain";
import type { AttendanceRecord } from "@/app/attendance/attendance-utils";

// ---------------------------------------------------------------------------
// "Nuevos miembros por período" pagination
// ---------------------------------------------------------------------------

/** Results per page for the persona report table. */
export const PERSONA_REPORT_PAGE_SIZE = 10;

/**
 * Slice a (possibly already filtered) persona report list to a single page.
 *
 * `page` is 1-indexed. Returns an empty array when `page` is beyond the
 * available data — never throws or wraps around.
 */
export function paginatePersonaResults(
  results: PersonaReporte[],
  page: number,
  pageSize: number = PERSONA_REPORT_PAGE_SIZE,
): PersonaReporte[] {
  const start = (page - 1) * pageSize;
  return results.slice(start, start + pageSize);
}

/**
 * Total number of pages for a given persona report result count.
 *
 * Always returns at least 1 (never 0 pages, even for an empty list) so
 * "Página 1 de 1" is a valid state to render.
 */
export function getPersonaReportTotalPages(
  totalResults: number,
  pageSize: number = PERSONA_REPORT_PAGE_SIZE,
): number {
  return Math.max(1, Math.ceil(totalResults / pageSize));
}

// ---------------------------------------------------------------------------
// "Asistencia" report pagination
// ---------------------------------------------------------------------------

/** Results per page for the attendance report table. */
export const ASISTENCIA_REPORT_PAGE_SIZE = 10;

/**
 * Slice a (possibly already filtered) attendance report list to a single page.
 *
 * `page` is 1-indexed. Returns an empty array when `page` is beyond the
 * available data — never throws or wraps around.
 */
export function paginateAsistenciaResults(
  results: AttendanceRecord[],
  page: number,
  pageSize: number = ASISTENCIA_REPORT_PAGE_SIZE,
): AttendanceRecord[] {
  const start = (page - 1) * pageSize;
  return results.slice(start, start + pageSize);
}

/**
 * Total number of pages for a given attendance report result count.
 *
 * Always returns at least 1 (never 0 pages, even for an empty list) so
 * "Página 1 de 1" is a valid state to render.
 */
export function getAsistenciaReportTotalPages(
  totalResults: number,
  pageSize: number = ASISTENCIA_REPORT_PAGE_SIZE,
): number {
  return Math.max(1, Math.ceil(totalResults / pageSize));
}
