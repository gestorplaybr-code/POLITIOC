import { useEffect, useState } from "react";
import { Moon, Sun, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { Theme } from "@/lib/theme";

export function ThemePickerModal({
  open,
  onChoose,
}: {
  open: boolean;
  onChoose: (t: Theme) => void;
}) {
  const [selected, setSelected] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent
        className="max-w-3xl border-indigo-400/20 bg-gradient-to-b from-[#0c0c20] to-[#07071a] p-8 [&>button]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="mb-6 text-center">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-indigo-200">
            <Sparkles className="h-3 w-3" />
            Bem-vindo
          </div>
          <DialogTitle className="font-display text-3xl uppercase tracking-wide text-white">
            Escolha sua experiência
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-white/60">
            Você pode trocar depois em Configurações → Aparência.
          </DialogDescription>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <ThemeCard
            id="dark"
            label="Escuro"
            badge="Recomendado"
            description="Visual cinematográfico com gradientes midnight indigo. Ideal para uso prolongado."
            selected={selected === "dark"}
            onSelect={() => setSelected("dark")}
            preview={
              <div className="h-full w-full rounded-lg bg-gradient-to-br from-[#0a0a1a] via-[#1e1e5a]/40 to-[#7c3aed]/30">
                <div className="flex h-full flex-col gap-1.5 p-3">
                  <div className="h-2 w-16 rounded bg-indigo-400/60" />
                  <div className="h-1.5 w-24 rounded bg-white/20" />
                  <div className="mt-auto flex gap-1.5">
                    <div className="h-6 w-12 rounded bg-gradient-to-r from-indigo-500 to-violet-500" />
                    <div className="h-6 w-8 rounded bg-white/10" />
                  </div>
                </div>
              </div>
            }
            icon={<Moon className="h-5 w-5" />}
          />
          <ThemeCard
            id="light"
            label="Claro"
            description="Fundo claro, alto contraste. Ideal para ambientes iluminados e impressão."
            selected={selected === "light"}
            onSelect={() => setSelected("light")}
            preview={
              <div className="h-full w-full rounded-lg bg-gradient-to-br from-slate-50 via-indigo-50 to-violet-50">
                <div className="flex h-full flex-col gap-1.5 p-3">
                  <div className="h-2 w-16 rounded bg-indigo-500" />
                  <div className="h-1.5 w-24 rounded bg-slate-300" />
                  <div className="mt-auto flex gap-1.5">
                    <div className="h-6 w-12 rounded bg-gradient-to-r from-indigo-500 to-violet-500" />
                    <div className="h-6 w-8 rounded bg-slate-200" />
                  </div>
                </div>
              </div>
            }
            icon={<Sun className="h-5 w-5" />}
          />
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            variant="premium"
            size="lg"
            onClick={() => onChoose(selected)}
          >
            Continuar com {selected === "dark" ? "Escuro" : "Claro"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ThemeCard({
  id,
  label,
  description,
  selected,
  onSelect,
  preview,
  icon,
  badge,
}: {
  id: string;
  label: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
  preview: React.ReactNode;
  icon: React.ReactNode;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      data-theme={id}
      className={`group relative overflow-hidden rounded-xl border p-4 text-left transition ${
        selected
          ? "border-indigo-400/60 bg-indigo-500/10 shadow-[0_0_40px_-10px_rgba(124,58,237,0.6)]"
          : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
      }`}
    >
      {selected && (
        <div className="absolute right-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-white">
          <Check className="h-3.5 w-3.5" />
        </div>
      )}
      <div className="mb-3 h-32 overflow-hidden rounded-lg">{preview}</div>
      <div className="flex items-center gap-2">
        <div className="text-indigo-300">{icon}</div>
        <div className="font-display text-lg uppercase tracking-wide text-white">{label}</div>
        {badge && (
          <span className="ml-auto rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-emerald-200">
            {badge}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-xs text-white/60">{description}</p>
    </button>
  );
}