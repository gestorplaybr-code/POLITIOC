import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Lock, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { PasswordStrength, calcStrength } from "@/components/password-strength";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Nova senha — Política+" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const strong = calcStrength(password) >= 3;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!strong) {
      toast.error("Escolha uma senha mais forte.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Senha atualizada.");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 text-white"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 20% 0%, rgba(79,70,229,0.25), transparent 60%), radial-gradient(ellipse 60% 50% at 100% 100%, rgba(124,58,237,0.18), transparent 60%), #05050f",
        fontFamily: "var(--font-body)",
      }}
    >
      <div className="relative w-full max-w-md animate-fade-in">
        <Link
          to="/auth"
          className="mb-6 inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para o login
        </Link>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
          <div
            className="grid h-12 w-12 place-items-center rounded-2xl text-white shadow-[0_0_40px_-10px_rgba(124,58,237,0.6)]"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            <Vote className="h-6 w-6" />
          </div>

          <h1
            className="mt-6 text-4xl uppercase leading-none tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <span className="text-gradient-indigo">Nova senha</span>
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Escolha uma senha forte. Ela vai proteger toda sua campanha.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rp-password" className="text-white/70">
                Nova senha
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <Input
                  id="rp-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-white/10 bg-white/5 pl-9 text-white placeholder:text-white/30"
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                />
              </div>
            </div>
            <PasswordStrength password={password} />
            <Button
              type="submit"
              variant="premium"
              className="w-full"
              disabled={loading || !strong}
            >
              {loading ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}