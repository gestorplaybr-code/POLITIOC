import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
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

export function EnqueteWizard({
  open, onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { profile, user, canManage } = useCurrentUser();
  const navigate = useNavigate();
  const invalidate = useInvalidate();
  const defaultPol = (profile as any)?.politico_id ?? "";

  const [politicoId, setPoliticoId] = useState(defaultPol);
  const [createPol, setCreatePol] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");

  useEffect(() => { if (open) setPoliticoId(defaultPol); }, [open, defaultPol]);

  const pols = useQuery({
    queryKey: ["politicos-min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("politicos").select("id, nome").order("nome");
      if (error) throw error; return data;
    },
    enabled: canManage || !defaultPol,
  });

  const mut = useMutation({
    mutationFn: async () => {
      if (!politicoId) throw new Error("Escolha o político da enquete");
      if (titulo.trim().length < 3) throw new Error("Título precisa de ao menos 3 caracteres");
      if (!canManage && defaultPol && politicoId !== defaultPol) {
        throw new Error("Você só pode criar enquetes para o seu próprio político. Peça permissão de Admin ou Gestor para criar em nome de outros.");
      }
      const { data, error } = await supabase.from("enquetes")
        .insert({ politico_id: politicoId, titulo: titulo.trim(), descricao: descricao || null, slug: "", created_by: user?.id })
        .select("id").single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: (row) => {
      toast.success("Enquete criada — agora adicione perguntas");
      invalidate([["enquetes"]]);
      onOpenChange(false);
      setTitulo(""); setDescricao("");
      navigate({ to: "/enquetes/$id", params: { id: row.id } });
    },
    onError: (e) => toastError(e, "enquete"),
  });

  return (
    <>
      <WizardDialog open={open} onOpenChange={onOpenChange}>
        <Wizard
          onCancel={() => onOpenChange(false)}
          pending={mut.isPending}
          onFinish={() => mut.mutate()}
          finishLabel="Criar e adicionar perguntas"
          steps={[
            {
              id: "politico",
              title: "De qual político é essa enquete?",
              description: "A enquete fica vinculada ao político e aparece no link público dele.",
              isValid: () => !!politicoId,
              render: () => (
                <div className="space-y-4">
                  <HelpHint>
                    {canManage
                      ? <>Toda enquete pertence a um político. Se você ainda não cadastrou nenhum, use o botão <strong className="text-foreground">+ Cadastrar novo político</strong> abaixo — ele abre uma janelinha rápida e volta pra cá com o político já selecionado.</>
                      : <>Sua conta está vinculada a um político. As enquetes que você criar serão associadas automaticamente a ele.</>
                    }
                  </HelpHint>
                  <PickerField label="Político" required>
                    {!canManage && defaultPol ? (
                      <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                        {(profile as any)?.politico?.nome ?? "Seu político"}
                      </div>
                    ) : (
                      <EntityPicker
                        value={politicoId}
                        options={(pols.data ?? []).map((p) => ({ id: p.id, label: p.nome }))}
                        placeholder="Escolha o político"
                        onChange={setPoliticoId}
                        onCreate={canManage ? () => setCreatePol(true) : undefined}
                        createLabel="+ Cadastrar novo político"
                      />
                    )}
                  </PickerField>
                  {!canManage && !defaultPol && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Sua conta não está vinculada a um político. Peça ao administrador para vincular seu perfil antes de criar enquetes.
                    </p>
                  )}
                </div>
              ),
            },
            {
              id: "conteudo",
              title: "Sobre o que é a enquete?",
              description: "Dê um título claro e uma descrição opcional para os eleitores.",
              isValid: () => titulo.trim().length >= 3,
              render: () => (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Título *</Label>
                    <Input
                      autoFocus
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      placeholder="Ex.: Qual sua prioridade para o bairro?"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Descrição (opcional)</Label>
                    <Textarea
                      rows={4}
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      placeholder="Aparece para o eleitor antes das perguntas. Use para contextualizar."
                    />
                  </div>
                  <HelpHint>
                    <strong className="text-foreground">Próximo passo:</strong> ao confirmar, você é levado
                    para a tela onde adiciona <strong className="text-foreground">perguntas</strong> e ativa
                    a enquete. Antes de ativar, você precisa escolher o <strong className="text-foreground">coordenador responsável</strong> — ele quem vai receber o link e encaminhar para os eleitores pelo WhatsApp. A conversa é conduzida por IA.
                  </HelpHint>
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