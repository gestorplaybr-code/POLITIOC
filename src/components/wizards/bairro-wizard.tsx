import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { useInvalidate, toastError } from "@/lib/use-mutation-toast";
import { Wizard, HelpHint, WizardDialog } from "@/components/wizard";
import { EntityPicker, PickerField } from "@/components/entity-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PoliticoWizard } from "./politico-wizard";
import { BRLocationPicker } from "@/components/br-location-picker";

type Created = { id: string; nome: string };

export function BairroWizard({
  open, onOpenChange, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (b: Created) => void;
}) {
  const { profile } = useCurrentUser();
  const invalidate = useInvalidate();
  const defaultPol = (profile as any)?.politico_id ?? "";
  const [politicoId, setPoliticoId] = useState(defaultPol);
  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [createPol, setCreatePol] = useState(false);

  useEffect(() => { if (open) setPoliticoId(defaultPol); }, [open, defaultPol]);

  const pols = useQuery({
    queryKey: ["politicos-min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("politicos").select("id, nome").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const mut = useMutation({
    mutationFn: async () => {
      if (!politicoId) throw new Error("Selecione um político");
      if (nome.trim().length < 2) throw new Error("Informe o nome do bairro");
      const { data, error } = await supabase.from("bairros").insert({
        politico_id: politicoId, nome: nome.trim(), cidade: cidade || null, uf: uf || null,
      }).select("id, nome").single();
      if (error) throw error;
      return data as Created;
    },
    onSuccess: (row) => {
      toast.success("Bairro cadastrado");
      invalidate([["bairros"]]);
      onCreated?.(row);
      onOpenChange(false);
      setNome(""); setCidade(""); setUf("");
    },
    onError: (e) => toastError(e, "bairro"),
  });

  return (
    <>
      <WizardDialog open={open} onOpenChange={onOpenChange}>
        <Wizard
          onCancel={() => onOpenChange(false)}
          pending={mut.isPending}
          onFinish={() => mut.mutate()}
          finishLabel="Cadastrar bairro"
          steps={[{
            id: "tudo",
            title: "Novo bairro",
            description: "Bairros ajudam a segmentar eleitores por região.",
            isValid: () => !!politicoId && nome.trim().length >= 2,
            render: () => (
              <div className="space-y-4">
                <HelpHint>
                  Cadastre o bairro vinculado ao político. Depois, ao adicionar eleitores,
                  você pode escolher o bairro da lista para organizar a base.
                </HelpHint>
                <PickerField label="Político" required>
                  <EntityPicker
                    value={politicoId}
                    options={(pols.data ?? []).map((p) => ({ id: p.id, label: p.nome }))}
                    placeholder="Escolha o político"
                    onChange={setPoliticoId}
                    onCreate={() => setCreatePol(true)}
                    createLabel="+ Cadastrar novo político"
                  />
                </PickerField>
                <div className="space-y-1.5">
                  <Label>Nome do bairro *</Label>
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Centro" />
                </div>
                <BRLocationPicker
                  uf={uf}
                  cidade={cidade}
                  onChange={({ uf: u, cidade: c }) => {
                    setUf(u);
                    setCidade(c);
                  }}
                />
              </div>
            ),
          }]}
        />
      </WizardDialog>
      <PoliticoWizard
        open={createPol}
        onOpenChange={setCreatePol}
        onCreated={(p) => setPoliticoId(p.id)}
      />
    </>
  );
}