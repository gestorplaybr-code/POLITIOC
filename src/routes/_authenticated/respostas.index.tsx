import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Eye, Filter, LayoutList, ListTree, ChevronRight, ChevronDown, Building2, UserRound, ClipboardList, Info, BarChart3, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { ExportButtons } from "@/components/export-buttons";
import { applyDateRange } from "@/components/data-toolbar";
import { PoliticoCoordenadorFilter, SEM_COORDENADOR } from "@/components/politico-coordenador-filter";
import { EnqueteGraficos } from "@/components/enquete-graficos";
import { maskPhoneBR } from "@/lib/br-masks";

export const Route = createFileRoute("/_authenticated/respostas/")({
  head: () => ({ meta: [{ title: "Respostas — Política+" }] }),
  component: RespostasPage,
});

function RespostasPage() {
  const [enqueteId, setEnqueteId] = useState<string>("__all");
  const [busca, setBusca] = useState("");
  const [arquivada, setArquivada] = useState<string>("all");
  const [origem, setOrigem] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [fPolitico, setFPolitico] = useState("all");
  const [fCoordenador, setFCoordenador] = useState("all");

  const enquetes = useQuery({
    queryKey: ["enquetes-min", fPolitico],
    queryFn: async () => {
      let req = supabase.from("enquetes").select("id, titulo, politico_id").order("titulo");
      if (fPolitico !== "all") req = req.eq("politico_id", fPolitico);
      const { data } = await req;
      return data ?? [];
    },
  });

  const q = useQuery({
    queryKey: ["respostas-list", enqueteId, busca, fPolitico, fCoordenador],
    queryFn: async () => {
      let query = supabase
        .from("respostas")
        .select("id, nome, telefone, email, origem, created_at, arquivada, candidato_id, coordenador_id, enquete:enquetes(id, titulo, politico_id, politico:politicos(id, nome)), coordenador:coordenadores(id, nome)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (enqueteId !== "__all") query = query.eq("enquete_id", enqueteId);
      if (busca.trim()) query = query.ilike("nome", `%${busca.trim()}%`);
      if (fPolitico !== "all") query = query.eq("candidato_id", fPolitico);
      if (fCoordenador === SEM_COORDENADOR) query = query.is("coordenador_id", null);
      else if (fCoordenador !== "all") query = query.eq("coordenador_id", fCoordenador);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  let filtered: any[] = q.data ?? [];
  if (arquivada !== "all") filtered = filtered.filter((r) => (arquivada === "sim" ? r.arquivada : !r.arquivada));
  if (origem !== "all") filtered = filtered.filter((r) => (r.origem ?? "") === origem);
  filtered = applyDateRange(filtered, dateFrom, dateTo, (r: any) => r.created_at);
  const origens = Array.from(new Set((q.data ?? []).map((r: any) => r.origem).filter(Boolean))) as string[];
  const exportRows = filtered.map((r: any) => ({
    Data: formatDateTime(r.created_at),
    Politico: r.enquete?.politico?.nome ?? "",
    Coordenador: r.coordenador?.nome ?? "",
    Enquete: r.enquete?.titulo ?? "",
    Nome: r.nome ?? "",
    WhatsApp: r.telefone ? maskPhoneBR(r.telefone) : "",
    Email: r.email ?? "",
    Origem: r.origem ?? "",
    Arquivada: r.arquivada ? "Sim" : "Não",
  }));

  const [view, setView] = useState<"tree" | "flat">("tree");
  const grouped = useMemo(() => buildTree(filtered), [filtered]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Respostas"
        description="Consulte todas as respostas recebidas em enquetes."
        actions={
          <ExportButtons filename="respostas" title="Respostas" rows={exportRows} disabled={filtered.length === 0} />
        }
      />

      <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-muted-foreground">
          Cada resposta pertence a uma <strong className="text-foreground">enquete</strong>, conduzida por um <strong className="text-foreground">coordenador</strong>, que representa um <strong className="text-foreground">político</strong>. Use a visão em árvore para navegar por essa hierarquia.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <PoliticoCoordenadorFilter
          politicoId={fPolitico}
          coordenadorId={fCoordenador}
          onChange={({ politicoId, coordenadorId }) => {
            setFPolitico(politicoId);
            setFCoordenador(coordenadorId);
            setEnqueteId("__all");
          }}
        />
      </div>

      <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr,1fr,1fr,1fr,1fr,1fr,auto]">
        <div className="space-y-1.5">
          <Label className="text-xs">Enquete</Label>
          <Select value={enqueteId} onValueChange={setEnqueteId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todas</SelectItem>
              {enquetes.data?.map((e: any) => (
                <SelectItem key={e.id} value={e.id}>{e.titulo}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Buscar pelo nome</Label>
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite parte do nome..." />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Origem</Label>
          <Select value={origem} onValueChange={setOrigem}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {origens.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Arquivada</Label>
          <Select value={arquivada} onValueChange={setArquivada}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="nao">Não arquivadas</SelectItem>
              <SelectItem value="sim">Arquivadas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">De</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Até</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Badge variant="secondary" className="h-9 px-3">
            <Filter className="mr-1 h-3 w-3" /> {filtered.length} resultados
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-1 rounded-lg border bg-card p-1 w-fit">
        <Button variant={view === "tree" ? "secondary" : "ghost"} size="sm" onClick={() => setView("tree")}>
          <ListTree className="mr-1.5 h-4 w-4" /> Visão hierárquica
        </Button>
        <Button variant={view === "flat" ? "secondary" : "ghost"} size="sm" onClick={() => setView("flat")}>
          <LayoutList className="mr-1.5 h-4 w-4" /> Tabela
        </Button>
      </div>

      {view === "tree" ? (
        <RespostasTree tree={grouped} loading={q.isLoading} />
      ) : (
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Político</TableHead>
              <TableHead>Coordenador</TableHead>
              <TableHead>Enquete</TableHead>
              <TableHead>Respondente</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>}
            {!q.isLoading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Nenhuma resposta.</TableCell></TableRow>
            )}
            {filtered.map((r: any) => (
              <TableRow key={r.id} className={r.arquivada ? "opacity-60" : ""}>
                <TableCell className="text-sm">{formatDateTime(r.created_at)}</TableCell>
                <TableCell className="text-sm">{r.enquete?.politico?.nome ?? <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="text-sm">{r.coordenador?.nome ?? <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>{r.enquete?.titulo ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar nome={r.nome} telefone={r.telefone} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{r.nome || <span className="text-muted-foreground font-normal">Contato do WhatsApp</span>}</div>
                      {r.email && <div className="truncate text-xs text-muted-foreground">{r.email}</div>}
                    </div>
                  </div>
                </TableCell>
                <TableCell><WhatsAppCell telefone={r.telefone} /></TableCell>
                <TableCell><Badge variant="outline">{r.origem ?? "—"}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/respostas/$id" params={{ id: r.id }}><Eye className="mr-1 h-4 w-4" /> Ver</Link>
                  </Button>
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

type EnqueteNode = { id: string; titulo: string; count: number; respostas: any[] };
type CoordNode = { id: string; nome: string; count: number; enquetes: Map<string, EnqueteNode> };
type PolNode = { id: string; nome: string; count: number; coordenadores: Map<string, CoordNode> };

function buildTree(rows: any[]): PolNode[] {
  const pols = new Map<string, PolNode>();
  for (const r of rows) {
    const polId = r.enquete?.politico?.id ?? r.enquete?.politico_id ?? "__none__";
    const polNome = r.enquete?.politico?.nome ?? "Sem político";
    const coordId = r.coordenador?.id ?? "__none__";
    const coordNome = r.coordenador?.nome ?? "Sem coordenador";
    const enqId = r.enquete?.id ?? "__none__";
    const enqTitulo = r.enquete?.titulo ?? "Sem enquete";
    if (!pols.has(polId)) pols.set(polId, { id: polId, nome: polNome, count: 0, coordenadores: new Map() });
    const pol = pols.get(polId)!;
    if (!pol.coordenadores.has(coordId)) pol.coordenadores.set(coordId, { id: coordId, nome: coordNome, count: 0, enquetes: new Map() });
    const coord = pol.coordenadores.get(coordId)!;
    if (!coord.enquetes.has(enqId)) coord.enquetes.set(enqId, { id: enqId, titulo: enqTitulo, count: 0, respostas: [] });
    const enq = coord.enquetes.get(enqId)!;
    enq.respostas.push(r);
    enq.count++;
    coord.count++;
    pol.count++;
  }
  return Array.from(pols.values()).sort((a, b) => b.count - a.count);
}

function RespostasTree({ tree, loading }: { tree: PolNode[]; loading: boolean }) {
  const [openPol, setOpenPol] = useState<Record<string, boolean>>({});
  const [openCoord, setOpenCoord] = useState<Record<string, boolean>>({});
  const [openEnq, setOpenEnq] = useState<Record<string, boolean>>({});
  const [showGraph, setShowGraph] = useState<Record<string, boolean>>({});
  if (loading) return <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">Carregando...</div>;
  if (tree.length === 0) return <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">Nenhuma resposta.</div>;
  return (
    <div className="space-y-2">
      {tree.map((pol) => {
        const isPolOpen = openPol[pol.id] ?? true;
        return (
          <div key={pol.id} className="rounded-lg border bg-card">
            <button type="button" onClick={() => setOpenPol((s) => ({ ...s, [pol.id]: !isPolOpen }))}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40">
              {isPolOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Building2 className="h-4 w-4 text-primary" />
              <span className="flex-1 font-semibold">{pol.nome}</span>
              <span className="text-xs text-muted-foreground">Político</span>
              <Badge variant="secondary">{pol.count} respostas</Badge>
            </button>
            {isPolOpen && (
              <div className="border-t bg-muted/20">
                {Array.from(pol.coordenadores.values()).sort((a, b) => b.count - a.count).map((coord) => {
                  const ckey = `${pol.id}:${coord.id}`;
                  const isCoordOpen = openCoord[ckey] ?? true;
                  return (
                    <div key={ckey} className="border-b last:border-b-0">
                      <button type="button" onClick={() => setOpenCoord((s) => ({ ...s, [ckey]: !isCoordOpen }))}
                        className="flex w-full items-center gap-3 pl-10 pr-4 py-2.5 text-left hover:bg-muted/40">
                        {isCoordOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <UserRound className="h-4 w-4 text-emerald-600" />
                        <span className="flex-1 font-medium">{coord.nome}</span>
                        <span className="text-xs text-muted-foreground">Coordenador</span>
                        <Badge variant="outline">{coord.count}</Badge>
                      </button>
                      {isCoordOpen && (
                        <div className="bg-background">
                          {Array.from(coord.enquetes.values()).sort((a, b) => b.count - a.count).map((enq) => {
                            const ekey = `${ckey}:${enq.id}`;
                            const isEnqOpen = openEnq[ekey] ?? false;
                            return (
                              <div key={ekey} className="border-b last:border-b-0">
                                <div className="flex items-center gap-3 pl-16 pr-4 py-2.5 hover:bg-muted/30">
                                  <button type="button" onClick={() => setOpenEnq((s) => ({ ...s, [ekey]: !isEnqOpen }))} className="flex flex-1 items-center gap-2 text-left">
                                    {isEnqOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    <ClipboardList className="h-4 w-4 text-amber-600" />
                                    <span className="flex-1 text-sm">{enq.titulo}</span>
                                  </button>
                                  <Badge variant="secondary">{enq.count} respostas</Badge>
                                  {enq.id !== "__none__" && (
                                    <>
                                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setShowGraph((s) => ({ ...s, [ekey]: !s[ekey] })); }}>
                                        <BarChart3 className="mr-1 h-3.5 w-3.5" /> {showGraph[ekey] ? "Ocultar gráfico" : "Ver gráfico"}
                                      </Button>
                                      <Button asChild variant="ghost" size="sm">
                                        <Link to="/enquetes/$id/resultados" params={{ id: enq.id }}>Página completa</Link>
                                      </Button>
                                    </>
                                  )}
                                </div>
                                {showGraph[ekey] && enq.id !== "__none__" && (
                                  <div className="border-t bg-muted/10 px-4 py-3 sm:pl-20">
                                    <EnqueteGraficos enqueteId={enq.id} compact />
                                  </div>
                                )}
                                {isEnqOpen && (
                                  <div className="border-t bg-muted/10 pl-20 pr-4 py-2">
                                    <div className="space-y-1">
                                      {enq.respostas.slice(0, 50).map((r: any) => (
                                        <div key={r.id} className={`flex items-center gap-3 rounded px-2 py-1.5 text-sm hover:bg-muted/50 ${r.arquivada ? "opacity-60" : ""}`}>
                                          <Avatar nome={r.nome} telefone={r.telefone} />
                                          <div className="flex min-w-0 flex-1 flex-col">
                                            <span className="truncate text-sm font-medium">{r.nome || <span className="text-muted-foreground font-normal">Contato do WhatsApp</span>}</span>
                                            <span className="text-xs text-muted-foreground">{formatDateTime(r.created_at)}</span>
                                          </div>
                                          <WhatsAppCell telefone={r.telefone} compact />
                                          <Badge variant="outline" className="hidden sm:inline-flex text-[10px]">{r.origem ?? "—"}</Badge>
                                          <Button asChild variant="ghost" size="sm">
                                            <Link to="/respostas/$id" params={{ id: r.id }}><Eye className="mr-1 h-3.5 w-3.5" /> Ver</Link>
                                          </Button>
                                        </div>
                                      ))}
                                      {enq.respostas.length > 50 && (
                                        <div className="px-2 py-1 text-xs text-muted-foreground">+ {enq.respostas.length - 50} respostas — use os filtros para reduzir.</div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const AVATAR_COLORS = ["bg-emerald-500", "bg-sky-500", "bg-violet-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-fuchsia-500", "bg-lime-500"];
function initials(nome?: string | null, telefone?: string | null) {
  const src = (nome ?? "").trim() || (telefone ?? "").replace(/\D/g, "").slice(-4) || "?";
  const parts = src.split(/\s+/);
  const first = parts[0]?.[0] ?? "?";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}
function hashIdx(s: string) {
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % AVATAR_COLORS.length;
}
function Avatar({ nome, telefone }: { nome?: string | null; telefone?: string | null }) {
  const key = (telefone ?? nome ?? "?").toString();
  const color = AVATAR_COLORS[hashIdx(key)];
  return (
    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white ${color}`}>
      {initials(nome, telefone)}
    </div>
  );
}
function WhatsAppCell({ telefone, compact = false }: { telefone?: string | null; compact?: boolean }) {
  if (!telefone) return <span className="text-xs text-muted-foreground">—</span>;
  const digits = telefone.replace(/\D/g, "");
  const masked = maskPhoneBR(telefone);
  return (
    <a
      href={`https://wa.me/${digits.startsWith("55") ? digits : `55${digits}`}`}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300 ${compact ? "text-xs" : "text-sm"}`}
    >
      <Phone className="h-3 w-3" /> {masked}
    </a>
  );
}