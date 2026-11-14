import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { UserCog } from "lucide-react";

export type CoordPerfRow = {
  id: string;
  nome: string;
  politico: string;
  base: number;
  disparos: number;
  cliques: number;
  responderam: number;
  taxa: number;
};

export function useCoordenadorPerformance(opts: { days?: number; politicoId?: string } = {}) {
  const days = opts.days ?? 30;
  const politicoId = opts.politicoId ?? "all";

  return useQuery({
    queryKey: ["coord-perf", days, politicoId],
    staleTime: 2 * 60_000,
    queryFn: async (): Promise<CoordPerfRow[]> => {
      const since = new Date(Date.now() - days * 86400000).toISOString();

      let coordQ = supabase
        .from("coordenadores")
        .select("id, nome, politico_id, politico:politicos(nome)")
        .order("nome");
      if (politicoId !== "all") coordQ = coordQ.eq("politico_id", politicoId);
      const { data: coords, error: cErr } = await coordQ;
      if (cErr) throw cErr;
      const coordIds = (coords ?? []).map((c: any) => c.id);
      if (!coordIds.length) return [];

      // Base = eleitores atribuídos ao coordenador (universo potencial)
      const { data: eleit } = await supabase
        .from("eleitores")
        .select("coordenador_id")
        .in("coordenador_id", coordIds)
        .limit(20000);
      const baseMap = new Map<string, number>();
      (eleit ?? []).forEach((e: any) => {
        if (!e.coordenador_id) return;
        baseMap.set(e.coordenador_id, (baseMap.get(e.coordenador_id) ?? 0) + 1);
      });

      // Disparos = whatsapp_envios com eleitor_id ligado a esses coordenadores, no período
      const eleitorToCoord = new Map<string, string>();
      {
        const { data: eleitFull } = await supabase
          .from("eleitores")
          .select("id, coordenador_id")
          .in("coordenador_id", coordIds)
          .limit(20000);
        (eleitFull ?? []).forEach((e: any) => {
          if (e.coordenador_id) eleitorToCoord.set(e.id, e.coordenador_id);
        });
      }
      const disparosMap = new Map<string, number>();
      const eleitorIds = Array.from(eleitorToCoord.keys());
      if (eleitorIds.length) {
        // paginação simples: Supabase aceita in() de milhares mas por segurança fazemos em blocos
        const chunk = 500;
        for (let i = 0; i < eleitorIds.length; i += chunk) {
          const slice = eleitorIds.slice(i, i + chunk);
          const { data: envs } = await supabase
            .from("whatsapp_envios")
            .select("eleitor_id, created_at")
            .in("eleitor_id", slice)
            .gte("created_at", since)
            .limit(20000);
          (envs ?? []).forEach((e: any) => {
            const cid = eleitorToCoord.get(e.eleitor_id);
            if (!cid) return;
            disparosMap.set(cid, (disparosMap.get(cid) ?? 0) + 1);
          });
        }
      }

      // Respostas por coordenador (no período)
      const { data: resp } = await supabase
        .from("respostas")
        .select("coordenador_id, created_at")
        .in("coordenador_id", coordIds)
        .gte("created_at", since)
        .limit(20000);
      const respMap = new Map<string, number>();
      (resp ?? []).forEach((r: any) => {
        if (!r.coordenador_id) return;
        respMap.set(r.coordenador_id, (respMap.get(r.coordenador_id) ?? 0) + 1);
      });

      // Cliques: cruza enquete_convite_cliques -> enquetes.coordenador_id
      let enqQ = supabase
        .from("enquetes")
        .select("id, coordenador_id")
        .in("coordenador_id", coordIds);
      const { data: enqs } = await enqQ;
      const enqToCoord = new Map<string, string>();
      (enqs ?? []).forEach((e: any) => {
        if (e.coordenador_id) enqToCoord.set(e.id, e.coordenador_id);
      });
      const cliquesMap = new Map<string, number>();
      const enqIds = Array.from(enqToCoord.keys());
      if (enqIds.length) {
        const { data: cliques } = await supabase
          .from("enquete_convite_cliques")
          .select("enquete_id, created_at")
          .in("enquete_id", enqIds)
          .gte("created_at", since)
          .limit(20000);
        (cliques ?? []).forEach((c: any) => {
          const cid = enqToCoord.get(c.enquete_id);
          if (!cid) return;
          cliquesMap.set(cid, (cliquesMap.get(cid) ?? 0) + 1);
        });
      }

      const rows: CoordPerfRow[] = (coords ?? []).map((c: any) => {
        const base = baseMap.get(c.id) ?? 0;
        const responderam = respMap.get(c.id) ?? 0;
        const taxa = base > 0 ? Math.round((responderam / base) * 100) : 0;
        return {
          id: c.id,
          nome: c.nome,
          politico: c.politico?.nome ?? "—",
          base,
          disparos: disparosMap.get(c.id) ?? 0,
          cliques: cliquesMap.get(c.id) ?? 0,
          responderam,
          taxa,
        };
      });
      rows.sort((a, b) => b.responderam - a.responderam || b.base - a.base);
      return rows;
    },
  });
}

export function CoordenadorPerformanceTable({
  days = 30,
  politicoId = "all",
  limit,
}: {
  days?: number;
  politicoId?: string;
  limit?: number;
}) {
  const q = useCoordenadorPerformance({ days, politicoId });
  const rows = useMemo(() => {
    const data = q.data ?? [];
    return limit ? data.slice(0, limit) : data;
  }, [q.data, limit]);

  if (q.isLoading) {
    return <div className="py-6 text-center text-sm text-muted-foreground">Carregando...</div>;
  }
  if (!rows.length) {
    return (
      <EmptyState
        icon={UserCog}
        title="Sem coordenadores"
        description="Cadastre coordenadores e vincule eleitores para ver o desempenho aqui."
      />
    );
  }
  const maxTaxa = Math.max(1, ...rows.map((r) => r.taxa));
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Coordenador</TableHead>
            <TableHead>Político</TableHead>
            <TableHead className="text-right" title="Eleitores atribuídos ao coordenador (universo potencial)">Base</TableHead>
            <TableHead className="text-right" title="Mensagens WhatsApp enviadas via campanha para eleitores deste coordenador">Disparos</TableHead>
            <TableHead className="text-right">Cliques</TableHead>
            <TableHead className="text-right">Responderam</TableHead>
            <TableHead className="min-w-[160px]" title="Responderam ÷ Base">Participação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.nome}</TableCell>
              <TableCell className="text-muted-foreground">{r.politico}</TableCell>
              <TableCell className="text-right tabular-nums">{r.base}</TableCell>
              <TableCell className="text-right tabular-nums">{r.disparos}</TableCell>
              <TableCell className="text-right tabular-nums">{r.cliques}</TableCell>
              <TableCell className="text-right tabular-nums">{r.responderam}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (r.taxa / maxTaxa) * 100)}%`,
                        background: "linear-gradient(90deg, #34d399, #818cf8)",
                      }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                    {r.taxa}%
                  </span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}