import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Eye, Landmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { Info } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { PoliticoWizard } from "@/components/wizards/politico-wizard";
import { DataToolbar, applyTextSearch } from "@/components/data-toolbar";
import { ExportButtons } from "@/components/export-buttons";

export const Route = createFileRoute("/_authenticated/politicos")({
  head: () => ({ meta: [{ title: "Políticos — Política+" }] }),
  component: PoliticosPage,
});

function PoliticosPage() {
  const { isAdmin, isGestor } = useCurrentUser();
  const canCreate = isAdmin;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [fPartido, setFPartido] = useState("all");
  const [fCargo, setFCargo] = useState("all");
  const [fUF, setFUF] = useState("all");
  const [fStatus, setFStatus] = useState("all");

  const q = useQuery({
    queryKey: ["politicos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("politicos")
        .select("id, nome, partido, cargo, cidade, estado, status, codigo_unico")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const rows: any[] = q.data ?? [];
  const partidos = Array.from(new Set(rows.map((r) => r.partido).filter(Boolean))) as string[];
  const cargos = Array.from(new Set(rows.map((r) => r.cargo).filter(Boolean))) as string[];
  const ufs = Array.from(new Set(rows.map((r) => r.estado).filter(Boolean))) as string[];
  let filtered = applyTextSearch(rows, search, ["nome" as any, "partido" as any, "cidade" as any, "codigo_unico" as any]);
  if (fPartido !== "all") filtered = filtered.filter((r) => r.partido === fPartido);
  if (fCargo !== "all") filtered = filtered.filter((r) => r.cargo === fCargo);
  if (fUF !== "all") filtered = filtered.filter((r) => r.estado === fUF);
  if (fStatus !== "all") filtered = filtered.filter((r) => r.status === fStatus);
  const exportRows = filtered.map((p: any) => ({
    Nome: p.nome, Partido: p.partido ?? "", Cargo: p.cargo ?? "",
    Cidade: p.cidade ?? "", UF: p.estado ?? "", Código: p.codigo_unico, Status: p.status,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Políticos"
        description="Gerencie políticos vinculados à plataforma."
        actions={
          canCreate && (
            <Button variant="premium" onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />Novo político
            </Button>
          )
        }
      />
      <PoliticoWizard open={open} onOpenChange={setOpen} />
      {!isAdmin && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-500/5 p-3 text-sm text-amber-100/90">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <strong>Cadastro de político é exclusivo do Administrador.</strong>{" "}
            {isGestor
              ? "Como Parceiro, você gerencia o político já vinculado ao seu perfil. Peça ao Admin para criar novos políticos e vinculá-los a você."
              : "Peça ao Admin para cadastrar e vincular ao seu perfil."}
          </div>
        </div>
      )}
      <DataToolbar
        search={search} onSearchChange={setSearch}
        searchPlaceholder="Buscar por nome, partido, cidade, código..."
        filters={[
          { key: "partido", label: "Partido", value: fPartido, onChange: setFPartido, options: partidos.map((p) => ({ value: p, label: p })) },
          { key: "cargo", label: "Cargo", value: fCargo, onChange: setFCargo, options: cargos.map((p) => ({ value: p, label: p })) },
          { key: "uf", label: "UF", value: fUF, onChange: setFUF, options: ufs.map((p) => ({ value: p, label: p })) },
          { key: "status", label: "Status", value: fStatus, onChange: setFStatus, options: [
            { value: "ativo", label: "Ativo" }, { value: "inativo", label: "Inativo" },
          ]},
        ]}
        onClear={() => { setSearch(""); setFPartido("all"); setFCargo("all"); setFUF("all"); setFStatus("all"); }}
        right={<ExportButtons filename="politicos" title="Políticos" rows={exportRows} />}
      />

      {!q.isLoading && (q.data?.length ?? 0) === 0 ? (
        <EmptyState
          size="lg"
          icon={Landmark}
          title="Nenhum político cadastrado"
          description="Comece cadastrando o político que você vai gerenciar. Todo o resto — eleitores, enquetes, candidatos — pertence a um político."
          action={
            canCreate && (
              <Button variant="premium" onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />Cadastrar primeiro político
              </Button>
            )
          }
        />
      ) : (
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Partido</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Cidade/UF</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>
            )}
            {!q.isLoading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhum resultado.</TableCell></TableRow>
            )}
            {filtered.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nome}</TableCell>
                <TableCell>{p.partido ?? "—"}</TableCell>
                <TableCell>{p.cargo ?? "—"}</TableCell>
                <TableCell>{[p.cidade, p.estado].filter(Boolean).join("/") || "—"}</TableCell>
                <TableCell><code className="text-xs">{p.codigo_unico}</code></TableCell>
                <TableCell><Badge variant={p.status === "ativo" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <Link to="/politicos/$id" params={{ id: p.id }}>
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