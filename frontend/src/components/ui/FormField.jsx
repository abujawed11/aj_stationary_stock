export default function FormField({ label, error, hint, className = "", children }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}
      <div className={label ? "mt-1" : undefined}>{children}</div>
      {error && <p className="mt-1 text-xs text-red-600">{error.message || error}</p>}
      {!error && hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
