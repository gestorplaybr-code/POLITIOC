import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, MapPin, Trophy, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useInvalidate, toastError } from "@/lib/use-mutation-toast";
import { Wizard, HelpHint, WizardDialog, ChoiceBadge } from "@/components/wizard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BRLocationPicker } from "@/components/br-location-picker";

type Created = { id: string; nome: string };
const tipos = [
  { id: "Municipal", icon: <Building2 className="h-5 w-5" />, label: "Municipal", desc: "Prefeito / vereadores" },
  { id: "Estadual", icon: <MapPin className="h-5 w-5" />, label: "Estadual", desc: "Governador / deputado est." },
  { id: "Federal", icon: <Globe className="h-5 w-5" />, label: "Federal", desc: "Presidente / deputado fed. / senador" },
  { id: "Outro", icon: <Trophy className="h-5 w-5" />, label: "Outro", desc: "Plebiscito, prévia partidária, etc." },
];

export function PleitoWizard({
  open, onOpenChange, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (p: Created) => void;
}) {
  const invalidate = useInvalidate();
  const [f, setF] = useState({
    tipo: "", nome: "", ano: String(new Date().getFullYear()),
    cidade: "", estado: "", descricao: "",
  });
  function reset() {
    setF({ tipo: "", nome: "", ano: String(new Date().getFullYear()), cidade: "", estado: "", descricao: "" });
  }

  const mut = useMutation({
    mutationFn: async () => {
      if (f.nome.trim().length < 2) throw new Error("Informe o nome do pleito");
      const payload: any = {
        nome: f.nome.trim(),
        tipo: f.tipo || null,
        ano: f.ano ? Number(f.ano) : null,
        cidade: f.cidade || null,
        estado: f.estado || null,
        descricao: f.descricao || null,
      };
      const { data, error } = await supabase.from("pleitos").insert(payload).select("id, nome").single();
      if (error) throw error;
      return data as Created;
    },
    onSuccess: (row) => {
      toast.success("Pleito criado");
      invalidate([["pleitos"], ["pleitos-lookup"], ["dashboard-stats"]]);
      onCreated?.(row);
      onOpenChange(false);
      reset();
    },
    onError: (e) => toastError(e, "pleito"),
  });

  return (
    <WizardDialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <Wizard
        onCancel={() => onOpenChange(false)}
        pending={mut.isPending}
        onFinish={() => mut.mutate()}
        finishLabel="Criar pleito"
        steps={[
          {
            id: "tipo",
            title: "Que tipo de pleito?",
            description: "Escolha a esfera da eleição. Você pode mudar depois.",
            isValid: () => !!f.tipo,
            render: () => (
              <div className="space-y-4">
                <HelpHint>
                  <strong className="text-white">Pleito</strong> é a eleição/campanha onde seus
                  candidatos vão concorrer. Use um pleito por eleição (ex.: "Eleições Municipais 2028").
                </HelpHint>
                <div className="grid grid-cols-2 gap-3">
                  {tipos.map((t) => (
                    <ChoiceBadge
                      key={t.id}
                      icon={t.icon}
                      title={t.label}
                      description={t.desc}
                      selected={f.tipo === t.id}
                      onClick={() => setF({ ...f, tipo: t.id })}
                    />
                  ))}
                </div>
              </div>
            ),
          },
          {
            id: "identidade",
            title: "Nome e ano",
            isValid: () => f.nome.trim().length >= 2,
            render: () => (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Nome do pleito *</Label>
                  <Input
                    autoFocus
                    value={f.nome}
                    onChange={(e) => setF({ ...f, nome: e.target.value })}
                    placeholder={`Ex.: Eleições ${f.tipo || "Municipais"} ${f.ano}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Ano</Label>
                  <Input type="number" value={f.ano} onChange={(e) => setF({ ...f, ano: e.target.value })} />
                </div>
              </div>
            ),
          },
          {
            id: "local",
            title: "Local e detalhes",
            description: "Onde e o que será disputado.",
            render: () => (
              <div className="space-y-4">
                <BRLocationPicker
                  uf={f.estado}
                  cidade={f.cidade}
                  onChange={({ uf, cidade }) => setF({ ...f, estado: uf, cidade })}
                />
                <div className="space-y-1.5"><Label>Descrição</Label>
                  <Textarea rows={3} value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} placeholder="Observações internas, datas-chave, etc." />
                </div>
              </div>
            ),
          },
        ]}
      />
    </WizardDialog>
  );
}