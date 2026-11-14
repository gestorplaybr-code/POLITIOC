import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Send, Trash2, AlertTriangle, Zap, Pause, Play, Ban, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useInvalidate, toastError } from "@/lib/use-mutation-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/whatsapp/campanhas")({
  head: () => ({ meta: [{ title: "Campanhas WhatsApp — Política+" }] }),
  component: CampanhasPage,
});

function CampanhasPage() {
  const invalidate = useInvalidate();
  const [open, setOpen] = useState(false);
  const [politicoId, setPoliticoId] = useState("");
  const [nome, setNome] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [mensagem, setMensagem] = useState("");
  const [filtroCidade, setFiltroCidade] = useState("");
  const [filtroBairro, setFiltroBairro] = useState("");

  const politicos = useQuery({
    queryKey: ["politicos-min"],
    queryFn: async () => (await supabase.from("politicos").select("id, nome").order("nome")).data ?? [],
  });

  const templates = useQuery({
    queryKey: ["wa-templates-min", politicoId],
    enabled: !!politicoId,
    queryFn: async () => {
      const { data } = await supabase
        .from("whatsapp_templates")
        .select("id, nome, conteudo")
        .eq("politico_id", politicoId)
        .order("nome");
      return data ?? [];
    },
  });

  const list = useQuery({
    queryKey: ["wa-campanhas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_campanhas")
        .select("id, nome, status, total_alvo, total_enviado, total_falha, created_at, filtro_cidade, filtro_bairro, politico:politicos(nome)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!politicoId || !nome.trim() || !mensagem.trim()) {
        throw new Error("Preencha político, nome e mensagem");
      }

      // Estima alvo a partir do filtro
      let q = supabase
        .from("eleitores")
        .select("id", { count: "exact", head: true })
        .eq("politico_id", politicoId)
        .not("telefone", "is", null);
      if (filtroCidade.trim()) q = q.eq("cidade", filtroCidade.trim());
      if (filtroBairro.trim()) q = q.eq("bairro", filtroBairro.trim());
      const { count } = await q;

      const { error } = await supabase.from("whatsapp_campanhas").insert({
        politico_id: politicoId,
        nome: nome.trim(),
        template_id: templateId || null,
        mensagem: mensagem.trim(),
        filtro_cidade: filtroCidade.trim() || null,
        filtro_bairro: filtroBairro.trim() || null,
        total_alvo: count ?? 0,
        status: "rascunho",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campanha criada");
      setOpen(false);
      setNome(""); setMensagem(""); setTemplateId(""); setFiltroCidade(""); setFiltroBairro("");
      invalidate([["wa-campanhas"]]);
    },
    onError: (e) => toastError(e),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whatsapp_campanhas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removida"); invalidate([["wa-campanhas"]]); },
    onError: (e) => toastError(e),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const patch: any = { status };
      if (status === "concluida") patch.concluida_em = new Date().toISOString();
      if (status === "enviando") patch.iniciada_em = new Date().toISOString();
      const { error } = await supabase.from("whatsapp_campanhas").update(patch).eq("id", id);
      if (error) throw error;
      // Reflete em envios pendentes quando cancelar
      if (status === "cancelada") {
        await supabase
          .from("whatsapp_envios")
          .update({ status: "cancelado" })
          .eq("campanha_id", id)
          .eq("status", "pendente");
      }
    },
    onSuccess: () => { toast.success("Status atualizado"); invalidate([["wa-campanhas"]]); },
    onError: (e) => toastError(e),
  });

  const reenviarNaoResp = useMutation({
    mutationFn: async (c: any) => {
      // Eleitores já contatados na campanha
      const { data: envios } = await supabase
        .from("whatsapp_envios")
        .select("eleitor_id")
        .eq("campanha_id", c.id);
      const idsContatados = new Set((envios ?? []).map((e: any) => e.eleitor_id).filter(Boolean));
      // Eleitores com resposta (qualquer enquete deste político)
      const { data: resp } = await supabase
        .from("respostas")
        .select("eleitor_id, enquete:enquetes!inner(politico_id)")
        .eq("enquete.politico_id", c.politico_id);
      const responderam = new Set((resp ?? []).map((r: any) => r.eleitor_id).filter(Boolean));

      let q = supabase
        .from("eleitores")
        .select("id, nome, telefone, cidade, bairro")
        .eq("politico_id", c.politico_id)
        .not("telefone", "is", null);
      if (c.filtro_cidade) q = q.eq("cidade", c.filtro_cidade);
      if (c.filtro_bairro) q = q.eq("bairro", c.filtro_bairro);
      const { data: eles, error } = await q;
      if (error) throw error;
      const alvo = (eles ?? []).filter((e: any) => idsContatados.has(e.id) && !responderam.has(e.id));
      if (!alvo.length) throw new Error("Nenhum eleitor pendente de resposta");
      const rows = alvo.map((e: any) => ({
        campanha_id: c.id,
        eleitor_id: e.id,
        telefone: e.telefone,
        mensagem: (c.mensagem ?? "")
          .replaceAll("{{nome}}", e.nome ?? "")
          .replaceAll("{{cidade}}", e.cidade ?? "")
          .replaceAll("{{bairro}}", e.bairro ?? ""),
        status: "pendente",
        tentativas: 0,
      }));
      for (let i = 0; i < rows.length; i += 200) {
        const { error: ie } = await supabase.from("whatsapp_envios").insert(rows.slice(i, i + 200));
        if (ie) throw ie;
      }
      return rows.length;
    },
    onSuccess: (n) => { toast.success(`${n} reenvio(s) enfileirado(s)`); invalidate([["wa-campanhas"]]); },
    onError: (e) => toastError(e),
  });

  const simular = useMutation({
    mutationFn: async (c: any) => {
      // Carrega eleitores segmentados
      let q = supabase
        .from("eleitores")
        .select("id, nome, telefone, cidade, bairro")
        .eq("politico_id", c.politico_id ?? c.politicoId)
        .not("telefone", "is", null);
      if (c.filtro_cidade) q = q.eq("cidade", c.filtro_cidade);
      if (c.filtro_bairro) q = q.eq("bairro", c.filtro_bairro);
      const { data: eles, error: ee } = await q;
      if (ee) throw ee;
      if (!eles?.length) throw new Error("Nenhum eleitor com telefone para esta segmentação");

      const rows = eles.map((e: any) => ({
        campanha_id: c.id,
        eleitor_id: e.id,
        telefone: e.telefone,
        mensagem: (c.mensagem ?? "")
          .replaceAll("{{nome}}", e.nome ?? "")
          .replaceAll("{{cidade}}", e.cidade ?? "")
          .replaceAll("{{bairro}}", e.bairro ?? ""),
        status: "enviado",
        enviado_em: new Date().toISOString(),
        tentativas: 1,
      }));
      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await supabase.from("whatsapp_envios").insert(rows.slice(i, i + 200));
        if (error) throw error;
      }
      const { error: ue } = await supabase.from("whatsapp_campanhas").update({
        status: "concluida",
        total_alvo: rows.length,
        total_enviado: rows.length,
      }).eq("id", c.id);
      if (ue) throw ue;
      return rows.length;
    },
    onSuccess: (n) => { toast.success(`Simulação concluída: ${n} mensagem(ns) registrada(s)`); invalidate([["wa-campanhas"]]); },
    onError: (e) => toastError(e),
  });

  // Para simular precisamos do politico_id; recarrega via select extra
  const fullList = useQuery({
    queryKey: ["wa-campanhas-full"],
    queryFn: async () => {
      const { data } = await supabase.from("whatsapp_campanhas")
        .select("id, politico_id, mensagem, filtro_cidade, filtro_bairro");
      return new Map((data ?? []).map((r: any) => [r.id, r]));
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Crie campanhas e segmente sua base. O disparo será habilitado após configurar a Z-API.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Nova campanha</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>Nova campanha</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>Político</Label>
                  <Select value={politicoId} onValueChange={(v) => { setPoliticoId(v); setTemplateId(""); }}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {(politicos.data ?? []).map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nome da campanha</Label>
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} />
                </div>
              </div>

              <div>
                <Label>Usar template (opcional)</Label>
                <Select
                  value={templateId}
                  onValueChange={(v) => {
                    setTemplateId(v);
                    const t = (templates.data ?? []).find((x: any) => x.id === v);
                    if (t) setMensagem(t.conteudo);
                  }}
                  disabled={!politicoId}
                >
                  <SelectTrigger><SelectValue placeholder={politicoId ? "Selecione" : "Escolha o político primeiro"} /></SelectTrigger>
                  <SelectContent>
                    {(templates.data ?? []).map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Mensagem</Label>
                <Textarea rows={5} value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>Filtro: cidade</Label>
                  <Input value={filtroCidade} onChange={(e) => setFiltroCidade(e.target.value)} placeholder="Opcional" />
                </div>
                <div>
                  <Label>Filtro: bairro</Label>
                  <Input value={filtroBairro} onChange={(e) => setFiltroBairro(e.target.value)} placeholder="Opcional" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => create.mutate()} disabled={create.isPending}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Político</TableHead>
              <TableHead>Segmentação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Alvo / Enviado / Falhas</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(list.data?.length ?? 0) === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Nenhuma campanha ainda.
                </TableCell>
              </TableRow>
            ) : (
              (list.data ?? []).map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.politico?.nome}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {[c.filtro_cidade, c.filtro_bairro].filter(Boolean).join(" · ") || "Toda a base"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.status === "concluida" ? "default" : "secondary"}>{c.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="ml-auto w-40">
                      <Progress value={c.total_alvo ? (c.total_enviado / c.total_alvo) * 100 : 0} />
                      <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                        {c.total_enviado}/{c.total_alvo} · {c.total_falha} falhas
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="mr-1"
                      disabled={simular.isPending || c.status === "concluida"}
                      onClick={() => {
                        const full = fullList.data?.get(c.id);
                        if (!full) return toast.error("Carregando dados...");
                        if (!confirm("Simular o envio para todos os eleitores segmentados? Nenhuma mensagem real será enviada.")) return;
                        simular.mutate({ ...full, id: c.id });
                      }}
                      title="Registra os envios como enviados sem chamar a Z-API"
                    >
                      <Zap className="mr-1 h-3 w-3" /> Simular
                    </Button>
                    {c.status === "enviando" && (
                      <Button variant="outline" size="sm" className="mr-1"
                        onClick={() => setStatus.mutate({ id: c.id, status: "pausada" })}>
                        <Pause className="mr-1 h-3 w-3" /> Pausar
                      </Button>
                    )}
                    {c.status === "pausada" && (
                      <Button variant="outline" size="sm" className="mr-1"
                        onClick={() => setStatus.mutate({ id: c.id, status: "enviando" })}>
                        <Play className="mr-1 h-3 w-3" /> Retomar
                      </Button>
                    )}
                    {(c.status === "enviando" || c.status === "pausada" || c.status === "rascunho") && (
                      <Button variant="outline" size="sm" className="mr-1"
                        onClick={() => {
                          if (!confirm("Cancelar campanha e marcar envios pendentes como cancelados?")) return;
                          setStatus.mutate({ id: c.id, status: "cancelada" });
                        }}>
                        <Ban className="mr-1 h-3 w-3" /> Cancelar
                      </Button>
                    )}
                    {c.status === "concluida" && (
                      <Button variant="outline" size="sm" className="mr-1"
                        disabled={reenviarNaoResp.isPending}
                        onClick={() => {
                          const full = fullList.data?.get(c.id);
                          if (!full) return toast.error("Carregando dados...");
                          if (!confirm("Reenviar para quem ainda não respondeu?")) return;
                          reenviarNaoResp.mutate({ ...full, id: c.id });
                        }}>
                        <RefreshCw className="mr-1 h-3 w-3" /> Não respondentes
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      title="Disparo será habilitado após configurar a Z-API"
                    >
                      <Send className="mr-1 h-3 w-3" /> Enviar
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => del.mutate(c.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-amber-200/40 bg-amber-50/40 p-3 text-xs dark:bg-amber-950/20">
        <AlertTriangle className="mt-0.5 h-3 w-3 text-amber-600" />
        <span className="text-amber-900 dark:text-amber-200">
          O botão "Enviar" será habilitado quando a integração Z-API estiver ativa.
        </span>
      </div>
    </div>
  );
}