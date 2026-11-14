import { AlertTriangle, RefreshCw, Home, Copy, ChevronDown } from "lucide-react";
import { Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

function friendlyMessage(err?: Error): { title: string; hint: string } {
  const raw = (err?.message || "").toLowerCase();
  if (!err) return { title: "Não foi possível carregar esta tela", hint: "Tente novamente em alguns instantes." };
  if (raw.includes("insertbefore") || raw.includes("removechild") || raw.includes("appendchild") || raw.includes("not a child of this node"))
    return { title: "A tela foi alterada pelo navegador", hint: "Recarregue a página. Se continuar, desative tradução automática ou extensões do navegador para este sistema." };
  if (raw.includes("row-level security") || raw.includes("permission denied") || raw.includes("42501"))
    return { title: "Sem permissão para essa tela", hint: "Sua conta não tem acesso a esses dados. Peça ao administrador o papel Admin ou Gestor." };
  if (raw.includes("failed to fetch") || raw.includes("networkerror") || raw.includes("load failed"))
    return { title: "Sem conexão com o servidor", hint: "Verifique sua internet e tente novamente em instantes." };
  if (raw.includes("jwt") || raw.includes("unauthorized") || raw.includes(" 401"))
    return { title: "Sua sessão expirou", hint: "Saia e entre novamente para continuar." };
  if (raw.includes("not found") || raw.includes(" 404"))
    return { title: "Conteúdo não encontrado", hint: "O registro pode ter sido removido ou o link está incorreto." };
  return { title: "Algo saiu do roteiro", hint: "Não foi possível carregar esta tela. Clique em “Copiar detalhes” e envie para o suporte se o erro continuar." };
}

export function CinemaError({
  error,
  reset,
}: {
  error?: Error;
  reset?: () => void;
}) {
  const router = useRouter();
  const [showDetails, setShowDetails] = useState(false);
  const { title, hint } = friendlyMessage(error);
  const details = [
    `Título: ${title}`,
    `Mensagem: ${error?.message ?? "(sem mensagem)"}`,
    `Nome: ${error?.name ?? "(desconhecido)"}`,
    `URL: ${typeof window !== "undefined" ? window.location.href : "(SSR)"}`,
    `Horário: ${new Date().toISOString()}`,
    "",
    "Stack:",
    (error?.stack ?? "(sem stack)").slice(0, 2000),
  ].join("\n");

  function copyDetails() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(details);
      toast.success("Detalhes copiados — envie para o suporte");
    }
  }

  return (
    <div className="relative mx-auto flex max-w-2xl flex-col items-center justify-center gap-6 rounded-3xl border border-rose-500/20 bg-white/[0.02] px-6 py-16 text-center backdrop-blur">
      <div className="absolute -top-12 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full opacity-30 blur-3xl" style={{ background: "linear-gradient(135deg, #e11d48, #7c3aed)" }} />
      <div className="relative grid h-16 w-16 place-items-center rounded-2xl text-white shadow-[0_0_40px_-10px_rgba(225,29,72,0.6)]" style={{ background: "linear-gradient(135deg, #e11d48, #7c3aed)" }}>
        <AlertTriangle className="h-7 w-7" />
      </div>
      <div>
        <h2 className="text-4xl uppercase tracking-wide text-white" style={{ fontFamily: "var(--font-display)" }}>
          {title}
        </h2>
        <p className="mt-2 max-w-md text-sm text-white/60">
          {hint}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          variant="premium"
          onClick={() => {
            router.invalidate();
            reset?.();
          }}
        >
          <RefreshCw className="h-4 w-4" /> Tentar novamente
        </Button>
        <Button variant="glass" asChild>
          <Link to="/dashboard">
            <Home className="h-4 w-4" /> Voltar ao dashboard
          </Link>
        </Button>
        <Button variant="glass" onClick={copyDetails}>
          <Copy className="h-4 w-4" /> Copiar detalhes
        </Button>
      </div>
      <button
        type="button"
        onClick={() => setShowDetails((v) => !v)}
        className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white/80"
      >
        <ChevronDown className={`h-3 w-3 transition ${showDetails ? "rotate-180" : ""}`} />
        {showDetails ? "Ocultar detalhes técnicos" : "Ver detalhes técnicos"}
      </button>
      {showDetails && (
        <pre className="mt-2 max-h-64 w-full overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 text-left text-[11px] leading-relaxed text-white/70">
{details}
        </pre>
      )}
    </div>
  );
}

export function CinemaNotFound() {
  return (
    <div className="relative mx-auto flex max-w-2xl flex-col items-center justify-center gap-6 rounded-3xl border border-white/5 bg-white/[0.02] px-6 py-16 text-center backdrop-blur">
      <div className="absolute -top-12 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full opacity-30 blur-3xl" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }} />
      <div className="relative text-[110px] leading-none text-transparent" style={{ fontFamily: "var(--font-display)", background: "linear-gradient(135deg, #818cf8, #c084fc, #f0abfc)", backgroundClip: "text", WebkitBackgroundClip: "text" }}>
        404
      </div>
      <div>
        <h2 className="text-3xl uppercase tracking-wide text-white" style={{ fontFamily: "var(--font-display)" }}>
          Cena não encontrada
        </h2>
        <p className="mt-2 max-w-md text-sm text-white/60">
          O endereço pedido não existe ou foi movido para outra rota.
        </p>
      </div>
      <Button variant="premium" asChild>
        <Link to="/dashboard">
          <Home className="h-4 w-4" /> Voltar ao dashboard
        </Link>
      </Button>
    </div>
  );
}