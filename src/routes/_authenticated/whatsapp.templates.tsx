import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useInvalidate, toastError } from "@/lib/use-mutation-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ExportButtons } from "@/components/export-buttons";
import { applyTextSearch } from "@/components/data-toolbar";

export const Route = createFileRoute("/_authenticated/whatsapp/templates")({
  head: () => ({ meta: [{ title: "Templates WhatsApp — Política+" }] }),
  component: TemplatesPage,
});

function TemplatesPage() {
  const invalidate = useInvalidate();
  const [open, setOpen] = useState(false);
  const [politicoId, setPoliticoId] = useState("");
  const [nome, setNome] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [search, setSearch] = useState("");
  const [fPolitico, setFPolitico] = useState("all");

  const politicos = useQuery({
    queryKey: ["politicos-min"],
    queryFn: async () => (await supabase.from("politicos").select("id, nome").order("nome")).data ?? [],
  });

  const list = useQuery({
    queryKey: ["wa-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_templates")
        .select("id, nome, conteudo, descricao, created_at, politico:politicos(nome)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const rows: any[] = list.data ?? [];
  const polNames = Array.from(new Set(rows.map((r) => r.politico?.nome).filter(Boolean))) as string[];
  let filtered = applyTextSearch(rows, search, ["nome" as any, "conteudo" as any, "descricao" as any]);
  if (fPolitico !== "all") filtered = filtered.filter((r) => r.politico?.nome === fPolitico);
  const exportRows = filtered.map((t: any) => ({
    Nome: t.nome, Político: t.politico?.nome ?? "", Conteúdo: t.conteudo,
    Descrição: t.descricao ?? "", "Criado em": new Date(t.created_at).toLocaleString("pt-BR"),
  }));

  const create = useMutation({
    mutationFn: async () => {
      if (!politicoId || !nome.trim() || !conteudo.trim()) {
        throw new Error("Preencha político, nome e conteúdo");
      }
      const { error } = await supabase.from("whatsapp_templates").insert({
        politico_id: politicoId,
        nome: nome.trim(),
        conteudo: conteudo.trim(),
        descricao: descricao.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template criado");
      setOpen(false);
      setNome(""); setConteudo(""); setDescricao("");
      invalidate([["wa-templates"]]);
    },
    onError: (e) => toastError(e),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whatsapp_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removido"); invalidate([["wa-templates"]]); },
    onError: (e) => toastError(e),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground flex-1">
          Use <code>{"{{nome}}"}</code>, <code>{"{{cidade}}"}</code>, <code>{"{{bairro}}"}</code> nas mensagens.
        </p>
        <div className="flex items-center gap-2">
          <ExportButtons filename="whatsapp-templates" title="Templates WhatsApp" rows={exportRows} />
          <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Novo template</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo template</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Político</Label>
                <Select value={politicoId} onValueChange={setPoliticoId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(politicos.data ?? []).map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nome</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Boas-vindas" />
              </div>
              <div>
                <Label>Conteúdo</Label>
                <Textarea
                  rows={6}
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                  placeholder="Olá {{nome}}, tudo bem? ..."
                />
              </div>
              <div>
                <Label>Descrição (opcional)</Label>
                <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => create.mutate()} disabled={create.isPending}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3">
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs text-muted-foreground">Buscar</Label>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome, conteúdo, descrição..." />
        </div>
        <div className="w-[200px]">
          <Label className="text-xs text-muted-foreground">Político</Label>
          <Select value={fPolitico} onValueChange={setFPolitico}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {polNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {(list.data?.length ?? 0) === 0 ? (
        <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">
          <FileText className="mx-auto mb-2 h-6 w-6" />
          Nenhum template criado ainda.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((t: any) => (
            <div key={t.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold">{t.nome}</h4>
                  <p className="text-xs text-muted-foreground">{t.politico?.nome}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => del.mutate(t.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <pre className="mt-3 max-h-32 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-2 text-xs">
                {t.conteudo}
              </pre>
              {t.descricao && <p className="mt-2 text-xs text-muted-foreground">{t.descricao}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}