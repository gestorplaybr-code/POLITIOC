import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Radio, Volume2, VolumeX, Pause, Play, Maximize, Minimize,
  Smartphone, Globe, MessageCircle, MapPin, Users, Activity, TrendingUp,
  MousePointerClick, MessageSquare, CheckCircle2, XCircle, Timer, UserRound, PhoneCall, Send,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/enquetes/$id/ao-vivo")({
  head: () => ({ meta: [{ title: "Ao vivo — Política+" }] }),
  component: AoVivoPage,
  errorComponent: ({ error, reset }) => (
    <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-6">
      <h2 className="text-lg font-semibold text-destructive">Não foi possível abrir o painel ao vivo</h2>
      <p className="text-sm text-muted-foreground">{(error as any)?.message ?? "Erro desconhecido."}</p>
      <Button size="sm" onClick={() => reset()}>Tentar novamente</Button>
    </div>
  ),
});

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function FunnelStep({ icon, label, value, tint, pulse }: {
  icon: React.ReactNode; label: string; value: number; tint: string; pulse?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-3 ${tint}`}>
      <div className="flex items-center gap-2 text-xs">
        <span className={pulse ? "animate-pulse" : ""}>{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

type RespostaLive = {
  id: string;
  enquete_id: string;
  nome: string | null;
  telefone: string | null;
  origem: string | null;
  dispositivo: string | null;
  created_at: string;
};

type ItemLive = {
  id: string;
  resposta_id: string;
  pergunta_id: string | null;
  opcao_id: string | null;
  texto: string | null;
  texto_outro?: string | null;
  numero: number | null;
  created_at: string;
};

const MILESTONES = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

function timeAgo(iso: string, now: number): string {
  const diff = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (diff < 5) return "agora";
  if (diff < 60) return `há ${diff}s`;
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return new Date(iso).toLocaleString("pt-BR");
}

function initials(name?: string | null): string {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function formatPhoneLive(phone?: string | null): string {
  const digits = String(phone ?? "").replace(/\D/g, "");
  const d = digits.startsWith("55") ? digits.slice(2) : digits;
  if (d.length >= 11) return `+55 (${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7, 11)}`;
  if (d.length >= 10) return `+55 (${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6, 10)}`;
  return digits ? `+${digits}` : "—";
}

function originIcon(origem: string | null) {
  if (!origem) return <Globe className="h-3 w-3" />;
  if (/whats/i.test(origem)) return <MessageCircle className="h-3 w-3 text-emerald-500" />;
  return <Globe className="h-3 w-3" />;
}

function deviceIcon(dispositivo: string | null) {
  if (!dispositivo) return null;
  if (/mobile|android|iphone/i.test(dispositivo)) return <Smartphone className="h-3 w-3" />;
  return null;
}

/** WebAudio beep — no asset */
function useBeep() {
  const ctxRef = useRef<AudioContext | null>(null);
  return (freq = 880, ms = 80) => {
    try {
      const AC = (window.AudioContext || (window as any).webkitAudioContext);
      if (!AC) return;
      const ctx = (ctxRef.current ??= new AC());
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.value = 0.07;
      osc.connect(gain).connect(ctx.destination);
      const t = ctx.currentTime;
      osc.start(t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
      osc.stop(t + ms / 1000 + 0.02);
    } catch { /* noop */ }
  };
}

/** Animated number counter */
function AnimatedCount({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();
    const dur = 600;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={className}>{display.toLocaleString("pt-BR")}</span>;
}

function AoVivoPage() {
  const { id } = Route.useParams();
  const [now, setNow] = useState(() => Date.now());
  const [paused, setPaused] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [follow, setFollow] = useState(true);
  const [feed, setFeed] = useState<RespostaLive[]>([]);
  const [items, setItems] = useState<ItemLive[]>([]);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [confetti, setConfetti] = useState(false);
  const beep = useBeep();
  const reachedRef = useRef<Set<number>>(new Set());

  // Header data
  const enquete = useQuery({
    queryKey: ["enquete-live", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enquetes")
        .select("id, titulo, slug, status, politico_id, mostrar_politico, coordenador_id, coordenador:coordenadores(nome), politico:politicos(nome)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const perguntas = useQuery({
    queryKey: ["enquete-live-perguntas", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enquete_perguntas")
        .select("id, texto, tipo, ordem, opcoes:enquete_opcoes(id, texto, ordem)")
        .eq("enquete_id", id)
        .order("ordem");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Funnel: clicks, sessions, envios
  const cliques = useQuery({
    queryKey: ["enquete-live-cliques", id],
    queryFn: async () => {
      const { count } = await supabase
        .from("enquete_convite_cliques")
        .select("*", { count: "exact", head: true })
        .eq("enquete_id", id);
      return count ?? 0;
    },
    refetchInterval: 15_000,
  });

  const envios = useQuery({
    queryKey: ["enquete-live-envios", id],
    queryFn: async () => {
      const { data: camps } = await supabase
        .from("whatsapp_campanhas")
        .select("id")
        .eq("enquete_id", id);
      const ids = (camps ?? []).map((c: any) => c.id);
      if (!ids.length) return 0;
      const { count } = await supabase
        .from("whatsapp_envios")
        .select("*", { count: "exact", head: true })
        .in("campanha_id", ids);
      return count ?? 0;
    },
    refetchInterval: 15_000,
  });

  const [sessoes, setSessoes] = useState<any[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("enquete_sessoes_whatsapp")
        .select("id, telefone, status, passo, pergunta_atual_id, started_at, last_msg_at, ended_at, historico")
        .eq("enquete_id", id)
        .order("last_msg_at", { ascending: false })
        .limit(200);
      if (!cancelled) setSessoes(data ?? []);
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (paused) return;
    const channel = supabase
      .channel(`sessoes-live-${id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "enquete_sessoes_whatsapp", filter: `enquete_id=eq.${id}` },
        (payload) => {
          setSessoes((prev) => {
            const row = (payload.new ?? payload.old) as any;
            if (!row) return prev;
            if (payload.eventType === "DELETE") return prev.filter((s) => s.id !== row.id);
            const filtered = prev.filter((s) => s.id !== row.id);
            return [row, ...filtered].slice(0, 200);
          });
        },
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, paused]);

  // Histórico inicial (últimas 100 respostas + itens)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: rs } = await supabase
        .from("respostas")
        .select("id, enquete_id, nome, telefone, origem, dispositivo, created_at")
        .eq("enquete_id", id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (cancelled) return;
      setFeed((rs ?? []) as RespostaLive[]);
      const ids = (rs ?? []).map((r: any) => r.id);
      if (ids.length) {
        const { data: its } = await supabase
          .from("resposta_itens")
          .select("id, resposta_id, pergunta_id, opcao_id, texto, texto_outro, numero, created_at")
          .in("resposta_id", ids);
        if (!cancelled) setItems((its ?? []) as ItemLive[]);
      } else {
        setItems([]);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Realtime
  useEffect(() => {
    if (paused) return;
    const channel = supabase
      .channel(`enquete-live-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "respostas", filter: `enquete_id=eq.${id}` },
        (payload) => {
          const r = payload.new as RespostaLive;
          setFeed((prev) => [r, ...prev].slice(0, 100));
          setFlashId(r.id);
          if (soundOn) beep(880, 90);
          window.setTimeout(() => setFlashId((cur) => (cur === r.id ? null : cur)), 1200);
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "resposta_itens" },
        async (payload) => {
          const it = payload.new as ItemLive;
          const { data: resposta } = await supabase
            .from("respostas")
            .select("id")
            .eq("id", it.resposta_id)
            .eq("enquete_id", id)
            .maybeSingle();
          if (!resposta) return;
          setItems((prev) => {
            if (prev.some((x) => x.id === it.id)) return prev;
            return [it, ...prev].slice(0, 2000);
          });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, paused, soundOn, beep]);

  // Tick por segundo (para "há Xs" e janela de 60s)
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  // Marcos / confetti
  useEffect(() => {
    for (const m of MILESTONES) {
      if (feed.length >= m && !reachedRef.current.has(m)) {
        reachedRef.current.add(m);
        setConfetti(true);
        window.setTimeout(() => setConfetti(false), 2200);
        if (soundOn) beep(1320, 220);
        break;
      }
    }
  }, [feed.length, soundOn, beep]);

  // Métricas derivadas
  const last60s = useMemo(
    () => feed.filter((r) => now - new Date(r.created_at).getTime() <= 60_000).length,
    [feed, now],
  );
  const last5min = useMemo(
    () => feed.filter((r) => now - new Date(r.created_at).getTime() <= 5 * 60_000).length,
    [feed, now],
  );

  // Sparkline últimas 30 min
  const sparkBuckets = useMemo(() => {
    const buckets = new Array(30).fill(0);
    const start = now - 30 * 60_000;
    for (const r of feed) {
      const t = new Date(r.created_at).getTime();
      if (t < start) continue;
      const idx = Math.min(29, Math.floor((t - start) / 60_000));
      buckets[idx]++;
    }
    return buckets;
  }, [feed, now]);
  const sparkMax = Math.max(1, ...sparkBuckets);

  // Heat 24h
  const hourBuckets = useMemo(() => {
    const h = new Array(24).fill(0);
    for (const r of feed) h[new Date(r.created_at).getHours()]++;
    return h;
  }, [feed]);
  const hourMax = Math.max(1, ...hourBuckets);

  // Origem
  const origemAgg = useMemo(() => {
    const m: Record<string, number> = { whatsapp: 0, web: 0, link_publico: 0, outros: 0 };
    for (const r of feed) {
      const o = (r.origem ?? "").toLowerCase();
      if (/whats/.test(o)) m.whatsapp++;
      else if (/link/.test(o)) m.link_publico++;
      else if (/web|form/.test(o) || !o) m.web++;
      else m.outros++;
    }
    return m;
  }, [feed]);

  // Dispositivo
  const devAgg = useMemo(() => {
    const m = { mobile: 0, desktop: 0, outros: 0 };
    for (const r of feed) {
      const d = (r.dispositivo ?? "").toLowerCase();
      if (/mobile|android|iphone/.test(d)) m.mobile++;
      else if (/desktop|mac|windows|linux/.test(d)) m.desktop++;
      else m.outros++;
    }
    return m;
  }, [feed]);

  // Por pergunta — contagem por opção e últimas dissertativas
  const perguntaAgg = useMemo(() => {
    const byPergunta: Record<string, { porOpcao: Record<string, number>; textos: { id: string; texto: string; created_at: string }[]; numeros: number[]; total: number }> = {};
    for (const it of items) {
      if (!it.pergunta_id) continue;
      const b = (byPergunta[it.pergunta_id] ??= { porOpcao: {}, textos: [], numeros: [], total: 0 });
      b.total++;
      if (it.opcao_id) b.porOpcao[it.opcao_id] = (b.porOpcao[it.opcao_id] ?? 0) + 1;
      const textoItem = it.texto ?? it.texto_outro ?? "";
      if (textoItem && textoItem.trim()) b.textos.push({ id: it.id, texto: textoItem, created_at: it.created_at });
      if (it.numero != null) b.numeros.push(Number(it.numero));
    }
    return byPergunta;
  }, [items]);

  const optionLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const p of (perguntas.data ?? []) as any[]) {
      for (const o of p.opcoes ?? []) labels[o.id] = o.texto;
    }
    return labels;
  }, [perguntas.data]);

  const questionLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const p of (perguntas.data ?? []) as any[]) labels[p.id] = p.texto;
    return labels;
  }, [perguntas.data]);

  const itemsByResposta = useMemo(() => {
    const grouped: Record<string, ItemLive[]> = {};
    for (const item of items) (grouped[item.resposta_id] ??= []).push(item);
    return grouped;
  }, [items]);

  const formatAnswer = (item: ItemLive) => {
    if (item.opcao_id) return optionLabels[item.opcao_id] ?? "Opção selecionada";
    if (item.numero != null) return String(item.numero);
    return item.texto ?? item.texto_outro ?? "Resposta registrada";
  };

  // Toggle fullscreen
  function toggleFullscreen() {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().then(() => setFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setFullscreen(false)).catch(() => {});
    }
  }
  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const e = enquete.data;

  // Funnel + session stats
  const enviosCount = envios.data ?? 0;
  const cliquesCount = cliques.data ?? 0;
  const sessAtivas = sessoes.filter((s) => s.status === "em_andamento" && s.last_msg_at && (now - new Date(s.last_msg_at).getTime()) < 30 * 60_000);
  const sessConcluidas = sessoes.filter((s) => s.status === "concluida");
  const sessCanceladas = sessoes.filter((s) => s.status === "cancelada");
  const sessAbandonadas = sessoes.filter((s) => s.status === "em_andamento" && s.last_msg_at && (now - new Date(s.last_msg_at).getTime()) >= 30 * 60_000);
  const totalConversas = sessoes.length;
  const taxaConclusao = totalConversas > 0 ? Math.round((sessConcluidas.length / totalConversas) * 100) : 0;
  const temposConclusao = sessConcluidas
    .map((s) => s.ended_at && s.started_at ? (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000 : null)
    .filter((v): v is number => v != null && v > 0);
  const tempoMedioSeg = temposConclusao.length ? Math.round(temposConclusao.reduce((a, b) => a + b, 0) / temposConclusao.length) : 0;

  // Drop-off por pergunta (baseado em passo das sessões)
  const perguntasArr = (perguntas.data ?? []) as any[];
  const dropByPergunta = perguntasArr.map((p, i) => {
    const alcancaram = sessoes.filter((s) => (s.passo ?? 0) >= i).length;
    const passaram = sessoes.filter((s) => (s.passo ?? 0) > i || s.status === "concluida").length;
    return { pergunta: p, alcancaram, passaram };
  });

  return (
    <div className="space-y-6 relative">
      {/* Confetti minimal */}
      {confetti && (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
          {Array.from({ length: 60 }).map((_, i) => (
            <span
              key={i}
              className="absolute block h-2 w-2 rounded-sm"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-10px`,
                background: ["#ef4444","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ec4899"][i % 6],
                animation: `live-fall ${1.4 + Math.random() * 1.2}s linear forwards`,
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes live-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          50% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
        }
        @keyframes live-slide-in {
          from { transform: translateY(-12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes live-flash {
          0% { background-color: rgba(250, 204, 21, 0.25); }
          100% { background-color: transparent; }
        }
        @keyframes live-fall {
          to { transform: translateY(110vh) rotate(720deg); }
        }
        .live-pulse { animation: live-pulse 1.6s infinite; }
        .live-card-in { animation: live-slide-in .35s ease-out, live-flash 1.2s ease-out; }
        .live-grad { background: linear-gradient(120deg, rgba(239,68,68,.10), rgba(139,92,246,.10), rgba(59,130,246,.10)); background-size: 200% 200%; animation: live-grad-shift 8s ease infinite; }
        @keyframes live-grad-shift {
          0%,100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>

      <Link to="/enquetes/$id" params={{ id }} className="inline-flex items-center text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar para enquete
      </Link>

      {/* HEADER broadcast */}
      <div className="rounded-xl border live-grad p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 live-pulse">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Ao vivo
              </span>
              <Badge variant="outline" className="text-xs">{e?.status ?? "..."}</Badge>
            </div>
            <h1 className="mt-2 text-2xl font-bold">{e?.titulo ?? "Carregando..."}</h1>
            <p className="text-sm text-muted-foreground">
              Acompanhe respostas em tempo real
            </p>
            {(e as any)?.coordenador?.nome && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                Coordenador: {(e as any).coordenador.nome}
              </div>
            )}
            {(e as any)?.politico?.nome && (
              <div className="ml-2 mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                Político: {(e as any).politico.nome}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPaused((p) => !p)}>
              {paused ? <><Play className="mr-1 h-4 w-4" /> Retomar</> : <><Pause className="mr-1 h-4 w-4" /> Pausar</>}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSoundOn((s) => !s)}>
              {soundOn ? <Volume2 className="mr-1 h-4 w-4" /> : <VolumeX className="mr-1 h-4 w-4" />} Som
            </Button>
            <Button variant="outline" size="sm" onClick={toggleFullscreen}>
              {fullscreen ? <Minimize className="mr-1 h-4 w-4" /> : <Maximize className="mr-1 h-4 w-4" />} Telão
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard icon={<Users className="h-4 w-4" />} label="Total" value={feed.length} accent="from-blue-500/20" />
          <KpiCard icon={<Activity className="h-4 w-4" />} label="Últimos 60s" value={last60s} accent="from-rose-500/20" pulse={last60s > 0} />
          <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="Últimos 5min" value={last5min} accent="from-emerald-500/20" />
          <KpiCard icon={<Radio className="h-4 w-4" />} label="Resp./min" value={Math.round((last5min / 5) * 10) / 10} accent="from-violet-500/20" decimal />
        </div>
      </div>

      {/* FUNIL DE CONVERSÃO */}
      <div className="rounded-xl border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <div className="text-sm font-semibold">Funil da enquete</div>
          <span className="text-xs text-muted-foreground">— jornada do eleitor no WhatsApp</span>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
          <FunnelStep icon={<Send className="h-4 w-4" />} label="Convites enviados" value={enviosCount} tint="bg-slate-500/10 text-slate-300" />
          <FunnelStep icon={<MousePointerClick className="h-4 w-4" />} label="Cliques no link" value={cliquesCount} tint="bg-blue-500/10 text-blue-400" />
          <FunnelStep icon={<MessageSquare className="h-4 w-4" />} label="Conversas iniciadas" value={totalConversas} tint="bg-violet-500/10 text-violet-400" />
          <FunnelStep icon={<PhoneCall className="h-4 w-4" />} label="Em andamento" value={sessAtivas.length} tint="bg-amber-500/10 text-amber-400" pulse={sessAtivas.length > 0} />
          <FunnelStep icon={<CheckCircle2 className="h-4 w-4" />} label="Concluídas" value={sessConcluidas.length} tint="bg-emerald-500/10 text-emerald-400" />
          <FunnelStep icon={<XCircle className="h-4 w-4" />} label="Abandonadas" value={sessAbandonadas.length + sessCanceladas.length} tint="bg-rose-500/10 text-rose-400" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="text-xs uppercase text-muted-foreground">Taxa de conclusão</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums">{taxaConclusao}%</span>
              <span className="text-xs text-muted-foreground">
                {sessConcluidas.length} de {totalConversas} conversas
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-blue-500" style={{ width: `${taxaConclusao}%` }} />
            </div>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center gap-1.5 text-xs uppercase text-muted-foreground">
              <Timer className="h-3 w-3" /> Tempo médio de conclusão
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums">
              {tempoMedioSeg > 0 ? formatDuration(tempoMedioSeg) : "—"}
            </div>
            <div className="text-xs text-muted-foreground">
              baseado em {temposConclusao.length} conversas concluídas
            </div>
          </div>
        </div>
      </div>

      {/* CONVERSAS ATIVAS AGORA */}
      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b p-3">
          <div className="flex items-center gap-2">
            <PhoneCall className={`h-4 w-4 ${sessAtivas.length > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
            <span className="text-sm font-semibold">Conversas ativas agora</span>
            <Badge variant="secondary" className="ml-1">{sessAtivas.length}</Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            {sessAbandonadas.length} sem resposta há mais de 30min
          </span>
        </div>
        <div className="max-h-[280px] overflow-auto">
          {sessAtivas.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma conversa em andamento agora. Assim que alguém abrir o WhatsApp, aparecerá aqui.
            </div>
          ) : (
            <ul className="divide-y">
              {sessAtivas.slice(0, 20).map((s) => {
                const pergAtual = perguntasArr.find((p) => p.id === s.pergunta_atual_id);
                const digits = String(s.telefone ?? "").replace(/\D/g, "");
                const masked = formatPhoneLive(s.telefone);
                const ultimaFala = Array.isArray(s.historico) ? s.historico.slice(-1)[0] : null;
                return (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-xs font-bold text-white">
                      <UserRound className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="tabular-nums">{masked}</strong>
                        <Badge variant="outline" className="text-[10px]">passo {(s.passo ?? 0) + 1}/{perguntasArr.length || "?"}</Badge>
                        <span className="text-xs text-muted-foreground">{s.last_msg_at ? timeAgo(s.last_msg_at, now) : ""}</span>
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {pergAtual ? <>Aguardando: <span className="italic">{pergAtual.texto}</span></> : "—"}
                      </div>
                      {ultimaFala?.texto && (
                        <div className="mt-0.5 truncate text-[11px] text-muted-foreground/80">
                          Última msg {ultimaFala.role === "eleitor" ? "eleitor" : "IA"}: "{String(ultimaFala.texto).slice(0, 80)}"
                        </div>
                      )}
                    </div>
                    {digits && (
                      <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400 hover:bg-emerald-500/20">
                        <MessageCircle className="h-3 w-3" /> Abrir
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* PROGRESSO POR PERGUNTA (drop-off) */}
      {perguntasArr.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-3 text-sm font-semibold">Progresso por pergunta (drop-off)</div>
          <div className="space-y-2">
            {dropByPergunta.map((d, i) => {
              const max = Math.max(1, dropByPergunta[0]?.alcancaram ?? 1);
              const pct = Math.round((d.alcancaram / max) * 100);
              return (
                <div key={d.pergunta.id} className="space-y-1">
                  <div className="flex justify-between gap-3 text-xs">
                    <span className="truncate"><span className="text-muted-foreground">P{i + 1}.</span> {d.pergunta.texto}</span>
                    <span className="tabular-nums text-muted-foreground">{d.alcancaram} chegaram · {d.passaram} passaram</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-emerald-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* GRID 3 colunas */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* FEED */}
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b p-3">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-rose-500" />
              <span className="text-sm font-semibold">Feed ao vivo</span>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} />
              Seguir novas
            </label>
          </div>
          <div className="max-h-[640px] space-y-2 overflow-auto p-3" style={{ scrollBehavior: follow ? "smooth" : "auto" }}>
            {feed.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Aguardando respostas… elas aparecerão aqui em tempo real.
              </div>
            ) : feed.map((r) => {
              const respostasLead = itemsByResposta[r.id] ?? [];
              return (
                <div
                  key={r.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 ${flashId === r.id ? "live-card-in border-amber-400/60" : ""}`}
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-rose-500 text-xs font-bold text-white">
                    {initials(r.nome ?? r.telefone)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <strong className="truncate">{r.nome ?? "Lead WhatsApp"}</strong>
                      {r.telefone && <span className="font-mono text-xs text-emerald-700 dark:text-emerald-300">{formatPhoneLive(r.telefone)}</span>}
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        {originIcon(r.origem)} {r.origem ?? "web"}
                      </span>
                      {deviceIcon(r.dispositivo)}
                    </div>
                    <div className="text-xs text-muted-foreground">{timeAgo(r.created_at, now)}</div>
                    {respostasLead.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {respostasLead.slice(0, 4).map((item) => (
                          <div key={item.id} className="rounded-md bg-muted/40 px-2 py-1 text-xs">
                            <span className="text-muted-foreground">{item.pergunta_id ? questionLabels[item.pergunta_id] ?? "Pergunta" : "Pergunta"}: </span>
                            <strong>{formatAnswer(item)}</strong>
                          </div>
                        ))}
                        {respostasLead.length > 4 && (
                          <div className="text-[10px] text-muted-foreground">+{respostasLead.length - 4} respostas registradas</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* HEATMAP PERGUNTAS */}
        <div className="rounded-xl border bg-card">
          <div className="border-b p-3">
            <div className="text-sm font-semibold">Respostas por pergunta</div>
            <div className="text-xs text-muted-foreground">Atualiza em tempo real</div>
          </div>
          <div className="max-h-[640px] space-y-3 overflow-auto p-3">
            {(perguntas.data ?? []).length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Sem perguntas cadastradas.</div>
            ) : (perguntas.data as any[]).map((p) => {
              const agg = perguntaAgg[p.id] ?? { porOpcao: {}, textos: [], numeros: [], total: 0 };
              const opts = (p.opcoes ?? []).slice().sort((a: any, b: any) => a.ordem - b.ordem);
              const total = Math.max(1, agg.total);
              const isDiss = ["texto", "longa", "texto_curto", "texto_longo", "dissertativa"].includes(p.tipo);
              const isNum = ["escala", "nps", "numero"].includes(p.tipo);
              const isSimNao = p.tipo === "simnao";
              return (
                <div key={p.id} className="rounded-lg border p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="text-sm font-medium leading-snug">{p.texto}</div>
                    <Badge variant="secondary" className="shrink-0 text-xs">{agg.total}</Badge>
                  </div>
                  {opts.length > 0 && (
                    <div className="space-y-1.5">
                      {opts.map((o: any) => {
                        const c = agg.porOpcao[o.id] ?? 0;
                        const pct = Math.round((c / total) * 100);
                        return (
                          <div key={o.id} className="space-y-0.5">
                            <div className="flex justify-between text-xs">
                              <span className="truncate">{o.texto}</span>
                              <span className="tabular-nums text-muted-foreground">{c} · {pct}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                              <div className="h-full bg-gradient-to-r from-violet-500 to-rose-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {isDiss && agg.textos.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {agg.textos
                        .slice()
                        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
                        .slice(0, 5)
                        .map((t) => (
                          <div key={t.id} className="rounded-md bg-muted/40 px-2 py-1 text-xs italic">
                            "{t.texto}"
                          </div>
                        ))}
                      {agg.textos.length > 5 && (
                        <div className="text-[10px] text-muted-foreground">
                          +{agg.textos.length - 5} outras respostas
                        </div>
                      )}
                    </div>
                  )}
                  {isSimNao && opts.length === 0 && agg.textos.length > 0 && (() => {
                    const sim = agg.textos.filter((t) => /^s/i.test(t.texto.trim())).length;
                    const nao = agg.textos.length - sim;
                    const tot = Math.max(1, sim + nao);
                    return (
                      <div className="space-y-1.5">
                        {[{ l: "Sim", c: sim }, { l: "Não", c: nao }].map((d) => (
                          <div key={d.l} className="space-y-0.5">
                            <div className="flex justify-between text-xs">
                              <span>{d.l}</span>
                              <span className="tabular-nums text-muted-foreground">{d.c} · {Math.round((d.c / tot) * 100)}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                              <div className="h-full bg-gradient-to-r from-violet-500 to-rose-500 transition-all duration-500" style={{ width: `${(d.c / tot) * 100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  {isNum && agg.numeros.length > 0 && (
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-bold">
                        {(agg.numeros.reduce((a, b) => a + b, 0) / agg.numeros.length).toFixed(1)}
                      </span>
                      <span className="text-xs text-muted-foreground">média ({agg.numeros.length})</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* MÉTRICAS */}
        <div className="space-y-4">
          {/* Sparkline 30 min */}
          <div className="rounded-xl border bg-card p-4">
            <div className="mb-2 text-sm font-semibold">Últimos 30 minutos</div>
            <div className="flex h-24 items-end gap-0.5">
              {sparkBuckets.map((v, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-gradient-to-t from-violet-500/40 to-rose-500/80 transition-all"
                  style={{ height: `${(v / sparkMax) * 100}%`, minHeight: v > 0 ? "4px" : "1px" }}
                  title={`${v} resposta(s)`}
                />
              ))}
            </div>
          </div>

          {/* Heat 24h */}
          <div className="rounded-xl border bg-card p-4">
            <div className="mb-2 text-sm font-semibold">Distribuição por hora</div>
            <div className="grid grid-cols-24 gap-0.5" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
              {hourBuckets.map((v, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-sm"
                  style={{ background: `rgba(239, 68, 68, ${0.08 + (v / hourMax) * 0.85})` }}
                  title={`${i.toString().padStart(2,"0")}h — ${v}`}
                />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>00h</span><span>12h</span><span>23h</span>
            </div>
          </div>

          {/* Origem */}
          <div className="rounded-xl border bg-card p-4">
            <div className="mb-2 text-sm font-semibold">Origem</div>
            <MiniBars data={[
              { label: "WhatsApp", value: origemAgg.whatsapp, color: "bg-emerald-500" },
              { label: "Web", value: origemAgg.web, color: "bg-blue-500" },
              { label: "Link público", value: origemAgg.link_publico, color: "bg-violet-500" },
              ...(origemAgg.outros ? [{ label: "Outros", value: origemAgg.outros, color: "bg-muted-foreground" }] : []),
            ]} />
          </div>

          {/* Dispositivo */}
          <div className="rounded-xl border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4" /> Dispositivo</div>
            <MiniBars data={[
              { label: "Mobile", value: devAgg.mobile, color: "bg-rose-500" },
              { label: "Desktop", value: devAgg.desktop, color: "bg-blue-500" },
              ...(devAgg.outros ? [{ label: "Outros", value: devAgg.outros, color: "bg-muted-foreground" }] : []),
            ]} />
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, accent, pulse, decimal }: { icon: React.ReactNode; label: string; value: number; accent: string; pulse?: boolean; decimal?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-lg border bg-gradient-to-br ${accent} to-transparent p-3 ${pulse ? "live-pulse" : ""}`}>
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">{icon} {label}</div>
      <div className="mt-1 text-3xl font-bold tabular-nums">
        {decimal ? value.toLocaleString("pt-BR") : <AnimatedCount value={value} />}
      </div>
    </div>
  );
}

function MiniBars({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-1.5">
      {data.map((d) => (
        <div key={d.label} className="space-y-0.5">
          <div className="flex justify-between text-xs">
            <span>{d.label}</span>
            <span className="tabular-nums text-muted-foreground">{d.value}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className={`h-full ${d.color} transition-all duration-500`} style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}