import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Copy, Trash2, ClipboardList, AlertCircle, Send, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { useInvalidate, toastError } from "@/lib/use-mutation-toast";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { EnqueteWizard } from "@/components/wizards/enquete-wizard";
import { DisparoEnqueteDialog } from "@/components/disparo-enquete-dialog";
import { DataToolbar, applyTextSearch, applyDateRange } from "@/components/data-toolbar";
import { ExportButtons } from "@/components/export-buttons";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/enquetes/")({
  head: () => ({ meta: [{ title: "Enquetes — Política+" }] }),
  component: EnquetesPage,
});

function EnquetesPage() {
  const { canManage } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [disparoEnq, setDisparoEnq] = useState<any | null>(null);
  const invalidate = useInvalidate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [politicoFiltro, setPoliticoFiltro] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const q = useQuery({
    queryKey: ["enquetes"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enquetes")
        .select("id, titulo, slug, token_convite, status, created_at, politico_id, politico:politicos(nome), perguntas:enquete_perguntas(count)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("enquetes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removida"); invalidate([["enquetes"]]); },
    onError: (e) => toastError(e),
  });

  function copyLink(row: any) {
    const token = row.token_convite ?? row.slug;
    const url = `${window.location.origin}/c/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link de convite copiado");
  }

  function statusVariant(s: string) {
    return s === "ativa" ? "default" : s === "encerrada" ? "secondary" : "outline";
  }

  const rows: any[] = q.data ?? [];
  const politicos = Array.from(new Set(rows.map((r) => r.politico?.nome).filter(Boolean))) as string[];
  let filtered = applyTextSearch(rows, search, ["titulo" as any, "slug" as any, (r: any) => r.politico?.nome]);
  if (status !== "all") filtered = filtered.filter((r) => r.status === status);
  if (politicoFiltro !== "all") filtered = filtered.filter((r) => r.politico?.nome === politicoFiltro);
  filtered = applyDateRange(filtered, dateFrom, dateTo, (r) => r.created_at);

  const exportRows = filtered.map((e: any) => ({
    Título: e.titulo,
    Político: e.politico?.nome ?? "—",
    Perguntas: e.perguntas?.[0]?.count ?? 0,
    Status: e.status,
    Slug: e.slug,
    "Criada em": formatDateTime(e.created_at),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enquetes"
        description="Crie pesquisas com link público e colete respostas dos eleitores."
        actions={canManage && <Button variant="premium" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nova enquete</Button>}
      />
      <EnqueteWizard open={open} onOpenChange={setOpen} />

      <DataToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por título, slug ou político..."
        filters={[
          { key: "status", label: "Status", value: status, onChange: setStatus, options: [
            { value: "rascunho", label: "Rascunho" }, { value: "ativa", label: "Ativa" }, { value: "encerrada", label: "Encerrada" },
          ]},
          { key: "politico", label: "Político", value: politicoFiltro, onChange: setPoliticoFiltro, options: politicos.map((n) => ({ value: n, label: n })) },
        ]}
        dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo}
        onClear={() => { setSearch(""); setStatus("all"); setPoliticoFiltro("all"); setDateFrom(""); setDateTo(""); }}
        right={<ExportButtons filename="enquetes" title="Enquetes" rows={exportRows} />}
      />

      {!q.isLoading && !q.isError && (q.data?.length ?? 0) === 0 ? (
        <EmptyState
          size="lg"
          icon={ClipboardList}
          title="Nenhuma enquete criada"
          description="Crie uma enquete em 2 passos guiados: escolha o político e dê um título. Depois você adiciona as perguntas e ativa o link público."
          action={canManage && <Button variant="premium" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Criar primeira enquete</Button>}
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead><TableHead>Político</TableHead><TableHead>Perguntas</TableHead><TableHead>Status</TableHead><TableHead>Slug</TableHead><TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.isLoading && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>}
              {!q.isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum resultado com esses filtros.</TableCell></TableRow>}
              {filtered.map((e: any) => {
                const count = e.perguntas?.[0]?.count ?? 0;
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.titulo}</TableCell>
                    <TableCell>{e.politico?.nome ?? "—"}</TableCell>
                    <TableCell>{count === 0 ? <Link to="/enquetes/$id" params={{ id: e.id }} className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 transition hover:bg-amber-500/25 dark:text-amber-300"><AlertCircle className="h-3 w-3" /> Adicionar perguntas</Link> : <span className="text-sm text-muted-foreground">{count} pergunta{count > 1 ? "s" : ""}</span>}</TableCell>
                    <TableCell><Badge variant={statusVariant(e.status) as any}>{e.status}</Badge></TableCell>
                    <TableCell><code className="text-xs">{e.slug}</code></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="sm" aria-label="Copiar link de convite" onClick={() => copyLink(e)} title="Copiar link de convite"><Copy className="h-4 w-4" /></Button>
                      <Button asChild variant="ghost" size="sm" aria-label="Acompanhar ao vivo" title="Acompanhar ao vivo">
                        <Link to="/enquetes/$id/ao-vivo" params={{ id: e.id }}>
                          <Radio className="h-4 w-4 text-rose-500" />
                        </Link>
                      </Button>
                      {canManage && (
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label="Enviar para participantes"
                          onClick={() => setDisparoEnq(e)}
                          disabled={e.status !== "ativa" || count === 0}
                          title={e.status !== "ativa" ? "Ative a enquete primeiro" : count === 0 ? "Adicione perguntas primeiro" : "Enviar para participantes"}
                        >
                          <Send className="mr-1.5 h-3.5 w-3.5" />Enviar
                        </Button>
                      )}
                      <Button asChild variant="outline" size="sm"><Link to="/enquetes/$id" params={{ id: e.id }}><Pencil className="mr-1.5 h-3.5 w-3.5" />Editar perguntas</Link></Button>
                      <Button variant="ghost" size="sm" aria-label="Excluir enquete" onClick={() => { if (confirm(`Excluir a enquete "${e.titulo}"? Todas as respostas associadas também serão removidas. Esta ação não pode ser desfeita.`)) remove.mutate(e.id); }} title="Excluir"><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {disparoEnq && (
        <DisparoEnqueteDialog
          enquete={disparoEnq}
          open={!!disparoEnq}
          onOpenChange={(o) => { if (!o) setDisparoEnq(null); }}
        />
      )}
    </div>
  );
}