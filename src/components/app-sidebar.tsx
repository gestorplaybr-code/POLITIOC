import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  UserCog,
  Vote,
  Trophy,
  Settings,
  LogOut,
  UserCircle,
  Landmark,
  MapPin,
  UsersRound,
  ClipboardList,
  BarChart3,
  ShieldCheck,
  MessageSquare,
  MessageCircle,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

const main = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Políticos", url: "/politicos", icon: Landmark },
  { title: "Pleitos", url: "/pleitos", icon: Trophy },
  { title: "Candidatos", url: "/candidatos", icon: Vote },
  { title: "Eleitores", url: "/eleitores", icon: Users },
  { title: "Coordenadores", url: "/coordenadores", icon: UsersRound },
  { title: "Desempenho", url: "/coordenadores/desempenho", icon: BarChart3 },
  { title: "Bairros", url: "/bairros", icon: MapPin },
  { title: "Enquetes", url: "/enquetes", icon: ClipboardList },
  { title: "Respostas", url: "/respostas", icon: MessageCircle },
  { title: "WhatsApp", url: "/whatsapp", icon: MessageSquare },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
];

const admin = [
  { title: "Usuários", url: "/usuarios", icon: UserCog },
  { title: "Auditoria", url: "/auditoria", icon: ShieldCheck },
];

const account = [
  { title: "Meu Perfil", url: "/perfil", icon: UserCircle },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { isAdmin, profile } = useCurrentUser();
  const navigate = useNavigate();

  const isActive = (url: string) => path === url || path.startsWith(url + "/");

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const initials = (profile?.nome || profile?.email || "U")
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-white/5 bg-[#08081a]/90 backdrop-blur-xl"
    >
      <SidebarHeader className="border-b border-white/5">
        <Link
          to="/dashboard"
          className="flex items-center gap-3 px-2 py-3 transition hover:opacity-80"
        >
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white shadow-[0_0_30px_-5px_rgba(124,58,237,0.6)]"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            <Vote className="h-5 w-5" />
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span
              className="text-xl tracking-wider"
              style={{ fontFamily: "var(--font-display)" }}
            >
              POLÍTICA+
            </span>
            <span className="text-[10px] uppercase tracking-[0.25em] text-indigo-300/60">
              Gestão de campanha
            </span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-1">
        <SidebarSection label="Operação" items={main} isActive={isActive} />
        {isAdmin && (
          <SidebarSection label="Administração" items={admin} isActive={isActive} />
        )}
        <SidebarSection label="Conta" items={account} isActive={isActive} />
      </SidebarContent>
      <SidebarFooter className="border-t border-white/5">
        <div className="flex flex-col gap-3 p-2 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-2">
            <div
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
              {initials || "U"}
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-xs font-semibold text-white">
                {profile?.nome || "Usuário"}
              </div>
              <div className="truncate text-[10px] text-white/40">
                {profile?.email ?? "—"}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/70 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-200"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair da campanha
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function SidebarSection({
  label,
  items,
  isActive,
}: {
  label: string;
  items: { title: string; url: string; icon: any }[];
  isActive: (url: string) => boolean;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-indigo-300/40">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = isActive(item.url);
            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={item.title}
                  className={cn(
                    "group/sb relative h-10 rounded-xl px-3 text-white/60 transition-all duration-200",
                    "hover:translate-x-0.5 hover:bg-white/5 hover:text-white",
                    "data-[active=true]:bg-white/[0.06] data-[active=true]:text-white",
                    "data-[active=true]:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]",
                  )}
                >
                  <Link to={item.url}>
                    {active && (
                      <span
                        className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full"
                        style={{
                          background: "linear-gradient(180deg, #818cf8, #c084fc)",
                          boxShadow: "0 0 12px rgba(129, 140, 248, 0.8)",
                        }}
                      />
                    )}
                    <item.icon
                      className={cn(
                        "h-4 w-4 transition-colors",
                        active ? "text-indigo-300" : "text-white/40 group-hover/sb:text-indigo-300/70",
                      )}
                    />
                    <span className="text-sm font-medium tracking-wide">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}