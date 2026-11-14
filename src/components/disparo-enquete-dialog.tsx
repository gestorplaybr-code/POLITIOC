import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Send, Upload, Users, FileText, AlertCircle, Loader2, CheckCircle2, X as XIcon, Search } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { dispararEnqueteWhatsapp } from "@/lib/disparo-enquete.functions";
import { csvToObjects } from "@/lib/csv-import";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

type Dest = { nome?: string | null; telefone: string; eleitor_id?: string | null };

function normPhone(raw: string): string {
  const d = String(raw ?? "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("55")) return d;
  if (d.length === 10 || d.length === 11) return "55" + d;
  return d;
}

export function DisparoEnqueteDialog({
  enquete,
  open,
  onOpenChange,
}: {
  enquete: { id: string; titulo: string; slug: string; token_convite?: string | null; politico_id: string; politico?: { nome?: string } | null };
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [source, setSource] = useState<"eleitores" | "paste" | "csv">("eleitores");

  // Source 1 — eleitores (filtros)
  const [busca, setBusca] = useState("");
  const [cidade, setCidade] = useState("");
  const [bairro, setBairro] = useState("");
  const [uf, setUf] = useState<string>("__all__");
  const [genero, setGenero] = useState<string>("__all__");
  const [statusEl, setStatusEl] = useState<string>("__all__");
  const [origem, setOrigem] = useState<string>("__all__");
  const [idadeMin, setIdadeMin] = useState<string>("");
  const [idadeMax, setIdadeMax] = useState<string>("");
  const [apenasTel, setApenasTel] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  function limparFiltros() {
    setBusca(""); setCidade(""); setBairro(""); setUf("__all__"); setGenero("__all__");
    setStatusEl("__all__"); setOrigem("__all__"); setIdadeMin(""); setIdadeMax("");
    setApenasTel(true); setPage(0);
  }

  // Source 2 — paste
  const [paste, setPaste] = useState("");
  // Source 3 — csv
  const [csvRows, setCsvRows] = useState<Dest[]>([]);
  const [csvError, setCsvError] = useState("");

  const [mensagem, setMensagem] = useState(
    "Olá {{nome}}! Sua opinião é muito importante. Responda nossa pesquisa: {{link}}",
  );
  const [ritmo, setRitmo] = useState(4);
  const [consentLGPD, setConsentLGPD] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ total: number; enviados: number; falhas: number } | null>(null);

  const eleitoresQ = useQuery({
    queryKey: ["disparo-eleitores", enquete.politico_id, busca, cidade, bairro, uf, genero, statusEl, origem, idadeMin, idadeMax, apenasTel],
    enabled: open && source === "eleitores",
    queryFn: async () => {
      let q = supabase
        .from("eleitores")
        .select("id, nome, telefone, email, cidade, bairro, uf, genero, status, origem, data_nascimento, tags")
        .eq("politico_id", enquete.politico_id)
        .order("nome", { ascending: true })
        .limit(5000);
      if (apenasTel) q = q.not("telefone", "is", null);
      if (busca.trim()) {
        const t = busca.trim().replace(/,/g, " ");
        q = q.or(`nome.ilike.%${t}%,telefone.ilike.%${t}%,email.ilike.%${t}%,cpf.ilike.%${t}%`);
      }
      if (cidade.trim()) q = q.ilike("cidade", `%${cidade.trim()}%`);
      if (bairro.trim()) q = q.ilike("bairro", `%${bairro.trim()}%`);
      if (uf !== "__all__") q = q.eq("uf", uf);
      if (genero !== "__all__") q = q.eq("genero", genero);
      if (statusEl !== "__all__") q = q.eq("status", statusEl);
      if (origem !== "__all__") q = q.eq("origem", origem);
      if (idadeMin || idadeMax) {
        const today = new Date();
        if (idadeMax) {
          const min = new Date(today.getFullYear() - (Number(idadeMax) + 1), today.getMonth(), today.getDate() + 1);
          q = q.gte("data_nascimento", min.toISOString().slice(0, 10));
        }
        if (idadeMin) {
          const max = new Date(today.getFullYear() - Number(idadeMin), today.getMonth(), today.getDate());
          q = q.lte("data_nascimento", max.toISOString().slice(0, 10));
        }
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const filtrados = eleitoresQ.data ?? [];
  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const pageRows = filtrados.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function togglePageAll(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      pageRows.forEach((r: any) => { checked ? next.add(r.id) : next.delete(r.id); });
      return next;
    });
  }
  function toggleAllFiltered(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filtrados.forEach((r: any) => { checked ? next.add(r.id) : next.delete(r.id); });
      return next;
    });
  }
  const pageAllChecked = pageRows.length > 0 && pageRows.every((r: any) => selectedIds.has(r.id));
  const allFilteredChecked = filtrados.length > 0 && filtrados.every((r: any) => selectedIds.has(r.id));

  function parsePastedNumbers(text: string): Dest[] {
    return text.split(/[\n,;]/).map((l) => l.trim()).filter(Boolean).map((l) => ({ telefone: l }));
  }

  function handleCsv(file: File) {
    setCsvError("");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        const rows = csvToObjects(text);
        if (!rows.length) { setCsvError("CSV vazio"); return; }
        const cols = Object.keys(rows[0]);
        const telCol = cols.find((c) => /tel|whats|fone|phone|celular/i.test(c)) ?? cols[0];
        const nameCol = cols.find((c) => /nome|name/i.test(c));
        const parsed: Dest[] = rows
          .map((r) => ({ telefone: r[telCol] ?? "", nome: nameCol ? r[nameCol] : "" }))
          .filter((r) => r.telefone);
        setCsvRows(parsed);
      } catch (e: any) {
        setCsvError(e?.message ?? "Falha ao ler CSV");
      }
    };
    reader.readAsText(file);
  }

  const rawDests = useMemo<Dest[]>(() => {
    if (source === "eleitores") {
      return filtrados
        .filter((e: any) => selectedIds.has(e.id))
        .map((e: any) => ({ nome: e.nome, telefone: e.telefone, eleitor_id: e.id }));
    }
    if (source === "paste") return parsePastedNumbers(paste);
    return csvRows;
  }, [source, filtrados, selectedIds, paste, csvRows]);

  const { validos, invalidos } = useMemo(() => {
    const seen = new Set<string>();
    const ok: Dest[] = [];
    let bad = 0;
    for (const d of rawDests) {
      const tel = normPhone(d.telefone);
      if (!tel || tel.length < 12) { bad++; continue; }
      if (seen.has(tel)) continue;
      seen.add(tel);
      ok.push({ ...d, telefone: tel });
    }
    return { validos: ok, invalidos: bad };
  }, [rawDests]);

  const disparar = useServerFn(dispararEnqueteWhatsapp);

  async function confirmar() {
    if (!validos.length) return;
    if (!consentLGPD) { toast.error("Confirme o consentimento LGPD"); return; }
    setRunning(true);
    setResult(null);
    try {
      const r = await disparar({
        data: {
          enquete_id: enquete.id,
          nome_campanha: `Disparo — ${enquete.titulo} — ${new Date().toLocaleString("pt-BR")}`,
          mensagem,
          ritmo_segundos: ritmo,
          destinatarios: validos.slice(0, 5000),
        },
      });
      setResult({ total: r.total, enviados: r.enviados, falhas: r.falhas });
      toast.success(`Disparo concluído: ${r.enviados} enviados, ${r.falhas} falhas`);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha no disparo");
    } finally {
      setRunning(false);
    }
  }

  function resetAndClose() {
    setStep(1); setSource("eleitores"); setPaste(""); setCsvRows([]);
    limparFiltros(); setSelectedIds(new Set());
    setResult(null); setConsentLGPD(false);
    onOpenChange(false);
  }

  const linkExemplo = typeof window !== "undefined"
    ? `${window.location.origin}/c/${enquete.token_convite ?? enquete.slug}`
    : `/c/${enquete.token_convite ?? enquete.slug}`;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!running) (o ? onOpenChange(true) : resetAndClose()); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Send className="h-5 w-5" /> Enviar enquete por WhatsApp</DialogTitle>
          <DialogDescription>
            Disparo em massa para os participantes — passo {step} de 3 — <strong>{enquete.titulo}</strong>
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 py-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h3 className="text-lg font-semibold">Disparo concluído</h3>
            <div className="flex justify-center gap-6 text-sm">
              <div><div className="text-2xl font-bold">{result.total}</div><div className="text-muted-foreground">Total</div></div>
              <div><div className="text-2xl font-bold text-emerald-500">{result.enviados}</div><div className="text-muted-foreground">Enviados</div></div>
              <div><div className="text-2xl font-bold text-rose-500">{result.falhas}</div><div className="text-muted-foreground">Falhas</div></div>
            </div>
            <Button onClick={resetAndClose}>Fechar</Button>
          </div>
        ) : (
          <>
            {/* PASSO 1 — Destinatários */}
            {step === 1 && (
              <div className="space-y-4">
                <Tabs value={source} onValueChange={(v) => setSource(v as any)}>
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="eleitores"><Users className="mr-2 h-4 w-4" />Eleitores</TabsTrigger>
                    <TabsTrigger value="paste"><FileText className="mr-2 h-4 w-4" />Colar números</TabsTrigger>
                    <TabsTrigger value="csv"><Upload className="mr-2 h-4 w-4" />CSV</TabsTrigger>
                  </TabsList>
                  <TabsContent value="eleitores" className="space-y-3 pt-3">
                    {/* Filtros */}
                    <div className="rounded-md border bg-muted/20 p-3 space-y-3">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={busca}
                          onChange={(e) => { setBusca(e.target.value); setPage(0); }}
                          placeholder="Buscar por nome, telefone, e-mail ou CPF…"
                          className="pl-8"
                        />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        <Input value={cidade} onChange={(e) => { setCidade(e.target.value); setPage(0); }} placeholder="Cidade" />
                        <Input value={bairro} onChange={(e) => { setBairro(e.target.value); setPage(0); }} placeholder="Bairro" />
                        <Select value={uf} onValueChange={(v) => { setUf(v); setPage(0); }}>
                          <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">Todas UFs</SelectItem>
                            {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map((u) => (
                              <SelectItem key={u} value={u}>{u}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={genero} onValueChange={(v) => { setGenero(v); setPage(0); }}>
                          <SelectTrigger><SelectValue placeholder="Gênero" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">Todos gêneros</SelectItem>
                            <SelectItem value="M">Masculino</SelectItem>
                            <SelectItem value="F">Feminino</SelectItem>
                            <SelectItem value="Outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={statusEl} onValueChange={(v) => { setStatusEl(v); setPage(0); }}>
                          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">Todos status</SelectItem>
                            <SelectItem value="ativo">Ativo</SelectItem>
                            <SelectItem value="inativo">Inativo</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={origem} onValueChange={(v) => { setOrigem(v); setPage(0); }}>
                          <SelectTrigger><SelectValue placeholder="Origem" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">Todas origens</SelectItem>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="import">Importação</SelectItem>
                            <SelectItem value="link_publico">Link público</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input type="number" min={0} max={120} value={idadeMin} onChange={(e) => { setIdadeMin(e.target.value); setPage(0); }} placeholder="Idade mín." />
                        <Input type="number" min={0} max={120} value={idadeMax} onChange={(e) => { setIdadeMax(e.target.value); setPage(0); }} placeholder="Idade máx." />
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox checked={apenasTel} onCheckedChange={(v) => { setApenasTel(!!v); setPage(0); }} />
                          <span>Só com telefone</span>
                        </label>
                      </div>
                      <div className="flex justify-end">
                        <Button variant="ghost" size="sm" onClick={limparFiltros}>
                          <XIcon className="mr-1 h-3.5 w-3.5" /> Limpar filtros
                        </Button>
                      </div>
                    </div>

                    {/* Cabeçalho de seleção */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2">
                          <Checkbox checked={pageAllChecked} onCheckedChange={(v) => togglePageAll(!!v)} />
                          <span>Selecionar página ({pageRows.length})</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <Checkbox checked={allFilteredChecked} onCheckedChange={(v) => toggleAllFiltered(!!v)} />
                          <span>Selecionar todos filtrados ({filtrados.length})</span>
                        </label>
                      </div>
                      <div className="text-muted-foreground">
                        <strong className="text-foreground">{selectedIds.size}</strong> selecionado(s) de {filtrados.length}
                      </div>
                    </div>

                    {/* Tabela rolável */}
                    <div className="max-h-[320px] overflow-auto rounded-md border">
                      {eleitoresQ.isLoading ? (
                        <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando eleitores…
                        </div>
                      ) : filtrados.length === 0 ? (
                        <div className="py-10 text-center text-sm text-muted-foreground">
                          Nenhum eleitor encontrado com esses filtros.
                          <br />
                          <span className="text-xs">Ajuste os filtros ou cadastre eleitores em <code>/eleitores</code>.</span>
                        </div>
                      ) : (
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-background border-b">
                            <tr className="text-left">
                              <th className="w-10 p-2"></th>
                              <th className="p-2">Nome</th>
                              <th className="p-2">Telefone</th>
                              <th className="p-2">Cidade / Bairro</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pageRows.map((r: any) => {
                              const checked = selectedIds.has(r.id);
                              return (
                                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                                  <td className="p-2">
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(v) => {
                                        setSelectedIds((prev) => {
                                          const n = new Set(prev);
                                          v ? n.add(r.id) : n.delete(r.id);
                                          return n;
                                        });
                                      }}
                                    />
                                  </td>
                                  <td className="p-2">{r.nome ?? <em className="text-muted-foreground">sem nome</em>}</td>
                                  <td className="p-2 font-mono text-xs">{r.telefone ?? "—"}</td>
                                  <td className="p-2 text-muted-foreground">
                                    {[r.cidade, r.bairro].filter(Boolean).join(" / ") || "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* Paginação */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Página {page + 1} de {totalPages}</span>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Anterior</Button>
                          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>Próxima</Button>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="paste" className="space-y-2 pt-3">
                    <Label>Cole os números (um por linha, ou separados por vírgula)</Label>
                    <Textarea rows={8} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={"(11) 91234-5678\n11987654321\n..."} />
                  </TabsContent>
                  <TabsContent value="csv" className="space-y-2 pt-3">
                    <Label>Selecione um CSV com colunas <code>nome,telefone</code></Label>
                    <Input type="file" accept=".csv,text/csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsv(f); }} />
                    {csvError && <p className="text-sm text-rose-500">{csvError}</p>}
                    {csvRows.length > 0 && <p className="text-sm text-muted-foreground">{csvRows.length} linha(s) carregada(s) do CSV.</p>}
                  </TabsContent>
                </Tabs>

                <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3 text-sm">
                  <Badge variant="default">{validos.length} válidos</Badge>
                  {invalidos > 0 && <Badge variant="secondary">{invalidos} inválidos descartados</Badge>}
                  {validos.length > 5000 && <Badge variant="destructive">Limite: 5000 por disparo</Badge>}
                </div>
              </div>
            )}

            {/* PASSO 2 — Mensagem */}
            {step === 2 && (
              <div className="space-y-3">
                <div>
                  <Label>Mensagem</Label>
                  <Textarea rows={6} value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Variáveis: <code>{`{{nome}}`}</code>, <code>{`{{link}}`}</code>, <code>{`{{politico}}`}</code>, <code>{`{{titulo}}`}</code>
                  </p>
                </div>
                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Prévia (1º destinatário)</p>
                  <p className="whitespace-pre-wrap text-sm">
                    {mensagem
                      .replaceAll("{{nome}}", validos[0]?.nome ?? "Eleitor")
                      .replaceAll("{{link}}", linkExemplo)
                      .replaceAll("{{politico}}", enquete.politico?.nome ?? "")
                      .replaceAll("{{titulo}}", enquete.titulo)}
                  </p>
                </div>
              </div>
            )}

            {/* PASSO 3 — Confirmação */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Intervalo entre envios</Label>
                    <Select value={String(ritmo)} onValueChange={(v) => setRitmo(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 segundos (rápido)</SelectItem>
                        <SelectItem value="4">4 segundos (recomendado)</SelectItem>
                        <SelectItem value="6">6 segundos</SelectItem>
                        <SelectItem value="10">10 segundos (seguro)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="rounded-md border bg-muted/30 p-3 text-sm">
                    <div className="font-medium">Duração estimada</div>
                    <div className="text-muted-foreground">
                      ≈ {Math.ceil((validos.length * ritmo) / 60)} min ({validos.length} × {ritmo}s)
                    </div>
                  </div>
                </div>

                <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                  <div className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4" /> Aviso importante
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    A janela precisa permanecer aberta até o fim do disparo. Disparos muito rápidos podem fazer
                    a Z-API bloquear sua instância.
                  </p>
                </div>

                <label className="flex items-start gap-2 text-sm">
                  <Checkbox checked={consentLGPD} onCheckedChange={(v) => setConsentLGPD(!!v)} />
                  <span>Confirmo que tenho consentimento dos destinatários para receber mensagens (LGPD).</span>
                </label>

                <div className="rounded-md border p-3 text-sm">
                  <div className="flex justify-between"><span>Destinatários:</span><strong>{validos.length}</strong></div>
                  <div className="flex justify-between"><span>Ritmo:</span><strong>{ritmo}s</strong></div>
                  <div className="flex justify-between"><span>Enquete:</span><strong>{enquete.titulo}</strong></div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-2">
              {step > 1 && <Button variant="outline" onClick={() => setStep((s) => (s - 1) as any)} disabled={running}>Voltar</Button>}
              {step < 3 && (
                <Button onClick={() => setStep((s) => (s + 1) as any)} disabled={step === 1 && validos.length === 0}>
                  Avançar
                </Button>
              )}
              {step === 3 && (
                <Button onClick={confirmar} disabled={running || !consentLGPD || !validos.length}>
                  {running ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Disparando...</> : <><Send className="mr-2 h-4 w-4" /> Disparar agora</>}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}