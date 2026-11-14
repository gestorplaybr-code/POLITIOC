import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";
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
import { X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/candidatos/$id")({
  head: () => ({ meta: [{ title: "Candidato — Política+" }] }),
  component: CandidatoDetail,
});

const schema = z.object({
  nome: z.string().trim().min(2).max(120),
  partido: z.string().trim().max(50).optional().nullable(),
  cargo_pretendido: z.string().trim().max(80).optional().nullable(),
  numero: z.string().trim().max(10).optional().nullable(),
  cidade: z.string().trim().max(80).optional().nullable(),
  estado: z.string().trim().max(2).optional().nullable(),
  bio: z.string().trim().max(2000).optional().nullable(),
  politico_id: z.string().uuid().optional().nullable().or(z.literal("").transform(() => null)),
  pleito_id: z.string().uuid().optional().nullable().or(z.literal("").transform(() => null)),
  status: z.enum(["ativo", "inativo", "arquivado"]),
});

function CandidatoDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { isAdmin } = useCurrentUser();
  const invalidate = useInvalidate();
  const qc = useQueryClient();
  const [status, setStatus] = useState("ativo");
  const [politicoId, setPoliticoId] = useState("");
  const [pleitoId, setPleitoId] = useState("");

  const q = useQuery({
    queryKey: ["candidato", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("candidatos").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Candidato não encontrado");
      return data;
    },
  });

  useEffect(() => {
    if (q.data) {
      setStatus(q.data.status);
      setPoliticoId(q.data.politico_id ?? "");
      setPleitoId(q.data.pleito_id ?? "");
    }
  }, [q.data]);

  const politicos = useQuery({
    queryKey: ["politicos-lookup"],
    queryFn: async () => {
      const { data, error } = await supabase.from("politicos").select("id, nome").order("nome");
      if (error) throw error;
      return data;
    },
  });
  const pleitos = useQuery({
    queryKey: ["pleitos-lookup"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pleitos").select("id, nome").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const linkedCoords = useQuery({
    queryKey: ["candidato-coords", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidato_coordenadores")
        .select("coordenador_id, coordenador:coordenadores(id, nome)")
        .eq("candidato_id", id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const availableCoords = useQuery({
    queryKey: ["coordenadores-por-politico", politicoId],
    enabled: !!politicoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coordenadores").select("id, nome").eq("politico_id", politicoId).order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addCoord = useMutation({
    mutationFn: async (coordenador_id: string) => {
      const { error } = await supabase.from("candidato_coordenadores").insert({ candidato_id: id, coordenador_id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Coordenador vinculado"); qc.invalidateQueries({ queryKey: ["candidato-coords", id] }); },
    onError: (e) => toastError(e),
  });
  const removeCoord = useMutation({
    mutationFn: async (coordenador_id: string) => {
      const { error } = await supabase.from("candidato_coordenadores")
        .delete().eq("candidato_id", id).eq("coordenador_id", coordenador_id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Vínculo removido"); qc.invalidateQueries({ queryKey: ["candidato-coords", id] }); },
    onError: (e) => toastError(e),
  });

  const update = useMutation({
    mutationFn: async (input: z.infer<typeof schema>) => {
      const { error } = await supabase.from("candidatos").update(input).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Candidato atualizado"); invalidate([["candidato", id], ["candidatos"]]); },
    onError: (e) => toastError(e),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("candidatos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Excluído"); invalidate([["candidatos"]]); navigate({ to: "/candidatos" }); },
    onError: (e) => toastError(e),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = schema.safeParse({
      ...fd, status, politico_id: politicoId || null, pleito_id: pleitoId || null,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    update.mutate(parsed.data);
  }

  if (q.isLoading) return <p className="text-muted-foreground">Carregando...</p>;
  if (q.isError) return <p className="text-destructive">{(q.error as Error).message}</p>;
  const c = q.data!;

  return (
    <div className="space-y-6">
      <Link to="/candidatos" className="inline-flex items-center text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="mr-1 h-4 w-4" />Voltar
      </Link>
      <PageHeader
        breadcrumbs={[{ label: "Candidatos", to: "/candidatos" }, { label: c.nome }]}
        title={c.nome}
        description={[c.partido, c.cargo_pretendido].filter(Boolean).join(" · ")}
        actions={isAdmin && (
          <Button variant="destructive" onClick={() => { if (confirm("Excluir candidato?")) remove.mutate(); }}>
            <Trash2 className="mr-2 h-4 w-4" />Excluir
          </Button>
        )}
      />
      <Tabs defaultValue="dados" className="max-w-3xl">
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="enquetes">Enquetes</TabsTrigger>
          <TabsTrigger value="eleitores">Eleitores</TabsTrigger>
        </TabsList>
        <TabsContent value="dados">
      <form onSubmit={onSubmit} className="grid gap-4 rounded-lg border bg-card p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Nome *</Label><Input name="nome" defaultValue={c.nome} required disabled={!isAdmin} /></div>
          <div className="space-y-1.5"><Label>Partido</Label><Input name="partido" defaultValue={c.partido ?? ""} disabled={!isAdmin} /></div>
          <div className="space-y-1.5"><Label>Cargo pretendido</Label><Input name="cargo_pretendido" defaultValue={c.cargo_pretendido ?? ""} disabled={!isAdmin} /></div>
          <div className="space-y-1.5"><Label>Número</Label><Input name="numero" defaultValue={c.numero ?? ""} disabled={!isAdmin} /></div>
          <div className="space-y-1.5"><Label>Cidade</Label><Input name="cidade" defaultValue={c.cidade ?? ""} disabled={!isAdmin} /></div>
          <div className="space-y-1.5"><Label>UF</Label><Input name="estado" maxLength={2} defaultValue={c.estado ?? ""} disabled={!isAdmin} /></div>
          <div className="space-y-1.5"><Label>Político vinculado</Label>
            <Select value={politicoId} onValueChange={setPoliticoId} disabled={!isAdmin}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{politicos.data?.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Pleito</Label>
            <Select value={pleitoId} onValueChange={setPleitoId} disabled={!isAdmin}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{pleitos.data?.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Status</Label>
            <Select value={status} onValueChange={setStatus} disabled={!isAdmin}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
                <SelectItem value="arquivado">Arquivado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5"><Label>Bio</Label><Textarea name="bio" rows={4} defaultValue={c.bio ?? ""} disabled={!isAdmin} /></div>
        <div className="space-y-2 rounded-md border p-4">
          <Label>Coordenadores responsáveis</Label>
          {!politicoId ? (
            <p className="text-xs text-muted-foreground">Vincule um político para atribuir coordenadores.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {(linkedCoords.data ?? []).length === 0 && (
                  <span className="text-xs text-muted-foreground">Nenhum coordenador vinculado.</span>
                )}
                {(linkedCoords.data ?? []).map((l: any) => (
                  <Badge key={l.coordenador_id} variant="secondary" className="gap-1">
                    {l.coordenador?.nome ?? l.coordenador_id}
                    {isAdmin && (
                      <button type="button" onClick={() => removeCoord.mutate(l.coordenador_id)}>
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
              {isAdmin && (
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value=""
                  onChange={(e) => { if (e.target.value) addCoord.mutate(e.target.value); }}
                >
                  <option value="">+ Adicionar coordenador...</option>
                  {(availableCoords.data ?? [])
                    .filter((c: any) => !(linkedCoords.data ?? []).some((l: any) => l.coordenador_id === c.id))
                    .map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              )}
            </>
          )}
        </div>
        <div className="flex items-center justify-between">
          <Badge variant={c.status === "ativo" ? "default" : "secondary"}>{c.status}</Badge>
          {isAdmin && <Button type="submit" disabled={update.isPending}>{update.isPending ? "Salvando..." : "Salvar alterações"}</Button>}
        </div>
      </form>
        </TabsContent>
        <TabsContent value="enquetes"><CandidatoEnquetes politicoId={c.politico_id} /></TabsContent>
        <TabsContent value="eleitores"><CandidatoEleitores politicoId={c.politico_id} cidade={c.cidade} /></TabsContent>
      </Tabs>
    </div>
  );
}

function CandidatoEnquetes({ politicoId }: { politicoId: string | null }) {
  const q = useQuery({
    queryKey: ["cand-enquetes", politicoId],
    enabled: !!politicoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enquetes").select("id, titulo, status, created_at")
        .eq("politico_id", politicoId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  if (!politicoId) return <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Vincule um político para ver enquetes.</p>;
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!q.data?.length) return <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhuma enquete.</p>;
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader><TableRow><TableHead>Título</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>
          {q.data.map((e: any) => (
            <TableRow key={e.id}>
              <TableCell><Link to="/enquetes/$id" params={{ id: e.id }} className="text-primary hover:underline">{e.titulo}</Link></TableCell>
              <TableCell><Badge variant={e.status === "ativa" ? "default" : "secondary"}>{e.status}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CandidatoEleitores({ politicoId, cidade }: { politicoId: string | null; cidade: string | null }) {
  const q = useQuery({
    queryKey: ["cand-eleitores", politicoId, cidade],
    enabled: !!politicoId,
    queryFn: async () => {
      let req = supabase.from("eleitores").select("id, nome, telefone, cidade, bairro").eq("politico_id", politicoId!).limit(50);
      if (cidade) req = req.eq("cidade", cidade);
      const { data, error } = await req;
      if (error) throw error;
      return data ?? [];
    },
  });
  if (!politicoId) return <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Vincule um político para ver eleitores.</p>;
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!q.data?.length) return <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhum eleitor{cidade ? ` em ${cidade}` : ""}.</p>;
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Telefone</TableHead><TableHead>Bairro</TableHead></TableRow></TableHeader>
        <TableBody>
          {q.data.map((e: any) => (
            <TableRow key={e.id}>
              <TableCell><Link to="/eleitores/$id" params={{ id: e.id }} className="text-primary hover:underline">{e.nome}</Link></TableCell>
              <TableCell>{e.telefone ?? "—"}</TableCell>
              <TableCell>{e.bairro ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}