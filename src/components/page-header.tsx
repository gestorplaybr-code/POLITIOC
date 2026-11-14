import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export type Crumb = { label: string; to?: string };

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: Crumb[];
  eyebrow?: string;
}) {
  return (
    <div className="relative mb-8 pb-6">
      {/* gradient divider */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(129,140,248,0.4), transparent)",
        }}
      />

      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          className="mb-3 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-white/40"
          aria-label="Breadcrumb"
        >
          {breadcrumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3 w-3 text-white/20" />}
              {c.to ? (
                <Link
                  to={c.to as any}
                  className="transition hover:text-indigo-300"
                >
                  {c.label}
                </Link>
              ) : (
                <span className="text-white/80">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0 max-w-3xl">
          {eyebrow && (
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-indigo-300/70">
              {eyebrow}
            </div>
          )}
          <h1
            className="text-4xl uppercase leading-none tracking-tight text-white sm:text-5xl lg:text-6xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <span className="text-gradient-indigo">{title}</span>
          </h1>
          {description && (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/60 sm:text-base">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}