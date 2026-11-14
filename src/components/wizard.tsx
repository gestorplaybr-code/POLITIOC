import { type ReactNode, useState, createContext, useContext, useMemo } from "react";
import { ChevronLeft, ChevronRight, Check, HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type WizardStep = {
  id: string;
  title: string;
  description?: string;
  /** Returns true if the step is valid and the user can advance. */
  isValid?: () => boolean;
  render: () => ReactNode;
};

type Ctx = { goNext: () => void; goPrev: () => void; current: number; total: number };
const WizardCtx = createContext<Ctx | null>(null);
export function useWizard() {
  const c = useContext(WizardCtx);
  if (!c) throw new Error("useWizard outside provider");
  return c;
}

export function Wizard({
  steps,
  onFinish,
  finishLabel = "Concluir",
  pending,
  onCancel,
}: {
  steps: WizardStep[];
  onFinish: () => void;
  finishLabel?: string;
  pending?: boolean;
  onCancel?: () => void;
}) {
  const [i, setI] = useState(0);
  const step = steps[i];
  const isLast = i === steps.length - 1;
  const canAdvance = step.isValid?.() ?? true;

  const ctx = useMemo<Ctx>(
    () => ({
      goNext: () => setI((v) => Math.min(steps.length - 1, v + 1)),
      goPrev: () => setI((v) => Math.max(0, v - 1)),
      current: i,
      total: steps.length,
    }),
    [i, steps.length],
  );

  return (
    <WizardCtx.Provider value={ctx}>
      <div className="flex flex-col gap-6">
        {/* Stepper */}
        <div className="flex items-center gap-2">
          {steps.map((s, idx) => {
            const done = idx < i;
            const active = idx === i;
            return (
              <div key={s.id} className="flex flex-1 items-center gap-2">
                <div
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[11px] font-semibold transition",
                    done && "border-emerald-400/60 bg-emerald-500/15 text-emerald-300",
                    active && "border-indigo-400/60 bg-indigo-500/20 text-white shadow-[0_0_18px_rgba(129,140,248,0.45)]",
                    !done && !active && "border-white/10 bg-white/[0.03] text-white/40",
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                </div>
                {idx < steps.length - 1 && (
                  <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-white/5" />
                )}
              </div>
            );
          })}
        </div>

        {/* Header */}
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-[0.2em] text-indigo-300/70">
            Passo {i + 1} de {steps.length}
          </div>
          <h2
            className="text-2xl uppercase tracking-wide text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {step.title}
          </h2>
          {step.description && (
            <p className="text-sm text-white/55">{step.description}</p>
          )}
        </div>

        {/* Body */}
        <div className="min-h-[200px]">{step.render()}</div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <div>
            {i > 0 ? (
              <Button type="button" variant="ghost" onClick={ctx.goPrev} disabled={pending}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
              </Button>
            ) : onCancel ? (
              <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
                <X className="mr-1 h-4 w-4" /> Cancelar
              </Button>
            ) : (
              <span />
            )}
          </div>
          {isLast ? (
            <Button
              type="button"
              variant="premium"
              onClick={onFinish}
              disabled={pending || !canAdvance}
            >
              {pending ? "Salvando..." : finishLabel}
              <Check className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="premium"
              onClick={ctx.goNext}
              disabled={!canAdvance}
            >
              Continuar <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </WizardCtx.Provider>
  );
}

/** Helpful tip box. Use to explain WHY a field exists, in plain language. */
export function HelpHint({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-indigo-400/20 bg-indigo-500/[0.06] p-3 text-xs text-indigo-100/85">
      <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-300" />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

/** Large clickable choice badge. Use for categorical decisions (Tipo de pleito, etc). */
export function ChoiceBadge({
  icon,
  title,
  description,
  selected,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition",
        selected
          ? "border-indigo-400/60 bg-indigo-500/10 shadow-[0_0_24px_rgba(129,140,248,0.25)]"
          : "border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]",
      )}
    >
      <div
        className={cn(
          "grid h-10 w-10 place-items-center rounded-xl text-white",
          selected ? "bg-gradient-to-br from-indigo-500 to-violet-500" : "bg-white/[0.06]",
        )}
      >
        {icon}
      </div>
      <div className="space-y-0.5">
        <div className="text-sm font-medium text-white">{title}</div>
        {description && <div className="text-xs text-white/55">{description}</div>}
      </div>
      {selected && (
        <div className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-indigo-500 text-white">
          <Check className="h-3 w-3" />
        </div>
      )}
    </button>
  );
}

/** Wraps a Wizard in a Dialog for create flows. */
export function WizardDialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogTitle className="sr-only">Assistente</DialogTitle>
        <DialogDescription className="sr-only">Formulário guiado por passos</DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  );
}