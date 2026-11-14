import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronRight, Landmark, Trophy, Vote, Users, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PoliticoWizard } from "@/components/wizards/politico-wizard";
import { PleitoWizard } from "@/components/wizards/pleito-wizard";
import { CandidatoWizard } from "@/components/wizards/candidato-wizard";
import { EleitorWizard } from "@/components/wizards/eleitor-wizard";

type StepDef = {
  key: "pol" | "ple" | "can" | "ele";
  num: number;
  icon: any;
  title: string;
  description: string;
  cta: string;
};

const steps: StepDef[] = [
  { key: "pol", num: 1, icon: Landmark, title: "Cadastre seu primeiro político", description: "É o ponto de partida. Tudo no sistema (eleitores, enquetes, candidatos) pertence a um político.", cta: "Cadastrar político" },
  { key: "ple", num: 2, icon: Trophy, title: "Crie um pleito", description: "Pleito é a eleição/disputa onde os candidatos vão concorrer (Municipal, Estadual, Federal).", cta: "Criar pleito" },
  { key: "can", num: 3, icon: Vote, title: "Vincule candidatos ao pleito", description: "Adicione os candidatos da sua chapa ou apoiadores e amarre-os ao pleito.", cta: "Adicionar candidato" },
  { key: "ele", num: 4, icon: Users, title: "Cadastre eleitores (ou importe CSV)", description: "Construa sua base. Você pode cadastrar manualmente ou importar uma planilha de uma vez.", cta: "Cadastrar eleitor" },
];

export function WelcomeChecklist({ onSkip }: { onSkip: () => void }) {
  const [openPol, setOpenPol] = useState(false);
  const [openPle, setOpenPle] = useState(false);
  const [openCan, setOpenCan] = useState(false);
  const [openEle, setOpenEle] = useState(false);

  const counts = useQuery({
    queryKey: ["onboarding-counts"],
    staleTime: 30_000,
    queryFn: async () => {
      const [pol, ple, can, ele] = await Promise.all([
        supabase.from("politicos").select("id", { count: "exact", head: true }),
        supabase.from("pleitos").select("id", { count: "exact", head: true }),
        supabase.from("candidatos").select("id", { count: "exact", head: true }),
        supabase.from("eleitores").select("id", { count: "exact", head: true }),
      ]);
      return {
        pol: pol.count ?? 0,
        ple: ple.count ?? 0,
        can: can.count ?? 0,
        ele: ele.count ?? 0,
      };
    },
  });

  const done = (k: StepDef["key"]) => (counts.data?.[k] ?? 0) > 0;
  const completedCount = (["pol", "ple", "can", "ele"] as const).filter(done).length;
  const nextIdx = steps.findIndex((s) => !done(s.key));
  const allDone = nextIdx === -1;

  function openWizard(k: StepDef["key"]) {
    if (k === "pol") setOpenPol(true);
    if (k === "ple") setOpenPle(true);
    if (k === "can") setOpenCan(true);
    if (k === "ele") setOpenEle(true);
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/[0.08] via-violet-500/[0.05] to-transparent p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(129,140,248,0.5), transparent 70%)" }}
      />

      <button
        type="button"
        onClick={onSkip}
        className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-white/40 transition hover:bg-white/5 hover:text-white"
        title="Pular tutorial"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-indigo-300/80">
          <Sparkles className="h-3.5 w-3.5" />
          Comece por aqui
        </div>
        <h1
          className="text-3xl uppercase tracking-wide text-white sm:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {allDone ? "Tudo pronto!" : "Bem-vindo ao Política+"}
        </h1>
        <p className="max-w-2xl text-sm text-white/60">
          {allDone
            ? "Você completou os primeiros passos. Pode usar o painel normalmente — esta tela some assim que você fechar."
            : "Em 4 passos rápidos você deixa o sistema pronto para gerir sua campanha. Cada passo abre uma janela guiada — você não precisa saber nada técnico."}
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 w-48 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(completedCount / steps.length) * 100}%`,
                background: "linear-gradient(90deg, #818cf8, #c084fc)",
                boxShadow: "0 0 12px rgba(129,140,248,0.5)",
              }}
            />
          </div>
          <span className="text-xs text-white/50">{completedCount} de {steps.length}</span>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {steps.map((s, idx) => {
          const isDone = done(s.key);
          const isNext = !isDone && idx === nextIdx;
          const Icon = s.icon;
          return (
            <div
              key={s.key}
              className={cn(
                "relative rounded-2xl border p-5 transition",
                isDone
                  ? "border-emerald-400/30 bg-emerald-500/[0.04]"
                  : isNext
                    ? "border-indigo-400/50 bg-indigo-500/[0.08] shadow-[0_0_32px_rgba(129,140,248,0.2)]"
                    : "border-white/10 bg-white/[0.02]",
              )}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "grid h-12 w-12 shrink-0 place-items-center rounded-2xl",
                    isDone
                      ? "bg-emerald-500/20 text-emerald-300"
                      : isNext
                        ? "bg-gradient-to-br from-indigo-500 to-violet-500 text-white"
                        : "bg-white/[0.05] text-white/50",
                  )}
                >
                  {isDone ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/40">
                    Passo {s.num}
                    {isDone && <span className="text-emerald-300">· Concluído</span>}
                    {isNext && <span className="text-indigo-300">· Próximo</span>}
                  </div>
                  <h3 className="text-base font-medium text-white">{s.title}</h3>
                  <p className="text-xs leading-relaxed text-white/55">{s.description}</p>
                  <div className="pt-2">
                    {s.key === "ele" && !isDone ? (
                      <div className="flex gap-2">
                        <Button variant={isNext ? "premium" : "outline"} size="sm" onClick={() => openWizard(s.key)}>
                          {s.cta} <ChevronRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                        <Button asChild variant="ghost" size="sm">
                          <Link to="/eleitores">Importar CSV</Link>
                        </Button>
                      </div>
                    ) : !isDone ? (
                      <Button variant={isNext ? "premium" : "outline"} size="sm" onClick={() => openWizard(s.key)}>
                        {s.cta} <ChevronRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button asChild variant="ghost" size="sm">
                        <Link to={
                          s.key === "pol" ? "/politicos" : s.key === "ple" ? "/pleitos" : s.key === "can" ? "/candidatos" : "/eleitores"
                        }>
                          Ver lista <ChevronRight className="ml-1 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <PoliticoWizard open={openPol} onOpenChange={setOpenPol} />
      <PleitoWizard open={openPle} onOpenChange={setOpenPle} />
      <CandidatoWizard open={openCan} onOpenChange={setOpenCan} />
      <EleitorWizard open={openEle} onOpenChange={setOpenEle} />
    </div>
  );
}