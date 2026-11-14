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
import { Textarea } from "@/components/ui/textarea";
import { PoliticoWizard } from "./politico-wizard";
import { CoordenadorWizard } from "./coordenador-wizard";
import { BairroWizard } from "./bairro-wizard";
import { BRLocationPicker } from "@/components/br-location-picker";
import {
  digitsOnly,
  isValidEmail,
  isValidWhatsAppBR,
  maskCEP,
  maskCPF,
  maskPhoneBR,
} from "@/lib/br-masks";

export function EleitorWizard({
  open, onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { profile } = useCurrentUser();
  const invalidate = useInvalidate();
  const defaultPol = (profile as any)?.politico_id ?? "";

  const [politicoId, setPoliticoId] = useState(defaultPol);
  const [coordId, setCoordId] = useState("");
  const [bairroId, setBairroId] = useState("");
  const [createPol, setCreatePol] = useState(false);
  const [createCoord, setCreateCoord] = useState(false);
  const [createBairro, setCreateBairro] = useState(false);
  const [f, setF] = useState({
    nome: "", telefone: "", email: "", cpf: "",
    cidade: "", uf: "", bairroTxt: "", rua: "", numero: "", cep: "", observacoes: "",
  });

  useEffect(() => { if (open) setPoliticoId(defaultPol); }, [open, defaultPol]);

  const pols = useQuery({
    queryKey: ["politicos-min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("politicos").select("id, nome").order("nome");
      if (error) throw error; return data;
    },
  });
  const coords = useQuery({
    queryKey: ["coords-of", politicoId],
    enabled: !!politicoId,
    queryFn: async () => {
      const { data, error } = await supabase.from("coordenadores").select("id, nome").eq("politico_id", politicoId).order("nome");
      if (error) throw error; return data;
    },
  });
  const bairros = useQuery({
    queryKey: ["bairros-of", politicoId],
    enabled: !!politicoId,
    queryFn: async () => {
      const { data, error } = await supabase.from("bairros").select("id, nome").eq("politico_id", politicoId).order("nome");
      if (error) throw error; return data;
    },
  });

  const mut = useMutation({
    mutationFn: async () => {
      if (!politicoId) throw new Error("Escolha o político");
      if (f.nome.trim().length < 2) throw new Error("Nome obrigatório");
      if (f.email && !isValidEmail(f.email)) throw new Error("E-mail inválido");
      if (f.telefone && !isValidWhatsAppBR(f.telefone))
        throw new Error("Telefone/WhatsApp inválido. Use (DD) 9XXXX-XXXX");
      const { error } = await supabase.from("eleitores").insert({
        politico_id: politicoId,
        coordenador_id: coordId || null,
        bairro_id: bairroId || null,
        nome: f.nome.trim(),
        telefone: f.telefone ? digitsOnly(f.telefone) : null,
        email: f.email ? f.email.trim().toLowerCase() : null,
        cpf: f.cpf ? digitsOnly(f.cpf) : null,
        cidade: f.cidade || null,
        uf: f.uf || null,
        bairro: f.bairroTxt || null,
        rua: f.rua || null,
        numero: f.numero || null,
        cep: f.cep ? digitsOnly(f.cep) : null,
        observacoes: f.observacoes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Eleitor cadastrado");
      invalidate([["eleitores"], ["dashboard-stats"]]);
      onOpenChange(false);
      setCoordId(""); setBairroId("");
      setF({ nome: "", telefone: "", email: "", cpf: "", cidade: "", uf: "", bairroTxt: "", rua: "", numero: "", cep: "", observacoes: "" });
    },
    onError: (e) => toastError(e, "eleitor"),
  });

  return (
    <>
      <WizardDialog open={open} onOpenChange={onOpenChange}>
        <Wizard
          onCancel={() => onOpenChange(false)}
          pending={mut.isPending}
          onFinish={() => mut.mutate()}
          finishLabel="Cadastrar eleitor"
          steps={[
            {
              id: "vinculos",
              title: "A quem este eleitor pertence?",
              description: "Defina o político e, opcionalmente, o coordenador e bairro.",
              isValid: () => !!politicoId,
              render: () => (
                <div className="space-y-4">
                  <HelpHint>
                    Todo eleitor pertence a um político. Coordenador e bairro são opcionais,
                    mas ajudam a segmentar e a designar responsáveis pela base.
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
                  <div className="grid grid-cols-2 gap-3">
                    <PickerField label="Coordenador">
                      <EntityPicker
                        value={coordId}
                        options={(coords.data ?? []).map((c) => ({ id: c.id, label: c.nome }))}
                        placeholder={politicoId ? "Opcional" : "Escolha o político primeiro"}
                        onChange={setCoordId}
                        onCreate={politicoId ? () => setCreateCoord(true) : undefined}
                        createLabel="+ Novo coordenador"
                        disabled={!politicoId}
                      />
                    </PickerField>
                    <PickerField label="Bairro cadastrado">
                      <EntityPicker
                        value={bairroId}
                        options={(bairros.data ?? []).map((b) => ({ id: b.id, label: b.nome }))}
                        placeholder={politicoId ? "Opcional" : "Escolha o político primeiro"}
                        onChange={setBairroId}
                        onCreate={politicoId ? () => setCreateBairro(true) : undefined}
                        createLabel="+ Novo bairro"
                        disabled={!politicoId}
                      />
                    </PickerField>
                  </div>
                </div>
              ),
            },
            {
              id: "identidade",
              title: "Quem é o eleitor?",
              isValid: () => f.nome.trim().length >= 2,
              render: () => (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Nome completo *</Label>
                    <Input autoFocus value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label>Telefone / WhatsApp</Label>
                      <Input
                        inputMode="tel"
                        value={f.telefone}
                        onChange={(e) => setF({ ...f, telefone: maskPhoneBR(e.target.value) })}
                        placeholder="(11) 9 9999-9999"
                        maxLength={17}
                      />
                      {f.telefone && !isValidWhatsAppBR(f.telefone) && (
                        <p className="text-xs text-rose-400">Use DDD + 9 + número (11 dígitos)</p>
                      )}
                    </div>
                    <div className="space-y-1.5"><Label>E-mail</Label>
                      <Input
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        value={f.email}
                        onChange={(e) => setF({ ...f, email: e.target.value })}
                        placeholder="nome@dominio.com"
                      />
                      {f.email && !isValidEmail(f.email) && (
                        <p className="text-xs text-rose-400">Formato de e-mail inválido</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5"><Label>CPF</Label>
                    <Input
                      value={f.cpf}
                      onChange={(e) => setF({ ...f, cpf: maskCPF(e.target.value) })}
                      placeholder="000.000.000-00"
                      inputMode="numeric"
                      maxLength={14}
                    />
                  </div>
                </div>
              ),
            },
            {
              id: "endereco",
              title: "Endereço e observações",
              render: () => (
                <div className="space-y-4">
                  <HelpHint>
                    Endereço é opcional. Preencha o que tiver — você pode editar depois.
                  </HelpHint>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5"><Label>CEP</Label>
                      <Input
                        value={f.cep}
                        onChange={(e) => setF({ ...f, cep: maskCEP(e.target.value) })}
                        placeholder="00000-000"
                        inputMode="numeric"
                        maxLength={9}
                      />
                    </div>
                    <div className="col-span-2 space-y-1.5"><Label>Rua</Label>
                      <Input value={f.rua} onChange={(e) => setF({ ...f, rua: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label>Número</Label>
                      <Input value={f.numero} onChange={(e) => setF({ ...f, numero: e.target.value })} />
                    </div>
                    <div className="space-y-1.5"><Label>Bairro</Label>
                      <Input value={f.bairroTxt} onChange={(e) => setF({ ...f, bairroTxt: e.target.value })} />
                    </div>
                  </div>
                  <BRLocationPicker
                    uf={f.uf}
                    cidade={f.cidade}
                    onChange={({ uf, cidade }) => setF({ ...f, uf, cidade })}
                  />
                  <div className="space-y-1.5"><Label>Observações</Label>
                    <Textarea rows={3} value={f.observacoes} onChange={(e) => setF({ ...f, observacoes: e.target.value })} />
                  </div>
                </div>
              ),
            },
          ]}
        />
      </WizardDialog>
      <PoliticoWizard open={createPol} onOpenChange={setCreatePol} onCreated={(p) => setPoliticoId(p.id)} />
      <CoordenadorWizard open={createCoord} onOpenChange={setCreateCoord} onCreated={(c) => setCoordId(c.id)} />
      <BairroWizard open={createBairro} onOpenChange={setCreateBairro} onCreated={(b) => setBairroId(b.id)} />
    </>
  );
}