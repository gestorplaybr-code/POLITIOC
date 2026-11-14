import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { adminUpdateUser } from "@/lib/admin.functions";
import { useInvalidate } from "@/lib/use-mutation-toast";
import type { AppRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const schema = z.object({
  nome: z.string().trim().min(2, "Informe o nome"),
  telefone: z.string().trim().max(40).optional().nullable(),
  role: z.enum(["admin", "gestor", "coordenador", "operador", "visualizador"]),
  status: z.enum(["ativo", "inativo", "arquivado"]),
  politico_id: z.string().uuid().optional().nullable(),
});

export function UsuarioEditDialog({
  user, open, onOpenChange,
}: {
  user: any | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const invalidate = useInvalidate();
  const updateFn = useServerFn(adminUpdateUser);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [role, setRole] = useState<AppRole>("visualizador");
  const [status, setStatus] = useState<"ativo" | "inativo" | "arquivado">("ativo");
  const [politicoId, setPoliticoId] = useState<string>("");

  useEffect(() => {
    if (user) {
      setNome(user.nome ?? "");
      setTelefone(user.telefone ?? "");
      setRole((user.roles?.[0] as AppRole) ?? "visualizador");
      setStatus((user.status as any) ?? "ativo");
      setPoliticoId(user.politico_id ?? "");
    }
  }, [user]);

  const polQ = useQuery({
    queryKey: ["politicos-lookup"],
    queryFn: async () => {
      const { data, error } = await supabase.from("politicos").select("id, nome").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse({ nome, telefone: telefone || null, role, status, politico_id: politicoId || null });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      return updateFn({ data: { user_id: user.id, ...parsed.data } });
    },
    onSuccess: () => {
      toast.success("Usuário atualizado");
      invalidate([["users-admin"]]);
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao salvar"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
          <DialogDescription>Altere os dados do usuário. O e-mail não pode ser modificado por aqui.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5"><Label>Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>E-mail</Label><Input value={user?.email ?? ""} readOnly disabled /></div>
          <div className="space-y-1.5"><Label>Telefone</Label><Input value={telefone} onChange={(e) => setTelefone(e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>Perfil</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="gestor">Gestor Político</SelectItem>
                <SelectItem value="coordenador">Coordenador</SelectItem>
                <SelectItem value="operador">Operador</SelectItem>
                <SelectItem value="visualizador">Visualizador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(role === "gestor" || role === "coordenador") && (
            <div className="space-y-1.5">
              <Label>Político vinculado</Label>
              <Select value={politicoId} onValueChange={setPoliticoId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{polQ.data?.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Pausado (sem acesso)</SelectItem>
                <SelectItem value="arquivado">Arquivado</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Usuários pausados ou arquivados perdem acesso aos dados imediatamente.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar alterações"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}