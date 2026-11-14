import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Search, Eye, Upload, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { useInvalidate, toastError } from "@/lib/use-mutation-toast";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { csvToObjects } from "@/lib/csv-import";
import { ExportButtons } from "@/components/export-buttons";
import { formatPhone, maskCpf, formatCpf } from "@/lib/format";
import { EmptyState } from "@/components/empty-state";
import { EleitorWizard } from "@/components/wizards/eleitor-wizard";

export const Route = createFileRoute("/_authenticated/eleitores")({
  head: () => ({ meta: [{ title: "Eleitores — Política+" }] }),
  component: EleitoresPage,
});

function EleitoresPage() {
  const { canManage, profile } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [fCidade, setFCidade] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fBairroId, setFBairroId] = useState("");
  const [fCoordId, setFCoordId] = useState("");
  const [fResp, setFResp] = useState<"" | "sim" | "nao">("");
  const [fTag, setFTag] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ ok: number; fail: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const invalidate = useInvalidate();

  const defaultPoliticoId = (profile as any)?.politico_id ?? "";
  const effectivePolId = defaultPoliticoId;

  const coords = useQuery({
    queryKey: ["coords-of", effectivePolId],
    enabled: !!effectivePolId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coordenadores").select("id, nome").eq("politico_id", effectivePolId).order("nome");
      if (error) throw error;
      return data;
    },
  });

  const bairros = useQuery({
    queryKey: ["bairros-of", effectivePolId],
    enabled: !!effectivePolId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bairros").select("id, nome").eq("politico_id", effectivePolId).order("nome");
      if (error) throw error;
      return data;
    },
  });

  const q = useQuery({
    queryKey: ["eleitores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eleitores")
        .select("id, nome, telefone, email, cpf, cidade, uf, status, created_at, bairro_id, coordenador_id, tags, politico:politicos(nome), coordenador:coordenadores(id, nome), bairro_rel:bairros(id, nome), respostas(created_at)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    if (!q.data) return [];
    const s = search.trim().toLowerCase();
    return q.data.filter((e: any) => {
      if (s && ![e.nome, e.telefone, e.email, e.cidade].some((v) => (v ?? "").toString().toLowerCase().includes(s))) return false;
      if (fCidade && (e.cidade ?? "").toLowerCase() !== fCidade.toLowerCase()) return false;
      if (fStatus && e.status !== fStatus) return false;
      if (fBairroId && e.bairro_rel?.id !== fBairroId && e.bairro_id !== fBairroId) return false;
      if (fCoordId && e.coordenador?.id !== fCoordId && e.coordenador_id !== fCoordId) return false;
      const respondeu = (e.respostas?.length ?? 0) > 0;
      if (fResp === "sim" && !respondeu) return false;
      if (fResp === "nao" && respondeu) return false;
      if (fTag && !(e.tags ?? []).includes(fTag)) return false;
      return true;
    });
  }, [q.data, search, fCidade, fStatus, fBairroId, fCoordId, fResp, fTag]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    q.data?.forEach((e: any) => (e.tags ?? []).forEach((t: string) => s.add(t)));
    return Array.from(s).sort();
  }, [q.data]);

  const cidades = useMemo(() => {
    const s = new Set<string>();
    q.data?.forEach((e: any) => { if (e.cidade) s.add(e.cidade); });
    return Array.from(s).sort();
  }, [q.data]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("eleitores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removido"); invalidate([["eleitores"], ["dashboard-stats"]]); },
    onError: (e) => toastError(e),
  });

  async function handleImport(file: File) {
    if (!effectivePolId) { toast.error("Selecione/possua um político vinculado para importar"); return; }
    setImporting(true); setImportResult(null);
    try {
      const text = await file.text();
      const rows = csvToObjects(text);
      const errors: string[] = [];
      const valids: any[] = [];
      rows.forEach((r, i) => {
        const nome = (r.nome ?? "").trim();
        if (!nome) { errors.push(`Linha ${i + 2}: nome vazio`); return; }
        valids.push({
          politico_id: effectivePolId,
          nome,
          telefone: r.telefone || null,
          email: r.email || null,
          cpf: r.cpf || null,
          cidade: r.cidade || null,
          bairro: r.bairro || null,
          uf: r.uf || null,
        });
      });
      let ok = 0;
      for (let i = 0; i < valids.length; i += 100) {
        const chunk = valids.slice(i, i + 100);
        const { error } = await supabase.from("eleitores").insert(chunk);
        if (error) { errors.push(`Bloco ${i / 100 + 1}: ${error.message}`); }
        else ok += chunk.length;
      }
      setImportResult({ ok, fail: rows.length - ok, errors: errors.slice(0, 10) });
      invalidate([["eleitores"], ["dashboard-stats"]]);
    } finally { setImporting(false); }
  }

  const exportRows = filtered.map((e: any) => ({
    Nome: e.nome,
    Telefone: e.telefone ?? "",
    Email: e.email ?? "",
    CPF: e.cpf ?? "",
    Cidade: e.cidade ?? "",
    UF: e.uf ?? "",
    Bairro: e.bairro_rel?.nome ?? "",
    Coordenador: e.coordenador?.nome ?? "",
    Tags: (e.tags ?? []).join(", "),
    Respostas: e.respostas?.length ?? 0,
    Status: e.status,
    "Cadastrado em": new Date(e.created_at).toLocaleString("pt-BR"),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Eleitores"
        description="Base de eleitores, contatos e segmentação por bairro/coordenador."
        actions={
          <div className="flex items-center gap-2">
            <ExportButtons filename={`eleitores-${new Date().toISOString().slice(0,10)}`} title="Eleitores" rows={exportRows} />
            <Dialog open={importOpen} onOpenChange={(o) => { setImportOpen(o); if (!o) setImportResult(null); }}>
              <DialogTrigger asChild>
                <Button variant="outline"><Upload className="mr-2 h-4 w-4" />Importar CSV</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Importar eleitores via CSV</DialogTitle>
                  <DialogDescription>
                    Colunas aceitas: <code>nome,telefone,email,cpf,cidade,bairro,uf</code>. A coluna <code>nome</code> é obrigatória.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3">
                  <Input ref={fileRef} type="file" accept=".csv,text/csv" disabled={importing} onChange={(ev) => {
                    const f = ev.target.files?.[0]; if (f) handleImport(f);
                  }} />
                  {importing && <p className="text-sm text-muted-foreground">Importando, aguarde...</p>}
                  {importResult && (
                    <div className="rounded-md border p-3 text-sm">
                      <p><strong>{importResult.ok}</strong> importados · <strong>{importResult.fail}</strong> falharam</p>
                      {importResult.errors.length > 0 && (
                        <ul className="mt-2 list-disc pl-5 text-xs text-destructive">
                          {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            {canManage && (
              <Button variant="premium" onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />Novo eleitor
              </Button>
            )}
          </div>
        }
      />
      <EleitorWizard open={open} onOpenChange={setOpen} />

      {!q.isLoading && (q.data?.length ?? 0) === 0 ? (
        <EmptyState
          size="lg"
          icon={Users}
          title="Nenhum eleitor cadastrado"
          description="Comece sua base agora: cadastre eleitores manualmente em 3 passos guiados ou importe uma planilha CSV de uma vez."
          action={
            <div className="flex gap-2">
              {canManage && (
                <Button variant="premium" onClick={() => setOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />Cadastrar primeiro eleitor
                </Button>
              )}
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />Importar CSV
              </Button>
            </div>
          }
        />
      ) : (
      <>
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome, telefone, e-mail..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={fCidade} onValueChange={(v) => setFCidade(v === "__all" ? "" : v)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Cidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Todas cidades</SelectItem>
            {cidades.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fBairroId} onValueChange={(v) => setFBairroId(v === "__all" ? "" : v)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Bairro" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Todos bairros</SelectItem>
            {bairros.data?.map((b) => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fCoordId} onValueChange={(v) => setFCoordId(v === "__all" ? "" : v)}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Coordenador" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Todos coordenadores</SelectItem>
            {coords.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fStatus} onValueChange={(v) => setFStatus(v === "__all" ? "" : v)}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Todos status</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
            <SelectItem value="arquivado">Arquivado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={fResp} onValueChange={(v) => setFResp((v === "__all" ? "" : v) as any)}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Respondeu?" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Todos</SelectItem>
            <SelectItem value="sim">Respondeu enquete</SelectItem>
            <SelectItem value="nao">Sem respostas</SelectItem>
          </SelectContent>
        </Select>
        {allTags.length > 0 && (
          <Select value={fTag} onValueChange={(v) => setFTag(v === "__all" ? "" : v)}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tag" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todas tags</SelectItem>
              {allTags.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Cidade/UF</TableHead>
              <TableHead>Bairro</TableHead>
              <TableHead>Coordenador</TableHead>
              <TableHead>Última resposta</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>}
            {!q.isLoading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">Nenhum eleitor encontrado.</TableCell></TableRow>
            )}
            {filtered.map((e: any) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.nome}</TableCell>
                <TableCell>{formatPhone(e.telefone) || "—"}</TableCell>
                <TableCell><CpfCell cpf={e.cpf} /></TableCell>
                <TableCell>{[e.cidade, e.uf].filter(Boolean).join("/") || "—"}</TableCell>
                <TableCell>{e.bairro_rel?.nome ?? "—"}</TableCell>
                <TableCell>{e.coordenador?.nome ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {(() => {
                    const r = e.respostas ?? [];
                    if (!r.length) return "—";
                    const last = r.reduce((a: any, b: any) => (a.created_at > b.created_at ? a : b));
                    return new Date(last.created_at).toLocaleDateString("pt-BR");
                  })()}
                </TableCell>
                <TableCell><Badge variant={e.status === "ativo" ? "default" : "secondary"}>{e.status}</Badge></TableCell>
                <TableCell className="text-right space-x-1">
                  <Link to="/eleitores/$id" params={{ id: e.id }}>
                    <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                  </Link>
                  <Button variant="ghost" size="sm" aria-label="Excluir eleitor" title="Excluir" onClick={() => { if (confirm(`Excluir o eleitor "${e.nome ?? "selecionado"}"? Esta ação não pode ser desfeita.`)) remove.mutate(e.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      </>
      )}
    </div>
  );
}

function CpfCell({ cpf }: { cpf?: string | null }) {
  const [show, setShow] = useState(false);
  if (!cpf) return <span className="text-muted-foreground">—</span>;
  return (
    <button
      type="button"
      onClick={() => setShow((v) => !v)}
      className="font-mono text-xs text-muted-foreground hover:text-foreground"
      title={show ? "Ocultar" : "Mostrar"}
    >
      {show ? formatCpf(cpf) : maskCpf(cpf)}
    </button>
  );
}