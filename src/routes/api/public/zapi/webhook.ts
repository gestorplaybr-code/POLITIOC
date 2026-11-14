import { createFileRoute } from "@tanstack/react-router";

// Public webhook for Z-API events. Handles two kinds of payloads:
// 1) Status callbacks (Delivery/Read/MessageStatus) — updates whatsapp_envios.
// 2) Inbound text messages (ReceivedCallback) — drives the conversational survey.
export const Route = createFileRoute("/api/public/zapi/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let body: any;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        // Always log the payload for diagnostics (even 200/ignored).
        const logRow: any = {
          tipo: body?.type ?? body?.event ?? body?.notification ?? null,
          phone: String(body?.phone ?? body?.from ?? "") || null,
          from_me: body?.fromMe ?? null,
          is_group: body?.isGroup ?? null,
          payload: body,
          resultado: null,
          erro: null,
        };

        const logAndReturn = async (resultado: string, extra: any = {}, status = 200) => {
          logRow.resultado = resultado;
          if (extra?.error) logRow.erro = String(extra.error);
          try { await supabaseAdmin.from("zapi_webhook_log").insert(logRow); } catch { /* noop */ }
          return new Response(JSON.stringify({ ok: true, resultado, ...extra }), {
            status, headers: { "Content-Type": "application/json" },
          });
        };

        // ---- 1) Inbound message → conversational engine
        // Broader detection: accept ReceivedCallback / onmessage / any payload with
        // a text body. Always ignore fromMe and group messages.
        const inboundText: string = String(
          body?.text?.message ?? body?.message ?? body?.body ?? body?.content ?? body?.text ?? ""
        ).trim();
        const inboundPhone: string = String(body?.phone ?? body?.from ?? body?.author ?? "");
        const looksInbound =
          body?.fromMe !== true &&
          body?.isGroup !== true &&
          Boolean(inboundText) &&
          Boolean(inboundPhone) &&
          // don't confuse a status-only callback (which has no text) with a message
          !/READ|DELIVER|SENT|SEND|FAIL|ERROR|MessageStatus/i.test(String(body?.status ?? body?.type ?? ""));

        if (looksInbound) {
          try {
            const { handleIncomingWhatsApp } = await import("@/lib/enquete-whatsapp.server");
            const r = await handleIncomingWhatsApp({
              phone: inboundPhone,
              text: inboundText,
              senderName: body?.senderName ?? body?.chatName ?? body?.pushName ?? null,
            });
            return logAndReturn(`inbound:${r.note ?? (r.handled ? "handled" : "skipped")}`, { conversational: true, ...r });
          } catch (e: any) {
            return logAndReturn("inbound_error", { error: e?.message ?? String(e) });
          }
        }

        // ---- 2) Status callback → update whatsapp_envios
        const phone = String(body.phone ?? body.from ?? "").replace(/\D/g, "");
        const rawStatus = String(body.status ?? body.type ?? "").toUpperCase();
        if (!phone) {
          logRow.erro = JSON.stringify({
            keys: Object.keys(body ?? {}),
            hasText: Boolean(inboundText),
            inboundPhone,
            fromMe: body?.fromMe,
            isGroup: body?.isGroup,
          }).slice(0, 500);
          return logAndReturn("ignored_no_phone");
        }

        const now = new Date().toISOString();
        const patch: {
          status?: string;
          lido_em?: string;
          enviado_em?: string;
          erro?: string;
        } = {};
        if (/READ/.test(rawStatus)) {
          patch.status = "lido";
          patch.lido_em = now;
        } else if (/DELIVER/.test(rawStatus)) {
          patch.status = "entregue";
          patch.enviado_em = now;
        } else if (/SENT|SEND/.test(rawStatus)) {
          patch.status = "enviado";
          patch.enviado_em = now;
        } else if (/FAIL|ERROR/.test(rawStatus)) {
          patch.status = "erro";
          patch.erro = body.error ?? rawStatus;
        } else {
          return logAndReturn(`ignored:${rawStatus || "unknown"}`);
        }

        // Atualiza o envio mais recente pendente/enviando para este telefone
        const { data: rows } = await supabaseAdmin
          .from("whatsapp_envios")
          .select("id")
          .like("telefone", `%${phone.slice(-10)}%`)
          .in("status", ["pendente", "enviando", "enviado", "entregue"])
          .order("created_at", { ascending: false })
          .limit(1);
        const id = rows?.[0]?.id;
        if (!id) return logAndReturn("status_orphan", { phone });

        const { error } = await supabaseAdmin
          .from("whatsapp_envios")
          .update(patch)
          .eq("id", id);
        if (error) return logAndReturn("status_update_error", { error: error.message });
        return logAndReturn(`status:${patch.status}`, { id });
      },
      GET: async () => Response.json({ ok: true, hint: "POST events from Z-API here" }),
    },
  },
});