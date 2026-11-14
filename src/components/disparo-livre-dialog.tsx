import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Send, Users, Loader2, CheckCircle2, X as XIcon, Search, Image as ImageIcon, Video, FileText, Mic, Type } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { dispararMensagemLivre } from "@/lib/disparo-livre.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

type TipoMidia = "texto" | "imagem" | "video" | "audio" | "documento";

function normPhone(raw: string): string {
  const d = String(raw ?? "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("55")) return d;
  if (d.length === 10 || d.length === 11) return "55" + d;
  return d;
}

export function DisparoLivreDialog({
  politicoId,
  open,
  onOpenChange,
}: {
  politicoId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [busca, setBusca] = useState("");
  const [cidade, setCidade] = useState("");
  const [bairro, setBairro] = useState("");
  const [zona, setZona] = useState("");
  const [secao, setSecao] = useState("");
  const [genero, setGenero] = useState<string>("__all__");
  const [statusEl, setStatusEl] = useState<string>("__all__");
  const [origem, setOrigem] = useState<string>("__all__");
  const [coordId, setCoordId] = useState<string>("__all__");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const [tipoMidia, setTipoMidia] = useState<TipoMidia>("texto");
  const [mensagem, setMensagem] = useState("Olá {{nome}}! ");
  const [midiaUrl, setMidiaUrl] = useState("");
  const [midiaNome, setMidiaNome] = useState("");
  const [uploading, setUploading] = useState(false);

  const [ritmo, setRitmo] = useState(4);
  const [nomeCampanha, setNomeCampanha] = useState("");
  const [consentLGPD, setConsentLGPD] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ total: number; enviados: number; falhas: number } | null>(null);

  const coordsQ = useQuery({
    queryKey: ["dl-coords", politicoId],
    enabled: open && !!politicoId,
    queryFn: async () => {
      const { data } = await supabase.from("coordenadores").select("id, nome").eq("politico_id", politicoId).order("nome");
      return data ?? [];
    },
  });

  const eleitoresQ = useQuery({
    queryKey: ["dl-eleitores", politicoId, busca, cidade, bairro, zona, secao, genero, statusEl, origem, coordId],
    enabled: open && !!politicoId,
    queryFn: async () => {
      let q = supabase
        .from("eleitores")
        .select("id, nome, telefone, cidade, bairro, zona, secao, genero, status, origem, coordenador_id")
        .eq("politico_id", politicoId)
        .not("telefone", "is", null)
        .order("nome", { ascending: true })
        .limit(5000);
      if (busca.trim()) {
        const t = busca.trim();
        q = q.or(`nome.ilike.%${t}%,telefone.ilike.%${t}%`);
      }
      if (cidade.trim()) q = q.ilike("cidade", `%${cidade.trim()}%`);
      if (bairro.trim()) q = q.ilike("bairro", `%${bairro.trim()}%`);
      if (zona.trim()) q = q.eq("zona", zona.trim());
      if (secao.trim()) q = q.eq("secao", secao.trim());
      if (genero !== "__all__") q = q.eq("genero", genero);
      if (statusEl !== "__all__") q = q.eq("status", statusEl);
      if (origem !== "__all__") q = q.eq("origem", origem);
      if (coordId !== "__all__") q = q.eq("coordenador_id", coordId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const filtrados = eleitoresQ.data ?? [];
  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const pageRows = filtrados.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pageAllChecked = pageRows.length > 0 && pageRows.every((r: any) => selectedIds.has(r.id));
  const allFilteredChecked = filtrados.length > 0 && filtrados.every((r: any) => selectedIds.has(r.id));

  function togglePageAll(v: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      pageRows.forEach((r: any) => { v ? next.add(r.id) : next.delete(r.id); });
      return next;
    });
  }
  function toggleAllFiltered(v: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filtrados.forEach((r: any) => { v ? next.add(r.id) : next.delete(r.id); });
      return next;
    });
  }

  const destinatarios = useMemo(() => {
    return filtrados
      .filter((e: any) => selectedIds.has(e.id))
      .map((e: any) => ({ nome: e.nome, telefone: normPhone(e.telefone), eleitor_id: e.id, cidade: e.cidade, zona: e.zona, secao: e.secao }))
      .filter((d) => d.telefone.length >= 12);
  }, [filtrados, selectedIds]);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${politicoId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("whatsapp-midia").upload(path, file, {
        cacheControl: "3600", upsert: false, contentType: file.type,
      });
      if (error) throw error;
      // signed URL válida por 24h
      const { data: signed, error: se } = await supabase.storage.from("whatsapp-midia").createSignedUrl(path, 60 * 60 * 24);
      if (se) throw se;
      setMidiaUrl(signed.signedUrl);
      setMidiaNome(file.name);
      toast.success("Mídia enviada");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha no upload");
    } finally {
      setUploading(false);
    }
  }

  const disparar = useServerFn(dispararMensagemLivre);

  async function confirmar() {
    if (!destinatarios.length) return;
    if (!consentLGPD) { toast.error("Confirme o consentimento LGPD"); return; }
    if (tipoMidia !== "texto" && !midiaUrl) { toast.error("Envie a mídia primeiro"); return; }
    setRunning(true); setResult(null);
    try {
      const r = await disparar({
        data: {
          politico_id: politicoId,
          nome_campanha: nomeCampanha.trim() || `Disparo direto — ${new Date().toLocaleString("pt-BR")}`,
          tipo_midia: tipoMidia,
          mensagem,
          midia_url: midiaUrl || null,
          midia_nome: midiaNome || null,
          ritmo_segundos: ritmo,
          destinatarios: destinatarios.slice(0, 5000),
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
    setStep(1); setSelectedIds(new Set()); setResult(null); setConsentLGPD(false);
    setMensagem("Olá {{nome}}! "); setTipoMidia("texto"); setMidiaUrl(""); setMidiaNome("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!running) (o ? onOpenChange(true) : resetAndClose()); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Send className="h-5 w-5" /> Disparo direto</DialogTitle>
          <DialogDescription>
            Envie mensagem, imagem, vídeo, áudio ou documento diretamente para sua base — passo {step} de 3
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
            {step === 1 && (
              <div className="space-y-3">
                <div className="rounded-md border bg-muted/20 p-3 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-8" value={busca} onChange={(e) => { setBusca(e.target.value); setPage(0); }} placeholder="Buscar nome ou telefone…" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <Input value={cidade} onChange={(e) => { setCidade(e.target.value); setPage(0); }} placeholder="Cidade" />
                    <Input value={bairro} onChange={(e) => { setBairro(e.target.value); setPage(0); }} placeholder="Bairro" />
                    <Input value={zona} onChange={(e) => { setZona(e.target.value); setPage(0); }} placeholder="Zona eleitoral" />
                    <Input value={secao} onChange={(e) => { setSecao(e.target.value); setPage(0); }} placeholder="Seção" />
                    <Select value={coordId} onValueChange={(v) => { setCoordId(v); setPage(0); }}>
                      <SelectTrigger><SelectValue placeholder="Coordenador" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todos coordenadores</SelectItem>
                        {coordsQ.data?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={genero} onValueChange={(v) => { setGenero(v); setPage(0); }}>
                      <SelectTrigger><SelectValue placeholder="Gênero" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todos gêneros</SelectItem>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="feminino">Feminino</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
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
                        <SelectItem value="enquete">Enquete</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2">
                      <Checkbox checked={pageAllChecked} onCheckedChange={(v) => togglePageAll(!!v)} />
                      <span>Página ({pageRows.length})</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <Checkbox checked={allFilteredChecked} onCheckedChange={(v) => toggleAllFiltered(!!v)} />
                      <span>Todos filtrados ({filtrados.length})</span>
                    </label>
                  </div>
                  <div className="text-muted-foreground">
                    <strong className="text-foreground">{selectedIds.size}</strong> selecionado(s)
                  </div>
                </div>

                <div className="max-h-[300px] overflow-auto rounded-md border">
                  {eleitoresQ.isLoading ? (
                    <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
                    </div>
                  ) : filtrados.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">Nenhum eleitor com esses filtros.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-background border-b">
                        <tr className="text-left">
                          <th className="w-10 p-2"></th>
                          <th className="p-2">Nome</th>
                          <th className="p-2">Telefone</th>
                          <th className="p-2">Cidade / Zona / Seção</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.map((r: any) => (
                          <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="p-2">
                              <Checkbox
                                checked={selectedIds.has(r.id)}
                                onCheckedChange={(v) => setSelectedIds((prev) => {
                                  const n = new Set(prev); v ? n.add(r.id) : n.delete(r.id); return n;
                                })}
                              />
                            </td>
                            <td className="p-2">{r.nome ?? "—"}</td>
                            <td className="p-2 font-mono text-xs">{r.telefone ?? "—"}</td>
                            <td className="p-2 text-muted-foreground">
                              {[r.cidade, r.zona ? `Z${r.zona}` : null, r.secao ? `S${r.secao}` : null].filter(Boolean).join(" / ") || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Página {page + 1} de {totalPages}</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
                      <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3 text-sm">
                  <Badge variant="default">{destinatarios.length} válidos</Badge>
                  {destinatarios.length > 5000 && <Badge variant="destructive">Limite: 5000 por disparo</Badge>}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <div>
                  <Label>Tipo de conteúdo</Label>
                  <div className="mt-2 grid grid-cols-5 gap-2">
                    {([
                      { v: "texto", i: Type, l: "Texto" },
                      { v: "imagem", i: ImageIcon, l: "Imagem" },
                      { v: "video", i: Video, l: "Vídeo" },
                      { v: "documento", i: FileText, l: "PDF" },
                      { v: "audio", i: Mic, l: "Áudio" },
                    ] as const).map((t) => (
                      <button
                        key={t.v}
                        type="button"
                        onClick={() => { setTipoMidia(t.v); setMidiaUrl(""); setMidiaNome(""); }}
                        className={`flex flex-col items-center gap-1 rounded-md border p-2 text-xs transition ${
                          tipoMidia === t.v ? "border-primary bg-primary/10" : "hover:bg-muted"
                        }`}
                      >
                        <t.i className="h-5 w-5" /> {t.l}
                      </button>
                    ))}
                  </div>
                </div>

                {tipoMidia !== "texto" && (
                  <div className="space-y-2">
                    <Label>
                      {tipoMidia === "imagem" && "Imagem (JPG/PNG até ~5MB)"}
                      {tipoMidia === "video" && "Vídeo (MP4 até ~16MB)"}
                      {tipoMidia === "audio" && "Áudio (MP3/OGG)"}
                      {tipoMidia === "documento" && "Documento (PDF)"}
                    </Label>
                    <Input
                      type="file"
                      disabled={uploading}
                      accept={
                        tipoMidia === "imagem" ? "image/*" :
                        tipoMidia === "video" ? "video/*" :
                        tipoMidia === "audio" ? "audio/*" :
                        "application/pdf"
                      }
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
                    />
                    {uploading && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Enviando…</p>}
                    {midiaUrl && !uploading && (
                      <p className="text-xs text-emerald-500 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {midiaNome}</p>
                    )}
                  </div>
                )}

                <div>
                  <Label>{tipoMidia === "texto" ? "Mensagem" : tipoMidia === "audio" ? "Mensagem (não usada em áudio)" : "Legenda"}</Label>
                  <Textarea rows={5} value={mensagem} onChange={(e) => setMensagem(e.target.value)} disabled={tipoMidia === "audio"} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Variáveis disponíveis: <code>{`{{nome}}`}</code>, <code>{`{{cidade}}`}</code>, <code>{`{{zona}}`}</code>, <code>{`{{secao}}`}</code>
                  </p>
                </div>

                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Prévia (1º destinatário)</p>
                  <p className="whitespace-pre-wrap text-sm">
                    {mensagem
                      .replaceAll("{{nome}}", destinatarios[0]?.nome ?? "Eleitor")
                      .replaceAll("{{cidade}}", destinatarios[0]?.cidade ?? "")}
                  </p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Nome da campanha</Label>
                  <Input value={nomeCampanha} onChange={(e) => setNomeCampanha(e.target.value)} placeholder="Ex.: Comunicado geral — outubro" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Intervalo entre envios</Label>
                    <Select value={String(ritmo)} onValueChange={(v) => setRitmo(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2s (rápido)</SelectItem>
                        <SelectItem value="4">4s (recomendado)</SelectItem>
                        <SelectItem value="6">6s</SelectItem>
                        <SelectItem value="10">10s (seguro)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="rounded-md border bg-muted/30 p-3 text-sm">
                    <div className="font-medium">Duração estimada</div>
                    <div className="text-muted-foreground">≈ {Math.ceil((destinatarios.length * ritmo) / 60)} min</div>
                  </div>
                </div>
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox checked={consentLGPD} onCheckedChange={(v) => setConsentLGPD(!!v)} />
                  <span>Confirmo que tenho consentimento dos destinatários (LGPD).</span>
                </label>
                <div className="rounded-md border p-3 text-sm space-y-1">
                  <div className="flex justify-between"><span>Destinatários:</span><strong>{destinatarios.length}</strong></div>
                  <div className="flex justify-between"><span>Tipo:</span><strong>{tipoMidia}</strong></div>
                  <div className="flex justify-between"><span>Ritmo:</span><strong>{ritmo}s</strong></div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-2">
              {step > 1 && <Button variant="outline" onClick={() => setStep((s) => (s - 1) as any)} disabled={running}>Voltar</Button>}
              {step < 3 && (
                <Button
                  onClick={() => setStep((s) => (s + 1) as any)}
                  disabled={(step === 1 && destinatarios.length === 0) || (step === 2 && tipoMidia !== "texto" && !midiaUrl)}
                >
                  Avançar
                </Button>
              )}
              {step === 3 && (
                <Button onClick={confirmar} disabled={running || !consentLGPD || !destinatarios.length}>
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