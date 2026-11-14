import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ShieldAlert, Plus, Pencil, Trash2, LogIn, Send, Activity, ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SkeletonTable } from "@/components/skeleton-table";
import { CinemaError } from "@/components/cinema-error";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExportButtons } from "@/components/export-buttons";
import { applyDateRange } from "@/components/data-toolbar";

export const Route = createFileRoute("/_authenticated/auditoria")({
  head: () => ({ meta: [{ title: "Auditoria — Política+" }] }),
  errorComponent: ({ error, reset }) => <CinemaError error={error as Error} reset={reset} />,
  component: Auditoria,
});

function Auditoria() {
  const { isAdmin } = useCurrentUser();
  const [busca, setBusca] = useState("");
  const [entidade, setEntidade] = useState<string>("todas");
  const [acao, setAcao] = useState<string>("todas");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const logs = useQuery({
    queryKey: ["auditoria", entidade],
    enabled: isAdmin,
    queryFn: async () => {
      let q = supabase
        .from("auditoria")
        .select("id, acao, entidade, entidade_id, descricao, data_hora, usuario_id")
        .order("data_hora", { ascending: false })
        .limit(500);
      if (entidade !== "todas") q = q.eq("entidade", entidade);
      const { data, error } = await q;
      if (error) throw error;

      const ids = Array.from(new Set((data ?? []).map((l) => l.usuario_id).filter(Boolean))) as string[];
      const map = new Map<string, { nome: string; email: string }>();
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, nome, email")
          .in("id", ids);
        (profs ?? []).forEach((p: any) => map.set(p.id, { nome: p.nome, email: p.email }));
      }
      return (data ?? []).map((l) => ({
        ...l,
        usuario: l.usuario_id ? map.get(l.usuario_id) : null,
      }));
    },
  });

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Administração" title="Auditoria" description="Histórico de ações no sistema." />
        <EmptyState
          icon={ShieldAlert}
          title="Acesso restrito"
          description="Esta tela está disponível apenas para administradores da plataforma."
        />
      </div>
    );
  }

  let filtrados = (logs.data ?? []).filter((l) => {
    if (!busca.trim()) return true;
    const t = busca.toLowerCase();
    return (
      l.entidade.toLowerCase().includes(t) ||
      l.acao.toLowerCase().includes(t) ||
      l.usuario?.nome?.toLowerCase().includes(t) ||
      l.usuario?.email?.toLowerCase().includes(t)
    );
  });
  if (acao !== "todas") filtrados = filtrados.filter((l) => l.acao === acao);
  filtrados = applyDateRange(filtrados, dateFrom, dateTo, (l: any) => l.data_hora);
  const acoes = Array.from(new Set((logs.data ?? []).map((l) => l.acao))) as string[];

  const exportRows = filtrados.map((l) => ({
    "Data/hora": new Date(l.data_hora).toLocaleString("pt-BR"),
    Usuário: l.usuario?.nome ?? l.usuario_id ?? "—",
    Email: l.usuario?.email ?? "",
    Ação: l.acao, Entidade: l.entidade, "ID da entidade": l.entidade_id ?? "",
    Descrição: l.descricao ?? "",
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administração"
        title="Auditoria"
        description="Registro automático das ações realizadas pelos usuários."
        actions={
          <ExportButtons filename="auditoria" title="Auditoria" rows={exportRows} disabled={filtrados.length === 0} />
        }
      />

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3 backdrop-blur">
        <Input
          placeholder="Buscar por ação, entidade, usuário…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-xs"
        />
        <Select value={entidade} onValueChange={setEntidade}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as entidades</SelectItem>
            <SelectItem value="politicos">Políticos</SelectItem>
            <SelectItem value="candidatos">Candidatos</SelectItem>
            <SelectItem value="pleitos">Pleitos</SelectItem>
            <SelectItem value="eleitores">Eleitores</SelectItem>
            <SelectItem value="coordenadores">Coordenadores</SelectItem>
            <SelectItem value="enquetes">Enquetes</SelectItem>
            <SelectItem value="user_roles">Permissões</SelectItem>
          </SelectContent>
        </Select>
        <Select value={acao} onValueChange={setAcao}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Ação" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas ações</SelectItem>
            {acoes.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        <span className="ml-auto text-xs text-white/40">
          {filtrados.length} registro(s)
        </span>
      </div>

      {logs.isLoading ? (
        <SkeletonTable rows={8} cols={4} />
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Sem eventos"
          description="Nenhuma ação corresponde aos filtros atuais."
        />
      ) : (
        <Timeline items={filtrados} />
      )}
    </div>
  );
}

const ACTION_META: Record<string, { icon: any; tone: string; label?: string }> = {
  criou: { icon: Plus, tone: "from-emerald-500 to-emerald-300", label: "Criação" },
  atualizou: { icon: Pencil, tone: "from-indigo-500 to-violet-400", label: "Atualização" },
  excluiu: { icon: Trash2, tone: "from-rose-500 to-rose-300", label: "Exclusão" },
  login: { icon: LogIn, tone: "from-sky-500 to-cyan-300", label: "Login" },
  envio: { icon: Send, tone: "from-amber-500 to-amber-300", label: "Envio" },
};

function Timeline({ items }: { items: any[] }) {
  return (
    <div className="relative pl-6">
      <div
        className="pointer-events-none absolute bottom-0 left-3 top-0 w-px"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(129,140,248,0.5) 10%, rgba(124,58,237,0.4) 90%, transparent 100%)",
          boxShadow: "0 0 12px rgba(129,140,248,0.4)",
        }}
      />
      <ul className="space-y-3 cinema-stagger">
        {items.map((l) => {
          const meta = ACTION_META[l.acao] ?? { icon: ShieldCheck, tone: "from-white/40 to-white/20", label: l.acao };
          const Icon = meta.icon;
          return (
            <li key={l.id} className="relative">
              <div
                className="absolute -left-[14px] top-4 grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br text-white shadow-[0_0_16px_-2px_rgba(124,58,237,0.6)]"
                style={{ backgroundImage: `linear-gradient(135deg, var(--tw-gradient-stops))` }}
              >
                <div className={`grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br ${meta.tone}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="ml-6 rounded-2xl border border-white/5 bg-white/[0.03] p-4 backdrop-blur transition hover:border-indigo-400/20 hover:bg-white/[0.05]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge className="border-indigo-400/30 bg-indigo-500/15 text-indigo-100 capitalize">
                      {meta.label ?? l.acao}
                    </Badge>
                    <span className="text-sm font-medium text-white/90 capitalize">{l.entidade}</span>
                    {l.entidade_id && (
                      <span className="font-mono text-[10px] text-white/30">
                        #{l.entidade_id.slice(0, 8)}
                      </span>
                    )}
                  </div>
                  <time className="text-[11px] text-white/40">
                    {new Date(l.data_hora).toLocaleString("pt-BR")}
                  </time>
                </div>
                {l.descricao && (
                  <p className="mt-2 text-sm text-white/65">{l.descricao}</p>
                )}
                <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-2 text-xs text-white/50">
                  <div
                    className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold text-white"
                    style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                  >
                    {(l.usuario?.nome || l.usuario?.email || "S")[0]?.toUpperCase()}
                  </div>
                  <span className="truncate">
                    {l.usuario?.nome ?? "Sistema"}
                    {l.usuario?.email && <span className="text-white/30"> · {l.usuario.email}</span>}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}