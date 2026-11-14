import { ReactNode } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export type SelectFilter = {
  key: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  allLabel?: string;
};

export function DataToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  filters = [],
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onClear,
  extra,
  right,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  filters?: SelectFilter[];
  dateFrom?: string;
  dateTo?: string;
  onDateFromChange?: (v: string) => void;
  onDateToChange?: (v: string) => void;
  onClear?: () => void;
  extra?: ReactNode;
  right?: ReactNode;
}) {
  const hasAny = !!search || !!dateFrom || !!dateTo || filters.some((f) => f.value && f.value !== "all");
  return (
    <div role="search" className="rounded-lg border bg-card p-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <Label className="text-xs text-muted-foreground">Buscar</Label>
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-8"
            />
          </div>
        </div>
        {filters.map((f) => (
          <div key={f.key} className="min-w-[160px]">
            <Label className="text-xs text-muted-foreground">{f.label}</Label>
            <Select value={f.value || "all"} onValueChange={f.onChange}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{f.allLabel ?? "Todos"}</SelectItem>
                {f.options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
        {(onDateFromChange || onDateToChange) && (
          <>
            <div className="w-[170px]">
              <Label className="text-xs text-muted-foreground">De</Label>
              <Input type="date" value={dateFrom ?? ""} onChange={(e) => onDateFromChange?.(e.target.value)} className="mt-1" />
            </div>
            <div className="w-[170px]">
              <Label className="text-xs text-muted-foreground">Até</Label>
              <Input type="date" value={dateTo ?? ""} onChange={(e) => onDateToChange?.(e.target.value)} className="mt-1" />
            </div>
          </>
        )}
        {extra}
        <div className="ml-auto flex items-center gap-2">
          {hasAny && onClear && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              <X className="mr-1 h-4 w-4" /> Limpar
            </Button>
          )}
          {right}
        </div>
      </div>
    </div>
  );
}

export function applyTextSearch<T>(rows: T[] | undefined, q: string, fields: (keyof T | ((r: T) => string | null | undefined))[]): T[] {
  if (!rows) return [];
  const term = q.trim().toLowerCase();
  if (!term) return rows;
  return rows.filter((r) =>
    fields.some((f) => {
      const v = typeof f === "function" ? (f as any)(r) : (r as any)[f];
      return v != null && String(v).toLowerCase().includes(term);
    })
  );
}

export function applyDateRange<T>(rows: T[], from: string | undefined, to: string | undefined, getter: (r: T) => string | null | undefined): T[] {
  if (!from && !to) return rows;
  const fromTs = from ? new Date(from + "T00:00:00").getTime() : -Infinity;
  const toTs = to ? new Date(to + "T23:59:59").getTime() : Infinity;
  return rows.filter((r) => {
    const v = getter(r);
    if (!v) return false;
    const t = new Date(v).getTime();
    return t >= fromTs && t <= toTs;
  });
}