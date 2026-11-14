
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/api/public/zapi/omni-webhook"
)({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          ok: true,
          service: "POLITICA+ Z-API Omni",
          status: "online",
        });
      },

      POST: async ({ request }) => {
        // Ainda não processa eventos reais.
        // A validação HMAC será implementada
        // antes de ativar o recebimento.
        return Response.json(
          { ok: false, error: "Webhook nao configurado" },
          { status: 503 }
        );
      },
    },
  },
});

