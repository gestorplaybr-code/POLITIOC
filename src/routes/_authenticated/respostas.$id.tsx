import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Archive, Trash2, ArchiveRestore, ChevronLeft, ChevronRight, Radio, Building2, UserRound, ClipboardList, ChevronRight as Sep, Phone, Mail, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { useInvalidate, toastError } from "@/lib/use-mutation-toast";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExportButtons } from "@/components/export-buttons";
import { formatDateTime } from "@/lib/format";
import { maskPhoneBR } from "@/lib/br-masks";

export const Route = createFileRoute("/_authenticated/respostas/$id")({
  head: () => ({ meta: [{ title: "Resposta — Política+" }] }),
  component: RespostaDetail,
});

function RespostaDetail() {
  const { id } = Route.useParams();
  const { isAdmin } = useCurrentUser();
  const invalidate = useInvalidate();
  const navigate = useNavigate();

  const q = useQuery({
    queryKey: ["resposta", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("respostas")
        .select("*, enquete:enquetes(id, titulo, slug, status, politico:politicos(id, nome)), coordenador:coordenadores(id, nome, telefone)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Resposta não encontrada");
      const { data: itens, error: itErr } = await supabase
        .from("resposta_itens")
        .select("id, texto, texto_outro, numero, pergunta:enquete_perguntas(id, texto, tipo, ordem), opcao:enquete_opcoes(id, texto)")
        .eq("resposta_id", id);
      if (itErr) throw itErr;
      // Buscar TODAS as perguntas da enquete, para mostrar "Sem resposta" quando faltar
      const { data: todasPerguntas } = await supabase
        .from("enquete_perguntas")
        .select("id, texto, tipo, ordem")
        .eq("enquete_id", (data as any).enquete_id)
        .order("ordem");
      const grouped = new Map<string, { pergunta: any; respostas: any[] }>();
      (todasPerguntas ?? []).forEach((p: any) => grouped.set(p.id, { pergunta: p, respostas: [] }));
      (itens ?? []).forEach((it: any) => {
        const pid = it.pergunta?.id;
        if (!pid) return;
        if (!grouped.has(pid)) grouped.set(pid, { pergunta: it.pergunta, respostas: [] });
        grouped.get(pid)!.respostas.push(it);
      });
      return { resposta: data, perguntas: Array.from(grouped.values()).sort((a, b) => (a.pergunta.ordem ?? 0) - (b.pergunta.ordem ?? 0)) };
    },
  });

  // Navegação entre respostas da mesma enquete
  const enqueteId = q.data?.resposta?.enquete_id as string | undefined;
  const vizinhas = useQuery({
    queryKey: ["resposta-vizinhas", enqueteId],
    enabled: !!enqueteId,
    queryFn: async () => {
      const { data } = await supabase
        .from("respostas")
        .select("id, created_at")
        .eq("enquete_id", enqueteId!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const idx = (vizinhas.data ?? []).findIndex((r: any) => r.id === id);
  const anterior = idx > 0 ? (vizinhas.data as any[])[idx - 1] : null;
  const proxima = idx >= 0 && idx < (vizinhas.data ?? []).length - 1 ? (vizinhas.data as any[])[idx + 1] : null;

  const arquivar = useMutation({
    mutationFn: async (val: boolean) => {
      const { error } = await supabase.from("respostas").update({ arquivada: val }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Atualizado"); invalidate([["resposta", id], ["respostas-list"]]); },
    onError: (e) => toastError(e),
  });

  const excluir = useMutation({
    mutationFn: async () => {
      await supabase.from("resposta_itens").delete().eq("resposta_id", id);
      const { error } = await supabase.from("respostas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Excluída"); navigate({ to: "/respostas" }); },
    onError: (e) => toastError(e),
  });

  if (q.isLoading) return <p className="text-muted-foreground">Carregando...</p>;
  if (q.isError) return <p className="text-destructive">{(q.error as Error).message}</p>;
  const r = q.data!.resposta;
  const perguntas = q.data!.perguntas;

  const exportRows = perguntas.map((g, i) => ({
    "#": i + 1,
    Pergunta: g.pergunta.texto,
    Resposta: g.respostas.length === 0
      ? "(sem resposta)"
      : g.respostas
          .map((it: any) => it.opcao?.texto ?? it.texto ?? it.texto_outro ?? (it.numero != null ? String(it.numero) : "—"))
          .join(" | "),
  }));

  return (
    <div className="space-y-6">
      {r.enquete && (
        <nav className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/respostas" className="hover:underline">Respostas</Link>
          <Sep className="h-3 w-3" />
          {r.enquete.politico?.nome && (
            <>
              <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" /> {r.enquete.politico.nome}</span>
              <Sep className="h-3 w-3" />
            </>
          )}
          {(r as any).coordenador?.nome && (
            <>
              <span className="inline-flex items-center gap-1"><UserRound className="h-3 w-3" /> {(r as any).coordenador.nome}</span>
              <Sep className="h-3 w-3" />
            </>
          )}
          <Link to="/enquetes/$id" params={{ id: r.enquete.id }} className="inline-flex items-center gap-1 hover:underline">
            <ClipboardList className="h-3 w-3" /> {r.enquete.titulo}
          </Link>
          <Sep className="h-3 w-3" />
          <span className="text-foreground">Resposta de {r.nome || "Anônimo"}</span>
        </nav>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/respostas" className="inline-flex items-center text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar para respostas
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={!anterior}
            onClick={() => anterior && navigate({ to: "/respostas/$id", params: { id: anterior.id } })}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">
            {idx >= 0 ? `${idx + 1} / ${vizinhas.data?.length ?? "?"}` : ""}
          </span>
          <Button variant="outline" size="sm" disabled={!proxima}
            onClick={() => proxima && navigate({ to: "/respostas/$id", params: { id: proxima.id } })}>
            Próxima <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
          {r.enquete?.id && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/enquetes/$id/ao-vivo" params={{ id: r.enquete.id }}>
                <Radio className="mr-1 h-4 w-4 text-rose-500" /> Ao vivo
              </Link>
            </Button>
          )}
        </div>
      </div>
      <PageHeader
        title={r.enquete?.titulo ?? "Resposta"}
        description={`Recebida em ${formatDateTime(r.created_at)}`}
        actions={
          <>
            <ExportButtons
              filename={`resposta-${id}`}
              title={`Resposta — ${r.enquete?.titulo ?? ""}`}
              rows={exportRows}
              disabled={perguntas.length === 0}
            />
            {isAdmin && (
              <>
              <Button variant="outline" size="sm" onClick={() => arquivar.mutate(!r.arquivada)}>
                {r.arquivada ? <><ArchiveRestore className="mr-2 h-4 w-4" />Restaurar</> : <><Archive className="mr-2 h-4 w-4" />Arquivar</>}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => { if (confirm("Excluir definitivamente?")) excluir.mutate(); }}>
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </Button>
              </>
            )}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 text-primary" /> Político
          </div>
          <div className="mt-1.5 font-semibold">{r.enquete?.politico?.nome ?? "—"}</div>
          {r.enquete?.politico?.id && (
            <Link to="/politicos/$id" params={{ id: r.enquete.politico.id }} className="mt-1 inline-block text-xs text-primary hover:underline">
              Ver perfil do político →
            </Link>
          )}
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
            <UserRound className="h-3.5 w-3.5 text-emerald-600" /> Coordenador responsável
          </div>
          <div className="mt-1.5 font-semibold">{(r as any).coordenador?.nome ?? <span className="text-muted-foreground font-normal">Sem coordenador</span>}</div>
          {(r as any).coordenador?.telefone && (
            <div className="mt-0.5 text-xs text-muted-foreground">{(r as any).coordenador.telefone}</div>
          )}
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
            <ClipboardList className="h-3.5 w-3.5 text-amber-600" /> Enquete
          </div>
          <div className="mt-1.5 font-semibold">{r.enquete?.titulo ?? "—"}</div>
          {r.enquete?.id && (
            <Link to="/enquetes/$id" params={{ id: r.enquete.id }} className="mt-1 inline-block text-xs text-primary hover:underline">
              Abrir enquete →
            </Link>
          )}
        </div>
      </div>

      <RespondenteCard r={r} />

      <div className="grid gap-3 rounded-lg border bg-card p-5 sm:grid-cols-2">
        <Field label="Origem" value={r.origem ?? "—"} />
        <Field label="Dispositivo" value={(r as any).dispositivo ?? "—"} />
        <Field label="IP" value={(r as any).ip ?? "—"} />
        <Field label="Consentimento LGPD" value={r.consentimento_lgpd ? "Aceito" : "Não registrado"} />
        <Field label="Status" value={r.arquivada ? "Arquivada" : "Ativa"} />
        <Field label="Recebida em" value={formatDateTime(r.created_at)} />
      </div>

      <div className="space-y-3">
        {perguntas.map((g, i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <div className="text-xs uppercase text-muted-foreground">Pergunta {i + 1}</div>
            <p className="mt-1 font-medium">{g.pergunta.texto}</p>
            <div className="mt-3 space-y-1 text-sm">
              {g.respostas.length === 0 ? (
                <div className="rounded border border-dashed px-3 py-2 text-muted-foreground">Sem resposta</div>
              ) : g.respostas.map((it: any) => (
                <div key={it.id} className="rounded bg-muted/40 px-3 py-2">
                  {it.opcao?.texto ?? it.texto ?? it.texto_outro ?? (it.numero != null ? String(it.numero) : "—")}
                  {it.texto_outro && it.opcao && <span className="ml-2 text-muted-foreground">(outro: {it.texto_outro})</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
        {perguntas.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Esta enquete não tem perguntas cadastradas.
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

function RespondenteCard({ r }: { r: any }) {
  const nome = r.nome as string | null;
  const tel = r.telefone as string | null;
  const digits = (tel ?? "").replace(/\D/g, "");
  const src = (nome ?? "").trim() || digits.slice(-4) || "?";
  const parts = src.split(/\s+/);
  const inits = ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-lg font-semibold text-white">
          {inits}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase text-muted-foreground">Respondente</div>
          <div className="text-lg font-semibold">{nome || "Contato do WhatsApp"}</div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
            {tel ? (
              <a
                href={`https://wa.me/${digits.startsWith("55") ? digits : `55${digits}`}`}
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-medium text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
              >
                <Phone className="h-3.5 w-3.5" /> {maskPhoneBR(tel)}
              </a>
            ) : (
              <span className="text-muted-foreground">Sem número de WhatsApp</span>
            )}
            {r.email && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> {r.email}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" /> {formatDateTime(r.created_at)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}