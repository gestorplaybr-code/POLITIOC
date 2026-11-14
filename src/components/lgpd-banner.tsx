import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useCurrentUser } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function LgpdBanner() {
  const { user, profile } = useCurrentUser();
  const [accept, setAccept] = useState(false);
  const [saving, setSaving] = useState(false);

  const aceito = (profile as any)?.aceite_lgpd_em;
  const open = !!user && profile && !aceito;

  async function confirm() {
    if (!accept || !user) return;
    setSaving(true);
    await supabase.from("profiles").update({ aceite_lgpd_em: new Date().toISOString() }).eq("id", user.id);
    setSaving(false);
    window.location.reload();
  }

  return (
    <Dialog open={!!open}>
      <DialogContent
        className="max-w-md overflow-hidden border-white/10 p-0 text-white"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="relative px-6 pt-7">
          <div
            className="absolute -top-16 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full opacity-30 blur-3xl"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          />
          <div
            className="relative mx-auto grid h-12 w-12 place-items-center rounded-2xl text-white shadow-[0_0_40px_-10px_rgba(124,58,237,0.6)]"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            <ShieldCheck className="h-6 w-6" />
          </div>
        </div>
        <DialogHeader className="px-6 pt-4 text-center">
          <DialogTitle
            className="text-center text-3xl uppercase tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <span className="text-gradient-indigo">Termos e Privacidade</span>
          </DialogTitle>
          <DialogDescription className="text-center text-white/60">
            Antes de prosseguir, confirme que está de acordo com nosso compromisso
            com a LGPD.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 px-6 pb-2 text-sm text-white/70">
          <p>
            Tratamos dados pessoais com finalidade exclusivamente política, sob
            controle de acesso por papéis e RLS em todas as tabelas.
          </p>
          <p className="text-xs">
            Leia a{" "}
            <Link to="/politica-privacidade" target="_blank" className="text-indigo-300 underline-offset-2 hover:underline">
              política de privacidade completa
            </Link>.
          </p>
          <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
            <Checkbox id="acc" checked={accept} onCheckedChange={(c) => setAccept(!!c)} />
            <Label htmlFor="acc" className="cursor-pointer leading-relaxed text-white/80">
              Li e aceito os termos de uso e a política de privacidade.
            </Label>
          </label>
        </div>
        <DialogFooter className="border-t border-white/5 bg-white/[0.02] px-6 py-4">
          <Button variant="premium" onClick={confirm} disabled={!accept || saving} className="w-full">
            {saving ? "Salvando..." : "Aceitar e continuar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}