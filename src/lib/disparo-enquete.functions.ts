import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const destinatarioSchema = z.object({
  nome: z.string().trim().max(120).optional().nullable(),
  telefone: z.string().trim().min(8).max(40),
  eleitor_id: z.string().uuid().optional().nullable(),
});

const dispararSchema = z.object({
  enquete_id: z.string().uuid(),
  nome_campanha: z.string().trim().min(1).max(160),
  mensagem: z.string().trim().min(1).max(2000),
  ritmo_segundos: z.number().int().min(2).max(15).default(4),
  destinatarios: z.array(destinatarioSchema).min(1).max(5000),
});

function normPhone(raw: string): string {
  const d = String(raw ?? "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("55")) return d;
  if (d.length === 10 || d.length === 11) return "55" + d;
  return d;
}

function render(tpl: string, ctx: Record<string, string>): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => ctx[k] ?? "");
}

export const dispararEnqueteWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => dispararSchema.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = (context as any).supabase;
    const userId = (context as any).userId as string;

    // 1. Carrega enquete + político
    const { data: enq, error: ee } = await supabase
      .from("enquetes")
      .select("id, slug, token_convite, titulo, politico_id, mostrar_politico, politico:politicos(nome)")
      .eq("id", data.enquete_id)
      .maybeSingle();
    if (ee) throw new Error(ee.message);
    if (!enq) throw new Error("Enquete não encontrada");

    // 2. Dedup + normaliza
    const seen = new Set<string>();
    const dests = data.destinatarios
      .map((d) => ({ ...d, telefone: normPhone(d.telefone) }))
      .filter((d) => {
        if (!d.telefone || d.telefone.length < 12 || seen.has(d.telefone)) return false;
        seen.add(d.telefone);
        return true;
      });
    if (!dests.length) throw new Error("Nenhum telefone válido após normalização.");

    // 3. Cria campanha
    const { data: camp, error: ce } = await supabase
      .from("whatsapp_campanhas")
      .insert({
        politico_id: enq.politico_id,
        enquete_id: enq.id,
        nome: data.nome_campanha,
        mensagem: data.mensagem,
        total_alvo: dests.length,
        status: "enviando",
        iniciada_em: new Date().toISOString(),
        created_by: userId,
      })
      .select("id")
      .single();
    if (ce) throw new Error(ce.message);
    const campanhaId = camp.id as string;

    // 4. Insere envios pendentes
    const origin = process.env.PUBLIC_APP_URL || "https://politica.adscomunicacao.com";
    const linkBase = `${origin}/c/${enq.token_convite ?? enq.slug}`;
    const politicoNome = enq.mostrar_politico ? (enq.politico?.nome ?? "") : "";
    const palavraChave = enq.token_convite ?? "";
    const enviosRows = dests.map((d) => {
      const msg = render(data.mensagem, {
        nome: d.nome ?? "",
        link: linkBase,
        politico: politicoNome,
        palavra_chave: palavraChave,
        codigo: palavraChave,
        titulo: enq.titulo,
      });
      return {
        campanha_id: campanhaId,
        eleitor_id: d.eleitor_id ?? null,
        telefone: d.telefone,
        mensagem: msg,
        status: "pendente",
        tentativas: 0,
      };
    });
    for (let i = 0; i < enviosRows.length; i += 200) {
      const { error: ie } = await supabase.from("whatsapp_envios").insert(enviosRows.slice(i, i + 200));
      if (ie) throw new Error(ie.message);
    }

    // 5. Loop síncrono com ritmo
    const { sendZapiText } = await import("./zapi.server");
    let enviados = 0;
    let falhas = 0;
    const ritmoMs = Math.max(2000, data.ritmo_segundos * 1000);
    // Re-carrega ids dos envios criados (na ordem inserida)
    const { data: envios } = await supabase
      .from("whatsapp_envios")
      .select("id, telefone, mensagem")
      .eq("campanha_id", campanhaId)
      .order("created_at", { ascending: true });

    for (let i = 0; i < (envios?.length ?? 0); i++) {
      const env = envios![i];
      try {
        const r = await sendZapiText(env.telefone, env.mensagem);
        if (r.ok) {
          enviados++;
          await supabase.from("whatsapp_envios").update({
            status: "enviado",
            enviado_em: new Date().toISOString(),
            tentativas: 1,
          }).eq("id", env.id);
        } else {
          falhas++;
          await supabase.from("whatsapp_envios").update({
            status: "falha",
            erro: typeof r.data === "string" ? r.data.slice(0, 400) : JSON.stringify(r.data).slice(0, 400),
            tentativas: 1,
          }).eq("id", env.id);
        }
      } catch (e: any) {
        falhas++;
        await supabase.from("whatsapp_envios").update({
          status: "falha", erro: String(e?.message ?? e).slice(0, 400), tentativas: 1,
        }).eq("id", env.id);
      }
      if (i < envios!.length - 1) await new Promise((r) => setTimeout(r, ritmoMs));
    }

    await supabase.from("whatsapp_campanhas").update({
      status: "concluida",
      total_enviado: enviados,
      total_falha: falhas,
      concluida_em: new Date().toISOString(),
    }).eq("id", campanhaId);

    return { campanha_id: campanhaId, total: dests.length, enviados, falhas };
  });