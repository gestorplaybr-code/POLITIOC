import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Archive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { useInvalidate, toastError } from "@/lib/use-mutation-toast";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { QrCode } from "@/components/qr-code";

export const Route = createFileRoute("/_authenticated/politicos/$id")({
  head: () => ({ meta: [{ title: "Político — Política+" }] }),
  component: PoliticoDetail,
});

const schema = z.object({
  nome: z.string().trim().min(2).max(120),
  partido: z.string().trim().max(50).optional().nullable(),
  cargo: z.string().trim().max(80).optional().nullable(),
  cidade: z.string().trim().max(80).optional().nullable(),
  estado: z.string().trim().max(2).optional().nullable(),
  email: z.string().trim().email().optional().or(z.literal("")).nullable(),
  whatsapp: z.string().trim().max(40).optional().nullable(),
  bio: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(["ativo", "inativo", "arquivado"]),
});

function PoliticoDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { isAdmin } = useCurrentUser();
  const invalidate = useInvalidate();
  const [status, setStatus] = useState<string>("ativo");

  const q = useQuery({
    queryKey: ["politico", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("politicos").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Político não encontrado");
      setStatus(data.status);
      return data;
    },
  });

  const update = useMutation({
    mutationFn: async (input: z.infer<typeof schema>) => {
      const payload = { ...input, email: input.email || null };
      const { error } = await supabase.from("politicos").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Político atualizado");
      invalidate([["politico", id], ["politicos"]]);
    },
    onError: (e) => toastError(e),
  });

  const archive = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("politicos").update({ status: "arquivado" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Arquivado"); invalidate([["politicos"]]); navigate({ to: "/politicos" }); },
    onError: (e) => toastError(e),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { count: candCount } = await supabase.from("candidatos").select("id", { count: "exact", head: true }).eq("politico_id", id);
      if ((candCount ?? 0) > 0) throw new Error("Existem candidatos vinculados. Arquive em vez de excluir.");
      const { error } = await supabase.from("politicos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Excluído"); invalidate([["politicos"]]); navigate({ to: "/politicos" }); },
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
      <Link to="/politicos" className="inline-flex items-center text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="mr-1 h-4 w-4" />Voltar
      </Link>
      <PageHeader
        title={p.nome}
        description={`Código: ${p.codigo_unico} · Link: /${p.link_publico}`}
        actions={
          isAdmin && (
            <>
              <Button variant="outline" onClick={() => archive.mutate()}><Archive className="mr-2 h-4 w-4" />Arquivar</Button>
              <Button variant="destructive" onClick={() => { if (confirm("Excluir definitivamente?")) remove.mutate(); }}>
                <Trash2 className="mr-2 h-4 w-4" />Excluir
              </Button>
            </>
          )
        }
      />

      <form onSubmit={onSubmit} className="grid max-w-3xl gap-4 rounded-lg border bg-card p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Nome *</Label><Input name="nome" defaultValue={p.nome} required disabled={!isAdmin} /></div>
          <div className="space-y-1.5"><Label>Partido</Label><Input name="partido" defaultValue={p.partido ?? ""} disabled={!isAdmin} /></div>
          <div className="space-y-1.5"><Label>Cargo</Label><Input name="cargo" defaultValue={p.cargo ?? ""} disabled={!isAdmin} /></div>
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
          <div className="space-y-1.5"><Label>Cidade</Label><Input name="cidade" defaultValue={p.cidade ?? ""} disabled={!isAdmin} /></div>
          <div className="space-y-1.5"><Label>Estado</Label><Input name="estado" maxLength={2} defaultValue={p.estado ?? ""} disabled={!isAdmin} /></div>
          <div className="space-y-1.5"><Label>E-mail</Label><Input name="email" type="email" defaultValue={p.email ?? ""} disabled={!isAdmin} /></div>
          <div className="space-y-1.5"><Label>WhatsApp</Label><Input name="whatsapp" defaultValue={p.whatsapp ?? ""} disabled={!isAdmin} /></div>
        </div>
        <div className="space-y-1.5"><Label>Bio</Label><Textarea name="bio" rows={4} defaultValue={p.bio ?? ""} disabled={!isAdmin} /></div>
        <div className="flex items-center justify-between">
          <Badge variant={p.status === "ativo" ? "default" : "secondary"}>{p.status}</Badge>
          {isAdmin && <Button type="submit" disabled={update.isPending}>{update.isPending ? "Salvando..." : "Salvar alterações"}</Button>}
        </div>
      </form>

      <div className="max-w-3xl">
        <h2 className="mb-2 font-semibold">Página pública</h2>
        <QrCode
          value={`${typeof window !== "undefined" ? window.location.origin : ""}/p/${p.link_publico}`}
          filename={`politico-${p.link_publico}.png`}
        />
      </div>
    </div>
  );
}