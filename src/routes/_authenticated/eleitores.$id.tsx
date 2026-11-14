import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { useInvalidate, toastError } from "@/lib/use-mutation-toast";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatPhone, maskCpf } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/eleitores/$id")({
  head: () => ({ meta: [{ title: "Eleitor — Política+" }] }),
  component: EleitorDetail,
});

const schema = z.object({
  nome: z.string().trim().min(2).max(150),
  telefone: z.string().trim().max(40).optional().nullable(),
  email: z.string().trim().email().optional().or(z.literal("")).nullable(),
  cpf: z.string().trim().max(20).optional().nullable(),
  data_nascimento: z.string().optional().nullable().or(z.literal("").transform(() => null)),
  genero: z.string().optional().nullable(),
  cep: z.string().trim().max(15).optional().nullable(),
  rua: z.string().trim().max(150).optional().nullable(),
  numero: z.string().trim().max(20).optional().nullable(),
  complemento: z.string().trim().max(80).optional().nullable(),
  bairro: z.string().trim().max(120).optional().nullable(),
  cidade: z.string().trim().max(120).optional().nullable(),
  uf: z.string().trim().max(2).optional().nullable(),
  observacoes: z.string().trim().max(2000).optional().nullable(),
  origem: z.string().trim().max(60).optional().nullable(),
  status: z.enum(["ativo", "inativo", "arquivado"]),
  bairro_id: z.string().uuid().optional().nullable().or(z.literal("").transform(() => null)),
  coordenador_id: z.string().uuid().optional().nullable().or(z.literal("").transform(() => null)),
  zona: z.string().trim().max(10).optional().nullable(),
  secao: z.string().trim().max(10).optional().nullable(),
  titulo_eleitor: z.string().trim().max(20).optional().nullable(),
});

function EleitorDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { isAdmin } = useCurrentUser();
  const invalidate = useInvalidate();
  const [status, setStatus] = useState("ativo");
  const [genero, setGenero] = useState("");
  const [bairroId, setBairroId] = useState("");
  const [coordId, setCoordId] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const q = useQuery({
    queryKey: ["eleitor", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("eleitores").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Eleitor não encontrado");
      return data;
    },
  });

  useEffect(() => {
    if (q.data) {
      setStatus(q.data.status);
      setGenero(q.data.genero ?? "");
      setBairroId(q.data.bairro_id ?? "");
      setCoordId(q.data.coordenador_id ?? "");
      setTags(((q.data as any).tags as string[] | null) ?? []);
    }
  }, [q.data]);

  const polId = q.data?.politico_id;
  const bairros = useQuery({
    queryKey: ["bairros-of", polId],
    enabled: !!polId,
    queryFn: async () => {
      const { data, error } = await supabase.from("bairros").select("id, nome").eq("politico_id", polId!).order("nome");
      if (error) throw error;
      return data;
    },
  });
  const coords = useQuery({
    queryKey: ["coords-of", polId],
    enabled: !!polId,
    queryFn: async () => {
      const { data, error } = await supabase.from("coordenadores").select("id, nome").eq("politico_id", polId!).order("nome");
      if (error) throw error;
      return data;
    },
  });

  const update = useMutation({
    mutationFn: async (input: z.infer<typeof schema>) => {
      const payload = { ...input, email: input.email || null, data_nascimento: input.data_nascimento || null, genero: input.genero || null, tags: tags.length ? tags : null } as any;
      const { error } = await supabase.from("eleitores").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Eleitor atualizado"); invalidate([["eleitor", id], ["eleitores"]]); },
    onError: (e) => toastError(e),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("eleitores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Excluído"); invalidate([["eleitores"]]); navigate({ to: "/eleitores" }); },
    onError: (e) => toastError(e),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = schema.safeParse({ ...fd, status, genero, bairro_id: bairroId || null, coordenador_id: coordId || null });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    update.mutate(parsed.data);
  }

  if (q.isLoading) return <p className="text-muted-foreground">Carregando...</p>;
  if (q.isError) return <p className="text-destructive">{(q.error as Error).message}</p>;
  const e = q.data!;

  return (
    <div className="space-y-6">
      <Link to="/eleitores" className="inline-flex items-center text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="mr-1 h-4 w-4" />Voltar
      </Link>
      <PageHeader
        title={e.nome}
        description={[formatPhone(e.telefone), e.cidade, e.cpf ? `CPF ${maskCpf(e.cpf)}` : null].filter(Boolean).join(" · ")}
        actions={
          <Button variant="destructive" onClick={() => { if (confirm("Excluir eleitor?")) remove.mutate(); }}>
            <Trash2 className="mr-2 h-4 w-4" />Excluir
          </Button>
        }
      />
      <Tabs defaultValue="dados">
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="respostas">Respostas</TabsTrigger>
          <TabsTrigger value="mensagens">Mensagens</TabsTrigger>
        </TabsList>
        <TabsContent value="dados">
      <form onSubmit={onSubmit} className="grid max-w-3xl gap-4 rounded-lg border bg-card p-6">
        <div className="space-y-1.5"><Label>Nome *</Label><Input name="nome" defaultValue={e.nome} required /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Telefone / WhatsApp</Label><Input name="telefone" defaultValue={e.telefone ?? ""} /></div>
          <div className="space-y-1.5"><Label>E-mail</Label><Input name="email" type="email" defaultValue={e.email ?? ""} /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5"><Label>CPF</Label><Input name="cpf" defaultValue={e.cpf ?? ""} /></div>
          <div className="space-y-1.5"><Label>Nascimento</Label><Input name="data_nascimento" type="date" defaultValue={e.data_nascimento ?? ""} /></div>
          <div className="space-y-1.5"><Label>Gênero</Label>
            <Select value={genero} onValueChange={setGenero}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="masculino">Masculino</SelectItem>
                <SelectItem value="feminino">Feminino</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5"><Label>CEP</Label><Input name="cep" defaultValue={e.cep ?? ""} /></div>
          <div className="col-span-2 space-y-1.5"><Label>Rua</Label><Input name="rua" defaultValue={e.rua ?? ""} /></div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="space-y-1.5"><Label>Número</Label><Input name="numero" defaultValue={e.numero ?? ""} /></div>
          <div className="space-y-1.5"><Label>Complemento</Label><Input name="complemento" defaultValue={e.complemento ?? ""} /></div>
          <div className="space-y-1.5"><Label>Bairro (texto)</Label><Input name="bairro" defaultValue={e.bairro ?? ""} /></div>
          <div className="space-y-1.5"><Label>Cidade</Label><Input name="cidade" defaultValue={e.cidade ?? ""} /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5"><Label>UF</Label><Input name="uf" maxLength={2} defaultValue={e.uf ?? ""} /></div>
          <div className="space-y-1.5">
            <Label>Bairro cadastrado</Label>
            <Select value={bairroId} onValueChange={setBairroId}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{bairros.data?.map((b) => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Coordenador</Label>
            <Select value={coordId} onValueChange={setCoordId}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{coords.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Origem</Label><Input name="origem" defaultValue={e.origem ?? ""} /></div>
          <div className="space-y-1.5"><Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
                <SelectItem value="arquivado">Arquivado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5"><Label>Observações</Label><Textarea name="observacoes" rows={3} defaultValue={e.observacoes ?? ""} /></div>
        <div className="rounded-md border bg-muted/20 p-3 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dados eleitorais</div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>Zona</Label><Input name="zona" defaultValue={(e as any).zona ?? ""} placeholder="Ex.: 123" /></div>
            <div className="space-y-1.5"><Label>Seção</Label><Input name="secao" defaultValue={(e as any).secao ?? ""} placeholder="Ex.: 0045" /></div>
            <div className="space-y-1.5"><Label>Título de eleitor</Label><Input name="titulo_eleitor" defaultValue={(e as any).titulo_eleitor ?? ""} /></div>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-1.5 rounded-md border p-2 min-h-10">
            {tags.map((t) => (
              <Badge key={t} variant="secondary" className="gap-1">
                {t}
                <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <input
              value={tagInput}
              onChange={(ev) => setTagInput(ev.target.value)}
              onKeyDown={(ev) => {
                if ((ev.key === "Enter" || ev.key === ",") && tagInput.trim()) {
                  ev.preventDefault();
                  const v = tagInput.trim().slice(0, 40);
                  if (!tags.includes(v)) setTags([...tags, v]);
                  setTagInput("");
                } else if (ev.key === "Backspace" && !tagInput && tags.length) {
                  setTags(tags.slice(0, -1));
                }
              }}
              placeholder="Digite e pressione Enter"
              className="flex-1 min-w-[120px] bg-transparent text-sm outline-none"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Badge variant={e.status === "ativo" ? "default" : "secondary"}>{e.status}</Badge>
          <Button type="submit" disabled={update.isPending}>{update.isPending ? "Salvando..." : "Salvar alterações"}</Button>
        </div>
      </form>
        </TabsContent>
        <TabsContent value="respostas"><EleitorRespostas eleitorId={id} /></TabsContent>
        <TabsContent value="mensagens"><EleitorMensagens eleitorId={id} /></TabsContent>
      </Tabs>
    </div>
  );
}

function EleitorRespostas({ eleitorId }: { eleitorId: string }) {
  const q = useQuery({
    queryKey: ["eleitor-respostas", eleitorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("respostas")
        .select("id, created_at, enquete:enquetes(id, titulo, slug)")
        .eq("eleitor_id", eleitorId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!q.data?.length) return <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhuma resposta registrada.</p>;
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader><TableRow><TableHead>Enquete</TableHead><TableHead>Data</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {q.data.map((r: any) => (
            <TableRow key={r.id}>
              <TableCell>{r.enquete?.titulo ?? "—"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatDateTime(r.created_at)}</TableCell>
              <TableCell className="text-right">
                <Link to="/respostas/$id" params={{ id: r.id }} className="text-sm text-primary hover:underline">Ver</Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function EleitorMensagens({ eleitorId }: { eleitorId: string }) {
  const q = useQuery({
    queryKey: ["eleitor-mensagens", eleitorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_envios")
        .select("id, mensagem, status, enviado_em, erro, created_at, campanha:whatsapp_campanhas(nome)")
        .eq("eleitor_id", eleitorId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!q.data?.length) return <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhuma mensagem enviada.</p>;
  return (
    <div className="space-y-2">
      {q.data.map((m: any) => (
        <div key={m.id} className="rounded-md border bg-card p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">{m.campanha?.nome ?? "Avulsa"}</span>
            <Badge variant={m.status === "enviado" ? "default" : "secondary"}>{m.status}</Badge>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{m.mensagem}</p>
          <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(m.enviado_em ?? m.created_at)}{m.erro ? ` · ${m.erro}` : ""}</p>
        </div>
      ))}
    </div>
  );
}