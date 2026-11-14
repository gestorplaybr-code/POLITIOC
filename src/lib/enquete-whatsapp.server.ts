// Server-only conversational engine for WhatsApp surveys, powered by Lovable AI.
// The IA interprets free-form replies, maps them to survey options, and drives
// the conversation one question at a time.
import { sendZapiText, normalizePhone } from "@/lib/zapi.server";
import { generateObject, generateText, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

type Opcao = { id: string; texto: string; ordem: number };
type Pergunta = {
  id: string;
  texto: string;
  tipo: string;
  ordem: number;
  obrigatoria: boolean;
  permitir_outro: boolean;
  opcoes: Opcao[];
};

async function loadPerguntas(admin: any, enqueteId: string): Promise<Pergunta[]> {
  const { data } = await admin
    .from("enquete_perguntas")
    .select("id, texto, tipo, ordem, obrigatoria, permitir_outro, opcoes:enquete_opcoes(id, texto, ordem)")
    .eq("enquete_id", enqueteId)
    .order("ordem");
  return (data ?? []) as Pergunta[];
}

function extractToken(text: string): string | null {
  // Tokens são strings hex de 10 chars derivadas de md5 (sempre contêm dígitos).
  // 1) Padrão explícito: "código: XXXX" / "codigo XXXX" / "code XXXX".
  const labeled = text
    .toLowerCase()
    .match(/(?:c[oó]digo|code)[^a-z0-9]*([a-z0-9]{8,14})/i);
  if (labeled?.[1]) return labeled[1].toLowerCase();

  // 2) Fallback: qualquer palavra 8–14 alfanum que contenha ao menos 1 dígito
  //    (descarta palavras comuns como "participar", "pesquisa").
  const clean = text.toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu, " ");
  const words = clean.split(/\s+/).filter(Boolean);
  for (const w of words) {
    if (/^[a-z0-9]{8,14}$/.test(w) && /\d/.test(w)) return w;
  }
  return null;
}

/** Ask the model to interpret the user's free-form reply. */
async function interpretReply(args: {
  pergunta: Pergunta;
  reply: string;
  historico: { role: "assistente" | "eleitor"; texto: string }[];
  tituloEnquete: string;
}) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY não configurada");
  const gateway = createLovableAiGatewayProvider(key);
  const model = gateway("google/gemini-3-flash-preview");

  const { pergunta, reply, tituloEnquete } = args;
  const opcoes = (pergunta.opcoes ?? []).slice().sort((a, b) => a.ordem - b.ordem);

  const schema = z.object({
    acao: z.enum(["registrar", "reperguntar", "encerrar"])
      .describe("registrar=entendi a resposta; reperguntar=ambíguo/off-topic; encerrar=quer sair"),
    opcao_ids: z.array(z.string()).optional().default([])
      .describe("IDs das opções selecionadas (vazio se pergunta aberta ou sim/não)"),
    texto_livre: z.string().optional().default("")
      .describe("Texto livre normalizado (vazio se não aplicável)"),
    mensagem_para_usuario: z.string().optional().default("")
      .describe("Resposta amigável para enviar ao eleitor no WhatsApp"),
  });

  const opcoesTxt = opcoes.length
    ? opcoes.map((o, i) => `  ${i + 1}. [id=${o.id}] ${o.texto}`).join("\n")
    : "  (nenhuma opção — pergunta aberta)";

  const tipoDesc: Record<string, string> = {
    unica: "escolha ÚNICA (apenas 1 opção)",
    multipla: "escolha MÚLTIPLA (uma ou mais opções)",
    simnao: "SIM ou NÃO",
    escala: "número de 0 a 10",
    texto: "resposta curta livre",
    longa: "resposta longa livre",
    observacao: "resposta livre",
    cpf: "CPF (11 dígitos)",
    email: "e-mail",
    telefone: "telefone com DDD",
    data: "data DD/MM/AAAA",
    endereco: "endereço",
    cidade: "cidade",
    bairro: "bairro",
  };

  const system = `Entrevistador telegráfico de pesquisa por WhatsApp.
Valide a resposta contra as opções. Aceite variações naturais (sim/claro/apoio → SIM; não/nem pensar → NÃO). Nomes parciais valem se casarem sem ambiguidade.
Ambíguo/off-topic → acao="reperguntar". Pedir sair/parar → acao="encerrar".
NUNCA invente opções fora da lista. NUNCA marque mais de uma em escolha única.
"mensagem_para_usuario" é curtíssima: 1 palavra ou 3-4 palavras no máximo ("Anotado.", "Ok.", "Beleza."). Nada de explicar o que entendeu. No máximo 1 emoji ocasional.`;

  const userMsg = `Pesquisa: "${tituloEnquete}"
Pergunta atual (tipo: ${tipoDesc[pergunta.tipo] ?? pergunta.tipo}):
"${pergunta.texto}"

Opções disponíveis:
${opcoesTxt}
${pergunta.permitir_outro ? '(o eleitor também pode responder "outro" com texto livre)' : ""}

Últimas mensagens da conversa:
${args.historico.slice(-6).map((h) => `${h.role === "eleitor" ? "Eleitor" : "Você"}: ${h.texto}`).join("\n") || "(início da conversa)"}

Nova mensagem do eleitor:
"${reply}"

Responda em JSON conforme o schema. Em "mensagem_para_usuario":
- Se registrar: dê um breve reconhecimento ("Perfeito!", "Anotado!") — a próxima pergunta será enviada depois automaticamente.
- Se reperguntar: seja gentil, reformule a pergunta.
- Se encerrar: agradeça e despeça-se.`;

  try {
    const { object } = await generateObject({
      model,
      schema,
      system,
      prompt: userMsg,
    });
    return object;
  } catch (err) {
    if (!NoObjectGeneratedError.isInstance(err)) throw err;
    // Retry como texto puro pedindo JSON e parse tolerante
    const { text } = await generateText({
      model,
      system: system + "\n\nResponda APENAS com JSON válido, sem crases nem markdown.",
      prompt: userMsg + '\n\nFormato exato: {"acao":"registrar|reperguntar|encerrar","opcao_ids":[],"texto_livre":"","mensagem_para_usuario":""}',
    });
    const parsed = tolerantJsonParse(text);
    return schema.parse({
      acao: (parsed as any)?.acao ?? "reperguntar",
      opcao_ids: (parsed as any)?.opcao_ids ?? [],
      texto_livre: (parsed as any)?.texto_livre ?? "",
      mensagem_para_usuario: (parsed as any)?.mensagem_para_usuario ?? "",
    });
  }
}

