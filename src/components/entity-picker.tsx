import { type ReactNode, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type PickerOption = { id: string; label: string; sublabel?: string };

/**
 * Searchable combobox with an inline "+ Create new" affordance.
 * The picker is purely controlled — onCreate is the parent's escape hatch
 * to open a nested creation wizard.
 */
export function EntityPicker({
  value,
  options,
  placeholder = "Selecionar...",
  emptyLabel = "Nenhum item encontrado.",
  createLabel,
  onChange,
  onCreate,
  disabled,
}: {
  value: string;
  options: PickerOption[];
  placeholder?: string;
  emptyLabel?: string;
  createLabel?: string;
  onChange: (id: string) => void;
  onCreate?: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = useMemo(() => options.find((o) => o.id === value), [options, value]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    return options.filter((o) => o.label.toLowerCase().includes(s));
  }, [options, q]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !selected && "text-white/40")}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="border-b border-white/10 p-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-white/40" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar..."
              className="h-8 pl-8 text-sm"
            />
          </div>
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-white/40">{emptyLabel}</div>
          )}
          {filtered.map((o) => {
            const sel = o.id === value;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm transition hover:bg-white/[0.05]",
                  sel && "bg-white/[0.04]",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-white">{o.label}</span>
                  {o.sublabel && (
                    <span className="block truncate text-[11px] text-white/45">{o.sublabel}</span>
                  )}
                </span>
                {sel && <Check className="h-4 w-4 shrink-0 text-indigo-300" />}
              </button>
            );
          })}
        </div>
        {onCreate && (
          <div className="border-t border-white/10 p-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onCreate();
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-indigo-300 transition hover:bg-indigo-500/10"
            >
              <Plus className="h-4 w-4" />
              {createLabel ?? "Criar novo"}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Form-field-style wrapper for the picker. */
export function PickerField({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs uppercase tracking-wider text-white/60">
        {label} {required && <span className="text-indigo-300">*</span>}
      </label>
      {children}
      {hint && <div className="text-[11px] text-white/45">{hint}</div>}
    </div>
  );
}