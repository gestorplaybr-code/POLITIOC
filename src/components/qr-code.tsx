import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Download, Copy } from "lucide-react";
import { toast } from "sonner";

export function QrCode({ value, size = 192, filename = "qrcode.png" }: { value: string; size?: number; filename?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ref.current || !value) return;
    QRCode.toCanvas(ref.current, value, { width: size, margin: 1, color: { dark: "#0f172a", light: "#ffffff" } })
      .then(() => setReady(true))
      .catch(() => setReady(false));
  }, [value, size]);

  function download() {
    if (!ref.current) return;
    const url = ref.current.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  function copy() {
    navigator.clipboard.writeText(value);
    toast.success("Link copiado");
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border bg-card p-4">
      <canvas ref={ref} className="rounded bg-white" />
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={copy}><Copy className="mr-2 h-3.5 w-3.5" />Copiar link</Button>
        <Button variant="outline" size="sm" onClick={download} disabled={!ready}>
          <Download className="mr-2 h-3.5 w-3.5" />Baixar PNG
        </Button>
      </div>
    </div>
  );
}