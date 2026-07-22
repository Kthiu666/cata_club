/**
 * Unit tests for the shared `usePagination` hook and its pure helpers
 * (`paginateRecords`/`getTotalPages`), generalized from
 * `attendance/attendance-utils.ts`'s original implementation.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { paginateRecords, getTotalPages, usePagination } from "../usePagination";

// ---------------------------------------------------------------------------
// paginateRecords / getTotalPages — pure helpers (Task 1.1/1.2)
// ---------------------------------------------------------------------------

interface Item {
  id: string;
}

function buildItems(count: number): Item[] {
  return Array.from({ length: count }, (_, i) => ({ id: `item-${i}` }));
}

describe("paginateRecords", () => {
  it("returns an empty array for an empty input list", () => {
    expect(paginateRecords([], 1, 10)).toEqual([]);
  });

  it("slices to exactly pageSize items for a full page, and the remainder on the last partial page", () => {
    const items = buildItems(37);
    const page1 = paginateRecords(items, 1, 10);
    expect(page1).toHaveLength(10);
    expect(page1[0].id).toBe("item-0");
    expect(page1[9].id).toBe("item-9");

    const page4 = paginateRecords(items, 4, 10);
    expect(page4).toHaveLength(7);
    expect(page4[0].id).toBe("item-30");
  });

  it("returns an empty array when the page is exactly at the total-item boundary (exact multiple of pageSize)", () => {
    const items = buildItems(20);
    // page 3 of a 20-item list at pageSize 10 is beyond the data (pages 1-2 exist)
    expect(paginateRecords(items, 3, 10)).toEqual([]);
    // page 2 is the exact last full page
    expect(paginateRecords(items, 2, 10)).toHaveLength(10);
  });
});

describe("getTotalPages", () => {
  it("returns 1 (never 0) for an empty list", () => {
    expect(getTotalPages(0, 10)).toBe(1);
  });

  it("rounds up to a whole page count for a partial last page", () => {
    expect(getTotalPages(37, 10)).toBe(4);
  });

  it("returns an exact page count when total is an exact multiple of pageSize", () => {
    expect(getTotalPages(20, 10)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// usePagination — hook navigation + reset behavior (Task 1.3/1.4)
// ---------------------------------------------------------------------------

describe("usePagination", () => {
  it("exposes the first page's slice, page=1, and correct totalPages on initial render", () => {
    const records = buildItems(25);
    const { result } = renderHook(() => usePagination({ records, pageSize: 10 }));

    expect(result.current.page).toBe(1);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.currentItems).toHaveLength(10);
    expect(result.current.currentItems[0].id).toBe("item-0");
  });

  it("goToNext advances the page and updates currentItems synchronously", () => {
    const records = buildItems(25);
    const { result } = renderHook(() => usePagination({ records, pageSize: 10 }));

    act(() => result.current.goToNext());

    expect(result.current.page).toBe(2);
    expect(result.current.currentItems[0].id).toBe("item-10");
  });

  it("goToPrevious moves back a page but never below page 1", () => {
    const records = buildItems(25);
    const { result } = renderHook(() => usePagination({ records, pageSize: 10 }));

    act(() => result.current.goToNext());
    act(() => result.current.goToNext());
    expect(result.current.page).toBe(3);

    act(() => result.current.goToPrevious());
    expect(result.current.page).toBe(2);

    act(() => result.current.setPage(1));
    act(() => result.current.goToPrevious());
    expect(result.current.page).toBe(1);
  });

  it("goToNext never advances past totalPages", () => {
    const records = buildItems(15);
    const { result } = renderHook(() => usePagination({ records, pageSize: 10 }));

    expect(result.current.totalPages).toBe(2);
    act(() => result.current.goToNext());
    expect(result.current.page).toBe(2);
    act(() => result.current.goToNext());
    expect(result.current.page).toBe(2);
  });

  it("setPage jumps directly to a given page", () => {
    const records = buildItems(45);
    const { result } = renderHook(() => usePagination({ records, pageSize: 10 }));

    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);
    expect(result.current.currentItems[0].id).toBe("item-20");
  });

  it("resets to page 1 when the records array shrinks below the current page (NEW requirement — not in the original attendance-only implementation)", () => {
    const initialRecords = buildItems(45);
    const { result, rerender } = renderHook(
      ({ records }) => usePagination({ records, pageSize: 10 }),
      { initialProps: { records: initialRecords } },
    );

    act(() => result.current.setPage(4));
    expect(result.current.page).toBe(4);

    const filteredRecords = buildItems(5);
    rerender({ records: filteredRecords });

    expect(result.current.page).toBe(1);
    expect(result.current.currentItems).toHaveLength(5);
  });

  it("defaults pageSize to 10 when not provided (no user-facing size override)", () => {
    const records = buildItems(25);
    const { result } = renderHook(() => usePagination({ records }));

    expect(result.current.totalPages).toBe(3);
    expect(result.current.currentItems).toHaveLength(10);
  });
});
