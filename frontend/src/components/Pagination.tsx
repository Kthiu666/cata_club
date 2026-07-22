/**
 * Shared client-side pagination control.
 *
 * Reuses the existing visual pattern from `attendance/page.tsx`'s inline
 * prev/next JSX (ChevronLeft/ChevronRight, `btn-secondary`, "Página X de Y"),
 * extracted into a reusable presentational component for Issue #41.
 *
 * Pure presentational — the caller (`usePagination`) owns all page state.
 * Renders nothing when there is only one page (`totalPages <= 1`), matching
 * the original attendance page's behavior of hiding pagination controls
 * entirely rather than rendering a disabled no-op control.
 */

import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationProps {
  /** 1-indexed current page. */
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Force both controls disabled regardless of boundary (e.g. while loading). */
  disabled?: boolean;
}

export default function Pagination({
  page,
  totalPages,
  onPageChange,
  disabled = false,
}: PaginationProps): React.ReactElement | null {
  if (totalPages <= 1) return null;

  const isFirstPage = page <= 1;
  const isLastPage = page >= totalPages;

  return (
    <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p
        className="text-sm font-semibold text-cata-text"
        aria-current="page"
        aria-live="polite"
      >
        Página {page} de {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || isFirstPage}
          aria-label="Página anterior"
          className="btn-secondary px-4 py-2 text-xs"
        >
          <ChevronLeft size={14} strokeWidth={1.5} aria-hidden="true" />
          Anterior
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || isLastPage}
          aria-label="Página siguiente"
          className="btn-secondary px-4 py-2 text-xs"
        >
          Siguiente
          <ChevronRight size={14} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
