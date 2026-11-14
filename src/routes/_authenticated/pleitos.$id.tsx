import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/pleitos/$id")({
  head: () => ({ meta: [{ title: "Pleito — Política+" }] }),
  component: PleitoDetail,
});

const schema = z.object({
  nome: z.string().trim().min(2).max(120),
  ano: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
  tipo: z.string().trim().max(50).optional().nullable(),
  cidade: z.string().trim().max(80).optional().nullable(),
  estado: z.string().trim().max(2).optional().nullable(),
  descricao: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(["ativo", "encerrado", "arquivado"]),
});

function PleitoDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { isAdmin } = useCurrentUser();
  const invalidate = useInvalidate();
  const [status, setStatus] = useState("ativo");

  const q = useQuery({
    queryKey: ["pleito", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("pleitos").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Pleito não encontrado");
      setStatus(data.status);
      return data;
    },
  });

  const politicos = useQuery({
    queryKey: ["politicos-lookup"],
    queryFn: async () => {
      const { data, error } = await supabase.from("politicos").select("id, nome").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const vinculados = useQuery({
    queryKey: ["pleito-politicos", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pleito_politicos").select("politico_id").eq("pleito_id", id);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.politico_id));
    },
  });

  const update = useMutation({
    mutationFn: async (input: z.infer<typeof schema>) => {
      const { error } = await supabase.from("pleitos").update(input).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Pleito atualizado"); invalidate([["pleito", id], ["pleitos"]]); },
    onError: (e) => toastError(e),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pleitos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Excluído"); invalidate([["pleitos"]]); navigate({ to: "/pleitos" }); },
    onError: (e) => toastError(e),
  });

  const toggleVinculo = useMutation({
    mutationFn: async ({ politico_id, checked }: { politico_id: string; checked: boolean }) => {
      if (checked) {
        const { error } = await supabase.from("pleito_politicos").insert({ pleito_id: id, politico_id });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pleito_politicos").delete().eq("pleito_id", id).eq("politico_id", politico_id);
        if (error) throw error;
      }
    },
    onSuccess: () => invalidate([["pleito-politicos", id]]),
    onError: (e) => toastError(e),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = schema.safeParse({ ...fd, status });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    update.mutate(parsed.data);
  }

  if (q.isLoading) return <p className="text-muted-foreground">Carregando...</p>;
  if (q.isError) return <p className="text-destructive">{(q.error as Error).message}</p>;
  const p = q.data!;

  return (
    <div className="space-y-6">
      <Link to="/pleitos" className="inline-flex items-center text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="mr-1 h-4 w-4" />Voltar
      </Link>
      <PageHeader
        title={p.nome}
        description={[p.tipo, p.ano].filter(Boolean).join(" · ")}
        actions={
          isAdmin && (
            <Button variant="destructive" onClick={() => { if (confirm("Excluir pleito?")) remove.mutate(); }}>
              <Trash2 className="mr-2 h-4 w-4" />Excluir
            </Button>
          )
        }
      />

      <form onSubmit={onSubmit} className="grid max-w-3xl gap-4 rounded-lg border bg-card p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Nome *</Label><Input name="nome" defaultValue={p.nome} required disabled={!isAdmin} /></div>
          <div className="space-y-1.5"><Label>Ano</Label><Input name="ano" type="number" defaultValue={p.ano ?? ""} disabled={!isAdmin} /></div>
          <div className="space-y-1.5"><Label>Tipo</Label><Input name="tipo" defaultValue={p.tipo ?? ""} disabled={!isAdmin} /></div>
          <div className="space-y-1.5"><Label>Status</Label>
            <Select value={status} onValueChange={setStatus} disabled={!isAdmin}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="encerrado">Encerrado</SelectItem>
                <SelectItem value="arquivado">Arquivado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Cidade</Label><Input name="cidade" defaultValue={p.cidade ?? ""} disabled={!isAdmin} /></div>
          <div className="space-y-1.5"><Label>UF</Label><Input name="estado" maxLength={2} defaultValue={p.estado ?? ""} disabled={!isAdmin} /></div>
        </div>
        <div className="space-y-1.5"><Label>Descrição</Label><Textarea name="descricao" rows={3} defaultValue={p.descricao ?? ""} disabled={!isAdmin} /></div>
        <div className="flex items-center justify-between">
          <Badge variant={p.status === "ativo" ? "default" : "secondary"}>{p.status}</Badge>
          {isAdmin && <Button type="submit" disabled={update.isPending}>{update.isPending ? "Salvando..." : "Salvar alterações"}</Button>}
        </div>
      </form>

      <Tabs defaultValue="politicos" className="max-w-3xl">
        <TabsList>
          <TabsTrigger value="politicos">Políticos</TabsTrigger>
          <TabsTrigger value="candidatos">Candidatos</TabsTrigger>
          <TabsTrigger value="enquetes">Enquetes</TabsTrigger>
        </TabsList>
        <TabsContent value="politicos">
      <div className="rounded-lg border bg-card p-6">
        <h2 className="font-semibold">Políticos vinculados</h2>
        <p className="text-sm text-muted-foreground">Marque os políticos que participam deste pleito.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {politicos.data?.map((pol) => {
            const checked = vinculados.data?.has(pol.id) ?? false;
            return (
              <label key={pol.id} className="flex items-center gap-2 rounded-md border p-3 text-sm">
                <Checkbox
                  checked={checked}
                  disabled={!isAdmin || toggleVinculo.isPending}
                  onCheckedChange={(v) => toggleVinculo.mutate({ politico_id: pol.id, checked: !!v })}
                />
                <span>{pol.nome}</span>
              </label>
            );
          })}
          {!politicos.data?.length && <p className="text-sm text-muted-foreground">Nenhum político cadastrado.</p>}
        </div>
      </div>
        </TabsContent>
        <TabsContent value="candidatos"><PleitoCandidatos pleitoId={id} /></TabsContent>
        <TabsContent value="enquetes"><PleitoEnquetes politicoIds={Array.from(vinculados.data ?? [])} /></TabsContent>
      </Tabs>
    </div>
  );
}

function PleitoCandidatos({ pleitoId }: { pleitoId: string }) {
  const q = useQuery({
    queryKey: ["pleito-candidatos", pleitoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidatos")
        .select("id, nome, cargo_pretendido, numero, partido")
        .eq("pleito_id", pleitoId).order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!q.data?.length) return <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhum candidato neste pleito.</p>;
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Cargo</TableHead><TableHead>Partido</TableHead><TableHead>Nº</TableHead></TableRow></TableHeader>
        <TableBody>
          {q.data.map((c: any) => (
            <TableRow key={c.id}>
              <TableCell><Link to="/candidatos/$id" params={{ id: c.id }} className="text-primary hover:underline">{c.nome}</Link></TableCell>
              <TableCell>{c.cargo_pretendido ?? "—"}</TableCell>
              <TableCell>{c.partido ?? "—"}</TableCell>
              <TableCell className="font-mono text-xs">{c.numero ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PleitoEnquetes({ politicoIds }: { politicoIds: string[] }) {
  const q = useQuery({
    queryKey: ["pleito-enquetes", politicoIds],
    enabled: politicoIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enquetes")
        .select("id, titulo, status, created_at, politico:politicos(nome)")
        .in("politico_id", politicoIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  if (!politicoIds.length) return <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Vincule políticos para ver suas enquetes.</p>;
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!q.data?.length) return <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhuma enquete dos políticos vinculados.</p>;
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader><TableRow><TableHead>Título</TableHead><TableHead>Político</TableHead><TableHead>Status</TableHead><TableHead>Criada</TableHead></TableRow></TableHeader>
        <TableBody>
          {q.data.map((e: any) => (
            <TableRow key={e.id}>
              <TableCell><Link to="/enquetes/$id" params={{ id: e.id }} className="text-primary hover:underline">{e.titulo}</Link></TableCell>
              <TableCell className="text-sm text-muted-foreground">{e.politico?.nome}</TableCell>
              <TableCell><Badge variant={e.status === "ativa" ? "default" : "secondary"}>{e.status}</Badge></TableCell>
              <TableCell className="text-xs text-muted-foreground">{formatDateTime(e.created_at)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}