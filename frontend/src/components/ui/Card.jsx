export default function Card({ title, icon: Icon, action, className = "", children }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-card ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-slate-400" />}
            {title && <h2 className="text-sm font-semibold text-slate-700">{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
