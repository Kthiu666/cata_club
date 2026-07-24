import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  onPageChange: (updater: (page: number) => number) => void;
}

/** Prev/next pager ("Página X de Y") shared by list pages that paginate
 * client-side without a card-footer wrapper (groups, members). */
export default function PaginationControls({
  page,
  totalPages,
  onPageChange,
}: PaginationControlsProps): React.ReactElement {
  return (
    <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm font-semibold text-cata-text">
        Página {page} de {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="btn-secondary px-4 py-2 text-xs"
        >
          <ChevronLeft size={14} strokeWidth={1.5} aria-hidden="true" />
          Anterior
        </button>
        <button
          type="button"
          onClick={() => onPageChange((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="btn-secondary px-4 py-2 text-xs"
        >
          Siguiente
          <ChevronRight size={14} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