function tolerantJsonParse(raw: string): unknown {
  let s = String(raw ?? "").replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = s.search(/[\{\[]/);
  const end = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
  if (start === -1 || end === -1 || end <= start) return {};
  s = s.slice(start, end + 1).replace(/,\s*([}\]])/g, "$1").replace(/[\x00-\x1F\x7F]/g, " ");
  try { return JSON.parse(s); } catch { return {}; }
}

/** Texto pronto para enviar de uma pergunta, com opções numeradas e dica de formato. */
function formatarPergunta(p: Pergunta, prefixo?: string): string {
  const base = `*${p.texto}*`;
  const opcoes = (p.opcoes ?? []).slice().sort((a, b) => a.ordem - b.ordem);
  const partes: string[] = [];
  if (prefixo) partes.push(prefixo);
  partes.push(base);

  if (opcoes.length) {
    partes.push(opcoes.map((o, i) => `${i + 1}. ${o.texto}`).join("\n"));
    if (p.tipo === "multipla") {
      partes.push("_Responda com os números separados por vírgula (ex.: 1,3)._");
    } else {
      partes.push("_Responda com o número da opção._");
    }
    if (p.permitir_outro) partes.push("_Ou digite outra resposta._");
  } else {
    switch (p.tipo) {
      case "simnao": partes.push("_Responda com *sim* ou *não*._"); break;
      case "escala":
      case "nps":
      case "numero": partes.push("_Responda com um número de *0 a 10*._"); break;
      case "cpf": partes.push("_Envie os 11 dígitos do CPF._"); break;
      case "email": partes.push("_Envie um e-mail (ex.: nome@dominio.com)._"); break;
      case "telefone": partes.push("_Envie o número com DDD (ex.: 11 99999-0000)._"); break;
      case "data": partes.push("_Envie a data no formato DD/MM/AAAA._"); break;
      default: break;
    }
  }
  if (!p.obrigatoria) partes.push("_Se preferir, responda 'pular'._");
  return partes.join("\n\n");
}

