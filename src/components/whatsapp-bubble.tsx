export function WhatsAppBubble({ text, variables }: { text: string; variables?: Record<string, string> }) {
  const rendered = (text || "").replace(/\{\{(\w+)\}\}/g, (_, k) => {
    return variables?.[k] ?? `{{${k}}}`;
  });
  return (
    <div className="relative mx-auto w-full max-w-[280px] rounded-[2.2rem] border border-white/10 bg-[#0a0a1a] p-3 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]">
      <div className="absolute left-1/2 top-2 h-1 w-16 -translate-x-1/2 rounded-full bg-white/10" />
      <div className="mt-5 rounded-[1.6rem] bg-[#0b1a14] p-3" style={{ backgroundImage: "radial-gradient(circle at 20% 0%, rgba(52,211,153,0.08), transparent 50%)" }}>
        <div className="mb-2 flex items-center justify-between text-[10px] text-emerald-300/70">
          <span>WhatsApp</span>
          <span>agora</span>
        </div>
        <div className="relative ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-emerald-500/15 px-3 py-2 text-xs text-emerald-50 shadow-inner">
          <span className="whitespace-pre-wrap break-words">{rendered || "Sua mensagem aqui…"}</span>
        </div>
      </div>
    </div>
  );
}