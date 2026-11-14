import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

function genPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let p = "";
  for (let i = 0; i < 10; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}

async function requireAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId);
  if (error) throw new Error(error.message);
  if (!data.some((r: any) => r.role === "admin")) throw new Error("Apenas administradores.");
}

const createUserSchema = z.object({
  nome: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  telefone: z.string().trim().max(40).optional().nullable(),
  role: z.enum(["admin", "gestor", "coordenador", "operador", "visualizador"]),
  politico_id: z.string().uuid().optional().nullable(),
});

export const createUserWithProvisionalPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createUserSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const password = genPassword();
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password,
      email_confirm: true,
      user_metadata: { nome: data.nome },
    });
    if (error || !created?.user) throw new Error(error?.message || "Falha ao criar usuário");

    const userId = created.user.id;
    // upsert profile (the trigger may have created one)
    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      nome: data.nome,
      email: data.email,
      telefone: data.telefone ?? null,
      politico_id: data.politico_id ?? null,
    });
    // remove default visualizador if any, then add requested role
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: data.role });

    await supabaseAdmin.from("auditoria").insert({
      usuario_id: context.userId,
      acao: "criar",
      entidade: "usuario",
      entidade_id: userId,
      descricao: `Criou usuário ${data.email} (${data.role})`,
    });

    return { user_id: userId, email: data.email, password };
  });

const resetPasswordSchema = z.object({
  user_id: z.string().uuid(),
});

export const adminResetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => resetPasswordSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const password = genPassword();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, { password });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("auditoria").insert({
      usuario_id: context.userId,
      acao: "reset_senha",
      entidade: "usuario",
      entidade_id: data.user_id,
    });
    return { password };
  });

const updateRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["admin", "gestor", "coordenador", "operador", "visualizador"]),
  politico_id: z.string().uuid().optional().nullable(),
  status: z.enum(["ativo", "inativo", "arquivado"]).optional(),
  nome: z.string().trim().min(1).max(120).optional(),
  telefone: z.string().trim().max(40).optional().nullable(),
});

export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateRoleSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const updates: any = {};
    if (data.nome !== undefined) updates.nome = data.nome;
    if (data.telefone !== undefined) updates.telefone = data.telefone;
    if (data.politico_id !== undefined) updates.politico_id = data.politico_id;
    if (data.status !== undefined) updates.status = data.status;
    if (Object.keys(updates).length) {
      const { error } = await supabaseAdmin.from("profiles").update(updates).eq("id", data.user_id);
      if (error) throw new Error(error.message);
    }
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    await supabaseAdmin.from("user_roles").insert({ user_id: data.user_id, role: data.role });
    await supabaseAdmin.from("auditoria").insert({
      usuario_id: context.userId,
      acao: "editar",
      entidade: "usuario",
      entidade_id: data.user_id,
    });
    return { ok: true };
  });

const listUsersSchema = z.object({}).optional();

export const adminListUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listUsersSchema.parse(d ?? {}))
  .handler(async ({ context }) => {
    await requireAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, nome, email, telefone, politico_id, status, ultimo_acesso, created_at, politico:politicos(id, nome)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = (profiles ?? []).map((p: any) => p.id);
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids);
    const map: Record<string, string[]> = {};
    (roles ?? []).forEach((r: any) => {
      map[r.user_id] = map[r.user_id] || [];
      map[r.user_id].push(r.role);
    });
    return (profiles ?? []).map((p: any) => ({ ...p, roles: map[p.id] ?? [] }));
  });

const userIdSchema = z.object({ user_id: z.string().uuid() });

export const adminCheckUserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => userIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: u, error } = await supabaseAdmin.auth.admin.getUserById(data.user_id);
    if (error) throw new Error(error.message);
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("status, ultimo_acesso, nome, email")
      .eq("id", data.user_id)
      .maybeSingle();
    const { data: roles } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", data.user_id);
    return {
      email_confirmado: !!u.user?.email_confirmed_at,
      last_sign_in_at: u.user?.last_sign_in_at ?? null,
      created_at: u.user?.created_at ?? null,
      banned_until: (u.user as any)?.banned_until ?? null,
      profile_status: profile?.status ?? null,
      ultimo_acesso: profile?.ultimo_acesso ?? null,
      nome: profile?.nome ?? null,
      email: profile?.email ?? u.user?.email ?? null,
      roles: (roles ?? []).map((r: any) => r.role),
    };
  });

export const adminSendPasswordRecovery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => userIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin.from("profiles").select("email").eq("id", data.user_id).maybeSingle();
    if (!prof?.email) throw new Error("Usuário sem e-mail cadastrado");
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: prof.email,
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("auditoria").insert({
      usuario_id: context.userId, acao: "envio_recuperacao", entidade: "usuario", entidade_id: data.user_id,
    });
    return { action_link: link.properties?.action_link ?? null, email: prof.email };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => userIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    if (data.user_id === context.userId) throw new Error("Você não pode excluir seu próprio usuário.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("auditoria").insert({
      usuario_id: context.userId, acao: "excluir", entidade: "usuario", entidade_id: data.user_id,
    });
    return { ok: true };
  });