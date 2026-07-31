import { motion } from "motion/react";
import AnimatedNumber from "./AnimatedNumber";

const TONES = {
  blue: "bg-brand-50 text-brand-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-600",
};

export default function HeroStatCard({ label, value, numericValue, format, icon: Icon, tone = "blue" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-card"
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-500">{label}</p>
          <p className="truncate text-2xl font-semibold text-slate-800">
            {numericValue !== undefined ? <AnimatedNumber value={numericValue} format={format} /> : value}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
