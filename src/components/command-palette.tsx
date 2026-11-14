import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard, Users, UserCog, Vote, Trophy, Settings, UserCircle,
  Landmark, MapPin, UsersRound, ClipboardList, BarChart3, ShieldCheck,
  MessageSquare, MessageCircle, Plus, FileText, Send,
} from "lucide-react";

const items = [
  { group: "Navegação", icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
  { group: "Navegação", icon: Landmark, label: "Políticos", to: "/politicos" },
  { group: "Navegação", icon: Trophy, label: "Pleitos", to: "/pleitos" },
  { group: "Navegação", icon: Vote, label: "Candidatos", to: "/candidatos" },
  { group: "Navegação", icon: Users, label: "Eleitores", to: "/eleitores" },
  { group: "Navegação", icon: UsersRound, label: "Coordenadores", to: "/coordenadores" },
  { group: "Navegação", icon: MapPin, label: "Bairros", to: "/bairros" },
  { group: "Navegação", icon: ClipboardList, label: "Enquetes", to: "/enquetes" },
  { group: "Navegação", icon: MessageCircle, label: "Respostas", to: "/respostas" },
  { group: "Navegação", icon: MessageSquare, label: "WhatsApp", to: "/whatsapp" },
  { group: "Navegação", icon: BarChart3, label: "Relatórios", to: "/relatorios" },
  { group: "Administração", icon: UserCog, label: "Usuários", to: "/usuarios" },
  { group: "Administração", icon: ShieldCheck, label: "Auditoria", to: "/auditoria" },
  { group: "Conta", icon: UserCircle, label: "Meu Perfil", to: "/perfil" },
  { group: "Conta", icon: Settings, label: "Configurações", to: "/configuracoes" },
  { group: "Atalhos", icon: FileText, label: "Templates de WhatsApp", to: "/whatsapp/templates" },
  { group: "Atalhos", icon: Send, label: "Campanhas de WhatsApp", to: "/whatsapp/campanhas" },
];

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const grouped = items.reduce<Record<string, typeof items>>((acc, it) => {
    (acc[it.group] ||= []).push(it);
    return acc;
  }, {});
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Buscar telas, atalhos…" />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty>Nenhum resultado.</CommandEmpty>
        {Object.entries(grouped).map(([g, list], gi) => (
          <div key={g}>
            {gi > 0 && <CommandSeparator />}
            <CommandGroup heading={g}>
              {list.map((it) => (
                <CommandItem
                  key={it.to}
                  value={`${g} ${it.label}`}
                  onSelect={() => {
                    onOpenChange(false);
                    navigate({ to: it.to });
                  }}
                  className="gap-3"
                >
                  <it.icon className="h-4 w-4 text-indigo-300" />
                  <span>{it.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return { open, setOpen };
}