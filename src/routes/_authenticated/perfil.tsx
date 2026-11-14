import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Lock, User as UserIcon, Save, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, roleLabel } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { PasswordStrength, calcStrength } from "@/components/password-strength";
import { CinemaError } from "@/components/cinema-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({ meta: [{ title: "Meu Perfil — Política+" }] }),
  errorComponent: ({ error, reset }) => <CinemaError error={error as Error} reset={reset} />,
  component: PerfilPage,
});

function PerfilPage() {
  const { profile, roles, user } = useCurrentUser();
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);
  const [password, setPassword] = useState("");
  const strong = calcStrength(password) >= 3;

  const initials = (profile?.nome || profile?.email || "U")
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      nome: String(fd.get("nome") || ""),
      telefone: String(fd.get("telefone") || "") || null,
    }).eq("id", user!.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado");
  }

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!strong) return toast.error("Escolha uma senha mais forte.");
    setChanging(true);
    const { error } = await supabase.auth.updateUser({ password });
    setChanging(false);
    if (error) return toast.error(error.message);
    toast.success("Senha alterada");
    setPassword("");
    (e.target as HTMLFormElement).reset();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Conta"
        title="Meu Perfil"
        description="Mantenha seus dados atualizados e proteja sua conta com uma senha forte."
      />

      <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur">
        <div
          className="absolute -right-20 -top-20 h-60 w-60 rounded-full opacity-30 blur-3xl"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        />
        <div className="relative flex flex-wrap items-center gap-5">
          <div
            className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl text-3xl font-semibold text-white shadow-[0_0_40px_-10px_rgba(124,58,237,0.6)]"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            {initials || "U"}
          </div>
          <div className="min-w-0">
            <h2
              className="truncate text-3xl uppercase tracking-wide text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {profile?.nome || "Usuário"}
            </h2>
            <p className="truncate text-sm text-white/50">{profile?.email}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {roles.length === 0 ? (
                <Badge variant="outline" className="border-white/10 text-white/50">Sem papel atribuído</Badge>
              ) : (
                roles.map((r) => (
                  <Badge
                    key={r}
                    className="border-indigo-400/30 bg-indigo-500/15 text-indigo-100"
                  >
                    {roleLabel(r)}
                  </Badge>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 cinema-stagger">
        <SectionCard
          title="Dados pessoais"
          description="Como você aparece para a equipe"
          icon={<UserIcon className="h-4 w-4" />}
        >
          <form onSubmit={saveProfile} className="grid gap-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input name="nome" defaultValue={profile?.nome ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input value={profile?.email ?? ""} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input name="telefone" defaultValue={profile?.telefone ?? ""} />
            </div>
            <Button type="submit" variant="premium" disabled={saving} className="w-fit">
              <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </form>
        </SectionCard>

        <SectionCard
          title="Segurança"
          description="Troque sua senha periodicamente"
          icon={<Lock className="h-4 w-4" />}
        >
          <form onSubmit={changePassword} className="grid gap-4">
            <div className="space-y-1.5">
              <Label>Nova senha</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
              />
            </div>
            <PasswordStrength password={password} />
            <Button
              type="submit"
              variant="premium"
              disabled={changing || !strong}
              className="w-fit"
            >
              <Shield className="h-4 w-4" /> {changing ? "Alterando..." : "Alterar senha"}
            </Button>
          </form>
        </SectionCard>
      </div>
    </div>
  );
}