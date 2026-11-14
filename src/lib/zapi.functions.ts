import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

let cache: { at: number; value: { phone: string | null; connected: boolean } } | null = null;
const TTL_MS = 5 * 60 * 1000;

export const getZapiBotNumber = createServerFn({ method: "GET" }).handler(async () => {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.value;

  const instance = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN;
  const fallback = process.env.ZAPI_BOT_NUMBER;

  if (!instance || !token) {
    const value = { phone: fallback ? String(fallback).replace(/\D/g, "") : null, connected: false };
    cache = { at: now, value };
    return value;
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (clientToken) headers["Client-Token"] = clientToken;

  try {
    const res = await fetch(`https://api.z-api.io/instances/${instance}/token/${token}/device`, { headers });
    const text = await res.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    const raw = data?.phone ?? data?.device?.phone ?? data?.wid ?? null;
    const phone = raw ? String(raw).replace(/\D/g, "") : (fallback ? String(fallback).replace(/\D/g, "") : null);
    const connected = Boolean(data?.connected ?? data?.deviceConnected ?? (res.ok && phone));
    const value = { phone, connected };
    cache = { at: now, value };
    return value;
  } catch {
    const value = { phone: fallback ? String(fallback).replace(/\D/g, "") : null, connected: false };
    cache = { at: now, value };
    return value;
  }
});

/** Admin: configura os webhooks inbound do Z-API apontando para nosso endpoint público. */
export const syncZapiWebhooks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { webhookUrl?: string }) => d ?? {})
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Apenas administradores podem configurar o webhook.");
    const { configureZapiWebhooks, getZapiWebhookStatus } = await import("@/lib/zapi.server");
    const url = (data?.webhookUrl && String(data.webhookUrl)) ||
      "https://politica.adscomunicacao.com/api/public/zapi/webhook";
    const result = await configureZapiWebhooks(url);
    const status = await getZapiWebhookStatus();
    return { url, result, status };
  });

export const getZapiStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { getZapiWebhookStatus } = await import("@/lib/zapi.server");
    try {
      return await getZapiWebhookStatus();
    } catch (e: any) {
      return { error: e?.message ?? "erro", connected: false, received: null, delivery: null, device: null };
    }
  });

/** Admin: últimos eventos recebidos do Z-API (para diagnosticar se o webhook está de fato chegando). */
export const getRecentZapiEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) return { events: [] as any[] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("zapi_webhook_log")
      .select("id, tipo, resultado, erro, phone, from_me, is_group, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    return { events: data ?? [] };
  });