const TONES = {
  default: "text-slate-500 hover:bg-slate-100 hover:text-brand-600",
  danger: "text-slate-500 hover:bg-red-50 hover:text-red-600",
};

export default function IconButton({ icon: Icon, tone = "default", className = "", ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition ${TONES[tone]} ${className}`}
      {...props}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
