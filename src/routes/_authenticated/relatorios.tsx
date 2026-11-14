import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, PieChart as PieIcon, Users, MapPin, Vote, UserCog, MessageSquare } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { ExportButtons } from "@/components/export-buttons";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Política+" }] }),
  component: Relatorios,
});

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2, 142 76% 36%))", "hsl(var(--chart-3, 47 95% 53%))", "hsl(var(--chart-4, 280 65% 60%))", "hsl(var(--chart-5, 12 76% 61%))"];

function Card({ title, icon: Icon, action, children }: { title: string; icon: any; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Relatorios() {
  const eleitoresPorBairro = useQuery({
    queryKey: ["rel-eleitores-bairro"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("eleitores").select("bairro").limit(5000);
      if (error) throw error;
      const map = new Map<string, number>();
      (data ?? []).forEach((r: any) => {
        const k = (r.bairro || "Sem bairro").trim() || "Sem bairro";
        map.set(k, (map.get(k) ?? 0) + 1);
      });
      return Array.from(map.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    },
  });

  const eleitoresPorCidade = useQuery({
    queryKey: ["rel-eleitores-cidade"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("eleitores").select("cidade").limit(5000);
      if (error) throw error;
      const map = new Map<string, number>();
      (data ?? []).forEach((r: any) => {
        const k = (r.cidade || "—").trim() || "—";
        map.set(k, (map.get(k) ?? 0) + 1);
      });
      return Array.from(map.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);
    },
  });

  const candidatosPorPleito = useQuery({
    queryKey: ["rel-candidatos-pleito"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidatos")
        .select("pleito:pleitos(nome)")
        .limit(2000);
      if (error) throw error;
      const map = new Map<string, number>();
      (data ?? []).forEach((r: any) => {
        const k = r.pleito?.nome || "Sem pleito";
        map.set(k, (map.get(k) ?? 0) + 1);
      });
      return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    },
  });

  const enquetesResumo = useQuery({
    queryKey: ["rel-enquetes-resumo"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data: enq, error } = await supabase
        .from("enquetes")
        .select("id, titulo, status")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = (enq ?? []).map((e: any) => e.id);
      if (!ids.length) return [];
      const { data: resp } = await supabase
        .from("respostas")
        .select("enquete_id")
        .in("enquete_id", ids);
      const counts = new Map<string, number>();
      (resp ?? []).forEach((r: any) => counts.set(r.enquete_id, (counts.get(r.enquete_id) ?? 0) + 1));
      return (enq ?? []).map((e: any) => ({
        id: e.id,
        titulo: e.titulo,
        status: e.status,
        respostas: counts.get(e.id) ?? 0,
      }));
    },
  });

  const pleitosResumo = useQuery({
    queryKey: ["rel-pleitos"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data: pleitos } = await supabase
        .from("pleitos")
        .select("id, nome, ano, tipo, status, candidatos:candidatos(id), pleito_politicos:pleito_politicos(id)")
        .order("ano", { ascending: false });
      return (pleitos ?? []).map((p: any) => ({
        pleito: p.nome,
        ano: p.ano ?? "—",
        tipo: p.tipo ?? "—",
        status: p.status ?? "—",
        candidatos: p.candidatos?.length ?? 0,
        politicos: p.pleito_politicos?.length ?? 0,
      }));
    },
  });

  const usuariosPorPolitico = useQuery({
    queryKey: ["rel-usuarios-politico"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, nome, email, ultimo_acesso, politico:politicos(nome)")
        .order("ultimo_acesso", { ascending: false, nullsFirst: false })
        .limit(500);
      return (data ?? []).map((u: any) => ({
        nome: u.nome ?? "—",
        email: u.email ?? "—",
        politico: u.politico?.nome ?? "—",
        ultimo_acesso: u.ultimo_acesso ? new Date(u.ultimo_acesso).toLocaleString("pt-BR") : "—",
      }));
    },
  });

  const whatsappDetalhado = useQuery({
    queryKey: ["rel-wpp-detalhado"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("whatsapp_envios")
        .select("status, erro")
        .limit(10000);
      const total = data?.length ?? 0;
      const por = (s: string) => (data ?? []).filter((r: any) => r.status === s).length;
      const erros = new Map<string, number>();
      (data ?? []).filter((r: any) => r.status === "erro").forEach((r: any) => {
        const k = (r.erro || "Sem detalhe").slice(0, 60);
        erros.set(k, (erros.get(k) ?? 0) + 1);
      });
      return {
        total,
        enviado: por("enviado"),
        entregue: por("entregue"),
        lido: por("lido"),
        erro: por("erro"),
        cancelado: por("cancelado"),
        pendente: por("pendente"),
        erros: Array.from(erros.entries())
          .map(([motivo, qtd]) => ({ motivo, qtd }))
          .sort((a, b) => b.qtd - a.qtd)
          .slice(0, 8),
      };
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description="Visão geral consolidada de eleitores, candidatos e enquetes."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Top 10 bairros (eleitores)"
          icon={MapPin}
          action={
            <ExportButtons
              filename="eleitores-por-bairro"
              title="Eleitores por bairro"
              rows={eleitoresPorBairro.data ?? []}
            />
          }
        >
          <div className="h-72">
            {(eleitoresPorBairro.data?.length ?? 0) === 0 ? (
              <Empty />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eleitoresPorBairro.data} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={120} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card
          title="Eleitores por cidade"
          icon={Users}
          action={
            <ExportButtons
              filename="eleitores-por-cidade"
              title="Eleitores por cidade"
              rows={eleitoresPorCidade.data ?? []}
            />
          }
        >
          <div className="h-72">
            {(eleitoresPorCidade.data?.length ?? 0) === 0 ? (
              <Empty />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={eleitoresPorCidade.data} dataKey="value" nameKey="name" outerRadius={90} label>
                    {(eleitoresPorCidade.data ?? []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card
          title="Candidatos por pleito"
          icon={BarChart3}
          action={
            <ExportButtons
              filename="candidatos-por-pleito"
              title="Candidatos por pleito"
              rows={candidatosPorPleito.data ?? []}
            />
          }
        >
          <div className="h-72">
            {(candidatosPorPleito.data?.length ?? 0) === 0 ? (
              <Empty />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={candidatosPorPleito.data}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card
          title="Respostas por enquete"
          icon={PieIcon}
          action={
            <ExportButtons
              filename="respostas-por-enquete"
              title="Respostas por enquete"
              rows={(enquetesResumo.data ?? []).map(({ id: _id, ...rest }) => rest)}
            />
          }
        >
          <div className="max-h-72 overflow-auto">
            {(enquetesResumo.data?.length ?? 0) === 0 ? (
              <Empty />
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2">Enquete</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Respostas</th>
                  </tr>
                </thead>
                <tbody>
                  {(enquetesResumo.data ?? []).map((e) => (
                    <tr key={e.id} className="border-t">
                      <td className="py-2">{e.titulo}</td>
                      <td className="py-2 capitalize">{e.status}</td>
                      <td className="py-2 text-right font-medium">{e.respostas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Relatório de Pleitos"
          icon={Vote}
          action={<ExportButtons filename="pleitos" title="Pleitos" rows={pleitosResumo.data ?? []} />}
        >
          <div className="max-h-72 overflow-auto">
            {(pleitosResumo.data?.length ?? 0) === 0 ? <Empty /> : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="py-2">Pleito</th><th>Ano</th><th>Tipo</th><th>Status</th><th className="text-right">Polít.</th><th className="text-right">Cand.</th></tr>
                </thead>
                <tbody>
                  {(pleitosResumo.data ?? []).map((p, i) => (
                    <tr key={i} className="border-t">
                      <td className="py-2">{p.pleito}</td><td>{p.ano}</td><td>{p.tipo}</td>
                      <td className="capitalize">{p.status}</td>
                      <td className="text-right">{p.politicos}</td>
                      <td className="text-right">{p.candidatos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        <Card
          title="Usuários por político"
          icon={UserCog}
          action={<ExportButtons filename="usuarios-por-politico" title="Usuários por político" rows={usuariosPorPolitico.data ?? []} />}
        >
          <div className="max-h-72 overflow-auto">
            {(usuariosPorPolitico.data?.length ?? 0) === 0 ? <Empty /> : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="py-2">Nome</th><th>Político</th><th>Último acesso</th></tr>
                </thead>
                <tbody>
                  {(usuariosPorPolitico.data ?? []).map((u, i) => (
                    <tr key={i} className="border-t">
                      <td className="py-2">{u.nome}</td>
                      <td className="text-muted-foreground">{u.politico}</td>
                      <td className="text-xs">{u.ultimo_acesso}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        <Card
          title="WhatsApp — entrega e erros"
          icon={MessageSquare}
          action={
            <ExportButtons
              filename="whatsapp-detalhado"
              title="WhatsApp detalhado"
              rows={whatsappDetalhado.data ? [{
                total: whatsappDetalhado.data.total,
                enviado: whatsappDetalhado.data.enviado,
                entregue: whatsappDetalhado.data.entregue,
                lido: whatsappDetalhado.data.lido,
                erro: whatsappDetalhado.data.erro,
                cancelado: whatsappDetalhado.data.cancelado,
                pendente: whatsappDetalhado.data.pendente,
              }] : []}
            />
          }
        >
          {!whatsappDetalhado.data ? <Empty /> : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  ["Total", whatsappDetalhado.data.total],
                  ["Enviado", whatsappDetalhado.data.enviado],
                  ["Entregue", whatsappDetalhado.data.entregue],
                  ["Lido", whatsappDetalhado.data.lido],
                  ["Erro", whatsappDetalhado.data.erro],
                  ["Cancelado", whatsappDetalhado.data.cancelado],
                ].map(([k, v]) => (
                  <div key={k as string} className="rounded-md border bg-background p-2">
                    <div className="text-[10px] uppercase text-muted-foreground">{k}</div>
                    <div className="text-base font-semibold">{v as number}</div>
                  </div>
                ))}
              </div>
              {whatsappDetalhado.data.total > 0 && (
                <div className="text-xs text-muted-foreground">
                  Taxa de entrega: <strong>{Math.round(((whatsappDetalhado.data.entregue + whatsappDetalhado.data.lido) / whatsappDetalhado.data.total) * 100)}%</strong>
                  {" · "}Taxa de leitura: <strong>{Math.round((whatsappDetalhado.data.lido / whatsappDetalhado.data.total) * 100)}%</strong>
                </div>
              )}
              {whatsappDetalhado.data.erros.length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-medium">Erros por motivo</div>
                  <table className="w-full text-xs">
                    <tbody>
                      {whatsappDetalhado.data.erros.map((e, i) => (
                        <tr key={i} className="border-t">
                          <td className="py-1">{e.motivo}</td>
                          <td className="py-1 text-right font-mono">{e.qtd}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Sem dados ainda.
    </div>
  );
}