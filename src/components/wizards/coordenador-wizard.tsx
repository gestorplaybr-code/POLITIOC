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

export function CoordenadorWizard({
  open, onOpenChange, onCreated, lockedPoliticoId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (c: { id: string; nome: string }) => void;
  lockedPoliticoId?: string;
}) {
  const { profile } = useCurrentUser();
  const invalidate = useInvalidate();
  const defaultPol = lockedPoliticoId ?? (profile as any)?.politico_id ?? "";
  const [politicoId, setPoliticoId] = useState(defaultPol);
  const [createPol, setCreatePol] = useState(false);
  const [f, setF] = useState({ nome: "", telefone: "", email: "", regiao: "" });

  useEffect(() => { if (open) setPoliticoId(defaultPol); }, [open, defaultPol]);

  const pols = useQuery({
    queryKey: ["politicos-min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("politicos").select("id, nome").order("nome");
      if (error) throw error; return data;
    },
  });

  const mut = useMutation({
    mutationFn: async () => {
      if (!politicoId) throw new Error("Escolha o político");
      if (f.nome.trim().length < 2) throw new Error("Nome do coordenador obrigatório");
      const { data, error } = await supabase.from("coordenadores").insert({
        politico_id: politicoId, nome: f.nome.trim(),
        telefone: f.telefone || null, email: f.email || null, regiao: f.regiao || null,
      }).select("id, nome").single();
      if (error) throw error;
      return data as { id: string; nome: string };
    },
    onSuccess: (row) => {
      toast.success("Coordenador adicionado");
      invalidate([["coordenadores"]]);
      onCreated?.(row);
      onOpenChange(false);
      setF({ nome: "", telefone: "", email: "", regiao: "" });
    },
    onError: (e) => toastError(e, "coordenador"),
  });

  return (
    <>
      <WizardDialog open={open} onOpenChange={onOpenChange}>
        <Wizard
          onCancel={() => onOpenChange(false)}
          pending={mut.isPending}
          onFinish={() => mut.mutate()}
          finishLabel="Adicionar coordenador"
          steps={[
            ...(lockedPoliticoId ? [] : [{
              id: "vinculo",
              title: "A qual político ele responde?",
              isValid: () => !!politicoId,
              render: () => (
                <div className="space-y-4">
                  <HelpHint>
                    <strong className="text-white">Coordenador</strong> é o líder de campo
                    responsável por uma região e por um grupo de eleitores. Ele{" "}
                    <strong className="text-white">não precisa acessar o sistema</strong> —
                    o candidato gera o link da enquete e envia para ele repassar aos liderados
                    pelo WhatsApp.
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
                </div>
              ),
            }]),
            {
              id: "dados",
              title: "Dados do coordenador",
              isValid: () => f.nome.trim().length >= 2,
              render: () => (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Nome *</Label>
                    <Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} autoFocus />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label>Telefone</Label>
                      <Input value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} placeholder="(11) 9 9999-9999" />
                    </div>
                    <div className="space-y-1.5"><Label>E-mail</Label>
                      <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1.5"><Label>Região / Zona</Label>
                    <Input value={f.regiao} onChange={(e) => setF({ ...f, regiao: e.target.value })} placeholder="Ex.: Zona Sul" />
                  </div>
                </div>
              ),
            },
          ]}
        />
      </WizardDialog>
      <PoliticoWizard open={createPol} onOpenChange={setCreatePol} onCreated={(p) => setPoliticoId(p.id)} />
    </>
  );
}