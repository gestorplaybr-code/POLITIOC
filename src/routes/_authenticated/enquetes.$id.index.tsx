import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useIsMutating } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Copy, ExternalLink, BarChart3, Copy as CopyIcon, ArrowUp, ArrowDown, Pencil, X, Lightbulb, Send, Radio, AlertTriangle, Circle, CheckSquare, ToggleLeft, Users, Save, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useInvalidate, toastError } from "@/lib/use-mutation-toast";
import { PageHeader } from "@/components/page-header";
import { DisparoEnqueteDialog } from "@/components/disparo-enquete-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { QrCode } from "@/components/qr-code";
import { QUESTION_TYPES, TIPOS_COM_OPCOES, questionTypeLabel, questionTypeHint } from "@/lib/format";
import { EnqueteTemplatesPicker } from "@/components/enquete-templates-picker";
import { IphonePreview } from "@/components/iphone-preview";
import { CoordenadorWizard } from "@/components/wizards/coordenador-wizard";
import { getZapiBotNumber } from "@/lib/zapi.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/enquetes/$id/")({
  head: () => ({ meta: [{ title: "Editar enquete — Política+" }] }),
  component: EnqueteEditor,
  errorComponent: ({ error, reset }) => (
    <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-6">
      <h2 className="text-lg font-semibold text-destructive">Não foi possível abrir a enquete</h2>
      <p className="text-sm text-muted-foreground">{(error as any)?.message ?? "Erro desconhecido."}</p>
      <div className="flex gap-2">
        <Link to="/enquetes"><Button variant="outline" size="sm"><ArrowLeft className="mr-1 h-4 w-4" />Voltar</Button></Link>
        <Button size="sm" onClick={() => reset()}>Tentar novamente</Button>
      </div>
    </div>
  ),
});

