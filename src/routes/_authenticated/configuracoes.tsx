import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, MessageSquare, FileText, Lock, Save, Sparkles, Moon, Sun, Check } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { CinemaError } from "@/components/cinema-error";
import { useCurrentUser } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useInvalidate, toastError } from "@/lib/use-mutation-toast";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Política+" }] }),
  errorComponent: ({ error, reset }) => <CinemaError error={error as Error} reset={reset} />,
  component: Configuracoes,
});

function Configuracoes() {
  const { isAdmin } = useCurrentUser();
  const invalidate = useInvalidate();
  const { theme, setTheme } = useTheme();
  const [nome, setNome] = useState("");
  const [termo, setTermo] = useState("");

  const cfg = useQuery({
    queryKey: ["plataforma-config"],
    queryFn: async () => {
      const { data } = await supabase.from("plataforma_config").select("*").eq("id", true).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (cfg.data) {
      setNome(cfg.data.nome ?? "");
      setTermo(cfg.data.termo_privacidade ?? "");
    }
  }, [cfg.data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("plataforma_config")
        .update({ nome, termo_privacidade: termo, updated_at: new Date().toISOString() })
        .eq("id", true);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Configurações salvas"); invalidate([["plataforma-config"]]); },
    onError: (e) => toastError(e),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sistema"
        title="Configurações"
        description="Ajustes da plataforma, integrações e conformidade legal."
      />

      <div className="grid gap-5 cinema-stagger">
        <SectionCard
          title="Aparência"
          description="Escolha como o painel é exibido para você"
          icon={<Sparkles className="h-4 w-4" />}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`relative rounded-xl border p-4 text-left transition ${theme === "dark" ? "border-indigo-400/60 bg-indigo-500/10 shadow-[0_0_30px_-10px_rgba(124,58,237,0.5)]" : "border-white/10 bg-white/[0.02] hover:border-white/20"}`}
            >
              {theme === "dark" && (
                <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-white">
                  <Check className="h-3 w-3" />
                </div>
              )}
              <div className="mb-3 h-20 rounded-lg bg-gradient-to-br from-[#0a0a1a] via-[#1e1e5a]/40 to-[#7c3aed]/30" />
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-indigo-300" />
                <span className="font-display text-base uppercase tracking-wide text-white">Escuro</span>
                <span className="ml-auto rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-emerald-200">Padrão</span>
              </div>
              <p className="mt-1 text-xs text-white/55">Visual cinematográfico midnight indigo.</p>
            </button>
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`relative rounded-xl border p-4 text-left transition ${theme === "light" ? "border-indigo-400/60 bg-indigo-500/10 shadow-[0_0_30px_-10px_rgba(124,58,237,0.5)]" : "border-white/10 bg-white/[0.02] hover:border-white/20"}`}
            >
              {theme === "light" && (
                <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-white">
                  <Check className="h-3 w-3" />
                </div>
              )}
              <div className="mb-3 h-20 rounded-lg bg-gradient-to-br from-slate-50 via-indigo-50 to-violet-50" />
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-indigo-300" />
                <span className="font-display text-base uppercase tracking-wide text-white">Claro</span>
              </div>
              <p className="mt-1 text-xs text-white/55">Fundo claro, alto contraste.</p>
            </button>
          </div>
        </SectionCard>

        {isAdmin && (
          <SectionCard
            title="Plataforma"
            description="Identidade e termos públicos"
            icon={<FileText className="h-4 w-4" />}
            actions={
              <Button onClick={() => save.mutate()} disabled={save.isPending} variant="premium" size="sm">
                <Save className="h-4 w-4" /> {save.isPending ? "Salvando..." : "Salvar"}
              </Button>
            }
          >
            <div className="grid gap-4 sm:grid-cols-[300px,1fr]">
              <div className="space-y-1.5">
                <Label>Nome exibido</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
            </div>
            <div className="mt-4 space-y-1.5">
              <Label>Texto da política de privacidade</Label>
              <Textarea
                rows={10}
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                placeholder="Deixe em branco para usar o texto padrão."
              />
              <p className="text-[11px] text-white/40">
                Publicado em <code className="text-indigo-300">/politica-privacidade</code>.
              </p>
            </div>
          </SectionCard>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          {isAdmin && (
            <Link to="/auditoria" className="group block">
              <SectionCard
                title="Auditoria"
                description="Histórico de ações no sistema"
                icon={<ShieldCheck className="h-4 w-4" />}
                className="transition group-hover:border-indigo-400/30 group-hover:shadow-[0_0_40px_-10px_rgba(124,58,237,0.4)]"
              >
                <p className="text-sm text-white/60">
                  Veja quem alterou o quê, quando e por quê — com filtros por
                  entidade, ação e período.
                </p>
                <div className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-indigo-300">
                  Abrir auditoria →
                </div>
              </SectionCard>
            </Link>
          )}

          <SectionCard
            title="WhatsApp Z-API"
            description="Integração de disparos"
            icon={<MessageSquare className="h-4 w-4" />}
            actions={
              <Badge className="border-amber-400/30 bg-amber-500/10 text-amber-200">
                <Sparkles className="mr-1 h-3 w-3" /> Em breve
              </Badge>
            }
          >
            <p className="text-sm text-white/60">
              A estrutura completa de templates e campanhas já está pronta. O
              envio real será habilitado quando as credenciais forem
              configuradas.
            </p>
            <Button variant="glass" size="sm" disabled className="mt-4">
              Conectar Z-API
            </Button>
          </SectionCard>

          <SectionCard
            title="LGPD — Tratamento de dados"
            description="Princípios aplicados"
            icon={<FileText className="h-4 w-4" />}
            className="lg:col-span-2"
          >
            <p className="text-sm text-white/60">
              Tratamento conforme a Lei nº 13.709/2018, com finalidade
              exclusivamente política.
            </p>
            <ul className="mt-3 grid gap-2 text-sm text-white/65 sm:grid-cols-2">
              <li className="flex gap-2"><span className="text-indigo-300">▹</span> Dados restritos ao necessário para a relação eleitoral.</li>
              <li className="flex gap-2"><span className="text-indigo-300">▹</span> Acesso controlado por papéis (5 níveis).</li>
              <li className="flex gap-2"><span className="text-indigo-300">▹</span> Operações sensíveis registradas em auditoria.</li>
              <li className="flex gap-2"><span className="text-indigo-300">▹</span> Titular pode pedir exclusão ou retificação.</li>
            </ul>
          </SectionCard>

          <SectionCard
            title="Segurança"
            description="Camadas ativas"
            icon={<Lock className="h-4 w-4" />}
            className="lg:col-span-2"
          >
            <ul className="grid gap-2 text-sm text-white/65 sm:grid-cols-2">
              <li className="flex gap-2"><span className="text-emerald-400">●</span> Senhas com hash forte (Argon2) e mínimo 8 caracteres.</li>
              <li className="flex gap-2"><span className="text-emerald-400">●</span> RLS ativo em todas as tabelas — escopo por político.</li>
              <li className="flex gap-2"><span className="text-emerald-400">●</span> Funções privilegiadas exigem validação de papel.</li>
              <li className="flex gap-2"><span className="text-emerald-400">●</span> Sessões protegidas com expiração automática.</li>
            </ul>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}