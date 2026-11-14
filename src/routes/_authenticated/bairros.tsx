import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { useInvalidate, toastError } from "@/lib/use-mutation-toast";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import { BairroWizard } from "@/components/wizards/bairro-wizard";
import { DataToolbar, applyTextSearch } from "@/components/data-toolbar";
import { ExportButtons } from "@/components/export-buttons";

export const Route = createFileRoute("/_authenticated/bairros")({
  head: () => ({ meta: [{ title: "Bairros — Política+" }] }),
  component: BairrosPage,
});

const schema = z.object({
  politico_id: z.string().uuid("Selecione o político"),
  nome: z.string().trim().min(2, "Nome obrigatório").max(120),
  cidade: z.string().trim().max(80).optional().nullable(),
  uf: z.string().trim().max(2).optional().nullable(),
});

function BairrosPage() {
  const { canManage } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any | null>(null);
  const invalidate = useInvalidate();
  const [search, setSearch] = useState("");
  const [fUF, setFUF] = useState("all");
  const [fCidade, setFCidade] = useState("all");

  const q = useQuery({
    queryKey: ["bairros"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bairros")
        .select("id, nome, cidade, uf, politico:politicos(nome)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const rows: any[] = q.data ?? [];
  const ufs = Array.from(new Set(rows.map((r) => r.uf).filter(Boolean))) as string[];
  const cidades = Array.from(new Set(rows.map((r) => r.cidade).filter(Boolean))) as string[];
  let filtered = applyTextSearch(rows, search, ["nome" as any, "cidade" as any, (r: any) => r.politico?.nome]);
  if (fUF !== "all") filtered = filtered.filter((r) => r.uf === fUF);
  if (fCidade !== "all") filtered = filtered.filter((r) => r.cidade === fCidade);
  const exportRows = filtered.map((b: any) => ({
    Nome: b.nome, Cidade: b.cidade ?? "", UF: b.uf ?? "", Político: b.politico?.nome ?? "",
  }));

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bairros").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Bairro removido"); invalidate([["bairros"]]); },
    onError: (e) => toastError(e),
  });

  const update = useMutation({
    mutationFn: async (input: { id: string; nome: string; cidade: string | null; uf: string | null }) => {
      const { error } = await supabase.from("bairros").update({ nome: input.nome, cidade: input.cidade, uf: input.uf }).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Bairro atualizado"); setEdit(null); invalidate([["bairros"]]); },
    onError: (e) => toastError(e),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bairros"
        description="Organize bairros e regiões por político para segmentar eleitores."
        actions={
          canManage && (
            <Button variant="premium" onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />Novo bairro
            </Button>
          )
        }
      />
      <BairroWizard open={open} onOpenChange={setOpen} />
      <DataToolbar
        search={search} onSearchChange={setSearch}
        searchPlaceholder="Buscar por bairro, cidade, político..."
        filters={[
          { key: "uf", label: "UF", value: fUF, onChange: setFUF, options: ufs.map((p) => ({ value: p, label: p })) },
          { key: "cidade", label: "Cidade", value: fCidade, onChange: setFCidade, options: cidades.map((p) => ({ value: p, label: p })) },
        ]}
        onClear={() => { setSearch(""); setFUF("all"); setFCidade("all"); }}
        right={<ExportButtons filename="bairros" title="Bairros" rows={exportRows} />}
      />

      {!q.isLoading && (q.data?.length ?? 0) === 0 ? (
        <EmptyState
          size="lg"
          icon={MapPin}
          title="Nenhum bairro cadastrado"
          description="Cadastrar bairros permite segmentar eleitores por região e atribuir coordenadores responsáveis."
          action={
            canManage && (
              <Button variant="premium" onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />Cadastrar primeiro bairro
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
              <TableHead>Cidade</TableHead>
              <TableHead>UF</TableHead>
              <TableHead>Político</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>}
            {!q.isLoading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum resultado.</TableCell></TableRow>
            )}
            {filtered.map((b: any) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.nome}</TableCell>
                <TableCell>{b.cidade ?? "—"}</TableCell>
                <TableCell>{b.uf ?? "—"}</TableCell>
                <TableCell>{b.politico?.nome ?? "—"}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => setEdit(b)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" aria-label="Excluir bairro" title="Excluir" onClick={() => { if (confirm(`Excluir o bairro "${b.nome}"? Esta ação não pode ser desfeita.`)) remove.mutate(b.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar bairro</DialogTitle></DialogHeader>
          {edit && (
            <form onSubmit={(ev) => {
              ev.preventDefault();
              const fd = Object.fromEntries(new FormData(ev.currentTarget));
              update.mutate({ id: edit.id, nome: String(fd.nome), cidade: String(fd.cidade) || null, uf: String(fd.uf) || null });
            }} className="grid gap-3">
              <div className="space-y-1.5"><Label>Nome *</Label><Input name="nome" defaultValue={edit.nome} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Cidade</Label><Input name="cidade" defaultValue={edit.cidade ?? ""} /></div>
                <div className="space-y-1.5"><Label>UF</Label><Input name="uf" maxLength={2} defaultValue={edit.uf ?? ""} /></div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={update.isPending}>{update.isPending ? "Salvando..." : "Salvar"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}