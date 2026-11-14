import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  description,
  icon,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] backdrop-blur-sm",
        "shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)]",
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            {icon && (
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-indigo-300">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h3
                  className="truncate text-base font-semibold text-white"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {title}
                </h3>
              )}
              {description && (
                <p className="truncate text-xs text-white/40">{description}</p>
              )}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}