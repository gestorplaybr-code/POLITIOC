import { Smartphone, Check } from "lucide-react";

type Pergunta = {
  id: string;
  texto: string;
  tipo: string;
  obrigatoria?: boolean;
  permitir_outro?: boolean;
  opcoes?: { id: string; texto: string; ordem: number }[];
};

type Props = {
  titulo?: string | null;
  descricao?: string | null;
  politicoNome?: string | null;
  status?: string | null;
  perguntas: Pergunta[];
  mostrarPolitico?: boolean;
  coordenadorNome?: string | null;
};

function fakeAnswer(p: Pergunta): string {
  const opcoes = (p.opcoes ?? []).slice().sort((a, b) => a.ordem - b.ordem);
  if (p.tipo === "unica" || p.tipo === "multipla") return opcoes[0]?.texto ?? "Minha resposta";
  if (p.tipo === "simnao") return "Sim, com certeza!";
  if (p.tipo === "escala") return "9";
  if (p.tipo === "cpf") return "123.456.789-00";
  if (p.tipo === "email") return "eleitor@exemplo.com";
  if (p.tipo === "telefone") return "(11) 99999-9999";
  if (p.tipo === "cidade") return "São Paulo";
  if (p.tipo === "bairro") return "Centro";
  if (p.tipo === "data") return "05/10/1988";
  return "Minha resposta";
}

function formatQuestion(p: Pergunta, idx: number): string {
  const opcoes = (p.opcoes ?? []).slice().sort((a, b) => a.ordem - b.ordem);
  const head = `${idx + 1}. ${p.texto}`;
  if (p.tipo === "simnao") return `${head}\n(responda *sim* ou *não*)`;
  if (p.tipo === "escala") return `${head}\nDe 0 a 10, quanto você diria?`;
  if (opcoes.length && (p.tipo === "unica" || p.tipo === "multipla")) {
    const lista = opcoes.map((o) => `• ${o.texto}`).join("\n");
    return `${head}\n${lista}${p.tipo === "multipla" ? "\n(pode escolher mais de uma)" : ""}`;
  }
  return head;
}

export function IphonePreview({ titulo, descricao, politicoNome, status, perguntas, mostrarPolitico = false, coordenadorNome }: Props) {
  const saudacao = `Olá! 👋 ${coordenadorNome ? `${coordenadorNome} pediu sua ajuda com uma pesquisa rápida. ` : ""}${
    mostrarPolitico && politicoNome ? `É sobre *${politicoNome}*. ` : ""
  }Tema: *${titulo || "pesquisa"}*.`;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Smartphone className="h-3.5 w-3.5" />
        Prévia da conversa no WhatsApp
      </div>

      <div className="relative mx-auto h-[640px] w-[320px] rounded-[44px] bg-neutral-900 p-[10px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] ring-1 ring-black/20">
        <span className="absolute -left-[3px] top-24 h-8 w-[3px] rounded-l bg-neutral-800" />
        <span className="absolute -left-[3px] top-40 h-12 w-[3px] rounded-l bg-neutral-800" />
        <span className="absolute -left-[3px] top-56 h-12 w-[3px] rounded-l bg-neutral-800" />
        <span className="absolute -right-[3px] top-32 h-16 w-[3px] rounded-r bg-neutral-800" />

        <div className="relative h-full w-full overflow-hidden rounded-[34px] bg-[#e5ddd5]">
          <div className="pointer-events-none absolute left-1/2 top-2 z-10 h-6 w-32 -translate-x-1/2 rounded-full bg-neutral-900" />

          <div className="flex items-center gap-2 bg-[#075e54] px-3 pb-2 pt-8 text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">IA</div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-semibold">Pesquisa • IA</div>
              <div className="truncate text-[9px] text-white/80">online agora</div>
            </div>
          </div>

          <div
            className="h-[calc(100%-80px)] overflow-y-auto px-2.5 pb-8 pt-2"
            style={{ backgroundImage: "radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)", backgroundSize: "12px 12px" }}
          >
            <div className="mx-auto mb-2 w-fit rounded-md bg-white/70 px-2 py-0.5 text-[9px] text-neutral-600">hoje</div>

            <Bubble side="in">{saudacao}</Bubble>

            {perguntas.length === 0 ? (
              <Bubble side="in" muted>
                Adicione perguntas para simular a conversa aqui.
              </Bubble>
            ) : (
              perguntas.map((p, idx) => (
                <div key={p.id} className="space-y-1.5">
                  <Bubble side="in">{formatQuestion(p, idx)}</Bubble>
                  <Bubble side="out">{fakeAnswer(p)}</Bubble>
                  <Bubble side="in" small>
                    {idx === perguntas.length - 1 ? "Perfeito! 🙏" : "Anotado! ✅"}
                  </Bubble>
                </div>
              ))
            )}

            <Bubble side="in">Terminamos! Muito obrigado pela sua participação. 🙏</Bubble>

            {status && status !== "ativa" && (
              <div className="mx-auto mt-3 w-fit rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[9px] text-amber-800">
                Status "{status}" — o bot só responde com a enquete ativa.
              </div>
            )}
            {descricao && (
              <div className="mx-auto mt-3 max-w-[85%] rounded-md bg-white/70 px-2 py-1 text-center text-[9px] italic text-neutral-600">
                {descricao}
              </div>
            )}
          </div>

          <div className="pointer-events-none absolute bottom-1.5 left-1/2 h-1 w-24 -translate-x-1/2 rounded-full bg-neutral-900/80" />
        </div>
      </div>
    </div>
  );
}

function Bubble({
  side,
  children,
  small,
  muted,
}: {
  side: "in" | "out";
  children: React.ReactNode;
  small?: boolean;
  muted?: boolean;
}) {
  const isOut = side === "out";
  return (
    <div className={`mb-1.5 flex ${isOut ? "justify-end" : "justify-start"}`}>
      <div
        className={`relative max-w-[80%] whitespace-pre-line rounded-lg px-2 py-1.5 leading-snug shadow-sm ${
          isOut ? "bg-[#dcf8c6] text-neutral-900" : "bg-white text-neutral-900"
        } ${small ? "text-[10px]" : "text-[11px]"} ${muted ? "italic text-neutral-500" : ""}`}
      >
        {children}
        {isOut && (
          <span className="ml-1 inline-flex align-middle text-[#34b7f1]">
            <Check className="-mr-1.5 h-3 w-3" />
            <Check className="h-3 w-3" />
          </span>
        )}
      </div>
    </div>
  );
}
