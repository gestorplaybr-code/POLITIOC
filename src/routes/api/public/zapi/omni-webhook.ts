
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";

const WEBHOOK_SECRET = process.env.ZAPI_OMNI_WEBHOOK_SECRET;

function verifySignature(raw: string, signature: string | null) {
  if (!WEBHOOK_SECRET || !signature) return false;

  // Hipótese: HMAC-SHA256 hexadecimal do corpo bruto.
  // Confirmar o formato exato na documentação da Z-API Omni.
  const received = signature.replace(/^sha256=/i, "").trim();

  if (!/^[a-f0-9]{64}$/i.test(received)) return false;

  const expected = createHmac("sha256", WEBHOOK_SECRET)
    .update(raw, "utf8")
    .digest();

  return timingSafeEqual(
    expected,
    Buffer.from(received, "hex")
  );
}

export const Route = createFileRoute(
  "/api/public/zapi/omni-webhook"
)({
  server: {
    handlers: {
      GET: async () => Response.json({
        ok: true,
        service: "POLITICA+ Z-API Omni",
        status: "online",
      }),

      POST: async ({ request }) => {
        const raw = await request.text();

        const signature = request.headers.get(
          "x-webhook-signature"
        );

        if (!WEBHOOK_SECRET) {
          console.error("Webhook secret não configurado");
          return Response.json(
            { ok: false, error: "Configuração incompleta" },
            { status: 503 }
          );
        }

        if (!verifySignature(raw, signature)) {
          return Response.json(
            { ok: false, error: "Assinatura inválida" },
            { status: 401 }
          );
        }

        let body: any;

        try {
          body = JSON.parse(raw);
        } catch {
          return Response.json(
            { ok: false, error: "JSON inválido" },
            { status: 400 }
          );
        }

        const message = body?.message;
        const contents = Array.isArray(message?.contents)
          ? message.contents
          : [];

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        const results: any[] = [];

        for (const item of contents) {
          const type = String(item?.type ?? "");
          const external = item?.external_information ?? {};
          const state = String(item?.state?.name ?? "");

          const fromMe =
            message?.metadata?.from_me === true ||
            external?.from_me === true;

          const isGroup =
            item?.is_group === true ||
            external?.is_group === true;

          const phone = String(
            message?.sender?.identifier ?? ""
          ).replace(/\D/g, "");

          const text =
            typeof item?.message === "string"
              ? item.message.trim()
              : "";

          const eventId = String(
            item?.identifier ?? message?._id ?? ""
          );

          let resultado = "ignored";
          let erro: string | null = null;

          try {
            if (
              type === "TEXT" &&
              external?.webhook_type === "ReceivedCallback" &&
              !fromMe &&
              !isGroup &&
              phone &&
              text
            ) {
              const { handleIncomingWhatsApp } = await import(
                "@/lib/enquete-whatsapp.server"
              );

              const result = await handleIncomingWhatsApp({
                phone,
                text,
                senderName:
                  message?.sender?.name ?? null,
              });

              resultado = result.handled
                ? "inbound:handled"
                : `inbound:${result.note ?? "skipped"}`;
            } else if (
              type === "MessageStatusCallback" ||
              state
            ) {
              resultado = `status:${state || "unknown"}`;
            } else {
              resultado = `ignored:${type || "unknown"}`;
            }
          } catch (error: any) {
            erro = error?.message ?? String(error);
            resultado = "processing_error";
          }

          const { error: logError } = await supabaseAdmin
            .from("zapi_webhook_log")
            .insert({
              tipo: type || null,
              phone: phone || null,
              from_me: fromMe,
              is_group: isGroup,
              payload: {
                event_id: eventId,
                message_id: message?._id,
                content: item,
              },
              resultado,
              erro,
            });

          if (logError) {
            console.error("Erro ao salvar log:", logError);
            return Response.json(
              { ok: false, error: "Falha ao registrar evento" },
              { status: 503 }
            );
          }

          results.push({ eventId, resultado });

          if (erro) {
            console.error("Erro no processamento:", erro);
            return Response.json(
              { ok: false, error: "Falha no processamento" },
              { status: 503 }
            );
          }
        }

        return Response.json({
          ok: true,
          processed: results.length,
          results,
        });
      },
    },
  },
});
