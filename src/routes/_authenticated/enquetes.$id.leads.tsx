import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Send, Search, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { ExportButtons } from "@/components/export-buttons";
import { DisparoLivreDialog } from "@/components/disparo-livre-dialog";
import { formatPhone } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/enquetes/$id/leads")({
  head: () => ({ meta: [{ title: "Leads da enquete — Política+" }] }),
  component: LeadsPage,
  errorComponent: ({ error, reset }) => (
    <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-6">
      <h2 className="text-lg font-semibold text-destructive">Não foi possível carregar os leads</h2>
      <p className="text-sm text-muted-foreground">{(error as any)?.message ?? "Erro desconhecido."}</p>
      <Button size="sm" onClick={() => reset()}>Tentar novamente</Button>
    </div>
  ),
});

function LeadsPage() {
  const { id } = Route.useParams();
  const [busca, setBusca] = useState("");
  const [disparoOpen, setDisparoOpen] = useState(false);

  const enquete = useQuery({
    queryKey: ["enquete-leads-meta", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enquetes")
        .select("id, titulo, politico_id, coordenador_id, coordenador:coordenadores(nome)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const leadsQ = useQuery({
    queryKey: ["enquete-leads", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("respostas")
        .select("id, nome, telefone, created_at, eleitor_id, coordenador:coordenadores(nome), eleitor:eleitores(cidade, zona, secao)")
        .eq("enquete_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const s = busca.trim().toLowerCase();
    if (!s) return leadsQ.data ?? [];
    return (leadsQ.data ?? []).filter((r: any) =>
      [r.nome, r.telefone, r.coordenador?.nome, r.eleitor?.cidade]
        .some((v) => (v ?? "").toString().toLowerCase().includes(s))
    );
  }, [leadsQ.data, busca]);

  const exportRows = filtered.map((r: any) => ({
    Nome: r.nome ?? "",
    Telefone: r.telefone ?? "",
    Cidade: r.eleitor?.cidade ?? "",
    Zona: r.eleitor?.zona ?? "",
    Seção: r.eleitor?.secao ?? "",
    Coordenador: r.coordenador?.nome ?? "",
    "Respondeu em": new Date(r.created_at).toLocaleString("pt-BR"),
  }));

  return (
    <div className="space-y-6">
      <Link to="/enquetes/$id" params={{ id }} className="inline-flex items-center text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="mr-1 h-4 w-4" />Voltar para a enquete
      </Link>

      <PageHeader
        title="Leads desta enquete"
        description={
          enquete.data?.titulo
            ? `${enquete.data.titulo}${(enquete.data as any)?.coordenador?.nome ? ` — coordenador: ${(enquete.data as any).coordenador.nome}` : " — sem coordenador atribuído"}`
            : "Quem respondeu vira lead identificado"
        }
        actions={
          <div className="flex items-center gap-2">
            <ExportButtons filename={`leads-enquete-${id.slice(0, 8)}`} title="Leads da enquete" rows={exportRows} />
            <Button variant="premium" onClick={() => setDisparoOpen(true)} disabled={!enquete.data?.politico_id || filtered.length === 0}>
              <Send className="mr-2 h-4 w-4" /> Disparo direto para esta base
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome, telefone, cidade, coordenador..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <Badge variant="secondary">{filtered.length} lead(s)</Badge>
      </div>

      {leadsQ.isLoading ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">Carregando leads...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Ainda não há leads. Assim que os eleitores começarem a responder a enquete via WhatsApp, eles aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Cidade / Zona / Seção</TableHead>
                <TableHead>Coordenador</TableHead>
                <TableHead>Respondeu em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nome ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{formatPhone(r.telefone) || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {[r.eleitor?.cidade, r.eleitor?.zona ? `Z${r.eleitor.zona}` : null, r.eleitor?.secao ? `S${r.eleitor.secao}` : null].filter(Boolean).join(" / ") || "—"}
                  </TableCell>
                  <TableCell>{r.coordenador?.nome ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right">
                    <Link to="/respostas/$id" params={{ id: r.id }}>
                      <Button variant="ghost" size="sm">Ver respostas</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {enquete.data?.politico_id && (
        <DisparoLivreDialog
          politicoId={enquete.data.politico_id}
          open={disparoOpen}
          onOpenChange={setDisparoOpen}
        />
      )}
    </div>
  );
}