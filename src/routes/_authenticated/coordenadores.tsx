import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, UserCog, QrCode as QrCodeIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { useInvalidate, toastError } from "@/lib/use-mutation-toast";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import { CoordenadorWizard } from "@/components/wizards/coordenador-wizard";
import { DataToolbar, applyTextSearch } from "@/components/data-toolbar";
import { ExportButtons } from "@/components/export-buttons";
import { CoordenadorQrDialog } from "@/components/coordenador-qr-dialog";

export const Route = createFileRoute("/_authenticated/coordenadores")({
  head: () => ({ meta: [{ title: "Coordenadores — Política+" }] }),
  component: CoordPage,
});

function CoordPage() {
  const { canManage } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any | null>(null);
  const [qrCoord, setQrCoord] = useState<any | null>(null);
  const invalidate = useInvalidate();
  const [search, setSearch] = useState("");
  const [fPolitico, setFPolitico] = useState("all");
  const [fStatus, setFStatus] = useState("all");

  const q = useQuery({
    queryKey: ["coordenadores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coordenadores")
        .select("id, nome, telefone, email, regiao, ativo, user_id, token_captacao, politico:politicos(nome)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const rows: any[] = q.data ?? [];
  const politicos = Array.from(new Set(rows.map((r) => r.politico?.nome).filter(Boolean))) as string[];
  let filtered = applyTextSearch(rows, search, ["nome" as any, "email" as any, "telefone" as any, "regiao" as any]);
  if (fPolitico !== "all") filtered = filtered.filter((r) => r.politico?.nome === fPolitico);
  if (fStatus !== "all") filtered = filtered.filter((r) => (fStatus === "ativo" ? r.ativo : !r.ativo));
  const exportRows = filtered.map((c: any) => ({
    Nome: c.nome, Telefone: c.telefone ?? "", Email: c.email ?? "",
    Região: c.regiao ?? "", Político: c.politico?.nome ?? "", Status: c.ativo ? "Ativo" : "Inativo",
  }));

  const usuarios = useQuery({
    queryKey: ["profiles-min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, nome, email").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coordenadores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removido"); invalidate([["coordenadores"]]); },
    onError: (e) => toastError(e),
  });

  const update = useMutation({
    mutationFn: async (input: any) => {
      const { error } = await supabase.from("coordenadores").update({
        nome: input.nome, telefone: input.telefone || null, email: input.email || null, regiao: input.regiao || null, ativo: input.ativo, user_id: input.user_id || null,
      }).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Atualizado"); setEdit(null); invalidate([["coordenadores"]]); },
    onError: (e) => toastError(e),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coordenadores"
        description="Líderes de campo vinculados a cada político."
        actions={
          canManage && (
            <Button variant="premium" onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />Novo coordenador
            </Button>
          )
        }
      />
      <CoordenadorWizard open={open} onOpenChange={setOpen} />
      <DataToolbar
        search={search} onSearchChange={setSearch}
        searchPlaceholder="Buscar por nome, e-mail, telefone, região..."
        filters={[
          { key: "politico", label: "Político", value: fPolitico, onChange: setFPolitico, options: politicos.map((p) => ({ value: p, label: p })) },
          { key: "status", label: "Status", value: fStatus, onChange: setFStatus, options: [
            { value: "ativo", label: "Ativo" }, { value: "inativo", label: "Inativo" },
          ]},
        ]}
        onClear={() => { setSearch(""); setFPolitico("all"); setFStatus("all"); }}
        right={<ExportButtons filename="coordenadores" title="Coordenadores" rows={exportRows} />}
      />

      {!q.isLoading && (q.data?.length ?? 0) === 0 ? (
        <EmptyState
          size="lg"
          icon={UserCog}
          title="Nenhum coordenador cadastrado"
          description="Coordenadores são líderes de campo que ajudam a gerir grupos de eleitores por região."
          action={
            canManage && (
              <Button variant="premium" onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />Cadastrar primeiro coordenador
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
              <TableHead>Telefone</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Região</TableHead>
              <TableHead>Político</TableHead>
              <TableHead>Usuário vinculado</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>}
            {!q.isLoading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Nenhum resultado.</TableCell></TableRow>
            )}
            {filtered.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell>{c.telefone ?? "—"}</TableCell>
                <TableCell>{c.email ?? "—"}</TableCell>
                <TableCell>{c.regiao ?? "—"}</TableCell>
                <TableCell>{c.politico?.nome ?? "—"}</TableCell>
                <TableCell className="text-sm">
                  {(() => {
                    const u = usuarios.data?.find((x) => x.id === c.user_id);
                    return u ? (u.nome ?? u.email ?? c.user_id) : <span className="text-muted-foreground">Não vinculado</span>;
                  })()}
                </TableCell>
                <TableCell><Badge variant={c.ativo ? "default" : "secondary"}>{c.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="sm" aria-label="QR de captação" title="QR de captação de eleitores" onClick={() => setQrCoord(c)}>
                    <QrCodeIcon className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEdit(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" aria-label="Excluir coordenador" title="Excluir" onClick={() => { if (confirm("Excluir este coordenador? Esta ação não pode ser desfeita.")) remove.mutate(c.id); }}>
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
          <DialogHeader><DialogTitle>Editar coordenador</DialogTitle></DialogHeader>
          {edit && (
            <EditForm
              edit={edit}
              usuarios={usuarios.data ?? []}
              pending={update.isPending}
              onSubmit={(payload) => update.mutate(payload)}
            />
          )}
        </DialogContent>
      </Dialog>
      <CoordenadorQrDialog open={!!qrCoord} onOpenChange={(o) => !o && setQrCoord(null)} coordenador={qrCoord} />
    </div>
  );
}

function EditForm({
  edit, usuarios, pending, onSubmit,
}: {
  edit: any;
  usuarios: { id: string; nome: string | null; email: string | null }[];
  pending: boolean;
  onSubmit: (p: any) => void;
}) {
  const [userId, setUserId] = useState<string>(edit.user_id ?? "");
  return (
    <form onSubmit={(ev) => {
              ev.preventDefault();
              const fd = Object.fromEntries(new FormData(ev.currentTarget));
              onSubmit({
                id: edit.id, nome: String(fd.nome), telefone: String(fd.telefone), email: String(fd.email),
                regiao: String(fd.regiao), ativo: fd.ativo === "on", user_id: userId || null,
              });
            }} className="grid gap-3">
              <div className="space-y-1.5"><Label>Nome *</Label><Input name="nome" defaultValue={edit.nome} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Telefone</Label><Input name="telefone" defaultValue={edit.telefone ?? ""} /></div>
                <div className="space-y-1.5"><Label>E-mail</Label><Input name="email" type="email" defaultValue={edit.email ?? ""} /></div>
              </div>
              <div className="space-y-1.5"><Label>Região</Label><Input name="regiao" defaultValue={edit.regiao ?? ""} /></div>
              <div className="space-y-1.5">
                <Label>Usuário do sistema vinculado</Label>
                <Select value={userId || "__none"} onValueChange={(v) => setUserId(v === "__none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Não vinculado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Não vinculado</SelectItem>
                    {usuarios.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.nome ?? u.email ?? u.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Quando vinculado, o coordenador (com papel "Coordenador") só verá os eleitores em que é responsável.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="ativo" defaultChecked={edit.ativo} /> Ativo
              </label>
              <DialogFooter>
                <Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Salvar"}</Button>
              </DialogFooter>
            </form>
  );
}