import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Eye, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { PleitoWizard } from "@/components/wizards/pleito-wizard";
import { DataToolbar, applyTextSearch } from "@/components/data-toolbar";
import { ExportButtons } from "@/components/export-buttons";

export const Route = createFileRoute("/_authenticated/pleitos")({
  head: () => ({ meta: [{ title: "Pleitos — Política+" }] }),
  component: PleitosPage,
});

function PleitosPage() {
  const { canManage } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [fStatus, setFStatus] = useState("all");
  const [fTipo, setFTipo] = useState("all");
  const [fAno, setFAno] = useState("all");

  const q = useQuery({
    queryKey: ["pleitos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pleitos")
        .select("id, nome, ano, tipo, cidade, estado, status")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const rows: any[] = q.data ?? [];
  const tipos = Array.from(new Set(rows.map((r) => r.tipo).filter(Boolean))) as string[];
  const anos = Array.from(new Set(rows.map((r) => r.ano).filter(Boolean))).sort((a, b) => b - a) as number[];
  let filtered = applyTextSearch(rows, search, ["nome" as any, "cidade" as any, "estado" as any, "tipo" as any]);
  if (fStatus !== "all") filtered = filtered.filter((r) => r.status === fStatus);
  if (fTipo !== "all") filtered = filtered.filter((r) => r.tipo === fTipo);
  if (fAno !== "all") filtered = filtered.filter((r) => String(r.ano) === fAno);
  const exportRows = filtered.map((p: any) => ({
    Nome: p.nome, Ano: p.ano ?? "", Tipo: p.tipo ?? "",
    Cidade: p.cidade ?? "", UF: p.estado ?? "", Status: p.status,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pleitos"
        description="Eleições e campanhas gerenciadas na plataforma."
        actions={
          canManage && (
            <Button variant="premium" onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />Novo pleito
            </Button>
          )
        }
      />
      <PleitoWizard open={open} onOpenChange={setOpen} />
      <DataToolbar
        search={search} onSearchChange={setSearch}
        searchPlaceholder="Buscar por nome, cidade, tipo..."
        filters={[
          { key: "status", label: "Status", value: fStatus, onChange: setFStatus, options: [
            { value: "ativo", label: "Ativo" }, { value: "encerrado", label: "Encerrado" }, { value: "rascunho", label: "Rascunho" },
          ]},
          { key: "tipo", label: "Tipo", value: fTipo, onChange: setFTipo, options: tipos.map((t) => ({ value: t, label: t })) },
          { key: "ano", label: "Ano", value: fAno, onChange: setFAno, options: anos.map((a) => ({ value: String(a), label: String(a) })) },
        ]}
        onClear={() => { setSearch(""); setFStatus("all"); setFTipo("all"); setFAno("all"); }}
        right={<ExportButtons filename="pleitos" title="Pleitos" rows={exportRows} />}
      />
      {!q.isLoading && (q.data?.length ?? 0) === 0 ? (
        <EmptyState
          size="lg"
          icon={Trophy}
          title="Nenhum pleito cadastrado"
          description="Pleito é a eleição/disputa onde seus candidatos vão concorrer. Crie um por eleição."
          action={
            canManage && (
              <Button variant="premium" onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />Criar primeiro pleito
              </Button>
            )
          }
        />
      ) : (
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Nome</TableHead><TableHead>Ano</TableHead><TableHead>Tipo</TableHead>
            <TableHead>Local</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {q.isLoading && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>}
            {!q.isLoading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum resultado.</TableCell></TableRow>
            )}
            {filtered.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nome}</TableCell>
                <TableCell>{p.ano ?? "—"}</TableCell>
                <TableCell>{p.tipo ?? "—"}</TableCell>
                <TableCell>{[p.cidade, p.estado].filter(Boolean).join("/") || "—"}</TableCell>
                <TableCell><Badge variant={p.status === "ativo" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <Link to="/pleitos/$id" params={{ id: p.id }}>
                    <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      )}
    </div>
  );
}