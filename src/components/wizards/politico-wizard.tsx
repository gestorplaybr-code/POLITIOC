import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Landmark, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useInvalidate, toastError } from "@/lib/use-mutation-toast";
import { Wizard, HelpHint, WizardDialog } from "@/components/wizard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BRLocationPicker } from "@/components/br-location-picker";
import {
  digitsOnly,
  isValidEmail,
  isValidWhatsAppBR,
  maskPhoneBR,
} from "@/lib/br-masks";

const BIO_MAX = 240;

type Created = { id: string; nome: string };

export function PoliticoWizard({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (p: Created) => void;
}) {
  const invalidate = useInvalidate();
  const [f, setF] = useState({
    nome: "", partido: "", cargo: "",
    cidade: "", estado: "", email: "", whatsapp: "", bio: "",
  });
  function reset() {
    setF({ nome: "", partido: "", cargo: "", cidade: "", estado: "", email: "", whatsapp: "", bio: "" });
  }

  const mut = useMutation({
    mutationFn: async () => {
      if (f.nome.trim().length < 2) throw new Error("Nome obrigatório (mínimo 2 caracteres)");
      if (f.email && !isValidEmail(f.email)) throw new Error("E-mail inválido");
      if (f.whatsapp && !isValidWhatsAppBR(f.whatsapp))
        throw new Error("WhatsApp inválido. Use (DD) 9XXXX-XXXX");
      if (f.bio && f.bio.length > BIO_MAX)
        throw new Error(`Bio com no máximo ${BIO_MAX} caracteres`);
      const payload = {
        nome: f.nome.trim(),
        partido: f.partido || null,
        cargo: f.cargo || null,
        cidade: f.cidade || null,
        estado: f.estado || null,
        email: f.email ? f.email.trim().toLowerCase() : null,
        whatsapp: f.whatsapp ? digitsOnly(f.whatsapp) : null,
        bio: f.bio ? f.bio.trim() : null,
      };
      const { data, error } = await supabase
        .from("politicos").insert(payload).select("id, nome").single();
      if (error) throw error;
      return data as Created;
    },
    onSuccess: (row) => {
      toast.success("Político cadastrado");
      invalidate([["politicos"], ["politicos-min"], ["politicos-lookup"], ["dashboard-stats"]]);
      onCreated?.(row);
      onOpenChange(false);
      reset();
    },
    onError: (e) => toastError(e, "politico"),
  });

  return (
    <WizardDialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <Wizard
        onCancel={() => onOpenChange(false)}
        pending={mut.isPending}
        onFinish={() => mut.mutate()}
        finishLabel="Cadastrar político"
        steps={[
          {
            id: "identidade",
            title: "Quem é o político?",
            description: "Informe nome, partido e cargo. Só o nome é obrigatório.",
            isValid: () => f.nome.trim().length >= 2,
            render: () => (
              <div className="space-y-4">
                <HelpHint>
                  <strong className="text-white">Político</strong> é a pessoa pública que você
                  vai gerenciar. Você pode cadastrar quantos quiser — cada um terá link público,
                  enquetes e eleitores próprios.
                </HelpHint>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2"><User className="h-3.5 w-3.5" /> Nome completo *</Label>
                  <Input
                    value={f.nome}
                    onChange={(e) => setF({ ...f, nome: e.target.value })}
                    placeholder="Ex.: João da Silva"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Partido</Label>
                    <Input value={f.partido} onChange={(e) => setF({ ...f, partido: e.target.value })} placeholder="Ex.: PSDB" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cargo atual</Label>
                    <Input value={f.cargo} onChange={(e) => setF({ ...f, cargo: e.target.value })} placeholder="Ex.: Vereador" />
                  </div>
                </div>
              </div>
            ),
          },
          {
            id: "local-contato",
            title: "Onde atua e como contatar",
            description: "Esses dados aparecem no painel e ajudam a segmentar eleitores.",
            render: () => (
              <div className="space-y-4">
                <HelpHint>
                  Cidade e UF são usadas para organizar relatórios e segmentar a base de eleitores.
                  Email e WhatsApp são opcionais — você pode adicionar depois.
                </HelpHint>
                <BRLocationPicker
                  uf={f.estado}
                  cidade={f.cidade}
                  onChange={({ uf, cidade }) => setF({ ...f, estado: uf, cidade })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={f.email}
                      onChange={(e) => setF({ ...f, email: e.target.value })}
                      placeholder="nome@dominio.com"
                    />
                    {f.email && !isValidEmail(f.email) && (
                      <p className="text-xs text-rose-400">Formato de e-mail inválido</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>WhatsApp</Label>
                    <Input
                      inputMode="tel"
                      value={f.whatsapp}
                      onChange={(e) =>
                        setF({ ...f, whatsapp: maskPhoneBR(e.target.value) })
                      }
                      placeholder="(11) 9 9999-9999"
                      maxLength={17}
                    />
                    {f.whatsapp && !isValidWhatsAppBR(f.whatsapp) && (
                      <p className="text-xs text-rose-400">
                        Use DDD + 9 + número (11 dígitos)
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Bio curta</Label>
                    <span
                      className={`text-[11px] tabular-nums ${
                        f.bio.length > BIO_MAX
                          ? "text-rose-400"
                          : "text-slate-400"
                      }`}
                    >
                      {f.bio.length}/{BIO_MAX}
                    </span>
                  </div>
                  <Textarea
                    value={f.bio}
                    onChange={(e) =>
                      setF({ ...f, bio: e.target.value.slice(0, BIO_MAX) })
                    }
                    rows={3}
                    maxLength={BIO_MAX}
                    placeholder="Aparece no link público."
                  />
                </div>
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3 text-xs text-emerald-100/80">
                  <Landmark className="mr-1.5 inline h-3.5 w-3.5" />
                  Ao salvar, um <strong>código único</strong> e <strong>link público</strong> são
                  gerados automaticamente.
                </div>
              </div>
            ),
          },
        ]}
      />
    </WizardDialog>
  );
}