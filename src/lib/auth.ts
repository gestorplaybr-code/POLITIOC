import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export type AppRole = "admin" | "gestor" | "coordenador" | "operador" | "visualizador";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading, user: session?.user ?? null };
}

export function useCurrentUser() {
  const { session, loading } = useSession();
  const userId = session?.user?.id;

  const profileQ = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, politico:politicos(id, nome)")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const rolesQ = useQuery({
    queryKey: ["roles", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!);
      if (error) throw error;
      return data.map((r) => r.role as AppRole);
    },
  });

  const roles = rolesQ.data ?? [];
  const isAdmin = roles.includes("admin");
  const isGestor = roles.includes("gestor");
  const isCoordenador = roles.includes("coordenador");

  return {
    session,
    user: session?.user ?? null,
    profile: profileQ.data,
    roles,
    isAdmin,
    isGestor,
    isCoordenador,
    canManage: isAdmin || isGestor,
    loading: loading || profileQ.isLoading || rolesQ.isLoading,
  };
}

export function roleLabel(role: AppRole): string {
  return {
    admin: "Administrador",
    gestor: "Candidato",
    coordenador: "Coordenador",
    operador: "Operador",
    visualizador: "Visualizador",
  }[role];
}