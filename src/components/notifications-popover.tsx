import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/lib/auth";

export function NotificationsPopover() {
  const { isAdmin } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const recent = useQuery({
    queryKey: ["topbar-auditoria"],
    enabled: isAdmin && open,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("auditoria")
        .select("id, acao, entidade, descricao, data_hora")
        .order("data_hora", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  const items = recent.data ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Notificações"
          className="relative grid h-9 w-9 place-items-center rounded-full border border-border bg-muted/40 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">Atividade recente</div>
        </div>
        <div className="max-h-80 divide-y divide-border overflow-auto">
          {!isAdmin ? (
            <div className="p-6 text-center text-xs text-muted-foreground">Acesso restrito.</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">Sem eventos recentes.</div>
          ) : (
            items.map((l: any) => (
              <div key={l.id} className="flex items-start gap-3 px-4 py-3">
                <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-border bg-muted/40 text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="secondary" className="capitalize">{l.acao}</Badge>
                    <span className="truncate text-muted-foreground">{l.entidade}</span>
                  </div>
                  {l.descricao && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">{l.descricao}</p>
                  )}
                  <p className="mt-1 text-[10px] text-muted-foreground/70">
                    {new Date(l.data_hora).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
        {isAdmin && (
          <Link
            to="/auditoria"
            className="block border-t border-border px-4 py-3 text-center text-xs font-medium text-primary transition hover:bg-muted/40"
          >
            Ver tudo na Auditoria →
          </Link>
        )}
      </PopoverContent>
    </Popover>
  );
}