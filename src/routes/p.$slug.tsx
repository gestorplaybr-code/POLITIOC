import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/p/$slug")({
  head: () => ({ meta: [{ title: "Enquete via WhatsApp — Política+" }] }),
  component: SlugRedirect,
});

function SlugRedirect() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="rounded-full bg-primary/10 p-4">
        <MessageCircle className="h-8 w-8 text-primary" />
      </div>
      <h1 className="text-xl font-semibold">As enquetes agora são pelo WhatsApp</h1>
      <p className="text-sm text-muted-foreground">
        Esta pesquisa deixou de aceitar respostas por formulário. Peça o link atualizado ao coordenador — o novo formato é uma conversa rápida pelo WhatsApp, guiada por IA.
      </p>
      <Link to="/">
        <Button variant="outline">Ir para o início</Button>
      </Link>
    </div>
  );
}