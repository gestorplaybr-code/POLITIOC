import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExportButtons } from "@/components/export-buttons";
import {
  CoordenadorPerformanceTable,
  useCoordenadorPerformance,
} from "@/components/coordenador-performance-table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/coordenadores_/desempenho")({
  head: () => ({ meta: [{ title: "Desempenho por coordenador — Política+" }] }),
  component: Page,
});

function Page() {
  const [days, setDays] = useState<string>("30");
  const [politicoId, setPoliticoId] = useState<string>("all");
  const perf = useCoordenadorPerformance({ days: Number(days), politicoId });

  const pols = useQuery({
    queryKey: ["politicos-min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("politicos").select("id, nome").order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const exportRows = (perf.data ?? []).map((r) => ({
    Coordenador: r.nome,
    Político: r.politico,
    Base: r.base,
    Disparos: r.disparos,
    Cliques: r.cliques,
    Responderam: r.responderam,
    "Taxa (%)": r.taxa,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Desempenho por coordenador"
        description="Quantas pessoas cada coordenador atingiu com o link e quantas participaram."
      />

      <SectionCard>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label className="text-xs">Político</Label>
            <Select value={politicoId} onValueChange={setPoliticoId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os políticos</SelectItem>
                {pols.data?.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Período</Label>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="365">Últimos 12 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end">
            <ExportButtons
              filename="desempenho-coordenadores"
              title="Desempenho por coordenador"
              rows={exportRows}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <CoordenadorPerformanceTable days={Number(days)} politicoId={politicoId} />
      </SectionCard>
    </div>
  );
}