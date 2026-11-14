import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { MessageSquare, Copy, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { QrCode } from "@/components/qr-code";
import { getZapiBotNumber } from "@/lib/zapi.functions";

const enqueteByToken = (token: string) =>
  queryOptions({
    queryKey: ["enquete-convite", token],
    queryFn: async () => {
      const { data: enq, error } = await supabase
        .from("enquetes")
        .select("id, titulo, descricao, status, token_convite, mostrar_politico, politico_id, coordenador_id")
        .eq("token_convite", token)
        .maybeSingle();
      if (error) throw error;
      if (!enq) throw notFound();

      let politicoNome: string | null = null;
      if ((enq as any).politico_id) {
        const { data: pol } = await supabase
          .from("politicos")
          .select("nome")
          .eq("id", (enq as any).politico_id)
          .maybeSingle();
        politicoNome = (enq as any).mostrar_politico ? (pol?.nome ?? null) : null;
      }

      let coordenadorNome: string | null = null;
      if ((enq as any).coordenador_id) {
        const { data: c } = await supabase
          .from("coordenadores")
          .select("nome")
          .eq("id", (enq as any).coordenador_id)
          .maybeSingle();
        coordenadorNome = c?.nome ?? null;
      }

      const bot = await getZapiBotNumber();
      return { enquete: enq, politicoNome, coordenadorNome, botPhone: bot.phone, botConnected: bot.connected };
    },
  });

export const Route = createFileRoute("/c/$token")({
  ssr: false,
  loader: ({ context, params }) => context.queryClient.ensureQueryData(enqueteByToken(params.token)),
  head: ({ loaderData }) => {
    const t = (loaderData as any)?.enquete?.titulo ?? "Convite para pesquisa";
    return {
      meta: [
        { title: `${t} — Participar` },
        { name: "description", content: "Responda esta pesquisa por WhatsApp em uma conversa simples." },
        { property: "og:title", content: t },
      ],
    };
  },
  errorComponent: () => (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold">Erro ao carregar convite</h1>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold">Convite não encontrado</h1>
      <p className="mt-2 text-muted-foreground">Peça um novo link ao coordenador que te enviou.</p>
    </div>
  ),
  component: ConvitePage,
});

function digits(s: string | null | undefined) { return String(s ?? "").replace(/\D/g, ""); }

function ConvitePage() {
  const { token } = Route.useParams();
  const { data } = useSuspenseQuery(enqueteByToken(token));
  useEffect(() => {
    // Registra clique no link (funil do painel Ao vivo).
    fetch("/api/public/enquetes/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      keepalive: true,
    }).catch(() => { /* silencioso */ });
  }, [token]);
  const enq = data.enquete as any;
  const numeroDigits = digits(data.botPhone);
  const numeroE164 = numeroDigits ? (numeroDigits.startsWith("55") ? numeroDigits : `55${numeroDigits}`) : "";
  const codigo = enq.token_convite as string;
  const waText = `Olá! Quero participar da pesquisa. Código: ${codigo}`;
  const waLink = numeroE164 ? `https://wa.me/${numeroE164}?text=${encodeURIComponent(waText)}` : "";

  if (enq.status !== "ativa") {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold">Pesquisa indisponível</h1>
        <p className="mt-2 text-muted-foreground">Esta pesquisa não está aceitando respostas no momento.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white py-10 dark:from-neutral-950 dark:to-neutral-900">
      <div className="mx-auto max-w-lg px-6">
        <div className="rounded-2xl border bg-card p-6 shadow-lg text-center">
          {data.coordenadorNome && (
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <ShieldCheck className="h-3 w-3" /> Convite de {data.coordenadorNome}
            </div>
          )}
          {data.politicoNome && (
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {data.politicoNome}
            </div>
          )}
          <h1 className="mt-1 text-2xl font-semibold">{enq.titulo}</h1>
          {enq.descricao && (
            <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{enq.descricao}</p>
          )}

          <div className="mt-6 space-y-4 text-left">
            {!numeroE164 ? (
              <div className="rounded-md border border-amber-400/40 bg-amber-500/10 p-4 text-sm">
                <p className="font-medium">Bot do WhatsApp desconectado</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  A pesquisa está temporariamente indisponível. Tente novamente em alguns minutos.
                </p>
              </div>
            ) : (
              <>
                <a href={waLink} target="_blank" rel="noreferrer" className="block">
                  <Button size="lg" className="w-full bg-emerald-600 text-white hover:bg-emerald-700">
                    <MessageSquare className="mr-2 h-5 w-5" /> Responder pelo WhatsApp
                  </Button>
                </a>
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { navigator.clipboard.writeText(waLink); toast.success("Link copiado"); }}
                  >
                    <Copy className="mr-2 h-4 w-4" /> Copiar link
                  </Button>
                </div>

                <div className="rounded-md border bg-muted/30 p-4">
                  <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Como funciona</div>
                  <ol className="list-decimal space-y-1 pl-5 text-sm">
                    <li>Toque no botão verde acima.</li>
                    <li>O WhatsApp abre com uma mensagem pronta — apenas envie.</li>
                    <li>A IA vai puxar conversa e conduzir a pesquisa por mensagens, uma pergunta de cada vez.</li>
                  </ol>
                </div>

                <div className="flex flex-col items-center gap-2 pt-2">
                  <div className="text-xs text-muted-foreground">No computador? Aponte a câmera do celular:</div>
                  <QrCode value={waLink} filename={`convite-${codigo}.png`} size={168} />
                </div>
              </>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Suas respostas são registradas com segurança para fins de pesquisa política.
        </p>
      </div>
    </div>
  );
}