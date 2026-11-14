import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const configQuery = queryOptions({
  queryKey: ["plataforma-config"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("plataforma_config")
      .select("nome, termo_privacidade")
      .eq("id", true)
      .maybeSingle();
    if (error) throw error;
    return data ?? { nome: "Política+", termo_privacidade: null as string | null };
  },
});

export const Route = createFileRoute("/politica-privacidade")({
  loader: ({ context }) => context.queryClient.ensureQueryData(configQuery),
  head: () => ({
    meta: [
      { title: "Política de Privacidade" },
      { name: "description", content: "Como tratamos os dados pessoais (LGPD)." },
    ],
  }),
  errorComponent: () => <div className="p-6">Erro ao carregar.</div>,
  notFoundComponent: () => <div className="p-6">Não encontrado.</div>,
  component: PoliticaPrivacidade,
});

const FALLBACK = `Esta plataforma trata dados pessoais em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018).

1. Dados coletados: nome, e-mail, telefone, CPF, endereço, respostas a enquetes e dados de navegação.

2. Finalidade: gestão de relacionamento com eleitores, condução de pesquisas de opinião e comunicação política.

3. Base legal: consentimento do titular (art. 7º, I) e legítimo interesse para gestão administrativa (art. 7º, IX).

4. Compartilhamento: dados são acessados apenas pela equipe vinculada ao político responsável, com perfis e permissões individuais. Não compartilhamos com terceiros sem autorização.

5. Segurança: aplicamos controles de acesso, criptografia em trânsito e em repouso e auditoria de operações.

6. Direitos do titular: você pode solicitar a confirmação, acesso, correção, anonimização, portabilidade e exclusão dos seus dados a qualquer momento.

7. Tempo de retenção: dados são mantidos enquanto durar a finalidade ou conforme exigido por lei eleitoral.

8. Contato do encarregado: consulte o político responsável pela base ou a equipe gestora cadastrada na plataforma.`;

function PoliticaPrivacidade() {
  const { data } = useSuspenseQuery(configQuery);
  const txt = data.termo_privacidade?.trim() || FALLBACK;
  return (
    <div
      className="relative min-h-screen text-white"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 20% 0%, rgba(79,70,229,0.2), transparent 60%), #05050f",
        fontFamily: "var(--font-body)",
      }}
    >
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link to="/" className="text-sm text-white/60 transition hover:text-white">
          ← Voltar
        </Link>
        <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-indigo-300/70">
          {data.nome}
        </div>
        <h1
          className="mt-2 text-5xl uppercase leading-none tracking-wide sm:text-6xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <span className="text-gradient-indigo">Política de Privacidade</span>
        </h1>
        <div className="mt-10 whitespace-pre-line rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-sm leading-relaxed text-white/75 backdrop-blur">
          {txt}
        </div>
      </div>
    </div>
  );
}