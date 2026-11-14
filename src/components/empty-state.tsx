import type { ReactNode } from "react";
import { Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  size = "md",
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  size?: "md" | "lg";
}) {
  const lg = size === "lg";
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] text-center",
        lg ? "px-8 py-20" : "px-6 py-12",
      )}
    >
      <div className="relative">
        <div
          className={cn("absolute inset-0 rounded-full opacity-40 blur-2xl", lg ? "-m-5" : "-m-3")}
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        />
        <div
          className={cn(
            "relative grid place-items-center rounded-2xl text-white",
            lg ? "h-20 w-20" : "h-14 w-14",
          )}
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <Icon className={lg ? "h-9 w-9" : "h-6 w-6"} />
        </div>
      </div>
      <div className="space-y-1">
        <h3
          className={cn(
            "uppercase tracking-wide text-white",
            lg ? "text-3xl" : "text-2xl",
          )}
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h3>
        {description && (
          <p className={cn("mx-auto text-white/55", lg ? "max-w-lg text-base" : "max-w-md text-sm")}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}