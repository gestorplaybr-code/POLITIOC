import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, useEffect } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Copy, KeyRound, MoreVertical, Pencil, Pause, Play, Trash2, Activity, Mail, Search, Handshake, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, roleLabel, type AppRole } from "@/lib/auth";
import { useInvalidate, toastError } from "@/lib/use-mutation-toast";
import {
  createUserWithProvisionalPassword, adminListUsers, adminResetUserPassword,
  adminUpdateUser, adminCheckUserStatus, adminSendPasswordRecovery, adminDeleteUser,
} from "@/lib/admin.functions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { UsuarioEditDialog } from "@/components/usuario-edit-dialog";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — Política+" }] }),
  component: UsuariosPage,
});

const schema = z.object({
  nome: z.string().trim().min(2, "Informe o nome"),
  email: z.string().trim().email("E-mail inválido"),
  telefone: z.string().trim().optional().nullable(),
  role: z.enum(["admin", "gestor", "coordenador", "operador", "visualizador"]),
  politico_id: z.string().uuid().optional().nullable(),
});

function UsuariosPage() {
  const { isAdmin, user: currentUser } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<AppRole>("visualizador");
  const [politicoId, setPoliticoId] = useState<string>("");
  const [credentials, setCredentials] = useState<{ email: string; password: string; nome?: string; parceiro?: boolean } | null>(null);
  const [recoveryLink, setRecoveryLink] = useState<{ email: string; link: string | null } | null>(null);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [deletingUser, setDeletingUser] = useState<any | null>(null);
  const [diag, setDiag] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [modo, setModo] = useState<"interno" | "parceiro">("interno");
  const [novoPolNome, setNovoPolNome] = useState("");
  const [criandoPol, setCriandoPol] = useState(false);
  const [nomeInput, setNomeInput] = useState("");
  const invalidate = useInvalidate();

  // Abre automaticamente em modo "parceiro" via /usuarios?novo=parceiro
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("novo") === "parceiro" && isAdmin) {
      setModo("parceiro");
      setRole("gestor");
      setOpen(true);
    }
  }, [isAdmin]);

  // Ao alternar o modo, ajusta o perfil padrão
  useEffect(() => {
    if (modo === "parceiro") setRole("gestor");
  }, [modo]);

  const listFn = useServerFn(adminListUsers);
  const createFn = useServerFn(createUserWithProvisionalPassword);
  const resetFn = useServerFn(adminResetUserPassword);
  const updateFn = useServerFn(adminUpdateUser);
  const checkFn = useServerFn(adminCheckUserStatus);
  const recoveryFn = useServerFn(adminSendPasswordRecovery);
  const deleteFn = useServerFn(adminDeleteUser);

  const q = useQuery({
    queryKey: ["users-admin"],
    enabled: isAdmin,
    queryFn: () => listFn({ data: {} }),
  });

  const polQ = useQuery({
    queryKey: ["politicos-lookup"],
    queryFn: async () => {
      const { data, error } = await supabase.from("politicos").select("id, nome").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: (input: z.infer<typeof schema> & { _parceiro?: boolean }) => {
      const { _parceiro, ...payload } = input;
      return createFn({ data: payload }).then((r) => ({ ...r, _parceiro, nome: input.nome }));
    },
    onSuccess: (res: any) => {
      setCredentials({ email: res.email, password: res.password, nome: res.nome, parceiro: !!res._parceiro });
      setOpen(false);
      setRole("visualizador");
      setPoliticoId("");
      setModo("interno");
      setNomeInput("");
      setNovoPolNome("");
      invalidate([["users-admin"], ["dashboard-stats"]]);
    },
    onError: (e) => toastError(e),
  });

  const reset = useMutation({
    mutationFn: (user_id: string) => resetFn({ data: { user_id } }),
    onSuccess: (res, user_id) => {
      const u = q.data?.find((x: any) => x.id === user_id);
      setCredentials({ email: u?.email ?? "", password: res.password });
    },
    onError: (e) => toastError(e),
  });

  const togglePause = useMutation({
    mutationFn: async (u: any) => {
      const newStatus = u.status === "ativo" ? "inativo" : "ativo";
      return updateFn({ data: {
        user_id: u.id,
        role: (u.roles?.[0] as AppRole) ?? "visualizador",
        politico_id: u.politico_id ?? null,
        status: newStatus,
        nome: u.nome,
        telefone: u.telefone ?? null,
      } });
    },
    onSuccess: (_r, u) => {
      toast.success(u.status === "ativo" ? "Usuário pausado" : "Usuário reativado");
      invalidate([["users-admin"]]);
    },
    onError: (e) => toastError(e),
  });

  const diagnosticar = useMutation({
    mutationFn: (user_id: string) => checkFn({ data: { user_id } }),
    onSuccess: (res) => setDiag(res),
    onError: (e) => toastError(e),
  });

  const enviarRecuperacao = useMutation({
    mutationFn: (user_id: string) => recoveryFn({ data: { user_id } }),
    onSuccess: (res) => setRecoveryLink({ email: res.email, link: res.action_link }),
    onError: (e) => toastError(e),
  });

  const excluir = useMutation({
    mutationFn: (user_id: string) => deleteFn({ data: { user_id } }),
    onSuccess: () => {
      toast.success("Usuário excluído");
      setDeletingUser(null);
      invalidate([["users-admin"]]);
    },
    onError: (e) => toastError(e),
  });

  const filtered = useMemo(() => {
    const list = q.data ?? [];
    return list.filter((u: any) => {
      if (filterStatus !== "all" && u.status !== filterStatus) return false;
      if (filterRole !== "all" && !(u.roles ?? []).includes(filterRole)) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        if (!(u.nome?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s))) return false;
      }
      return true;
    });
  }, [q.data, search, filterRole, filterStatus]);

  const counts = useMemo(() => {
    const list = q.data ?? [];
    return {
      total: list.length,
      ativos: list.filter((u: any) => u.status === "ativo").length,
      pausados: list.filter((u: any) => u.status === "inativo").length,
    };
  }, [q.data]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget));
    if (modo === "parceiro" && !politicoId) {
      return toast.error("Selecione ou crie o político deste parceiro.");
    }
    if ((role === "gestor" || role === "coordenador") && !politicoId) {
      return toast.error("Vincule um político — Gestor/Coordenador só enxergam dados do político vinculado.");
    }
    const parsed = schema.safeParse({ ...fd, role, politico_id: politicoId || undefined });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    create.mutate({ ...parsed.data, _parceiro: modo === "parceiro" });
  }

  async function criarPoliticoInline() {
    const nome = novoPolNome.trim();
    if (nome.length < 2) return toast.error("Informe o nome do político.");
    setCriandoPol(true);
    try {
      const { data, error } = await supabase.from("politicos").insert({ nome }).select("id, nome").single();
      if (error) throw error;
      await polQ.refetch();
      setPoliticoId(data.id);
      setNovoPolNome("");
      toast.success(`Político "${data.nome}" criado.`);
    } catch (e: any) {
      toastError(e);
    } finally {
      setCriandoPol(false);
    }
  }

  function mensagemBoasVindas() {
    if (!credentials) return "";
    const url = typeof window !== "undefined" ? `${window.location.origin}/auth` : "https://politica.adscomunicacao.com/auth";
    const nome = credentials.nome || "";
    return [
      `Olá${nome ? ` ${nome}` : ""}, seu acesso ao sistema está pronto:`,
      ``,
      `🔗 Link: ${url}`,
      `📧 E-mail: ${credentials.email}`,
      `🔑 Senha provisória: ${credentials.password}`,
      ``,
      `Recomendamos trocar a senha no primeiro acesso.`,
    ].join("\n");
  }

  if (!isAdmin) {
    return <p className="text-muted-foreground">Apenas administradores acessam esta área.</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuários"
        description={`${counts.total} no total · ${counts.ativos} ativos · ${counts.pausados} pausados`}
        actions={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setModo("interno"); }}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Novo usuário</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{modo === "parceiro" ? "Novo parceiro (cliente do sistema)" : "Novo usuário"}</DialogTitle>
                <DialogDescription>
                  {modo === "parceiro"
                    ? "Cria um acesso de Gestor Político vinculado ao político do parceiro. Uma senha provisória será exibida na próxima tela."
                    : "Uma senha provisória será gerada e exibida na próxima tela."}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-2 rounded-lg border p-1">
                <button
                  type="button"
                  onClick={() => setModo("interno")}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${modo === "interno" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                >
                  Usuário interno
                </button>
                <button
                  type="button"
                  onClick={() => setModo("parceiro")}
                  className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${modo === "parceiro" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                >
                  <Handshake className="h-4 w-4" /> Parceiro / cliente
                </button>
              </div>

              <form onSubmit={onSubmit} className="grid gap-3">
                <div className="space-y-1.5"><Label>Nome *</Label><Input name="nome" required value={nomeInput} onChange={(e) => setNomeInput(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>E-mail *</Label><Input name="email" type="email" required /></div>
                <div className="space-y-1.5"><Label>Telefone</Label><Input name="telefone" /></div>
                <div className="space-y-1.5"><Label>Perfil *</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as AppRole)} disabled={modo === "parceiro"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="gestor">Gestor Político</SelectItem>
                      <SelectItem value="coordenador">Coordenador</SelectItem>
                      <SelectItem value="operador">Operador</SelectItem>
                      <SelectItem value="visualizador">Visualizador</SelectItem>
                    </SelectContent>
                  </Select>
                  {modo === "parceiro" && (
                    <p className="text-xs text-muted-foreground">Parceiros entram como <strong>Gestor Político</strong> — enxergam apenas o próprio político.</p>
                  )}
                </div>
                {(role === "gestor" || role === "coordenador" || modo === "parceiro") && (
                  <div className="space-y-1.5"><Label>Político vinculado {(modo === "parceiro" || role === "gestor" || role === "coordenador") && "*"}</Label>
                    <Select value={politicoId} onValueChange={setPoliticoId}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {(polQ.data ?? []).length === 0 ? (
                          <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhum político cadastrado — use o campo abaixo para criar</div>
                        ) : (
                          polQ.data!.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)
                        )}
                      </SelectContent>
                    </Select>
                    <div className="mt-2 rounded-md border border-dashed p-2">
                      <Label className="text-xs">Ou criar novo político agora</Label>
                      <div className="mt-1 flex gap-2">
                        <Input
                          value={novoPolNome}
                          onChange={(e) => setNovoPolNome(e.target.value)}
                          placeholder="Nome do político"
                        />
                        <Button type="button" variant="outline" onClick={criarPoliticoInline} disabled={criandoPol}>
                          {criandoPol ? "Criando..." : "Criar"}
                        </Button>
                      </div>
                      {(polQ.data ?? []).length === 0 && (role === "gestor" || role === "coordenador") && (
                        <p className="mt-1 text-[11px] text-muted-foreground">Crie o político logo acima para vincular ao usuário.</p>
                      )}
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button type="submit" disabled={create.isPending}>
                    {create.isPending ? "Criando..." : modo === "parceiro" ? "Criar acesso do parceiro" : "Criar usuário"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <Dialog open={!!credentials} onOpenChange={(o) => !o && setCredentials(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{credentials?.parceiro ? "Parceiro criado com sucesso" : "Senha provisória gerada"}</DialogTitle>
            <DialogDescription>
              Compartilhe estes dados com o usuário. A senha não será exibida novamente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div><Label>E-mail</Label><Input readOnly value={credentials?.email ?? ""} /></div>
            <div><Label>Senha provisória</Label>
              <div className="flex gap-2">
                <Input readOnly value={credentials?.password ?? ""} className="font-mono" />
                <Button type="button" variant="outline" onClick={() => {
                  navigator.clipboard.writeText(credentials?.password ?? "");
                  toast.success("Senha copiada");
                }}><Copy className="h-4 w-4" /></Button>
              </div>
            </div>
            <div>
              <Label>Mensagem pronta para envio</Label>
              <textarea
                readOnly
                value={mensagemBoasVindas()}
                className="mt-1 h-40 w-full rounded-md border bg-muted/40 p-2 font-mono text-xs"
              />
              <Button
                type="button"
                variant="secondary"
                className="mt-2 w-full"
                onClick={() => {
                  navigator.clipboard.writeText(mensagemBoasVindas());
                  toast.success("Mensagem copiada — cole no WhatsApp/e-mail do parceiro.");
                }}
              >
                <MessageCircle className="mr-2 h-4 w-4" /> Copiar mensagem pronta
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!recoveryLink} onOpenChange={(o) => !o && setRecoveryLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link de recuperação</DialogTitle>
            <DialogDescription>Compartilhe este link com {recoveryLink?.email}. Ele permite definir uma nova senha.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input readOnly value={recoveryLink?.link ?? ""} className="font-mono text-xs" />
            <Button variant="outline" onClick={() => { navigator.clipboard.writeText(recoveryLink?.link ?? ""); toast.success("Link copiado"); }}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!diag} onOpenChange={(o) => !o && setDiag(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Diagnóstico de acesso</DialogTitle>
            <DialogDescription>{diag?.nome} ({diag?.email})</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 text-sm">
            <Row label="Status do perfil" value={<Badge variant={diag?.profile_status === "ativo" ? "default" : "secondary"}>{diag?.profile_status ?? "—"}</Badge>} />
            <Row label="E-mail confirmado" value={diag?.email_confirmado ? "Sim" : "Não"} />
            <Row label="Último login (auth)" value={formatDateTime(diag?.last_sign_in_at)} />
            <Row label="Último acesso (app)" value={formatDateTime(diag?.ultimo_acesso)} />
            <Row label="Criado em" value={formatDateTime(diag?.created_at)} />
            <Row label="Perfis" value={(diag?.roles ?? []).join(", ") || "—"} />
          </div>
        </DialogContent>
      </Dialog>

      <UsuarioEditDialog user={editingUser} open={!!editingUser} onOpenChange={(o) => !o && setEditingUser(null)} />

      <AlertDialog open={!!deletingUser} onOpenChange={(o) => !o && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. <strong>{deletingUser?.nome}</strong> ({deletingUser?.email}) perderá acesso imediatamente
              e não poderá ser recuperado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => excluir.mutate(deletingUser.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou e-mail" className="pl-9" />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os perfis</SelectItem>
            <SelectItem value="admin">Administrador</SelectItem>
            <SelectItem value="gestor">Gestor</SelectItem>
            <SelectItem value="coordenador">Coordenador</SelectItem>
            <SelectItem value="operador">Operador</SelectItem>
            <SelectItem value="visualizador">Visualizador</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="inativo">Pausados</SelectItem>
            <SelectItem value="arquivado">Arquivados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Tipo</TableHead><TableHead>Perfil</TableHead>
            <TableHead>Político</TableHead><TableHead>Status</TableHead>
            <TableHead>Último acesso</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {q.isLoading && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>}
            {!q.isLoading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Nenhum usuário encontrado.</TableCell></TableRow>
            )}
            {filtered.map((u: any) => {
              const isParceiro = (u.roles ?? []).includes("gestor") && !!u.politico_id;
              return (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.nome}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  {isParceiro
                    ? <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" variant="outline"><Handshake className="mr-1 h-3 w-3" />Parceiro</Badge>
                    : <Badge variant="outline">Interno</Badge>}
                </TableCell>
                <TableCell>{(u.roles ?? []).map((r: AppRole) => roleLabel(r)).join(", ") || "—"}</TableCell>
                <TableCell>{u.politico?.nome ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={u.status === "ativo" ? "default" : u.status === "inativo" ? "outline" : "secondary"}>
                    {u.status === "ativo" ? "ativo" : u.status === "inativo" ? "pausado" : u.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {u.ultimo_acesso ? formatDateTime(u.ultimo_acesso) : "Nunca acessou"}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => setEditingUser(u)}>
                        <Pencil className="mr-2 h-4 w-4" /> Editar usuário
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => togglePause.mutate(u)} disabled={togglePause.isPending}>
                        {u.status === "ativo" ? <><Pause className="mr-2 h-4 w-4" /> Pausar acesso</> : <><Play className="mr-2 h-4 w-4" /> Reativar acesso</>}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => reset.mutate(u.id)} disabled={reset.isPending}>
                        <KeyRound className="mr-2 h-4 w-4" /> Resetar senha (provisória)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => enviarRecuperacao.mutate(u.id)} disabled={enviarRecuperacao.isPending}>
                        <Mail className="mr-2 h-4 w-4" /> Gerar link de recuperação
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => diagnosticar.mutate(u.id)} disabled={diagnosticar.isPending}>
                        <Activity className="mr-2 h-4 w-4" /> Testar / diagnosticar acesso
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeletingUser(u)}
                        disabled={u.id === currentUser?.id}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Excluir usuário
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-1.5 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}