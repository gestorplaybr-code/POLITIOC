import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MessageSquare, FileText, Send, AlertTriangle, CheckCircle2, Megaphone, Webhook, Loader2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { SectionCard } from "@/components/section-card";
import { WhatsAppBubble } from "@/components/whatsapp-bubble";
import { CinemaError } from "@/components/cinema-error";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { DisparoLivreDialog } from "@/components/disparo-livre-dialog";
import { useCurrentUser } from "@/lib/auth";
import { syncZapiWebhooks, getZapiStatus, getRecentZapiEvents } from "@/lib/zapi.functions";

export const Route = createFileRoute("/_authenticated/whatsapp")({
  head: () => ({ meta: [{ title: "WhatsApp — Política+" }] }),
  errorComponent: ({ error, reset }) => <CinemaError error={error as Error} reset={reset} />,
  component: WhatsAppLayout,
});

const tabs = [
  { to: "/whatsapp", label: "Visão geral", icon: MessageSquare, exact: true },
  { to: "/whatsapp/templates", label: "Templates", icon: FileText },
  { to: "/whatsapp/campanhas", label: "Campanhas", icon: Send },
];

function WhatsAppLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Comunicação"
        title="WhatsApp"
        description="Gestão de templates e campanhas de disparo para sua base de eleitores."
      />

      <div className="relative overflow-hidden rounded-2xl border border-amber-400/25 bg-amber-500/[0.06] p-4 backdrop-blur">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative flex items-start gap-3 text-sm">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-amber-200 shadow-[0_0_20px_-4px_rgba(251,191,36,0.6)]">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="text-amber-100">
            <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-200/80">
              Integração Z-API pendente
            </div>
            <p className="mt-1 text-amber-50/90">
              A estrutura completa de templates e campanhas já está pronta. O envio real
              será habilitado quando as credenciais da Z-API forem configuradas.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const active = t.exact ? path === t.to : path.startsWith(t.to);
          return (
            <Link key={t.to} to={t.to} className="tab-pill" data-active={active}>
              <t.icon className="h-4 w-4" /> {t.label}
            </Link>
          );
        })}
      </div>

      {path === "/whatsapp" ? <Overview /> : <Outlet />}
    </div>
  );
}

