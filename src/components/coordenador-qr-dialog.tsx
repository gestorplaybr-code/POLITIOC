import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { QrCode } from "@/components/qr-code";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

export function CoordenadorQrDialog({
  open, onOpenChange, coordenador,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  coordenador: { id: string; nome: string; token_captacao?: string | null } | null;
}) {
  const token = coordenador?.token_captacao ?? "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = token ? `${origin}/captar/${token}` : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>QR de captação — {coordenador?.nome}</DialogTitle>
          <DialogDescription>
            Mostre este QR code no celular para que o eleitor escaneie e cadastre os dados diretamente na sua base.
            O cadastro fica vinculado a você automaticamente.
          </DialogDescription>
        </DialogHeader>
        {!token ? (
          <p className="text-sm text-muted-foreground">Este coordenador ainda não tem um token de captação. Salve o cadastro novamente para gerar.</p>
        ) : (
          <div className="space-y-3">
            <QrCode value={url} size={240} filename={`qr-${coordenador?.nome ?? "coordenador"}.png`} />
            <div className="rounded-md border bg-muted/30 p-2 text-center text-xs font-mono break-all">{url}</div>
            <Button
              asChild variant="outline" className="w-full"
            >
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Cadastre-se na nossa base: ${url}`)}`}
                target="_blank" rel="noreferrer"
              >
                <MessageCircle className="mr-2 h-4 w-4" />Compartilhar no WhatsApp
              </a>
            </Button>
            <p className="text-xs text-muted-foreground">
              Dica: dentro do formulário há aceite obrigatório da LGPD antes do envio.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}