import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Landmark, Users, Trophy, Vote, ClipboardList, MessageSquare,
  TrendingUp, UserCog, Activity, Sparkles, Inbox, Award, BarChart3, Handshake,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, roleLabel } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { SectionCard } from "@/components/section-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { useChartTheme } from "@/lib/chart-theme";
import { WelcomeChecklist } from "@/components/welcome-checklist";
import { CoordenadorPerformanceTable } from "@/components/coordenador-performance-table";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Política+" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { profile, roles, isAdmin } = useCurrentUser();
  const { chartColors, chartTooltipStyle, isLight } = useChartTheme();
  const [skipped, setSkipped] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setSkipped(localStorage.getItem("vf-onboarding-skipped") === "1");
    }
  }, []);

  const stats = useQuery({
    queryKey: ["dashboard-stats"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [pol, ple, can, usr, ele, coo, enq, resp, msgTotal, msgErr] = await Promise.all([
        supabase.from("politicos").select("id", { count: "exact", head: true }),
        supabase.from("pleitos").select("id", { count: "exact", head: true }),
        supabase.from("candidatos").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("eleitores").select("id", { count: "exact", head: true }),
        supabase.from("coordenadores").select("id", { count: "exact", head: true }),
        supabase.from("enquetes").select("id", { count: "exact", head: true }),
        supabase.from("respostas").select("id", { count: "exact", head: true }),
        supabase.from("whatsapp_envios").select("id", { count: "exact", head: true }),
        supabase.from("whatsapp_envios").select("id", { count: "exact", head: true }).eq("status", "erro"),
      ]);
      const taxa = (ele.count ?? 0) > 0 ? Math.round(((resp.count ?? 0) / (ele.count ?? 1)) * 100) : 0;
      return {
        politicos: pol.count ?? 0,
        pleitos: ple.count ?? 0,
        candidatos: can.count ?? 0,
        usuarios: usr.count ?? 0,
        eleitores: ele.count ?? 0,
        coordenadores: coo.count ?? 0,
        enquetes: enq.count ?? 0,
        respostas: resp.count ?? 0,
        msgTotal: msgTotal.count ?? 0,
        msgErr: msgErr.count ?? 0,
        taxa,
      };
    },
  });

  const novosEleitores = useQuery({
    queryKey: ["dash-novos-eleitores-30d"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data, error } = await supabase
        .from("eleitores")
        .select("created_at")
        .gte("created_at", since)
        .limit(10000);
      if (error) throw error;
      const map = new Map<string, number>();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const k = d.toISOString().slice(5, 10);
        map.set(k, 0);
      }
      (data ?? []).forEach((r: any) => {
        const k = r.created_at.slice(5, 10);
        map.set(k, (map.get(k) ?? 0) + 1);
      });
      return Array.from(map.entries()).map(([dia, qtd]) => ({ dia, qtd }));
    },
  });

  const topPoliticos = useQuery({
    queryKey: ["dash-top-politicos"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("eleitores").select("politico_id").limit(10000);
      if (error) throw error;
      const counts = new Map<string, number>();
      (data ?? []).forEach((r: any) => {
        if (!r.politico_id) return;
        counts.set(r.politico_id, (counts.get(r.politico_id) ?? 0) + 1);
      });
      const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (!top.length) return [] as { nome: string; total: number }[];
      const { data: pols } = await supabase.from("politicos").select("id, nome").in("id", top.map((t) => t[0]));
      const byId = new Map((pols ?? []).map((p: any) => [p.id, p.nome]));
      return top.map(([id, total]) => ({ nome: byId.get(id) ?? "—", total }));
    },
  });

  const topEnquetes = useQuery({
    queryKey: ["dash-top-enquetes"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("respostas").select("enquete_id").limit(10000);
      if (error) throw error;
      const counts = new Map<string, number>();
      (data ?? []).forEach((r: any) => counts.set(r.enquete_id, (counts.get(r.enquete_id) ?? 0) + 1));
      const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (!top.length) return [] as { titulo: string; total: number; id: string }[];
      const { data: enqs } = await supabase.from("enquetes").select("id, titulo").in("id", top.map((t) => t[0]));
      const byId = new Map((enqs ?? []).map((e: any) => [e.id, e.titulo]));
      return top.map(([id, total]) => ({ id, titulo: byId.get(id) ?? "—", total }));
    },
  });

  const ultimasRespostas = useQuery({
    queryKey: ["dash-ultimas-respostas"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("respostas")
        .select("id, nome, created_at, enquete:enquetes(titulo)")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const ultimosUsuarios = useQuery({
    queryKey: ["dash-ultimos-usuarios"],
    enabled: isAdmin,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, email, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const s = stats.data;

  const showWelcome = !skipped && stats.isSuccess && (s?.politicos ?? 0) === 0;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Cinema da gestão política"
        title={`Olá, ${profile?.nome || "comandante"}`}
        description={`Sua sala de comando — ${roles.map(roleLabel).join(" · ") || "perfil em definição"}. Acompanhe a campanha em tempo real.`}
        actions={
          <>
            {isAdmin && (
              <Button asChild variant="glass" size="sm">
                <Link to="/usuarios" search={{ novo: "parceiro" } as any}><Handshake className="h-4 w-4" /> Novo parceiro</Link>
              </Button>
            )}
            <Button asChild variant="glass" size="sm">
              <Link to="/relatorios"><BarChart3 className="h-4 w-4" /> Relatórios</Link>
            </Button>
            <Button asChild variant="premium" size="sm">
              <Link to="/enquetes"><Sparkles className="h-4 w-4" /> Nova enquete</Link>
            </Button>
          </>
        }
      />

      {showWelcome && (
        <WelcomeChecklist
          onSkip={() => {
            localStorage.setItem("vf-onboarding-skipped", "1");
            setSkipped(true);
          }}
        />
      )}

      {/* Bento de stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Landmark} label="Políticos" value={s?.politicos ?? "—"} tone="indigo" />
        <StatCard icon={Users} label="Eleitores" value={s?.eleitores ?? "—"} tone="violet" />
        <StatCard icon={Trophy} label="Pleitos" value={s?.pleitos ?? "—"} tone="amber" />
        <StatCard icon={Vote} label="Candidatos" value={s?.candidatos ?? "—"} tone="mint" />
        <StatCard icon={ClipboardList} label="Enquetes" value={s?.enquetes ?? "—"} tone="indigo" />
        <StatCard
          icon={Activity}
          label="Respostas"
          value={s?.respostas ?? "—"}
          hint={`Taxa de engajamento ${s?.taxa ?? 0}%`}
          tone="violet"
        />
        <StatCard
          icon={MessageSquare}
          label="Mensagens enviadas"
          value={s?.msgTotal ?? "—"}
          hint={`Erros: ${s?.msgErr ?? 0}`}
          tone="mint"
        />
        {isAdmin && (
          <StatCard icon={UserCog} label="Usuários" value={s?.usuarios ?? "—"} tone="rose" />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          icon={<TrendingUp className="h-4 w-4" />}
          title="Novos eleitores"
          description="Últimos 30 dias"
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={novosEleitores.data ?? []}>
                <defs>
                  <linearGradient id="grad-eleitores" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors.indigo} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={chartColors.violet} stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis dataKey="dia" stroke={chartColors.axis} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} stroke={chartColors.axis} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  cursor={{ fill: isLight ? "rgba(79,70,229,0.08)" : "rgba(129,140,248,0.08)" }}
                />
                <Bar dataKey="qtd" fill="url(#grad-eleitores)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          icon={<Award className="h-4 w-4" />}
          title="Top 5 políticos por eleitores"
        >
          <RankingList
            items={(topPoliticos.data ?? []).map((p) => ({ label: p.nome, value: p.total }))}
            loading={topPoliticos.isLoading}
            emptyLabel="Nenhum eleitor vinculado ainda."
          />
        </SectionCard>

        <SectionCard
          icon={<ClipboardList className="h-4 w-4" />}
          title="Top 5 enquetes por respostas"
        >
          <RankingList
            items={(topEnquetes.data ?? []).map((e) => ({
              label: e.titulo,
              value: e.total,
              href: { to: "/enquetes/$id/resultados", params: { id: e.id } },
            }))}
            loading={topEnquetes.isLoading}
            emptyLabel="Crie uma enquete para começar."
          />
        </SectionCard>

        <SectionCard
          icon={<MessageSquare className="h-4 w-4" />}
          title="Últimas respostas"
        >
          {(ultimasRespostas.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Sem respostas"
              description="As próximas respostas aparecerão aqui em tempo real."
            />
          ) : (
            <ul className="divide-y divide-white/5">
              {(ultimasRespostas.data ?? []).map((r: any) => (
                <li key={r.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="min-w-0">
                    <div className="truncate text-white">{r.nome || "Anônimo"}</div>
                    <div className="truncate text-xs text-white/40">
                      {r.enquete?.titulo || "—"}
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] uppercase tracking-wider text-white/40">
                    {formatDateTime(r.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {isAdmin && (
        <SectionCard
          icon={<UserCog className="h-4 w-4" />}
          title="Últimos usuários cadastrados"
        >
          {(ultimosUsuarios.data?.length ?? 0) === 0 ? (
            <EmptyState icon={UserCog} title="Sem usuários" />
          ) : (
            <ul className="divide-y divide-white/5">
              {(ultimosUsuarios.data ?? []).map((u: any) => (
                <li key={u.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-white">
                    {u.nome} <span className="text-white/40">· {u.email}</span>
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-white/40">
                    {formatDateTime(u.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      )}

      <SectionCard
        icon={<UserCog className="h-4 w-4" />}
        title="Desempenho por coordenador"
        description="Quantas pessoas cada coordenador atingiu e participação nos últimos 30 dias"
        actions={
          <Button asChild variant="glass" size="sm">
            <Link to="/coordenadores/desempenho">Ver todos</Link>
          </Button>
        }
      >
        <CoordenadorPerformanceTable days={30} limit={10} />
      </SectionCard>
    </div>
  );
}

function RankingList({
  items,
  loading,
  emptyLabel,
}: {
  items: { label: string; value: number; href?: any }[];
  loading?: boolean;
  emptyLabel: string;
}) {
  if (!loading && items.length === 0) {
    return <EmptyState title="Sem dados" description={emptyLabel} />;
  }
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((item, i) => {
        const pct = (item.value / max) * 100;
        const content = (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-white/10 bg-white/5 text-[10px] font-semibold text-indigo-300"
                >
                  {i + 1}
                </span>
                <span className="truncate text-white">{item.label}</span>
              </div>
              <span
                className="shrink-0 text-base text-white"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {item.value}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: "linear-gradient(90deg, #818cf8, #c084fc)",
                  boxShadow: "0 0 12px rgba(129,140,248,0.5)",
                }}
              />
            </div>
          </div>
        );
        return (
          <li key={i}>
            {item.href ? (
              <Link to={item.href.to} params={item.href.params} className="block rounded-md p-1 -m-1 transition hover:bg-white/[0.03]">
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}