function reformularPergunta(p: Pergunta): string {
  return formatarPergunta(p, "Não entendi, vamos de novo:");
}

function normalizeText(value: string): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  return normalizeText(value).split(/\s+/).filter((w) => w.length >= 3);
}

function optionScore(replyNorm: string, replyWords: string[], optionText: string, index: number): number {
  const optNorm = normalizeText(optionText);
  if (!optNorm) return 0;
  if (replyNorm === String(index + 1)) return 100;
  if (replyNorm === optNorm) return 95;
  if (replyNorm.includes(optNorm)) return 85;
  if (optNorm.includes(replyNorm) && replyNorm.length >= 4) return 78;
  const optWords = tokenize(optNorm);
  if (!optWords.length || !replyWords.length) return 0;
  const matched = optWords.filter((w) => replyWords.includes(w) || replyWords.some((rw) => rw.length >= 4 && (w.includes(rw) || rw.includes(w))));
  if (!matched.length) return 0;
  const coverage = matched.length / optWords.length;
  const precision = matched.length / replyWords.length;
  return Math.round((coverage * 60) + (precision * 25));
}

function deterministicInterpret(p: Pergunta, reply: string): { acao: "registrar" | "reperguntar" | "encerrar"; opcao_ids: string[]; texto_livre: string; mensagem_para_usuario: string } | null {
  const raw = String(reply ?? "").trim();
  const norm = normalizeText(raw);
  if (!norm) return null;
  if (/^(cancelar|sair|parar|stop|encerrar|desistir)$/.test(norm)) {
    return { acao: "encerrar", opcao_ids: [], texto_livre: "", mensagem_para_usuario: "Tudo bem, encerramos por aqui. Obrigado! 🙏" };
  }

  if (!p.obrigatoria && /^(pular|skip|nao sei|não sei|prefiro nao responder|prefiro não responder|sem comentario|sem comentário)$/.test(norm)) {
    return { acao: "registrar", opcao_ids: [], texto_livre: "", mensagem_para_usuario: "Ok." };
  }

  if (p.tipo === "simnao") {
    if (/\b(nao|n|negativo|discordo|nem pensar|de jeito nenhum|nao apoio|não apoio)\b/.test(norm)) {
      return { acao: "registrar", opcao_ids: [], texto_livre: "nao", mensagem_para_usuario: "Anotado." };
    }
    if (/\b(sim|s|ss|claro|com certeza|positivo|apoio|concordo|quero|aceito)\b/.test(norm)) {
      return { acao: "registrar", opcao_ids: [], texto_livre: "sim", mensagem_para_usuario: "Anotado." };
    }
  }

  if (p.tipo === "escala" || p.tipo === "nps" || p.tipo === "numero") {
    const match = raw.replace(",", ".").match(/-?\d+(?:\.\d+)?/);
    if (match) {
      const n = Number(match[0]);
      if (Number.isFinite(n)) {
        return { acao: "registrar", opcao_ids: [], texto_livre: String(Math.max(0, Math.min(10, Math.round(n)))), mensagem_para_usuario: "Anotado." };
      }
    }
  }

  if (p.tipo === "cpf") {
    const digits = raw.replace(/\D/g, "");
    if (digits.length >= 11) return { acao: "registrar", opcao_ids: [], texto_livre: digits.slice(0, 11), mensagem_para_usuario: "Anotado." };
  }

  if (p.tipo === "email") {
    const email = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
    if (email) return { acao: "registrar", opcao_ids: [], texto_livre: email, mensagem_para_usuario: "Anotado." };
  }

  if (p.tipo === "telefone") {
    const digits = raw.replace(/\D/g, "");
    if (digits.length >= 10) return { acao: "registrar", opcao_ids: [], texto_livre: digits, mensagem_para_usuario: "Anotado." };
  }

  const opcoes = (p.opcoes ?? []).slice().sort((a, b) => a.ordem - b.ordem);
  if ((p.tipo === "unica" || p.tipo === "multipla") && opcoes.length) {
    const numericChoices = Array.from(new Set((norm.match(/\b\d+\b/g) ?? []).map((n) => Number(n)).filter((n) => n >= 1 && n <= opcoes.length)));
    if (numericChoices.length) {
      const ids = numericChoices.map((n) => opcoes[n - 1].id);
      return { acao: "registrar", opcao_ids: p.tipo === "unica" ? ids.slice(0, 1) : ids, texto_livre: "", mensagem_para_usuario: "Anotado." };
    }

    const replyWords = tokenize(raw);
    const ranked = opcoes
      .map((o, i) => ({ id: o.id, score: optionScore(norm, replyWords, o.texto, i) }))
      .filter((x) => x.score >= 55)
      .sort((a, b) => b.score - a.score);

    if (p.tipo === "unica" && ranked.length) {
      const first = ranked[0];
      const second = ranked[1];
      if (!second || first.score - second.score >= 8 || first.score >= 85) {
        return { acao: "registrar", opcao_ids: [first.id], texto_livre: "", mensagem_para_usuario: "Anotado." };
      }
    }

    if (p.tipo === "multipla" && ranked.length) {
      return { acao: "registrar", opcao_ids: ranked.map((r) => r.id), texto_livre: "", mensagem_para_usuario: "Anotado." };
    }

    // Só aceita como "outro" se a resposta parecer conteúdo real, não uma
    // interjeição vazia tipo "ok/beleza/blz/sim/aham" (senão o eleitor pula
    // as opções sem ver a lista).
    const interjeicao = /^(ok|okay|blz|beleza|show|top|legal|joia|jóia|sim|claro|aham|ahn|hum|hmm|certo|entendi|uhum|uhu|ta|tá|nao|não)\.?$/;
    if (p.permitir_outro && raw.length >= 3 && !interjeicao.test(norm)) {
      return { acao: "registrar", opcao_ids: [], texto_livre: raw, mensagem_para_usuario: "Anotado." };
    }
    return { acao: "reperguntar", opcao_ids: [], texto_livre: "", mensagem_para_usuario: "" };
  }

  if (["texto", "longa", "observacao", "endereco", "cidade", "bairro", "texto_curto", "texto_longo", "dissertativa"].includes(p.tipo)) {
    if (!raw && !p.obrigatoria) return { acao: "registrar", opcao_ids: [], texto_livre: "", mensagem_para_usuario: "Ok." };
    if (raw.length >= 1) return { acao: "registrar", opcao_ids: [], texto_livre: raw, mensagem_para_usuario: "Anotado." };
  }

  return null;
}

