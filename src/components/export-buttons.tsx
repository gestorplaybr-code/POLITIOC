import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  downloadCsv, downloadPdf, downloadXlsx, downloadJson, copyTsvToClipboard, printRows,
} from "@/lib/csv";

type Row = Record<string, unknown>;

export function ExportButtons({
  filename,
  title,
  rows,
  getRows,
  disabled,
}: {
  filename: string;
  title: string;
  rows?: Row[];
  getRows?: () => Promise<Row[]> | Row[];
  disabled?: boolean;
}) {
  async function resolve(): Promise<Row[]> {
    if (getRows) return await getRows();
    return rows ?? [];
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled}>
          <Download className="mr-2 h-4 w-4" /> Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Arquivo</DropdownMenuLabel>
        <DropdownMenuItem onClick={async () => downloadCsv(`${filename}.csv`, await resolve())}>CSV (.csv)</DropdownMenuItem>
        <DropdownMenuItem onClick={async () => downloadXlsx(`${filename}.xlsx`, await resolve())}>Excel (.xlsx)</DropdownMenuItem>
        <DropdownMenuItem onClick={async () => downloadPdf(`${filename}.pdf`, title, await resolve())}>PDF (.pdf)</DropdownMenuItem>
        <DropdownMenuItem onClick={async () => downloadJson(`${filename}.json`, await resolve())}>JSON (.json)</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Ações</DropdownMenuLabel>
        <DropdownMenuItem onClick={async () => { await copyTsvToClipboard(await resolve()); toast.success("Copiado para a área de transferência"); }}>
          Copiar (TSV — colar no Excel)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={async () => printRows(title, await resolve())}>Imprimir</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}