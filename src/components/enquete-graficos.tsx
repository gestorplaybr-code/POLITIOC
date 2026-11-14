import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LabelList } from "recharts";
import { MessageSquareOff, Quote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fetchResultadosEnquete, CHART_PALETTE, type PerguntaResultado } from "@/lib/resultados";

export function EnqueteGraficos({ enqueteId, compact = false }: { enqueteId: string; compact?: boolean }) {
  const q = useQuery({
    queryKey: ["resultados", enqueteId],
    queryFn: () => fetchResultadosEnquete(enqueteId),
  });

  if (q.isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-48 animate-pulse rounded-lg border bg-muted/30" />
        <div className="h-48 animate-pulse rounded-lg border bg-muted/30" />
      </div>
    );
  }
  if (q.isError) return <p className="text-sm text-destructive">Erro ao carregar gráficos.</p>;

  const perguntas = q.data?.perguntas ?? [];
  if (perguntas.length === 0) {
    return <p className="text-sm text-muted-foreground">Esta enquete ainda não tem perguntas.</p>;
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {perguntas.map((p) => (
        <PerguntaGrafico key={p.id} p={p} compact={compact} />
      ))}
    </div>
  );
}

function PerguntaGrafico({ p, compact }: { p: PerguntaResultado; compact: boolean }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <h3 className={compact ? "text-sm font-medium" : "font-semibold"}>{p.texto}</h3>
        <Badge variant="secondary" className="shrink-0">{p.total} resposta{p.total === 1 ? "" : "s"}</Badge>
      </div>
      {p.textos?.length && !(p.data?.length) ? (
        <TextoLivre textos={p.textos ?? []} />
      ) : p.total === 0 ? (
        <SemRespostas />
      ) : (
        <div className="space-y-3">
          {typeof p.media === "number" && (
            <div className="inline-flex items-baseline gap-2 rounded-md border bg-muted/30 px-3 py-1.5">
              <span className="text-xs text-muted-foreground">Média</span>
              <strong className="text-lg tabular-nums">{p.media.toFixed(1)}</strong>
            </div>
          )}
          <div style={{ height: compact ? 200 : 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={p.data} margin={{ top: 20, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {(p.data ?? []).map((_, i) => (
                    <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                  ))}
                  <LabelList dataKey="pct" position="top" formatter={(v: any) => `${v}%`} className="fill-foreground" style={{ fontSize: 11, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1 text-sm">
            {(p.data ?? []).map((d, i) => (
              <div key={d.name} className="flex items-center justify-between gap-2 border-b py-1 last:border-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CHART_PALETTE[i % CHART_PALETTE.length] }} />
                  <span className="truncate">{d.name}</span>
                </div>
                <span className="shrink-0 text-muted-foreground tabular-nums">{d.value} ({d.pct}%)</span>
              </div>
            ))}
          </div>
          {p.textos?.length ? <TextoLivre textos={p.textos} /> : null}
        </div>
      )}
    </div>
  );
}

function SemRespostas() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
      <MessageSquareOff className="h-4 w-4" /> Ainda sem respostas para esta pergunta.
    </div>
  );
}

function TextoLivre({ textos }: { textos: string[] }) {
  if (textos.length === 0) return <SemRespostas />;
  return (
    <div className="max-h-72 space-y-2 overflow-auto">
      {textos.map((t, i) => (
        <div key={i} className="flex gap-2 rounded-md border bg-muted/30 p-3 text-sm">
          <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span>{t}</span>
        </div>
      ))}
    </div>
  );
}