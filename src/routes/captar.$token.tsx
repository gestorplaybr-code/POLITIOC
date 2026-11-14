import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { BRLocationPicker } from "@/components/br-location-picker";
import { maskPhoneBR, isValidWhatsAppBR, maskCPF } from "@/lib/br-masks";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/captar/$token")({
  head: () => ({
    meta: [
      { title: "Cadastro do Eleitor" },
      { name: "description", content: "Cadastre seus dados de forma segura junto ao coordenador da campanha." },
      { name: "robots", content: "noindex, nofollow" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1" },
    ],
  }),
  component: CaptarPage,
});

function CaptarPage() {
  const { token } = Route.useParams();
  const infoQ = useQuery({
    queryKey: ["captacao-info", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_captacao_info", { p_token: token });
      if (error) throw error;
      return data as { coordenador_nome: string; politico_nome: string | null; ativo: boolean };
    },
    retry: false,
  });

  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    nome: "", telefone: "", data_nascimento: "", cpf: "", rg: "",
    uf: "", cidade: "", zona: "", secao: "",
  });
  const [aceite, setAceite] = useState(false);

  const submit = useMutation({
    mutationFn: async () => {
      if (!aceite) throw new Error("Você precisa aceitar a Política de Privacidade (LGPD).");
      if (!form.nome.trim() || form.nome.trim().length < 2) throw new Error("Informe seu nome completo.");
      if (!isValidWhatsAppBR(form.telefone)) throw new Error("WhatsApp inválido. Use DDD + 9 dígitos.");
      if (!form.data_nascimento) throw new Error("Informe sua data de nascimento.");
      const cpfDigits = form.cpf.replace(/\D/g, "");
      if (!cpfDigits && !form.rg.trim()) throw new Error("Informe CPF ou RG.");
      if (cpfDigits && cpfDigits.length !== 11) throw new Error("CPF inválido.");
      if (!form.cidade || !form.uf) throw new Error("Informe cidade e UF.");
      const { data, error } = await supabase.rpc("submit_captacao_publica", {
        p_token: token,
        p_payload: {
          consentimento: true,
          nome: form.nome.trim(),
          telefone: form.telefone,
          data_nascimento: form.data_nascimento,
          cpf: cpfDigits,
          rg: form.rg.trim(),
          cidade: form.cidade,
          uf: form.uf,
          zona: form.zona.trim(),
          secao: form.secao.trim(),
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { setDone(true); toast.success("Cadastro enviado com sucesso!"); },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível enviar."),
  });

  if (infoQ.isLoading) {
    return <CenteredMsg><Loader2 className="h-6 w-6 animate-spin" /> Carregando...</CenteredMsg>;
  }
  if (infoQ.isError || !infoQ.data) {
    return <CenteredMsg>Link inválido ou expirado.</CenteredMsg>;
  }
  if (!infoQ.data.ativo) {
    return <CenteredMsg>Este coordenador está inativo. Fale com a campanha.</CenteredMsg>;
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border bg-card p-6 text-center space-y-4">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
          <h1 className="text-xl font-semibold">Cadastro enviado!</h1>
          <p className="text-sm text-muted-foreground">
            Obrigado, {form.nome.split(" ")[0]}. Seus dados foram registrados junto ao coordenador {infoQ.data.coordenador_nome}.
          </p>
          <Button className="w-full" onClick={() => { setDone(false); setForm({ nome: "", telefone: "", data_nascimento: "", cpf: "", rg: "", uf: form.uf, cidade: form.cidade, zona: "", secao: "" }); setAceite(false); }}>
            Cadastrar outro eleitor
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md p-4 pb-24 space-y-5">
        <header className="pt-2 space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> Cadastro seguro
          </div>
          <h1 className="text-2xl font-bold">Cadastre seus dados</h1>
          <p className="text-sm text-muted-foreground">
            Coordenador: <span className="font-medium text-foreground">{infoQ.data.coordenador_nome}</span>
            {infoQ.data.politico_nome && <> · Campanha: <span className="font-medium text-foreground">{infoQ.data.politico_nome}</span></>}
          </p>
        </header>

        <form
          className="space-y-4"
          onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}
        >
          <div className="space-y-1.5">
            <Label>Nome completo *</Label>
            <Input value={form.nome} onChange={(e) => setForm((s) => ({ ...s, nome: e.target.value }))} maxLength={120} required autoComplete="name" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nascimento *</Label>
              <Input type="date" value={form.data_nascimento} onChange={(e) => setForm((s) => ({ ...s, data_nascimento: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp *</Label>
              <Input inputMode="tel" placeholder="(11) 9 9999-9999" value={form.telefone}
                onChange={(e) => setForm((s) => ({ ...s, telefone: maskPhoneBR(e.target.value) }))} required />
            </div>
          </div>

          <BRLocationPicker
            uf={form.uf} cidade={form.cidade}
            onChange={(v) => setForm((s) => ({ ...s, uf: v.uf, cidade: v.cidade }))}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>CPF</Label>
              <Input inputMode="numeric" placeholder="000.000.000-00" value={form.cpf}
                onChange={(e) => setForm((s) => ({ ...s, cpf: maskCPF(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>RG</Label>
              <Input value={form.rg} onChange={(e) => setForm((s) => ({ ...s, rg: e.target.value }))} maxLength={20} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">Informe CPF ou RG.</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Zona eleitoral</Label>
              <Input inputMode="numeric" value={form.zona} onChange={(e) => setForm((s) => ({ ...s, zona: e.target.value }))} maxLength={10} />
            </div>
            <div className="space-y-1.5">
              <Label>Seção</Label>
              <Input inputMode="numeric" value={form.secao} onChange={(e) => setForm((s) => ({ ...s, secao: e.target.value }))} maxLength={10} />
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
            <Checkbox checked={aceite} onCheckedChange={(v) => setAceite(!!v)} className="mt-0.5" />
            <span>
              Li e concordo com a{" "}
              <a href="/politica-privacidade" target="_blank" className="underline underline-offset-2 font-medium">
                Política de Privacidade (LGPD)
              </a>
              . Autorizo o uso dos meus dados para contato da campanha.
            </span>
          </label>

          <Button type="submit" className="w-full h-12 text-base" disabled={submit.isPending || !aceite}>
            {submit.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</> : "Enviar cadastro"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function CenteredMsg({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
      <div className="max-w-sm space-y-2 text-sm text-muted-foreground flex flex-col items-center">{children}</div>
    </div>
  );
}