async function greetOpening(args: {
  tituloEnquete: string;
  descricao: string | null;
  coordenadorNome: string | null;
  primeiraPergunta: string;
}): Promise<string> {
  // Saudação curta e determinística — sem chamada extra de IA.
  const quem = args.coordenadorNome ? `${args.coordenadorNome} enviou` : "Enviamos";
  return `Oi! 👋 ${quem} uma pesquisa rápida: *${args.tituloEnquete}*.\n\n${args.primeiraPergunta}`;
}

function isValidCpf(raw: string) {
  const cpf = String(raw ?? "").replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let s = 0; for (let i = 0; i < 9; i++) s += +cpf[i] * (10 - i);
  let d = (s * 10) % 11; if (d === 10) d = 0; if (d !== +cpf[9]) return false;
  s = 0; for (let i = 0; i < 10; i++) s += +cpf[i] * (11 - i);
  d = (s * 10) % 11; if (d === 10) d = 0; return d === +cpf[10];
}

/** Turn the AI interpretation into resposta_itens rows. */
function buildItems(p: Pergunta, ai: { opcao_ids: string[]; texto_livre: string }): any[] {
  const opcoes = p.opcoes ?? [];
  const validIds = new Set(opcoes.map((o) => o.id));
  const chosen = ai.opcao_ids.filter((id) => validIds.has(id));
  const items: any[] = [];

  if (p.tipo === "unica" || p.tipo === "multipla") {
    if (p.tipo === "unica" && chosen.length > 1) chosen.length = 1;
    for (const id of chosen) items.push({ pergunta_id: p.id, opcao_id: id });
    if (!chosen.length && ai.texto_livre && p.permitir_outro) {
      items.push({ pergunta_id: p.id, texto_outro: ai.texto_livre.slice(0, 500) });
    }
  } else if (p.tipo === "simnao") {
    const lv = ai.texto_livre.toLowerCase();
    const val = /sim|s|yes/.test(lv) ? "sim" : /não|nao|n|no/.test(lv) ? "nao" : "";
    if (val) items.push({ pergunta_id: p.id, texto: val });
  } else if (p.tipo === "escala") {
    const n = Number(String(ai.texto_livre).replace(",", "."));
    if (Number.isFinite(n)) items.push({ pergunta_id: p.id, numero: Math.max(0, Math.min(10, Math.round(n))) });
  } else {
    const t = String(ai.texto_livre ?? "").trim();
    if (t) items.push({ pergunta_id: p.id, texto: t.slice(0, 2000) });
  }
  return items;
}