function EnqueteEditor() {
  const { id } = Route.useParams();
  const invalidate = useInvalidate();
  const navigate = useNavigate();
  const [novoCoord, setNovoCoord] = useState(false);
  const [coordDialog, setCoordDialog] = useState(false);

  const enquete = useQuery({
    queryKey: ["enquete", id],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enquetes")
        .select("id, titulo, descricao, slug, status, politico_id, coordenador_id, token_convite, data_inicio, data_fim, mostrar_politico")
        .eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const zapiBot = useQuery({
    queryKey: ["zapi-bot-number"],
    staleTime: 5 * 60_000,
    queryFn: () => getZapiBotNumber(),
  });

  const coordenadores = useQuery({
    queryKey: ["coordenadores-do-politico", enquete.data?.politico_id],
    enabled: !!enquete.data?.politico_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coordenadores")
        .select("id, nome")
        .eq("politico_id", enquete.data!.politico_id!)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const politico = useQuery({
    queryKey: ["enquete-politico", enquete.data?.politico_id],
    enabled: !!enquete.data?.politico_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("politicos")
        .select("nome, whatsapp")
        .eq("id", enquete.data!.politico_id!)
        .maybeSingle();
      return data;
    },
  });

  const perguntas = useQuery({
    queryKey: ["perguntas", id],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enquete_perguntas")
        .select("id, texto, tipo, ordem, obrigatoria, permitir_outro, opcoes:enquete_opcoes(id, texto, ordem)")
        .eq("enquete_id", id)
        .order("ordem");
      if (error) throw error;
      return data;
    },
  });

  const respostas = useQuery({
    queryKey: ["respostas", id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("respostas")
        .select("id", { count: "exact", head: true })
        .eq("enquete_id", id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      // Validação: para ativar precisa de pelo menos 1 pergunta e opções suficientes
      if (status === "ativa") {
        const lst = perguntas.data ?? [];
        if (lst.length === 0) throw new Error("Adicione ao menos uma pergunta antes de ativar.");
        for (const p of lst as any[]) {
          if (TIPOS_COM_OPCOES.has(p.tipo) && (p.opcoes?.length ?? 0) < 2) {
            throw new Error(`A pergunta "${p.texto}" precisa de ao menos 2 opções para ser ativada.`);
          }
        }
      }
      const { error } = await supabase.from("enquetes").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status atualizado"); invalidate([["enquete", id]]); },
    onError: (e) => toastError(e),
  });

  const duplicar = useMutation({
    mutationFn: async () => {
      const src = enquete.data!;
      const { data: created, error: ce } = await supabase.from("enquetes").insert({
        titulo: `${src.titulo} (cópia)`,
        descricao: (src as any).descricao ?? null,
        status: "rascunho",
        politico_id: (src as any).politico_id,
      } as any).select("id").single();
      if (ce) throw ce;
      const perg = perguntas.data ?? [];
      for (const p of perg) {
        const { data: np, error: pe } = await supabase.from("enquete_perguntas").insert({
          enquete_id: created.id, texto: p.texto, tipo: p.tipo, ordem: p.ordem, obrigatoria: (p as any).obrigatoria ?? false,
        }).select("id").single();
        if (pe) throw pe;
        const opcoes = (p as any).opcoes ?? [];
        if (opcoes.length) {
          const { error: oe } = await supabase.from("enquete_opcoes").insert(
            opcoes.map((o: any) => ({ pergunta_id: np.id, texto: o.texto, ordem: o.ordem }))
          );
          if (oe) throw oe;
        }
      }
      return created.id as string;
    },
    onSuccess: (newId) => {
      toast.success("Enquete duplicada");
      navigate({ to: "/enquetes/$id", params: { id: newId } });
    },
    onError: (e) => toastError(e),
  });

  const addPergunta = useMutation({
    mutationFn: async (input: { texto: string; tipo: string }) => {
      const ordem = (perguntas.data?.length ?? 0);
      const { error } = await supabase
        .from("enquete_perguntas")
        .insert({ enquete_id: id, texto: input.texto, tipo: input.tipo, ordem });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Pergunta adicionada"); invalidate([["perguntas", id]]); },
    onError: (e) => toastError(e),
  });

  const delPergunta = useMutation({
    mutationFn: async (pid: string) => {
      const { error } = await supabase.from("enquete_perguntas").delete().eq("id", pid);
      if (error) throw error;
    },
    onSuccess: () => invalidate([["perguntas", id]]),
    onError: (e) => toastError(e),
  });

  const addOpcao = useMutation({
    mutationFn: async ({ pergunta_id, texto, ordem }: { pergunta_id: string; texto: string; ordem: number }) => {
      const { error } = await supabase.from("enquete_opcoes").insert({ pergunta_id, texto, ordem });
      if (error) throw error;
    },
    onSuccess: () => invalidate([["perguntas", id]]),
    onError: (e) => toastError(e),
  });

  const delOpcao = useMutation({
    mutationFn: async (oid: string) => {
      const { error } = await supabase.from("enquete_opcoes").delete().eq("id", oid);
      if (error) throw error;
    },
    onSuccess: () => invalidate([["perguntas", id]]),
    onError: (e) => toastError(e),
  });

  const updatePergunta = useMutation({
    mutationFn: async ({ pid, patch }: { pid: string; patch: any }) => {
      const { error } = await supabase.from("enquete_perguntas").update(patch).eq("id", pid);
      if (error) throw error;
    },
    onSuccess: () => invalidate([["perguntas", id]]),
    onError: (e) => toastError(e),
  });

  const movePergunta = useMutation({
    mutationFn: async ({ idx, dir }: { idx: number; dir: -1 | 1 }) => {
      const list = perguntas.data ?? [];
      const j = idx + dir;
      if (j < 0 || j >= list.length) return;
      const a: any = list[idx], b: any = list[j];
      await Promise.all([
        supabase.from("enquete_perguntas").update({ ordem: b.ordem }).eq("id", a.id),
        supabase.from("enquete_perguntas").update({ ordem: a.ordem }).eq("id", b.id),
      ]);
    },
    onSuccess: () => invalidate([["perguntas", id]]),
    onError: (e) => toastError(e),
  });

  const moveOpcao = useMutation({
    mutationFn: async ({ pergunta_id, idx, dir }: { pergunta_id: string; idx: number; dir: -1 | 1 }) => {
      const p: any = (perguntas.data ?? []).find((x: any) => x.id === pergunta_id);
      const list = (p?.opcoes ?? []).slice().sort((a: any, b: any) => a.ordem - b.ordem);
      const j = idx + dir;
      if (j < 0 || j >= list.length) return;
      const a: any = list[idx], b: any = list[j];
      await Promise.all([
        supabase.from("enquete_opcoes").update({ ordem: b.ordem }).eq("id", a.id),
        supabase.from("enquete_opcoes").update({ ordem: a.ordem }).eq("id", b.id),
      ]);
    },
    onSuccess: () => invalidate([["perguntas", id]]),
    onError: (e) => toastError(e),
  });

  const updateDatas = useMutation({
    mutationFn: async (p: { data_inicio: string | null; data_fim: string | null }) => {
      const { error } = await supabase.from("enquetes").update(p).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Período atualizado"); invalidate([["enquete", id]]); },
    onError: (e) => toastError(e),
  });

  const updateMostrarPolitico = useMutation({
    mutationFn: async (v: boolean) => {
      const { error } = await supabase.from("enquetes").update({ mostrar_politico: v }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate([["enquete", id]]); },
    onError: (e) => toastError(e),
  });

  const updateCoordenador = useMutation({
    mutationFn: async (cid: string | null) => {
      const { error } = await supabase.from("enquetes").update({ coordenador_id: cid }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Coordenador atualizado"); invalidate([["enquete", id]]); },
    onError: (e) => toastError(e),
  });

  const [novoTexto, setNovoTexto] = useState("");
  const [novoTipo, setNovoTipo] = useState("unica");
  const [dataInicio, setDataInicio] = useState<string>((enquete.data as any)?.data_inicio?.slice(0, 16) ?? "");
  const [dataFim, setDataFim] = useState<string>((enquete.data as any)?.data_fim?.slice(0, 16) ?? "");
  const [disparoOpen, setDisparoOpen] = useState(false);

  if (enquete.isLoading) return <div className="p-6 text-muted-foreground">Carregando enquete...</div>;
  if (enquete.isError) {
    return (
      <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-6">
        <h2 className="text-lg font-semibold text-destructive">Erro ao carregar a enquete</h2>
        <p className="text-sm text-muted-foreground">{(enquete.error as any)?.message}</p>
        <Link to="/enquetes"><Button variant="outline" size="sm"><ArrowLeft className="mr-1 h-4 w-4" />Voltar para a lista</Button></Link>
      </div>
    );
  }
  if (!enquete.data) {
    return (
      <div className="space-y-3 rounded-lg border border-dashed p-8 text-center">
        <h2 className="text-lg font-semibold">Enquete não encontrada</h2>
        <p className="text-sm text-muted-foreground">Ela pode ter sido removida ou você não tem permissão para acessá-la.</p>
        <Link to="/enquetes"><Button variant="outline" size="sm"><ArrowLeft className="mr-1 h-4 w-4" />Voltar para a lista</Button></Link>
      </div>
    );
  }

  const e = enquete.data;
  const conviteUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/c/${(e as any).token_convite ?? ""}`;

  function copy() { navigator.clipboard.writeText(conviteUrl); toast.success("Link copiado"); }

  function handleSaveAll() {
    // Flush período se estiver alterado
    const dbInicio = (e as any).data_inicio?.slice(0, 16) ?? "";
    const dbFim = (e as any).data_fim?.slice(0, 16) ?? "";
    if (dataInicio !== dbInicio || dataFim !== dbFim) {
      if (dataInicio && dataFim && new Date(dataFim) <= new Date(dataInicio)) {
        return toast.error("Data fim deve ser maior que data início");
      }
      updateDatas.mutate({ data_inicio: dataInicio || null, data_fim: dataFim || null });
    } else {
      toast.success("Tudo salvo — a enquete é salva automaticamente a cada alteração.");
    }
  }

  return (
    <div className="space-y-6">
      <Link to="/enquetes" className="inline-flex items-center text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="mr-1 h-4 w-4" />Voltar
      </Link>

      <details className="rounded-lg border bg-card p-3 lg:hidden">
        <summary className="cursor-pointer text-sm font-medium">Ver prévia no celular</summary>
        <div className="mt-3 flex justify-center">
          <IphonePreview
            titulo={e.titulo}
            descricao={(e as any).descricao}
            politicoNome={politico.data?.nome}
            status={e.status}
            perguntas={(perguntas.data as any) ?? []}
            mostrarPolitico={(e as any).mostrar_politico}
            coordenadorNome={(coordenadores.data ?? []).find((c: any) => c.id === (e as any).coordenador_id)?.nome ?? null}
          />
        </div>
      </details>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
      <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card/95 px-4 py-2.5 shadow-sm backdrop-blur">
        <SaveIndicator />
        <Button size="sm" onClick={handleSaveAll} className="gap-1.5">
          <Save className="h-4 w-4" /> Salvar alterações
        </Button>
      </div>
      <PageHeader
        title={e.titulo}
        description={`${politico.data?.nome ?? ""} · ${respostas.data ?? 0} resposta(s)`}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/enquetes/$id/resultados" params={{ id }}>
                <BarChart3 className="mr-2 h-4 w-4" /> Resultados
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/enquetes/$id/leads" params={{ id }}>
                <Users className="mr-2 h-4 w-4" /> Leads
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="relative">
              <Link to="/enquetes/$id/ao-vivo" params={{ id }}>
                <span className="absolute -right-1 -top-1 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
                </span>
                <Radio className="mr-2 h-4 w-4 text-rose-500" /> Ao vivo
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDisparoOpen(true)}
              disabled={e.status !== "ativa"}
              title={e.status !== "ativa" ? "Ative a enquete primeiro" : "Enviar para participantes"}
            >
              <Send className="mr-2 h-4 w-4" /> Enviar
            </Button>
            <Button variant="outline" size="sm" onClick={() => duplicar.mutate()} disabled={duplicar.isPending}>
              <CopyIcon className="mr-2 h-4 w-4" /> {duplicar.isPending ? "Duplicando..." : "Duplicar"}
            </Button>
            <Select value={e.status} onValueChange={(v) => {
              if (v === "encerrada" && !confirm("Encerrar a enquete? O link público deixa de aceitar respostas. Você pode reativar depois.")) return;
              if (v === "ativa" && !(e as any).coordenador_id) {
                setCoordDialog(true);
                return;
              }
              updateStatus.mutate(v);
            }}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="ativa" disabled={!(e as any).coordenador_id}>
                  Ativa {!(e as any).coordenador_id ? "(defina o coordenador)" : ""}
                </SelectItem>
                <SelectItem value="encerrada">Encerrada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div id="coordenador-card" className={`rounded-lg border bg-card p-4 ${!(e as any).coordenador_id ? "border-amber-500/60 bg-amber-500/5" : ""}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Label className="text-sm font-medium">
              Coordenador responsável {!(e as any).coordenador_id && <span className="text-amber-600 dark:text-amber-400">(obrigatório para ativar)</span>}
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Toda enquete pertence a UM coordenador — e só a coordenadores <strong>deste político</strong>. Ele recebe o link de convite e encaminha nos grupos de WhatsApp dele. Cada resposta é registrada no nome dele (e do político) automaticamente. O coordenador não precisa acessar o sistema.
            </p>
            {!(e as any).politico_id && (
              <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
                Antes de criar/escolher um coordenador, defina o político desta enquete.
              </p>
            )}
          </div>
          <div className="w-72 space-y-2">
            <Select
              value={(e as any).coordenador_id ?? "__none__"}
              onValueChange={(v) => updateCoordenador.mutate(v === "__none__" ? null : v)}
              disabled={!(e as any).politico_id}
            >
              <SelectTrigger><SelectValue placeholder="Escolha o coordenador" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— sem coordenador —</SelectItem>
                {(coordenadores.data ?? []).map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setNovoCoord(true)}
              disabled={!(e as any).politico_id}
              title={!(e as any).politico_id ? "Escolha o político desta enquete primeiro" : "Criar novo coordenador"}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Criar novo coordenador
            </Button>
            {(coordenadores.data ?? []).length === 0 && (e as any).politico_id && (
              <p className="text-[11px] text-muted-foreground">
                Nenhum coordenador cadastrado para este político. Crie acima ou em <Link to="/coordenadores" className="underline">Coordenadores</Link>.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs text-muted-foreground">Link de convite</Label>
          {(() => {
            const cid = (e as any).coordenador_id;
            const cnome = (coordenadores.data ?? []).find((c: any) => c.id === cid)?.nome;
            return cnome ? (
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                Exclusivo de {cnome}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("coordenador-card");
                  el?.scrollIntoView({ behavior: "smooth", block: "center" });
                  setCoordDialog(true);
                }}
                className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-600 hover:bg-amber-500/25 dark:text-amber-400"
              >
                Definir coordenador
              </button>
            );
          })()}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <Input readOnly value={conviteUrl} />
          <Button variant="outline" size="sm" onClick={copy}><Copy className="h-4 w-4" /></Button>
          <a href={conviteUrl} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm"><ExternalLink className="h-4 w-4" /></Button>
          </a>
          {e.status === "ativa" && (
            <Link to="/enquetes/$id/ao-vivo" params={{ id }}>
              <Button variant="outline" size="sm" title="Acompanhar respostas ao vivo"><Radio className="h-4 w-4" /></Button>
            </Link>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Este é o link que o <strong>coordenador</strong> compartilha com seus liderados. Quem abrir é levado pro WhatsApp e a <strong>IA</strong> conduz a pesquisa em conversa, uma pergunta por vez. {e.status !== "ativa" && "Ative a enquete para começar a receber respostas."}
        </p>
        <ol className="mt-3 space-y-1 rounded-md bg-muted/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
          <li><strong className="text-foreground">1.</strong> Você (político) escolhe o coordenador e ativa a enquete.</li>
          <li><strong className="text-foreground">2.</strong> Copia o link acima e envia manualmente para esse coordenador (WhatsApp direto).</li>
          <li><strong className="text-foreground">3.</strong> O coordenador repassa o link nos grupos dele.</li>
          <li><strong className="text-foreground">4.</strong> O eleitor clica → abre o WhatsApp do bot → a IA conduz a conversa, pergunta por pergunta.</li>
          <li><strong className="text-foreground">5.</strong> As respostas ficam salvas nesta enquete, atribuídas a este coordenador — acompanhe em <Link to="/enquetes/$id/ao-vivo" params={{ id }} className="underline">Ao vivo</Link>.</li>
        </ol>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <Label className="text-sm font-medium">Número do WhatsApp do bot</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Todo eleitor é direcionado automaticamente para o número conectado à integração Z-API. Não há escolha por enquete — a conversa acontece sempre neste número:
        </p>
        <div className="mt-2 flex items-center gap-2 text-sm">
          {zapiBot.isLoading ? (
            <span className="text-muted-foreground">Verificando integração...</span>
          ) : zapiBot.data?.phone ? (
            <>
              <span className="font-mono text-foreground">+{zapiBot.data.phone}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${zapiBot.data.connected ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"}`}>
                {zapiBot.data.connected ? "Conectado" : "Verificar conexão"}
              </span>
            </>
          ) : (
            <span className="text-amber-600">Z-API desconectada — configure a integração em WhatsApp.</span>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <Label className="text-xs text-muted-foreground">Período de coleta (opcional)</Label>
        <div className="mt-1 grid gap-3 sm:grid-cols-[1fr,1fr,auto]">
          <Input type="datetime-local" value={dataInicio} onChange={(ev) => setDataInicio(ev.target.value)} aria-label="Data e hora de início" />
          <Input type="datetime-local" value={dataFim} onChange={(ev) => setDataFim(ev.target.value)} aria-label="Data e hora de fim" />
          <Button variant="outline" size="sm" onClick={() => {
            if (dataInicio && dataFim && new Date(dataFim) <= new Date(dataInicio)) return toast.error("Data fim deve ser maior que data início");
            updateDatas.mutate({ data_inicio: dataInicio || null, data_fim: dataFim || null });
          }}>Salvar período</Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Label className="text-sm font-medium">Mostrar nome do político na enquete pública</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Desligado: a enquete aparece sem identificar o político — ideal para pesquisas de intenção de voto.
            </p>
            {politico.data?.nome && (
              <p className="mt-1 text-xs text-muted-foreground">
                Quando ligado, exibe: <strong className="text-foreground">{politico.data.nome}</strong>
              </p>
            )}
          </div>
          <Switch
            checked={!!(e as any).mostrar_politico}
            onCheckedChange={(v) => updateMostrarPolitico.mutate(v)}
            aria-label="Mostrar nome do político"
          />
        </div>
      </div>

      <div className="flex justify-start">
        <QrCode value={conviteUrl} filename={`convite-${(e as any).token_convite ?? "enquete"}.png`} />
      </div>

      <div className="rounded-lg border bg-card p-5">
        <h2 className="font-semibold">Adicionar pergunta</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Escreva a pergunta e escolha o tipo de resposta. Você pode editar tudo depois.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr,180px,auto]">
          <Input placeholder="Texto da pergunta" value={novoTexto} onChange={(ev) => setNovoTexto(ev.target.value)} />
          <Select value={novoTipo} onValueChange={setNovoTipo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {QUESTION_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => {
              if (!novoTexto.trim()) return toast.error("Informe o texto da pergunta");
              addPergunta.mutate({ texto: novoTexto.trim(), tipo: novoTipo });
              setNovoTexto("");
            }}
          >
            <Plus className="mr-2 h-4 w-4" />Adicionar
          </Button>
        </div>
        {questionTypeHint(novoTipo) && (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
            <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            {questionTypeHint(novoTipo)}
          </p>
        )}
      </div>

      <EnqueteTemplatesPicker
        enqueteId={id}
        baseOrdem={perguntas.data?.length ?? 0}
        hasExisting={(perguntas.data?.length ?? 0) > 0}
        onApplied={() => invalidate([["perguntas", id]])}
      />

      <div className="space-y-4">
        {perguntas.data?.map((p: any, idx: number) => (
          <PerguntaCard
            key={p.id}
            index={idx}
            total={perguntas.data!.length}
            pergunta={p}
            onDelete={() => delPergunta.mutate(p.id)}
            onAddOpcao={(texto) => addOpcao.mutate({ pergunta_id: p.id, texto, ordem: p.opcoes?.length ?? 0 })}
            onDelOpcao={(oid) => delOpcao.mutate(oid)}
            onMoveOpcao={(oIdx, dir) => moveOpcao.mutate({ pergunta_id: p.id, idx: oIdx, dir })}
            onMove={(dir) => movePergunta.mutate({ idx, dir })}
            onToggleObrigatoria={(v) => updatePergunta.mutate({ pid: p.id, patch: { obrigatoria: v } })}
            onTogglePermitirOutro={(v) => updatePergunta.mutate({ pid: p.id, patch: { permitir_outro: v } })}
            onUpdateTexto={(texto) => updatePergunta.mutate({ pid: p.id, patch: { texto } })}
            onUpdateTipo={(tipo) => {
              const prevTipo = p.tipo;
              const nOpc = (p.opcoes?.length ?? 0);
              updatePergunta.mutate(
                { pid: p.id, patch: { tipo } },
                {
                  onSuccess: () => {
                    const both = new Set(["unica", "multipla"]);
                    if (both.has(prevTipo) && both.has(tipo) && nOpc > 0) {
                      toast.success(`Tipo alterado. ${nOpc} ${nOpc === 1 ? "opção mantida" : "opções mantidas"}.`);
                    } else {
                      toast.success("Tipo de resposta atualizado");
                    }
                  },
                }
              );
            }}
          />
        ))}
        {!perguntas.isLoading && (perguntas.data?.length ?? 0) === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Nenhuma pergunta ainda</p>
            <p className="mt-1">Escolha um <strong>modelo pronto</strong> acima ou adicione perguntas manualmente.</p>
            <p className="mt-3 text-xs">Depois de adicionar as perguntas, mude o status para <strong>Ativa</strong> para liberar o link público.</p>
          </div>
        )}
      </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-4">
            <IphonePreview
              titulo={e.titulo}
              descricao={(e as any).descricao}
              politicoNome={politico.data?.nome}
              status={e.status}
              perguntas={(perguntas.data as any) ?? []}
              mostrarPolitico={(e as any).mostrar_politico}
              coordenadorNome={(coordenadores.data ?? []).find((c: any) => c.id === (e as any).coordenador_id)?.nome ?? null}
            />
          </div>
        </aside>
      </div>
      <DisparoEnqueteDialog
        enquete={{ id: e.id, titulo: e.titulo, slug: e.slug, token_convite: (e as any).token_convite, politico_id: (e as any).politico_id, politico: { nome: politico.data?.nome } }}
        open={disparoOpen}
        onOpenChange={setDisparoOpen}
      />
      <CoordenadorWizard
        open={novoCoord}
        onOpenChange={setNovoCoord}
        lockedPoliticoId={(e as any).politico_id}
        onCreated={(c) => { updateCoordenador.mutate(c.id); invalidate([["coordenadores-do-politico", (e as any).politico_id]]); }}
      />
      <Dialog open={coordDialog} onOpenChange={setCoordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escolha o coordenador para ativar</DialogTitle>
            <DialogDescription>
              Toda enquete precisa de um coordenador responsável antes de ficar ativa. Escolha um coordenador deste político ou crie um novo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select
              value={(e as any).coordenador_id ?? "__none__"}
              onValueChange={(v) => updateCoordenador.mutate(v === "__none__" ? null : v)}
              disabled={!(e as any).politico_id}
            >
              <SelectTrigger><SelectValue placeholder="Escolha o coordenador" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— sem coordenador —</SelectItem>
                {(coordenadores.data ?? []).map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => { setCoordDialog(false); setNovoCoord(true); }}
              disabled={!(e as any).politico_id}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Criar novo coordenador
            </Button>
            {!(e as any).politico_id && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                Esta enquete ainda não tem político definido. Defina o político antes de escolher o coordenador.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCoordDialog(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!(e as any).coordenador_id) { toast.error("Escolha ou crie um coordenador."); return; }
                setCoordDialog(false);
                updateStatus.mutate("ativa");
              }}
              disabled={!(e as any).coordenador_id}
            >
              Ativar enquete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PerguntaCard({
  index, total, pergunta, onDelete, onAddOpcao, onDelOpcao, onMoveOpcao, onMove, onToggleObrigatoria, onTogglePermitirOutro, onUpdateTexto, onUpdateTipo,
}: {
  index: number;
  total: number;
  pergunta: any;
  onDelete: () => void;
  onAddOpcao: (texto: string) => void;
  onDelOpcao: (id: string) => void;
  onMoveOpcao: (idx: number, dir: -1 | 1) => void;
  onMove: (dir: -1 | 1) => void;
  onToggleObrigatoria: (v: boolean) => void;
  onTogglePermitirOutro: (v: boolean) => void;
  onUpdateTexto: (texto: string) => void;
  onUpdateTipo: (tipo: string) => void;
}) {
  const [opcao, setOpcao] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(pergunta.texto as string);
  const tipoLabel = questionTypeLabel(pergunta.tipo);
  const temOpcoes = TIPOS_COM_OPCOES.has(pergunta.tipo);

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground">Pergunta {index + 1}</div>
          {editing ? (
            <div className="mt-1 space-y-2">
              <Input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" && draft.trim()) { onUpdateTexto(draft.trim()); setEditing(false); }
                  if (ev.key === "Escape") { setDraft(pergunta.texto); setEditing(false); }
                }}
              />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => { if (draft.trim()) { onUpdateTexto(draft.trim()); setEditing(false); toast.success("Pergunta salva"); } }} disabled={!draft.trim() || draft === pergunta.texto}>
                  <Save className="mr-1.5 h-3.5 w-3.5" /> Salvar pergunta
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setDraft(pergunta.texto); setEditing(false); }}>
                  <X className="mr-1.5 h-3.5 w-3.5" /> Cancelar
                </Button>
                {draft !== pergunta.texto && draft.trim() && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400">alterações não salvas</span>
                )}
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setEditing(true)} className="group mt-1 flex items-start gap-2 text-left">
              <h3 className="font-medium">{pergunta.texto}</h3>
              <Pencil className="mt-1 h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
            </button>
          )}
          <div className="mt-2 flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Tipo de resposta:</Label>
            <Select value={pergunta.tipo} onValueChange={onUpdateTipo}>
              <SelectTrigger className="h-7 w-[260px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {QUESTION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {questionTypeHint(pergunta.tipo) && (
            <p className="mt-1 text-xs text-muted-foreground">{questionTypeHint(pergunta.tipo)}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" disabled={index === total - 1} onClick={() => onMove(1)}><ArrowDown className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <Switch checked={!!pergunta.obrigatoria} onCheckedChange={onToggleObrigatoria} />
          Obrigatória
        </label>
        {temOpcoes && (
          <label className="flex items-center gap-2">
            <Switch checked={!!pergunta.permitir_outro} onCheckedChange={onTogglePermitirOutro} />
            Permitir "Outro"
          </label>
        )}
      </div>

      {temOpcoes && (
        <div className="mt-4 space-y-2">
          {(pergunta.opcoes?.length ?? 0) < 2 && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-900 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Adicione ao menos <strong>2 opções</strong> para esta pergunta funcionar.</span>
            </div>
          )}
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Como o eleitor vai ver
            </div>
            <div className="space-y-1.5">
              {(pergunta.opcoes ?? []).slice().sort((a: any, b: any) => a.ordem - b.ordem).slice(0, 3).map((o: any) => (
                <div key={o.id} className="flex items-center gap-2 text-sm">
                  {pergunta.tipo === "unica" ? (
                    <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className="text-foreground/80">{o.texto}</span>
                </div>
              ))}
              {(pergunta.opcoes?.length ?? 0) > 3 && (
                <div className="pl-5 text-xs text-muted-foreground">+ {pergunta.opcoes.length - 3} outras</div>
              )}
              {(pergunta.opcoes?.length ?? 0) === 0 && (
                <div className="text-xs italic text-muted-foreground">Nenhuma opção ainda</div>
              )}
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              {pergunta.tipo === "unica"
                ? "🔘 O eleitor marca APENAS UMA opção."
                : "☑ O eleitor pode marcar VÁRIAS opções."}
            </div>
          </div>
          {(() => {
            const ordered = (pergunta.opcoes ?? []).slice().sort((a: any, b: any) => a.ordem - b.ordem);
            return ordered.map((o: any, oIdx: number) => (
              <div key={o.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <span className="text-sm">
                  <span className="mr-2 text-xs text-muted-foreground">{oIdx + 1}.</span>
                  {o.texto}
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" disabled={oIdx === 0} onClick={() => onMoveOpcao(oIdx, -1)} title="Mover para cima">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" disabled={oIdx === ordered.length - 1} onClick={() => onMoveOpcao(oIdx, 1)} title="Mover para baixo">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelOpcao(o.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ));
          })()}
          <div className="flex gap-2">
            <Input placeholder="Nova opção" value={opcao} onChange={(e) => setOpcao(e.target.value)} />
            <Button
              variant="outline"
              onClick={() => { if (!opcao.trim()) return; onAddOpcao(opcao.trim()); setOpcao(""); }}
            >
              <Plus className="mr-1 h-4 w-4" />Opção
            </Button>
          </div>
        </div>
      )}

      {!temOpcoes && (
        <div className="mt-3 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
          {pergunta.tipo === "simnao" ? (
            <div className="flex items-center gap-2">
              <ToggleLeft className="h-4 w-4" />
              <span>Tipo <strong>Sim ou Não</strong> — apenas 2 botões fixos. Não usa lista de opções.</span>
            </div>
          ) : (
            <>Tipo <strong>{tipoLabel}</strong> — o eleitor preencherá o campo correspondente na página pública.</>
          )}
        </div>
      )}
    </div>
  );
}

function SaveIndicator() {
  const pending = useIsMutating();
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (pending === 0) setLastSaved((prev) => prev ?? Date.now());
    else setLastSaved(Date.now);
  }, [pending]);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 15_000);
    return () => clearInterval(t);
  }, []);
  void tick;
  if (pending > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
      </span>
    );
  }
  const rel = lastSaved ? relTime(lastSaved) : "agora";
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
      <CheckCircle2 className="h-4 w-4" /> Tudo salvo {rel}
    </span>
  );
}

function relTime(ts: number) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 5) return "agora";
  if (s < 60) return `há ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  return `há ${h}h`;
}