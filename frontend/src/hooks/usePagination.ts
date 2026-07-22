/**
 * Shared client-side pagination primitives.
 *
 * Generalized from `attendance/attendance-utils.ts`'s original
 * `paginateRecords`/`getTotalPages` (attendance-page-specific) into a
 * domain-agnostic hook reused across every in-scope list page (Issue #41).
 * `attendance-utils.ts` re-exports both function names unchanged for
 * backward compatibility with existing imports/tests.
 *
 * Client-side ONLY: slices an already-fetched in-memory array. Never issues
 * an HTTP request and never reads `skip`/`total`/`limit` from an API
 * response — those concerns are explicitly out of scope for this hook.
 */

import { useEffect, useState } from "react";

/** Default page size for every consumer — not caller-overridable in the UI. */
export const DEFAULT_PAGE_SIZE = 10;

/**
 * Slice a (possibly already filtered) records list to a single page.
 *
 * `page` is 1-indexed. Returns an empty array when `page` is beyond the
 * available data — never throws or wraps around.
 */
export function paginateRecords<T>(
  records: T[],
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE,
): T[] {
  const start = (page - 1) * pageSize;
  return records.slice(start, start + pageSize);
}

/**
 * Total number of pages for a given record count.
 *
 * Always returns at least 1 (never 0 pages, even for an empty list) so
 * "Página 1 de 1" is a valid state to render.
 */
export function getTotalPages(
  totalRecords: number,
  pageSize: number = DEFAULT_PAGE_SIZE,
): number {
  return Math.max(1, Math.ceil(totalRecords / pageSize));
}

export interface UsePaginationOptions<T> {
  records: T[];
  /** Defaults to 10 — not exposed as a user-facing control anywhere. */
  pageSize?: number;
}

export interface UsePaginationResult<T> {
  /** 1-indexed current page. */
  page: number;
  totalPages: number;
  /** The current page's slice of `records`. */
  currentItems: T[];
  setPage: (page: number) => void;
  goToNext: () => void;
  goToPrevious: () => void;
}

/**
 * Client-side pagination over an already-fetched in-memory array.
 *
 * Resets to page 1 whenever `records` changes (e.g. a filter is applied
 * upstream, or a reload shrinks the list) — otherwise a filtered-down list
 * could strand the caller on a page beyond the new `totalPages`. This is a
 * NEW requirement introduced by the shared hook; the original
 * attendance-only implementation did not reset automatically (that reset
 * was previously duplicated in `attendance/page.tsx` itself).
 */
export function usePagination<T>({
  records,
  pageSize = DEFAULT_PAGE_SIZE,
}: UsePaginationOptions<T>): UsePaginationResult<T> {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [records]);

  const totalPages = getTotalPages(records.length, pageSize);
  const currentItems = paginateRecords(records, page, pageSize);

  const goToNext = (): void => setPage((p) => Math.min(totalPages, p + 1));
  const goToPrevious = (): void => setPage((p) => Math.max(1, p - 1));

  return { page, totalPages, currentItems, setPage, goToNext, goToPrevious };
}
