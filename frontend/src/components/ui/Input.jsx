import { forwardRef } from "react";

const baseClasses =
  "w-full rounded-lg border border-slate-300 bg-white text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-slate-50 disabled:text-slate-400";

const Input = forwardRef(function Input(
  { icon: Icon, prefix, error, className = "", ...props },
  ref
) {
  if (Icon || prefix) {
    return (
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        )}
        {prefix && !Icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          className={`${baseClasses} py-2 ${Icon || prefix ? "pl-9" : "px-3"} pr-3 ${
            error ? "border-red-400 focus:border-red-500 focus:ring-red-500" : ""
          } ${className}`}
          {...props}
        />
      </div>
    );
  }

  return (
    <input
      ref={ref}
      className={`${baseClasses} px-3 py-2 ${
        error ? "border-red-400 focus:border-red-500 focus:ring-red-500" : ""
      } ${className}`}
      {...props}
    />
  );
});

export default Input;
