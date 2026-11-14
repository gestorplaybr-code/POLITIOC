import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useInvalidate() {
  const qc = useQueryClient();
  return (keys: string[][]) => {
    keys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
  };
}

type ErrContext =
  | "politico"
  | "enquete"
  | "eleitor"
  | "coordenador"
  | "candidato"
  | "pleito"
  | "bairro"
  | "usuario"
  | "whatsapp"
  | "resposta"
  | "generic";

const PERMISSION_MSG: Record<ErrContext, string> = {
  politico:
    "Só o Administrador pode cadastrar ou editar políticos. Peça ao Admin para criar e vincular o político ao seu perfil.",
  enquete:
    "Você não pode criar/editar enquetes desse político. Escolha um político vinculado ao seu perfil ou peça ao Admin/Parceiro o acesso.",
  eleitor:
    "Você só pode cadastrar ou editar eleitores dentro do político vinculado ao seu perfil.",
  coordenador:
    "Você só pode gerenciar coordenadores do político vinculado ao seu perfil. Peça ao Admin/Parceiro se precisar de outro escopo.",
  candidato:
    "Você só pode gerenciar candidatos do político vinculado ao seu perfil.",
  pleito:
    "Você só pode gerenciar pleitos do político vinculado ao seu perfil.",
  bairro:
    "Você só pode gerenciar bairros do político vinculado ao seu perfil.",
  usuario:
    "Só o Administrador pode criar, editar ou pausar usuários.",
  whatsapp:
    "Você não tem permissão para essa configuração/envio de WhatsApp no político selecionado.",
  resposta:
    "Você só pode ver ou editar respostas do político vinculado ao seu perfil.",
  generic:
    "Você não tem permissão para essa ação. Confirme se o registro pertence ao político vinculado ao seu perfil — ou peça ao Admin.",
};

export function toastError(e: unknown, contextOrFallback: ErrContext | string = "generic", fallback = "Erro inesperado") {
  // Log full error for diagnosis
  // eslint-disable-next-line no-console
  console.error("[mutation error]", e);

  const ctx: ErrContext = (["politico","enquete","eleitor","coordenador","candidato","pleito","bairro","usuario","whatsapp","resposta","generic"] as const)
    .includes(contextOrFallback as ErrContext)
    ? (contextOrFallback as ErrContext)
    : "generic";
  const fb = ctx === "generic" && typeof contextOrFallback === "string" && contextOrFallback !== "generic"
    ? contextOrFallback
    : fallback;

  const anyE = e as Record<string, unknown> | null;
  const code = (anyE?.code as string) ?? "";
  const rawMsg = (
    (anyE && typeof anyE.message === "string" && anyE.message) ||
    (anyE && typeof (anyE as any).error_description === "string" && ((anyE as any).error_description as string)) ||
    ""
  ).toString();
  const lower = rawMsg.toLowerCase();
  const details = ((anyE && (anyE.details as string)) || "").toString();

  // RLS / permission denied (PostgreSQL 42501, PostgREST PGRST301/PGRST116 on insert)
  if (code === "42501" || code === "PGRST301" || lower.includes("row-level security") || lower.includes("permission denied")) {
    toast.error(PERMISSION_MSG[ctx], { duration: 8000 });
    return;
  }

  // Sem linhas retornadas após insert/update (RLS filtrou o retorno)
  if (code === "PGRST116") {
    toast.error(
      "O registro foi salvo, mas você não pode lê-lo com seu perfil atual. Peça permissão de Admin/Parceiro para continuar.",
      { duration: 8000 }
    );
    return;
  }

  // Erros lançados por triggers (RAISE EXCEPTION USING ERRCODE='P0001')
  if (code === "P0001" || code === "P0002" || code === "P0003") {
    toast.error(rawMsg || "Regra do sistema impediu a ação.");
    return;
  }

  // Unique constraint
  if (code === "23505") {
    if (details.includes("slug") || lower.includes("slug"))
      toast.error("Já existe uma enquete com um título muito parecido. Ajuste o título e tente de novo.");
    else if (details.includes("token") || lower.includes("token"))
      toast.error("Falha ao gerar um link único. Tente novamente em alguns segundos.");
    else
      toast.error("Já existe um registro com esses dados. Verifique se o cadastro não foi feito antes.");
    return;
  }

  // Foreign key
  if (code === "23503") {
    toast.error("Um dos registros vinculados (político/coordenador/enquete) não existe mais. Recarregue a página e tente de novo.");
    return;
  }

  // NOT NULL
  if (code === "23502") {
    toast.error(`Faltou preencher um campo obrigatório${details ? `: ${details}` : ""}.`);
    return;
  }

  // CHECK constraint
  if (code === "23514") {
    toast.error("Um dos valores informados não é aceito. Confira os campos destacados.");
    return;
  }

  // Rede
  if (lower.includes("failed to fetch") || lower.includes("network")) {
    toast.error("Sem conexão com o servidor. Verifique sua internet e tente de novo.");
    return;
  }

  // Sessão
  if (lower.includes("jwt") || lower.includes("unauthorized")) {
    toast.error("Sua sessão expirou. Saia e entre novamente.");
    return;
  }

  const msg = rawMsg || details || ((anyE && (anyE.hint as string)) || "") || fb;
  toast.error(msg, { description: code ? `Código: ${code}` : undefined });
}