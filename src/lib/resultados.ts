import { supabase } from "@/integrations/supabase/client";

export const CHART_PALETTE = [
  "hsl(var(--primary))",
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // rose
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
];

export type PerguntaResultado = {
  id: string;
  texto: string;
  tipo: string;
  ordem: number;
  total: number;
  textos?: string[];
  data?: { name: string; value: number; pct: number }[];
  media?: number | null;
};

export async function fetchResultadosEnquete(enqueteId: string): Promise<{
  totalRespostas: number;
  perguntas: PerguntaResultado[];
}> {
  const { data: perguntas, error: e1 } = await supabase
    .from("enquete_perguntas")
    .select("id, texto, tipo, ordem, opcoes:enquete_opcoes(id, texto, ordem)")
    .eq("enquete_id", enqueteId)
    .order("ordem");
  if (e1) throw e1;

  const { data: respostas, error: e2 } = await supabase
    .from("respostas")
    .select("id")
    .eq("enquete_id", enqueteId);
  if (e2) throw e2;

  const respIds = (respostas ?? []).map((r: any) => r.id);
  let itens: any[] = [];
  if (respIds.length) {
    const { data: it, error: e3 } = await supabase
      .from("resposta_itens")
      .select("resposta_id, pergunta_id, opcao_id, texto, texto_outro, numero")
      .in("resposta_id", respIds);
    if (e3) throw e3;
    itens = it ?? [];
  }

  const perguntasComResultado: PerguntaResultado[] = (perguntas ?? []).map((p: any) => {
    const itensP = itens.filter((i) => i.pergunta_id === p.id);
    if (["texto", "longa", "observacao", "texto_curto", "texto_longo", "dissertativa", "endereco", "cidade", "bairro"].includes(p.tipo)) {
      const textos = itensP.map((i) => i.texto ?? i.texto_outro).filter(Boolean);
      return { id: p.id, texto: p.texto, tipo: p.tipo, ordem: p.ordem, total: textos.length, textos };
    }
    if (p.tipo === "simnao") {
      const sim = itensP.filter((i) => /^s/i.test(String(i.texto ?? "").trim())).length;
      const nao = itensP.filter((i) => /^n/i.test(String(i.texto ?? "").trim())).length;
      const total = sim + nao;
      return {
        id: p.id, texto: p.texto, tipo: p.tipo, ordem: p.ordem, total,
        data: [
          { name: "Sim", value: sim, pct: total ? Math.round((sim / total) * 1000) / 10 : 0 },
          { name: "Não", value: nao, pct: total ? Math.round((nao / total) * 1000) / 10 : 0 },
        ],
      };
    }
    if (["escala", "nps", "numero"].includes(p.tipo)) {
      const nums = itensP.map((i) => Number(i.numero)).filter((n) => Number.isFinite(n));
      const counts = new Map<string, number>();
      nums.forEach((n) => counts.set(String(n), (counts.get(String(n)) ?? 0) + 1));
      const total = nums.length;
      const media = total ? nums.reduce((a, b) => a + b, 0) / total : null;
      return {
        id: p.id, texto: p.texto, tipo: p.tipo, ordem: p.ordem, total, media,
        data: Array.from({ length: 11 }).map((_, i) => ({
          name: String(i),
          value: counts.get(String(i)) ?? 0,
          pct: total ? Math.round(((counts.get(String(i)) ?? 0) / total) * 1000) / 10 : 0,
        })),
      };
    }
    const opcoes = (p.opcoes ?? []).sort((a: any, b: any) => a.ordem - b.ordem);
    const counts = new Map<string, number>();
    itensP.forEach((i) => {
      if (i.opcao_id) counts.set(i.opcao_id, (counts.get(i.opcao_id) ?? 0) + 1);
    });
    const outros = itensP.filter((i) => i.texto_outro).map((i) => i.texto_outro);
    const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
    return {
      id: p.id,
      texto: p.texto,
      tipo: p.tipo,
      ordem: p.ordem,
      total: total + outros.length,
      textos: outros,
      data: [
        ...opcoes.map((o: any) => ({
        name: o.texto,
        value: counts.get(o.id) ?? 0,
        pct: (total + outros.length) ? Math.round(((counts.get(o.id) ?? 0) / (total + outros.length)) * 1000) / 10 : 0,
      })),
        ...(outros.length ? [{ name: "Outro", value: outros.length, pct: Math.round((outros.length / (total + outros.length)) * 1000) / 10 }] : []),
      ],
    };
  });

  return { totalRespostas: respostas?.length ?? 0, perguntas: perguntasComResultado };
}