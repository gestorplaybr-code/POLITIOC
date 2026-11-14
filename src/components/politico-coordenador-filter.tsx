import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const SEM_COORDENADOR = "__none";

export function PoliticoCoordenadorFilter({
  politicoId,
  coordenadorId,
  onChange,
  showSemCoordenador = true,
  compact = false,
  className,
}: {
  politicoId: string; // "all" ou uuid
  coordenadorId: string; // "all" | SEM_COORDENADOR | uuid
  onChange: (v: { politicoId: string; coordenadorId: string }) => void;
  showSemCoordenador?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const pols = useQuery({
    queryKey: ["politicos-min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("politicos").select("id, nome").order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const coords = useQuery({
    queryKey: ["coordenadores-por-politico", politicoId],
    enabled: politicoId !== "all" && !!politicoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coordenadores")
        .select("id, nome")
        .eq("politico_id", politicoId)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Reseta coordenador quando político muda
  useEffect(() => {
    if (politicoId === "all" && coordenadorId !== "all") {
      onChange({ politicoId, coordenadorId: "all" });
    }
  }, [politicoId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={className ?? `grid gap-3 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2"}`}>
      <div className="space-y-1.5">
        <Label className="text-xs">Político</Label>
        <Select
          value={politicoId}
          onValueChange={(v) => onChange({ politicoId: v, coordenadorId: "all" })}
        >
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
        <Label className="text-xs">Coordenador</Label>
        <Select
          value={coordenadorId}
          onValueChange={(v) => onChange({ politicoId, coordenadorId: v })}
          disabled={politicoId === "all"}
        >
          <SelectTrigger>
            <SelectValue placeholder={politicoId === "all" ? "Escolha o político" : "Todos"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os coordenadores</SelectItem>
            {showSemCoordenador && <SelectItem value={SEM_COORDENADOR}>Sem coordenador</SelectItem>}
            {coords.data?.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}