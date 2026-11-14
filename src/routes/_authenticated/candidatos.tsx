import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Eye, Vote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { CandidatoWizard } from "@/components/wizards/candidato-wizard";
import { DataToolbar, applyTextSearch } from "@/components/data-toolbar";
import { ExportButtons } from "@/components/export-buttons";
import { PoliticoCoordenadorFilter, SEM_COORDENADOR } from "@/components/politico-coordenador-filter";

export const Route = createFileRoute("/_authenticated/candidatos")({
  head: () => ({ meta: [{ title: "Candidatos — Política+" }] }),
  component: CandidatosPage,
});

function CandidatosPage() {
  const { canManage } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [fPartido, setFPartido] = useState("all");
  const [fCargo, setFCargo] = useState("all");
  const [fUF, setFUF] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fPolitico, setFPolitico] = useState("all");
  const [fCoordenador, setFCoordenador] = useState("all");

  const q = useQuery({
    queryKey: ["candidatos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidatos")
        .select("id, nome, partido, cargo_pretendido, numero, cidade, estado, status, politico_id, politico:politicos(id, nome), pleito:pleitos(nome), candidato_coordenadores(coordenador_id, coordenador:coordenadores(id, nome))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const rows: any[] = q.data ?? [];
  const partidos = Array.from(new Set(rows.map((r) => r.partido).filter(Boolean))) as string[];
  const cargos = Array.from(new Set(rows.map((r) => r.cargo_pretendido).filter(Boolean))) as string[];
  const ufs = Array.from(new Set(rows.map((r) => r.estado).filter(Boolean))) as string[];
  let filtered = applyTextSearch(rows, search, ["nome" as any, "partido" as any, (r: any) => r.politico?.nome, (r: any) => r.pleito?.nome]);
  if (fPartido !== "all") filtered = filtered.filter((r) => r.partido === fPartido);
  if (fCargo !== "all") filtered = filtered.filter((r) => r.cargo_pretendido === fCargo);
  if (fUF !== "all") filtered = filtered.filter((r) => r.estado === fUF);
  if (fStatus !== "all") filtered = filtered.filter((r) => r.status === fStatus);
  if (fPolitico !== "all") filtered = filtered.filter((r: any) => r.politico_id === fPolitico);
  if (fCoordenador === SEM_COORDENADOR) {
    filtered = filtered.filter((r: any) => !r.candidato_coordenadores || r.candidato_coordenadores.length === 0);
  } else if (fCoordenador !== "all") {
    filtered = filtered.filter((r: any) =>
      (r.candidato_coordenadores ?? []).some((cc: any) => cc.coordenador_id === fCoordenador),
    );
  }
  const exportRows = filtered.map((c: any) => ({
    Nome: c.nome, Partido: c.partido ?? "", Cargo: c.cargo_pretendido ?? "",
    Número: c.numero ?? "", Político: c.politico?.nome ?? "", Pleito: c.pleito?.nome ?? "",
    Cidade: c.cidade ?? "", UF: c.estado ?? "", Status: c.status,
    Coordenadores: (c.candidato_coordenadores ?? []).map((cc: any) => cc.coordenador?.nome).filter(Boolean).join(", "),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidatos"
        description="Candidatos vinculados a políticos e pleitos."
        actions={
          canManage && (
            <Button variant="premium" onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />Novo candidato
            </Button>
          )
        }
      />
      <CandidatoWizard open={open} onOpenChange={setOpen} />
      <div className="rounded-lg border bg-card p-4">
        <PoliticoCoordenadorFilter
          politicoId={fPolitico}
          coordenadorId={fCoordenador}
          onChange={({ politicoId, coordenadorId }) => { setFPolitico(politicoId); setFCoordenador(coordenadorId); }}
        />
      </div>
      <DataToolbar
        search={search} onSearchChange={setSearch}
        searchPlaceholder="Buscar por nome, partido, político..."
        filters={[
          { key: "partido", label: "Partido", value: fPartido, onChange: setFPartido, options: partidos.map((p) => ({ value: p, label: p })) },
          { key: "cargo", label: "Cargo", value: fCargo, onChange: setFCargo, options: cargos.map((p) => ({ value: p, label: p })) },
          { key: "uf", label: "UF", value: fUF, onChange: setFUF, options: ufs.map((p) => ({ value: p, label: p })) },
          { key: "status", label: "Status", value: fStatus, onChange: setFStatus, options: [
            { value: "ativo", label: "Ativo" }, { value: "inativo", label: "Inativo" },
          ]},
        ]}
        onClear={() => { setSearch(""); setFPartido("all"); setFCargo("all"); setFUF("all"); setFStatus("all"); }}
        right={<ExportButtons filename="candidatos" title="Candidatos" rows={exportRows} />}
      />
      {!q.isLoading && (q.data?.length ?? 0) === 0 ? (
        <EmptyState
          size="lg"
          icon={Vote}
          title="Nenhum candidato cadastrado"
          description="Cadastre os candidatos que vão concorrer no pleito. Vincule cada um ao político e ao pleito correspondente."
          action={
            canManage && (
              <Button variant="premium" onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />Cadastrar primeiro candidato
              </Button>
            )
          }
        />
      ) : (
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Nome</TableHead><TableHead>Partido</TableHead><TableHead>Cargo</TableHead>
            <TableHead>Nº</TableHead><TableHead>Político</TableHead><TableHead>Coordenadores</TableHead><TableHead>Pleito</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {q.isLoading && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>}
            {!q.isLoading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">Nenhum resultado.</TableCell></TableRow>
            )}
            {filtered.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell>{c.partido ?? "—"}</TableCell>
                <TableCell>{c.cargo_pretendido ?? "—"}</TableCell>
                <TableCell>{c.numero ?? "—"}</TableCell>
                <TableCell>{c.politico?.nome ?? "—"}</TableCell>
                <TableCell className="text-xs">
                  {(c.candidato_coordenadores ?? []).length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {(c.candidato_coordenadores ?? []).slice(0, 3).map((cc: any) => (
                        <Badge key={cc.coordenador_id} variant="outline">{cc.coordenador?.nome}</Badge>
                      ))}
                      {(c.candidato_coordenadores ?? []).length > 3 && (
                        <Badge variant="outline">+{(c.candidato_coordenadores ?? []).length - 3}</Badge>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell>{c.pleito?.nome ?? "—"}</TableCell>
                <TableCell><Badge variant={c.status === "ativo" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <Link to="/candidatos/$id" params={{ id: c.id }}>
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