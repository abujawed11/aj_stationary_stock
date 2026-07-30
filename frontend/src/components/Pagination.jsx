export default function Pagination({ meta, onPageChange }) {
  if (!meta || meta.totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
      <span>
        Page {meta.page} of {meta.totalPages} ({meta.total} total)
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(meta.page - 1)}
          disabled={meta.page <= 1}
          className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-40"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(meta.page + 1)}
          disabled={meta.page >= meta.totalPages}
          className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
