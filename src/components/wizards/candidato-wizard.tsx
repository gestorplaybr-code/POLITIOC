import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useInvalidate, toastError } from "@/lib/use-mutation-toast";
import { Wizard, HelpHint, WizardDialog } from "@/components/wizard";
import { EntityPicker, PickerField } from "@/components/entity-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { PoliticoWizard } from "./politico-wizard";
import { PleitoWizard } from "./pleito-wizard";

export function CandidatoWizard({
  open, onOpenChange, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (c: { id: string; nome: string }) => void;
}) {
  const invalidate = useInvalidate();
  const [politicoId, setPoliticoId] = useState("");
  const [pleitoId, setPleitoId] = useState("");
  const [coordIds, setCoordIds] = useState<string[]>([]);
  const [createPol, setCreatePol] = useState(false);
  const [createPle, setCreatePle] = useState(false);
  const [f, setF] = useState({ nome: "", partido: "", numero: "", cargo_pretendido: "", cidade: "", estado: "" });

  const pols = useQuery({
    queryKey: ["politicos-min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("politicos").select("id, nome").order("nome");
      if (error) throw error; return data;
    },
  });
  const ples = useQuery({
    queryKey: ["pleitos-lookup"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pleitos").select("id, nome, ano").order("ano", { ascending: false });
      if (error) throw error; return data;
    },
  });

  const coords = useQuery({
    queryKey: ["coordenadores-por-politico", politicoId],
    enabled: !!politicoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coordenadores").select("id, nome").eq("politico_id", politicoId).order("nome");
      if (error) throw error; return data ?? [];
    },
  });

  const mut = useMutation({
    mutationFn: async () => {
      if (f.nome.trim().length < 2) throw new Error("Informe o nome do candidato");
      const { data, error } = await supabase.from("candidatos").insert({
        nome: f.nome.trim(),
        partido: f.partido || null,
        numero: f.numero || null,
        cargo_pretendido: f.cargo_pretendido || null,
        cidade: f.cidade || null,
        estado: f.estado || null,
        politico_id: politicoId || null,
        pleito_id: pleitoId || null,
      }).select("id, nome").single();
      if (error) throw error;
      if (coordIds.length > 0) {
        const links = coordIds.map((cid) => ({ candidato_id: data.id, coordenador_id: cid }));
        const { error: le } = await supabase.from("candidato_coordenadores").insert(links);
        if (le) throw le;
      }
      return data as { id: string; nome: string };
    },
    onSuccess: (row) => {
      toast.success("Candidato cadastrado");
      invalidate([["candidatos"], ["dashboard-stats"]]);
      onCreated?.(row);
      onOpenChange(false);
      setPoliticoId(""); setPleitoId(""); setCoordIds([]);
      setF({ nome: "", partido: "", numero: "", cargo_pretendido: "", cidade: "", estado: "" });
    },
    onError: (e) => toastError(e, "candidato"),
  });

  return (
    <>
      <WizardDialog open={open} onOpenChange={onOpenChange}>
        <Wizard
          onCancel={() => onOpenChange(false)}
          pending={mut.isPending}
          onFinish={() => mut.mutate()}
          finishLabel="Cadastrar candidato"
          steps={[
            {
              id: "politico",
              title: "Qual político está apoiando?",
              description: "Vincule o candidato ao seu político (opcional, mas recomendado).",
              render: () => (
                <div className="space-y-4">
                  <HelpHint>
                    O <strong className="text-white">candidato</strong> é a pessoa que vai disputar
                    o pleito. Vincular ao político facilita a gestão da chapa e relatórios.
                  </HelpHint>
                  <PickerField label="Político vinculado" hint="Você pode pular este passo se ainda não souber.">
                    <EntityPicker
                      value={politicoId}
                      options={(pols.data ?? []).map((p) => ({ id: p.id, label: p.nome }))}
                      placeholder="Sem vínculo (opcional)"
                      onChange={(v) => { setPoliticoId(v); setCoordIds([]); }}
                      onCreate={() => setCreatePol(true)}
                      createLabel="+ Cadastrar novo político"
                    />
                  </PickerField>
                  {politicoId && (
                    <PickerField label="Coordenadores responsáveis" hint="Selecione um ou mais coordenadores desse político.">
                      <div className="space-y-2">
                        <select
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                          value=""
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v && !coordIds.includes(v)) setCoordIds([...coordIds, v]);
                          }}
                        >
                          <option value="">+ Adicionar coordenador...</option>
                          {(coords.data ?? []).filter((c: any) => !coordIds.includes(c.id)).map((c: any) => (
                            <option key={c.id} value={c.id}>{c.nome}</option>
                          ))}
                        </select>
                        <div className="flex flex-wrap gap-1.5">
                          {coordIds.map((cid) => {
                            const c = coords.data?.find((x: any) => x.id === cid);
                            return (
                              <Badge key={cid} variant="secondary" className="gap-1">
                                {c?.nome ?? cid}
                                <button type="button" onClick={() => setCoordIds(coordIds.filter((x) => x !== cid))}>
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            );
                          })}
                          {coordIds.length === 0 && <span className="text-xs text-muted-foreground">Nenhum vinculado.</span>}
                        </div>
                      </div>
                    </PickerField>
                  )}
                </div>
              ),
            },
            {
              id: "pleito",
              title: "Em qual pleito vai concorrer?",
              render: () => (
                <div className="space-y-4">
                  <HelpHint>
                    O <strong className="text-white">pleito</strong> é a eleição/disputa. Pode ser
                    deixado em branco e definido depois.
                  </HelpHint>
                  <PickerField label="Pleito">
                    <EntityPicker
                      value={pleitoId}
                      options={(ples.data ?? []).map((p: any) => ({
                        id: p.id, label: p.nome, sublabel: p.ano ? String(p.ano) : undefined,
                      }))}
                      placeholder="Sem pleito (opcional)"
                      onChange={setPleitoId}
                      onCreate={() => setCreatePle(true)}
                      createLabel="+ Criar novo pleito"
                    />
                  </PickerField>
                </div>
              ),
            },
            {
              id: "dados",
              title: "Dados do candidato",
              isValid: () => f.nome.trim().length >= 2,
              render: () => (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Nome de urna *</Label>
                    <Input autoFocus value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5"><Label>Partido</Label>
                      <Input value={f.partido} onChange={(e) => setF({ ...f, partido: e.target.value })} />
                    </div>
                    <div className="space-y-1.5"><Label>Número</Label>
                      <Input value={f.numero} onChange={(e) => setF({ ...f, numero: e.target.value })} placeholder="Ex.: 45123" />
                    </div>
                    <div className="space-y-1.5"><Label>UF</Label>
                      <Input maxLength={2} value={f.estado} onChange={(e) => setF({ ...f, estado: e.target.value.toUpperCase() })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label>Cargo pretendido</Label>
                      <Input value={f.cargo_pretendido} onChange={(e) => setF({ ...f, cargo_pretendido: e.target.value })} placeholder="Ex.: Vereador" />
                    </div>
                    <div className="space-y-1.5"><Label>Cidade</Label>
                      <Input value={f.cidade} onChange={(e) => setF({ ...f, cidade: e.target.value })} />
                    </div>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </WizardDialog>
      <PoliticoWizard open={createPol} onOpenChange={setCreatePol} onCreated={(p) => setPoliticoId(p.id)} />
      <PleitoWizard open={createPle} onOpenChange={setCreatePle} onCreated={(p) => setPleitoId(p.id)} />
    </>
  );
}