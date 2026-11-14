import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/csv";
import { EnqueteGraficos } from "@/components/enquete-graficos";
import { fetchResultadosEnquete } from "@/lib/resultados";

export const Route = createFileRoute("/_authenticated/enquetes/$id/resultados")({
  head: () => ({ meta: [{ title: "Resultados da enquete — Política+" }] }),
  component: Resultados,
  errorComponent: ({ error, reset }) => (
    <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-6">
      <h2 className="text-lg font-semibold text-destructive">Não foi possível carregar os resultados</h2>
      <p className="text-sm text-muted-foreground">{(error as any)?.message ?? "Erro desconhecido."}</p>
      <div className="flex gap-2">
        <Link to="/enquetes"><Button variant="outline" size="sm"><ArrowLeft className="mr-1 h-4 w-4" />Voltar</Button></Link>
        <Button size="sm" onClick={() => reset()}>Tentar novamente</Button>
      </div>
    </div>
  ),
});

function Resultados() {
  const { id } = Route.useParams();

  const enquete = useQuery({
    queryKey: ["enquete", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enquetes")
        .select("id, titulo, descricao, status")
        .eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const dados = useQuery({
    queryKey: ["resultados", id],
    queryFn: () => fetchResultadosEnquete(id),
  });

  function exportarCsv() {
    const rows: any[] = [];
    (dados.data?.perguntas ?? []).forEach((p: any) => {
      if (p.tipo === "texto") {
        (p.textos ?? []).forEach((t: string) => rows.push({ pergunta: p.texto, opcao: "(texto livre)", valor: t, votos: "" }));
      } else {
        (p.data ?? []).forEach((d: any) => rows.push({ pergunta: p.texto, opcao: d.name, valor: "", votos: d.value }));
      }
    });
    downloadCsv(`resultados-${id}.csv`, rows);
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link to="/enquetes/$id" params={{ id }}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para a enquete
        </Link>
      </Button>

      <PageHeader
        title={enquete.data?.titulo || "Resultados"}
        description={enquete.data?.descricao || "Visualização das respostas recebidas."}
        actions={
          <Button variant="outline" onClick={exportarCsv}>
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
        }
      />

      {(enquete.isLoading || dados.isLoading) && (
        <div className="space-y-3">
          <div className="h-20 animate-pulse rounded-lg border bg-muted/30" />
          <div className="h-72 animate-pulse rounded-lg border bg-muted/30" />
          <div className="h-72 animate-pulse rounded-lg border bg-muted/30" />
        </div>
      )}
      {!dados.isLoading && (dados.data?.perguntas?.length ?? 0) === 0 && (dados.data?.totalRespostas ?? 0) === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Sem respostas ainda</p>
          <p className="mt-1">Compartilhe o link público da enquete para começar a coletar respostas. Os gráficos aparecem aqui automaticamente.</p>
        </div>
      )}
      {!dados.isLoading && (
      <>
      <div className="rounded-lg border bg-card p-5">
        <div className="text-sm text-muted-foreground">Total de respostas</div>
        <div className="mt-1 text-3xl font-semibold">{dados.data?.totalRespostas ?? 0}</div>
      </div>

      <EnqueteGraficos enqueteId={id} />
      </>
      )}
    </div>
  );
}