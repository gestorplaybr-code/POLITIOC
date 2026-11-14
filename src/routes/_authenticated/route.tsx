import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { supabase } from "@/integrations/supabase/client";
import { LgpdBanner } from "@/components/lgpd-banner";
import { Search, Sparkles, Moon, Sun } from "lucide-react";
import { CommandPalette, useCommandPalette } from "@/components/command-palette";
import { NotificationsPopover } from "@/components/notifications-popover";
import { CinemaError, CinemaNotFound } from "@/components/cinema-error";
import { useTheme } from "@/lib/theme";
import { ThemePickerModal } from "@/components/theme-picker-modal";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  errorComponent: ({ error, reset }) => (
    <div className="cinema-shell min-h-screen p-6">
      <CinemaError error={error as Error} reset={reset} />
    </div>
  ),
  notFoundComponent: () => (
    <div className="cinema-shell min-h-screen p-6">
      <CinemaNotFound />
    </div>
  ),
  component: AuthedLayout,
});

function AuthedLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { open, setOpen } = useCommandPalette();
  const { theme, setTheme, isFirstTime } = useTheme();

  const crumbs = pathToCrumbs(path);
  const isDark = theme === "dark";
  const shellClass = isDark ? "cinema-shell" : "light-shell";

  return (
    <div className={isDark ? "dark" : ""}>
      <ThemePickerModal open={isFirstTime} onChoose={setTheme} />
      <SidebarProvider>
        <div className={`${shellClass} flex min-h-screen w-full`}>
          <AppSidebar />
          <div className="flex flex-1 flex-col min-w-0">
            <header className={`sticky top-0 z-20 flex h-16 items-center gap-3 border-b px-4 backdrop-blur-xl sm:px-6 ${isDark ? "border-white/5 bg-[#05050f]/70" : "border-slate-200 bg-white/80"}`}>
              <SidebarTrigger className={isDark ? "text-white/70 hover:text-white" : "text-slate-600 hover:text-slate-900"} />
              <div className={`hidden h-5 w-px sm:block ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
              <nav className={`hidden min-w-0 items-center gap-2 text-xs uppercase tracking-[0.2em] sm:flex ${isDark ? "text-white/40" : "text-slate-500"}`}>
                <Sparkles className="h-3 w-3 text-indigo-500" />
                <span className={isDark ? "text-white/30" : "text-slate-400"}>Política+</span>
                {crumbs.map((c, i) => (
                  <span key={i} className="flex items-center gap-2">
                    <span className={isDark ? "text-white/20" : "text-slate-300"}>/</span>
                    <span className={i === crumbs.length - 1 ? (isDark ? "truncate text-white/80" : "truncate text-slate-800") : (isDark ? "truncate text-white/40" : "truncate text-slate-500")}>
                      {c}
                    </span>
                  </span>
                ))}
              </nav>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className={`hidden h-9 items-center gap-2 rounded-full border px-3 text-xs transition md:flex ${isDark ? "border-white/10 bg-white/5 text-white/50 hover:border-indigo-400/40 hover:bg-white/10 hover:text-white" : "border-slate-200 bg-white text-slate-500 hover:border-indigo-400 hover:text-slate-900"}`}
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Buscar</span>
                  <kbd className={`ml-2 rounded border px-1.5 py-0.5 text-[10px] ${isDark ? "border-white/10 bg-white/5 text-white/40" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                    ⌘K
                  </kbd>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                  aria-label={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
                  title={isDark ? "Tema claro" : "Tema escuro"}
                  className={`grid h-9 w-9 place-items-center rounded-full border transition ${isDark ? "border-white/10 bg-white/5 text-white/70 hover:border-indigo-400/40 hover:text-white" : "border-slate-200 bg-white text-slate-600 hover:border-indigo-400 hover:text-slate-900"}`}
                >
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                <NotificationsPopover />
              </div>
            </header>
            <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
              <div className="mx-auto w-full max-w-screen-2xl">
                <Outlet />
              </div>
            </main>
          </div>
          <LgpdBanner />
          <CommandPalette open={open} onOpenChange={setOpen} />
        </div>
      </SidebarProvider>
    </div>
  );
}

const CRUMB_MAP: Record<string, string> = {
  dashboard: "Dashboard",
  politicos: "Políticos",
  pleitos: "Pleitos",
  candidatos: "Candidatos",
  eleitores: "Eleitores",
  coordenadores: "Coordenadores",
  bairros: "Bairros",
  enquetes: "Enquetes",
  respostas: "Respostas",
  whatsapp: "WhatsApp",
  templates: "Templates",
  campanhas: "Campanhas",
  resultados: "Resultados",
  relatorios: "Relatórios",
  usuarios: "Usuários",
  auditoria: "Auditoria",
  perfil: "Meu Perfil",
  configuracoes: "Configurações",
};

function pathToCrumbs(path: string): string[] {
  const segs = path.split("/").filter(Boolean);
  if (!segs.length) return ["Dashboard"];
  return segs.map((s) => CRUMB_MAP[s] ?? (s.length === 36 ? "Detalhe" : s));
}