function Overview() {
  const { profile, isAdmin } = useCurrentUser();
  const politicoId = (profile as any)?.politico_id ?? "";
  const [openDisparo, setOpenDisparo] = useState(false);

  const statusFn = useServerFn(getZapiStatus);
  const syncFn = useServerFn(syncZapiWebhooks);
  const eventsFn = useServerFn(getRecentZapiEvents);
  const zapiStatus = useQuery({
    queryKey: ["zapi-webhook-status"],
    queryFn: () => statusFn(),
    enabled: isAdmin,
    staleTime: 30_000,
  });
  const configuredUrl = (zapiStatus.data as any)?.received?.value ?? (zapiStatus.data as any)?.received?.url ?? null;
  const expectedUrl = "https://politica.adscomunicacao.com/api/public/zapi/webhook";
  const isPointingHere = typeof configuredUrl === "string" && configuredUrl.includes("/api/public/zapi/webhook");
  const urlExactMatch = configuredUrl === expectedUrl;
  const deviceConnected = Boolean((zapiStatus.data as any)?.connected);
  const devicePhone = (zapiStatus.data as any)?.device?.phone ?? null;

  const syncMut = useMutation({
    mutationFn: () => syncFn({ data: { webhookUrl: expectedUrl } }),
    onSuccess: () => { toast.success("Webhooks do Z-API atualizados"); zapiStatus.refetch(); recentEvents.refetch(); },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao configurar webhook"),
  });

  // Auto-reconfigura uma única vez se o webhook não estiver apontando pra cá.
  const autoSyncedRef = useRef(false);
  useEffect(() => {
    if (!isAdmin) return;
    if (zapiStatus.isLoading || zapiStatus.isFetching) return;
    if (!zapiStatus.data) return;
    if (isPointingHere) return;
    if (autoSyncedRef.current) return;
    autoSyncedRef.current = true;
    syncMut.mutate();
  }, [isAdmin, zapiStatus.data, zapiStatus.isLoading, zapiStatus.isFetching, isPointingHere]);

  const recentEvents = useQuery({
    queryKey: ["zapi-recent-events"],
    queryFn: () => eventsFn(),
    enabled: isAdmin,
    refetchInterval: 15_000,
  });
  const events: any[] = (recentEvents.data as any)?.events ?? [];
  const hasInbound = events.some((e) => String(e.resultado ?? "").startsWith("inbound"));

  const templates = useQuery({
    queryKey: ["wa-overview-templates"],
    queryFn: async () => {
      const { count } = await supabase
        .from("whatsapp_templates")
        .select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const campanhas = useQuery({
    queryKey: ["wa-overview-campanhas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("whatsapp_campanhas")
        .select("status, total_enviado, total_alvo");
      const rows = data ?? [];
      const enviadas = rows.reduce((a: number, r: any) => a + (r.total_enviado ?? 0), 0);
      const alvo = rows.reduce((a: number, r: any) => a + (r.total_alvo ?? 0), 0);
      return {
        total: rows.length,
        enviadas,
        taxa: alvo > 0 ? Math.round((enviadas / alvo) * 100) : 0,
      };
    },
  });

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className={`rounded-2xl border p-4 ${isPointingHere ? "border-emerald-400/30 bg-emerald-500/[0.06]" : "border-rose-400/30 bg-rose-500/[0.06]"}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`grid h-10 w-10 place-items-center rounded-xl ${isPointingHere ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>
                <Webhook className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold">
                  Webhook do WhatsApp (Z-API) — {zapiStatus.isLoading ? "verificando…" : isPointingHere ? "conectado" : "não configurado"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isPointingHere
                    ? "As mensagens recebidas pela IA estão chegando ao sistema."
                    : "Sem isso, o eleitor manda mensagem e a IA não é acionada. Clique em Reconfigurar."}
                </p>
                {configuredUrl && (
                  <p className="mt-1 truncate text-[11px] text-muted-foreground">URL atual: {configuredUrl}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => zapiStatus.refetch()} disabled={zapiStatus.isFetching}>
                <RefreshCw className={`mr-1 h-4 w-4 ${zapiStatus.isFetching ? "animate-spin" : ""}`} /> Verificar
              </Button>
              <Button size="sm" onClick={() => syncMut.mutate()} disabled={syncMut.isPending}>
                {syncMut.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Webhook className="mr-1 h-4 w-4" />}
                Reconfigurar
              </Button>
            </div>
          </div>
          {isPointingHere && (
            <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3 text-xs">
              <div className="mb-2 grid gap-1 sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">WhatsApp da instância:</span>{" "}
                  {deviceConnected
                    ? <span className="text-emerald-300">✅ conectado {devicePhone ? `(${devicePhone})` : ""}</span>
                    : <span className="text-rose-300">❌ desconectado — escaneie o QR no painel Z-API</span>}
                </div>
                <div>
                  <span className="text-muted-foreground">URL bate exatamente:</span>{" "}
                  {urlExactMatch
                    ? <span className="text-emerald-300">✅ sim</span>
                    : <span className="text-amber-300">⚠️ diferente do esperado — clique em Reconfigurar</span>}
                </div>
              </div>
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium">
                  Últimos eventos recebidos ({events.length}) —{" "}
                  {hasInbound
                    ? <span className="text-emerald-300">✅ mensagens de eleitores chegando</span>
                    : <span className="text-amber-300">⏳ aguardando primeira mensagem</span>}
                </span>
                <Button variant="ghost" size="sm" onClick={() => recentEvents.refetch()}>
                  <RefreshCw className={`h-3 w-3 ${recentEvents.isFetching ? "animate-spin" : ""}`} />
                </Button>
              </div>
              {events.length === 0 ? (
                <p className="text-muted-foreground">
                  Nenhum evento ainda. Peça a alguém para enviar uma mensagem para o número do bot; deve aparecer aqui em segundos.
                </p>
              ) : (
                <ul className="max-h-40 space-y-1 overflow-auto">
                  {events.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">
                        <span className="text-muted-foreground">{new Date(e.created_at).toLocaleTimeString()}</span>{" "}
                        <span className="font-mono">{e.resultado ?? "?"}</span>
                        {e.phone && <span className="text-muted-foreground"> · {e.phone}</span>}
                      </span>
                      {e.erro && <span className="truncate text-rose-300" title={e.erro}>{e.erro}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/[0.06] p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/20 text-emerald-200">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">Disparo direto</div>
              <p className="text-xs text-muted-foreground">
                Envie texto, imagem, vídeo, PDF ou áudio para sua base — sem depender do coordenador.
              </p>
            </div>
          </div>
          <Button
            variant="premium"
            onClick={() => setOpenDisparo(true)}
            disabled={!politicoId}
            title={!politicoId ? "Vincule um político ao seu perfil" : ""}
          >
            <Send className="mr-2 h-4 w-4" /> Novo disparo
          </Button>
        </div>
      </div>
      {politicoId && (
        <DisparoLivreDialog politicoId={politicoId} open={openDisparo} onOpenChange={setOpenDisparo} />
      )}

      <div className="grid gap-4 sm:grid-cols-3 cinema-stagger">
        <StatCard icon={FileText} tone="indigo" label="Templates" value={templates.data ?? 0} hint="modelos prontos para uso" />
        <StatCard icon={Send} tone="violet" label="Campanhas" value={campanhas.data?.total ?? 0} hint="planejadas no sistema" />
        <StatCard icon={CheckCircle2} tone="mint" label="Taxa estimada" value={`${campanhas.data?.taxa ?? 0}%`} hint="enviado vs alvo" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] cinema-stagger">
        <div className="grid gap-5">
          <Link to="/whatsapp/templates" className="block">
            <SectionCard
              title="Templates de mensagem"
              description="Modelos reutilizáveis com variáveis"
              icon={<FileText className="h-4 w-4" />}
              className="transition hover:border-indigo-400/30 hover:shadow-[0_0_40px_-10px_rgba(124,58,237,0.4)]"
            >
              <p className="text-sm text-white/60">
                Crie modelos com <code className="text-indigo-300">{"{{nome}}"}</code>,{" "}
                <code className="text-indigo-300">{"{{cidade}}"}</code>,{" "}
                <code className="text-indigo-300">{"{{bairro}}"}</code> — a substituição é feita
                automaticamente no envio.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-indigo-300">
                Gerenciar templates →
              </div>
            </SectionCard>
          </Link>

          <Link to="/whatsapp/campanhas" className="block">
            <SectionCard
              title="Campanhas"
              description="Planeje e dispare em massa"
              icon={<Send className="h-4 w-4" />}
              className="transition hover:border-indigo-400/30 hover:shadow-[0_0_40px_-10px_rgba(124,58,237,0.4)]"
            >
              <p className="text-sm text-white/60">
                Segmente eleitores por cidade ou bairro, acompanhe entrega em tempo real e
                exporte resultados.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-indigo-300">
                Ver campanhas →
              </div>
            </SectionCard>
          </Link>
        </div>

        <SectionCard
          title="Pré-visualização"
          description="Como a mensagem chega"
          icon={<MessageSquare className="h-4 w-4" />}
        >
          <WhatsAppBubble
            text="Olá {{nome}}! Sou da campanha do candidato. Posso contar com seu apoio em {{cidade}}?"
            variables={{ nome: "Maria", cidade: "São Paulo" }}
          />
        </SectionCard>
      </div>
    </div>
  );
}