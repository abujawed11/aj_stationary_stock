import { forwardRef } from "react";

const Textarea = forwardRef(function Textarea({ error, className = "", ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 ${
        error ? "border-red-400 focus:border-red-500 focus:ring-red-500" : ""
      } ${className}`}
      {...props}
    />
  );
});

export default Textarea;
