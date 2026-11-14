import { createFileRoute } from "@tanstack/react-router";

// Public endpoint that records a click on an enquete invite link.
// The public invite page (c.$token.tsx) posts here on mount.
export const Route = createFileRoute("/api/public/enquetes/click")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let body: any = {};
        try { body = await request.json(); } catch { /* noop */ }
        const token = String(body?.token ?? "").trim().toLowerCase();
        if (!token) return Response.json({ ok: false, error: "missing token" }, { status: 400 });

        const { data: enq } = await supabaseAdmin
          .from("enquetes")
          .select("id")
          .eq("token_convite", token)
          .maybeSingle();

        const ua = request.headers.get("user-agent")?.slice(0, 240) ?? null;
        const ip =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          null;

        await supabaseAdmin.from("enquete_convite_cliques").insert({
          enquete_id: enq?.id ?? null,
          token,
          ip,
          user_agent: ua,
        });
        return Response.json({ ok: true });
      },
    },
  },
});