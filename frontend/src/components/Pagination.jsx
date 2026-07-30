import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

const DEFAULT_PAGE_SIZES = [10, 20, 50, 100];

function getPageNumbers(page, totalPages) {
  const maxButtons = 5;
  if (totalPages <= maxButtons) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  let start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + maxButtons - 1);
  start = Math.max(1, end - maxButtons + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export default function Pagination({ meta, onPageChange, pageSize, onPageSizeChange, pageSizeOptions = DEFAULT_PAGE_SIZES }) {
  if (!meta) return null;
  const { page, totalPages, total } = meta;
  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <div className="mt-4 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-slate-500">
        <span>
          {total} entries total · page {page} of {totalPages}
        </span>
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            className="rounded-md border border-slate-300 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="rounded-md border border-slate-300 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {pageNumbers[0] > 1 && <span className="px-1 text-slate-400">…</span>}
          {pageNumbers.map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`h-8 min-w-[2rem] rounded-md px-2 text-sm font-medium ${
                p === page ? "bg-emerald-500 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p}
            </button>
          ))}
          {pageNumbers[pageNumbers.length - 1] < totalPages && <span className="px-1 text-slate-400">…</span>}

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="rounded-md border border-slate-300 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
            className="rounded-md border border-slate-300 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