/** Local validators — after AI interprets, still enforce data quality for typed fields. */
function validateTyped(p: Pergunta, items: any[]): string | null {
  if (!items.length) return null;
  const v = items[0]?.texto ?? "";
  if (p.tipo === "cpf" && !isValidCpf(v)) return "Não consegui identificar um CPF válido. Poderia enviar os 11 dígitos?";
  if (p.tipo === "email" && !/^\S+@\S+\.\S+$/.test(v)) return "Esse e-mail não parece válido. Pode enviar de novo?";
  return null;
}

export async function handleIncomingWhatsApp(payload: {
  phone: string;
  text: string;
  senderName?: string | null;
}): Promise<{ handled: boolean; note?: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const phone = normalizePhone(payload.phone);
  const text = String(payload.text ?? "").trim();
  const senderName = String(payload.senderName ?? "").trim() || null;
  if (!phone || !text) return { handled: false, note: "missing phone or text" };

  const lower = text.toLowerCase();

  // 1) Sessão em andamento?
  const { data: ongoing } = await supabaseAdmin
    .from("enquete_sessoes_whatsapp")
    .select("*")
    .eq("telefone", phone).eq("status", "em_andamento")
    .order("last_msg_at", { ascending: false }).limit(1);
  let sessao = ongoing?.[0];

  // Comando de saída em qualquer momento
  if (sessao && /^(cancelar|sair|parar|stop)$/i.test(lower)) {
    await supabaseAdmin.from("enquete_sessoes_whatsapp")
      .update({ status: "cancelada", ended_at: new Date().toISOString() }).eq("id", sessao.id);
    await sendZapiText(phone, "Tudo bem, encerramos a pesquisa por aqui. Obrigado pelo tempo! 🙏");
    return { handled: true, note: "cancelled" };
  }

  // 2) Sem sessão → tenta iniciar pelo token
  if (!sessao) {
    const token = extractToken(text);
    if (!token) {
      // Se este telefone já concluiu qualquer pesquisa pelo WhatsApp, silêncio total.
      const telNorm = phone.replace(/\D/g, "");
      if (telNorm.length >= 10) {
        const { data: prev } = await supabaseAdmin
          .from("respostas")
          .select("id, telefone")
          .eq("origem", "whatsapp_ia");
        const jaRespondeu = (prev ?? []).some(
          (r: any) => String(r.telefone ?? "").replace(/\D/g, "") === telNorm,
        );
        if (jaRespondeu) {
          return { handled: true, note: "silenced after completion" };
        }
      }
      await sendZapiText(phone, "Olá! 👋 Para participar de uma pesquisa, envie o *código de convite* que você recebeu.");
      return { handled: true, note: "no token" };
    }
    const { data: enq } = await supabaseAdmin
      .from("enquetes")
      .select("id, titulo, descricao, status, coordenador_id, coordenador:coordenadores(nome)")
      .eq("token_convite", token)
      .maybeSingle();
    if (!enq) {
      await sendZapiText(phone, "Não encontrei nenhuma pesquisa com esse código. Confira com quem te enviou o convite.");
      return { handled: true, note: "token not found" };
    }
    if (enq.status !== "ativa") {
      await sendZapiText(phone, "Essa pesquisa não está aceitando respostas no momento. 😕");
      return { handled: true };
    }
    // Bloqueio: 1 telefone = 1 resposta por enquete (canal WhatsApp)
    const telNorm = phone.replace(/\D/g, "");
    const { data: dupRows } = await supabaseAdmin
      .from("respostas")
      .select("id, telefone")
      .eq("enquete_id", enq.id)
      .eq("origem", "whatsapp_ia");
    const jaExiste = (dupRows ?? []).some(
      (r: any) => String(r.telefone ?? "").replace(/\D/g, "") === telNorm && telNorm.length >= 10,
    );
    if (jaExiste) {
      // cancela qualquer sessão em andamento órfã
      await supabaseAdmin
        .from("enquete_sessoes_whatsapp")
        .update({ status: "cancelada", ended_at: new Date().toISOString() })
        .eq("telefone", phone)
        .eq("enquete_id", enq.id)
        .eq("status", "em_andamento");
      await sendZapiText(
        phone,
        "Você já participou desta pesquisa, obrigado! 🙏\nSua resposta anterior foi registrada e não pode ser enviada novamente.",
      );
      return { handled: true, note: "already answered" };
    }
    const perguntas = await loadPerguntas(supabaseAdmin, enq.id);
    if (!perguntas.length) {
      await sendZapiText(phone, "Essa pesquisa ainda não tem perguntas cadastradas.");
      return { handled: true };
    }
    const ins = await supabaseAdmin
      .from("enquete_sessoes_whatsapp")
      .insert({
        enquete_id: enq.id,
        telefone: phone,
        status: "em_andamento",
        pergunta_atual_id: perguntas[0].id,
        passo: 0,
        coordenador_id: enq.coordenador_id,
        dados: { titulo: enq.titulo, nome_whatsapp: senderName },
        respostas: [],
        historico: [],
      })
      .select("*").single();
    sessao = ins.data ?? undefined;
    if (!sessao) {
      await sendZapiText(phone, "Não consegui iniciar a pesquisa agora. Tente novamente em instantes.");
      return { handled: true, note: "session insert failed" };
    }
    const opening = await greetOpening({
      tituloEnquete: enq.titulo,
      descricao: enq.descricao ?? null,
      coordenadorNome: (enq as any).coordenador?.nome ?? null,
      primeiraPergunta: formatarPergunta(perguntas[0]),
    });
    await sendZapiText(phone, opening);
    await supabaseAdmin.from("enquete_sessoes_whatsapp").update({
      last_msg_at: new Date().toISOString(),
      historico: [{ role: "assistente", texto: opening }],
    }).eq("id", sessao.id);
    return { handled: true, note: "started" };
  }

  // 3) Interpreta a resposta com IA
  const perguntas = await loadPerguntas(supabaseAdmin, sessao.enquete_id);
  if (!perguntas.length) {
    await sendZapiText(phone, "Não foi possível carregar a pesquisa. Tente novamente mais tarde.");
    return { handled: true };
  }
  const idx = perguntas.findIndex((p) => p.id === sessao.pergunta_atual_id);
  const currentIdx = idx >= 0 ? idx : 0;
  const pergunta = perguntas[currentIdx];
  const { data: enqMeta } = await supabaseAdmin
    .from("enquetes")
    .select("titulo, mensagem_final")
    .eq("id", sessao.enquete_id).maybeSingle();

  const historico = (Array.isArray(sessao.historico) ? sessao.historico : []) as { role: "assistente" | "eleitor"; texto: string }[];
  historico.push({ role: "eleitor", texto: text });

  let ai = deterministicInterpret(pergunta, text);
  try {
    if (!ai) {
      ai = await interpretReply({
        pergunta,
        reply: text,
        historico,
        tituloEnquete: enqMeta?.titulo ?? "pesquisa",
      });
    }
  } catch (e: any) {
    const msg = reformularPergunta(pergunta);
    await sendZapiText(phone, msg);
    await supabaseAdmin.from("enquete_sessoes_whatsapp").update({
      last_msg_at: new Date().toISOString(),
      historico: [...historico, { role: "assistente", texto: msg }],
    }).eq("id", sessao.id);
    return { handled: true, note: `ai hard fail (reprompt): ${e?.message ?? e}` };
  }

  if (!ai) {
    const msg = reformularPergunta(pergunta);
    await sendZapiText(phone, msg);
    await supabaseAdmin.from("enquete_sessoes_whatsapp").update({
      last_msg_at: new Date().toISOString(),
      historico: [...historico, { role: "assistente", texto: msg }],
    }).eq("id", sessao.id);
    return { handled: true, note: "retry (empty interpretation)" };
  }

  if (ai.acao === "encerrar") {
    await sendZapiText(phone, ai.mensagem_para_usuario || "Tudo bem, encerramos por aqui. Obrigado! 🙏");
    await supabaseAdmin.from("enquete_sessoes_whatsapp").update({
      status: "cancelada",
      ended_at: new Date().toISOString(),
      last_msg_at: new Date().toISOString(),
      historico: [...historico, { role: "assistente", texto: ai.mensagem_para_usuario }],
    }).eq("id", sessao.id);
    return { handled: true, note: "user asked to end" };
  }

  if (ai.acao === "reperguntar") {
    const msg = ai.mensagem_para_usuario || `Deixa eu perguntar de novo: ${pergunta.texto}`;
    await sendZapiText(phone, msg);
    await supabaseAdmin.from("enquete_sessoes_whatsapp").update({
      last_msg_at: new Date().toISOString(),
      historico: [...historico, { role: "assistente", texto: msg }],
    }).eq("id", sessao.id);
    return { handled: true, note: "reask" };
  }

  // acao === "registrar"
  const items = buildItems(pergunta, { opcao_ids: ai.opcao_ids, texto_livre: ai.texto_livre });
  const invalid = validateTyped(pergunta, items);
  const skippedOptional = !items.length && !pergunta.obrigatoria;
  if ((!items.length && !skippedOptional) || invalid) {
    const msg = invalid || reformularPergunta(pergunta);
    await sendZapiText(phone, msg);
    await supabaseAdmin.from("enquete_sessoes_whatsapp").update({
      last_msg_at: new Date().toISOString(),
      historico: [...historico, { role: "assistente", texto: msg }],
    }).eq("id", sessao.id);
    return { handled: true, note: "retry (no items)" };
  }

  const respostasAcum: any[] = Array.isArray(sessao.respostas) ? sessao.respostas : [];
  if (items.length) respostasAcum.push(...items);

  const nextIdx = currentIdx + 1;
  if (nextIdx < perguntas.length) {
    const next = perguntas[nextIdx];
    const ack = ai.mensagem_para_usuario || "Anotado.";
    const compound = `${ack}\n\n${formatarPergunta(next)}`;
    await sendZapiText(phone, compound);
    await supabaseAdmin.from("enquete_sessoes_whatsapp").update({
      respostas: respostasAcum,
      pergunta_atual_id: next.id,
      passo: nextIdx,
      last_msg_at: new Date().toISOString(),
      historico: [...historico, { role: "assistente", texto: compound }],
    }).eq("id", sessao.id);
    return { handled: true };
  }

  // 4) Encerramento — persiste no banco de respostas
  const { data: resp, error: respErr } = await supabaseAdmin
    .from("respostas")
    .insert({
      enquete_id: sessao.enquete_id,
      nome: senderName,
      telefone: phone,
      origem: "whatsapp_ia",
      consentimento_lgpd: true,
      dispositivo: "whatsapp",
      coordenador_id: sessao.coordenador_id ?? null,
    })
    .select("id").single();

  if (respErr || !resp) {
    // Índice único violado = já respondeu (corrida). Trata como sucesso silencioso.
    if (respErr && /duplicate key|unique/i.test(respErr.message ?? "")) {
      await supabaseAdmin.from("enquete_sessoes_whatsapp").update({
        status: "cancelada",
        ended_at: new Date().toISOString(),
      }).eq("id", sessao.id);
      await sendZapiText(
        phone,
        "Você já participou desta pesquisa, obrigado! 🙏\nSua resposta anterior foi registrada.",
      );
      return { handled: true, note: "duplicate on insert" };
    }
    await sendZapiText(phone, "Tivemos um problema ao registrar suas respostas. Tente novamente em instantes.");
    return { handled: true, note: `insert resposta: ${respErr?.message}` };
  }

  const itens = respostasAcum.map((it: any) => ({ ...it, resposta_id: resp.id }));
  if (itens.length) {
    const { error: itErr } = await supabaseAdmin.from("resposta_itens").insert(itens);
    if (itErr) {
      return { handled: true, note: `insert itens: ${itErr.message}` };
    }
  }

  const ack = ai.mensagem_para_usuario || "Perfeito!";
  const bye = enqMeta?.mensagem_final || "Terminamos! Muito obrigado pela sua participação. 🙏";

  await supabaseAdmin.from("enquete_sessoes_whatsapp").update({
    respostas: respostasAcum,
    status: "concluida",
    ended_at: new Date().toISOString(),
    last_msg_at: new Date().toISOString(),
    resposta_id: resp.id,
    historico: [...historico, { role: "assistente", texto: `${ack}\n\n${bye}` }],
  }).eq("id", sessao.id);

  await sendZapiText(phone, `${ack}\n\n${bye}`);
  return { handled: true, note: "done" };
}