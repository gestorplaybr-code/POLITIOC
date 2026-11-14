import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ENQUETE_TEMPLATES, type EnqueteTemplate } from "@/lib/enquete-templates";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function EnqueteTemplatesPicker({
  enqueteId, baseOrdem, hasExisting, onApplied,
}: {
  enqueteId: string;
  baseOrdem: number;
  hasExisting: boolean;
  onApplied: () => void;
}) {
  const [confirm, setConfirm] = useState<EnqueteTemplate | null>(null);

  const apply = useMutation({
    mutationFn: async (tpl: EnqueteTemplate) => {
      const { error } = await supabase.rpc("apply_enquete_template", {
        _enquete_id: enqueteId,
        _perguntas: tpl.perguntas as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Modelo aplicado — edite as perguntas como quiser");
      setConfirm(null);
      onApplied();
    },
    onError: (e: any) => {
      const msg: string = e?.message ?? "";
      if (/sem_permissao/i.test(msg)) {
        toast.error("Você não tem permissão para editar esta pesquisa. Confirme se o político dono da enquete é o mesmo do seu usuário.");
      } else if (/enquete_nao_encontrada/i.test(msg)) {
        toast.error("Enquete não encontrada. Recarregue a página e tente de novo.");
      } else if (/perguntas_invalidas/i.test(msg)) {
        toast.error("Modelo inválido. Tente outro modelo.");
      } else {
        toast.error(msg || "Falha ao aplicar modelo");
      }
    },
  });

  function pick(tpl: EnqueteTemplate) {
    if (hasExisting) setConfirm(tpl);
    else apply.mutate(tpl);
  }

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="font-semibold">Começar de um modelo pronto</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Escolha um modelo abaixo e edite as perguntas depois. Você sempre pode adicionar, remover ou trocar o tipo.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ENQUETE_TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => pick(tpl)}
            disabled={apply.isPending}
            className="group rounded-lg border bg-background p-4 text-left transition hover:border-primary hover:shadow-md disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden>{tpl.emoji}</span>
              <span className="font-medium">{tpl.nome}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{tpl.descricao}</p>
            <p className="mt-2 text-xs text-primary opacity-0 transition group-hover:opacity-100">
              {tpl.perguntas.length} pergunta{tpl.perguntas.length > 1 ? "s" : ""} — clique para aplicar
            </p>
          </button>
        ))}
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Adicionar perguntas do modelo?</AlertDialogTitle>
            <AlertDialogDescription>
              As perguntas do modelo <strong>{confirm?.nome}</strong> serão adicionadas ao final da enquete atual.
              Você pode editar ou remover cada uma depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirm && apply.mutate(confirm)}>
              Adicionar perguntas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}