import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "indigo",
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  hint?: string;
  tone?: "indigo" | "violet" | "mint" | "amber" | "rose";
  className?: string;
}) {
  const gradients: Record<string, string> = {
    indigo: "linear-gradient(135deg, #4f46e5, #818cf8)",
    violet: "linear-gradient(135deg, #7c3aed, #c084fc)",
    mint: "linear-gradient(135deg, #059669, #34d399)",
    amber: "linear-gradient(135deg, #d97706, #fbbf24)",
    rose: "linear-gradient(135deg, #e11d48, #fb7185)",
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] p-5 backdrop-blur-sm",
        "transition-all duration-300 hover:-translate-y-0.5 hover:border-white/10 hover:bg-white/[0.05]",
        "hover:shadow-[0_0_40px_-10px_rgba(124,58,237,0.4)]",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40"
        style={{ background: gradients[tone] }}
      />
      <div className="relative flex items-start justify-between">
        <div
          className="grid h-10 w-10 place-items-center rounded-xl text-white"
          style={{ background: gradients[tone] }}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="relative mt-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/40">
          {label}
        </div>
        <div
          className="mt-1 text-4xl leading-none text-white sm:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {value}
        </div>
        {hint && (
          <p className="mt-2 text-xs text-white/40">{hint}</p>
        )}
      </div>
    </div>
  );
}