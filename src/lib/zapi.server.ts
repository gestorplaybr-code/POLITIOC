// Server-only Z-API helpers. NEVER import from client code.
// Sends WhatsApp messages via Z-API REST. Credentials live in env.
const INSTANCE = () => process.env.ZAPI_INSTANCE_ID;
const TOKEN = () => process.env.ZAPI_TOKEN;
const CLIENT_TOKEN = () => process.env.ZAPI_CLIENT_TOKEN;

function base() {
  const i = INSTANCE();
  const t = TOKEN();
  if (!i || !t) throw new Error("Z-API não configurada (faltam ZAPI_INSTANCE_ID/ZAPI_TOKEN).");
  return `https://api.z-api.io/instances/${i}/token/${t}`;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const c = CLIENT_TOKEN();
  if (c) h["Client-Token"] = c;
  return h;
}

export function normalizePhone(raw: string): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  if (digits.length === 10 || digits.length === 11) return "55" + digits;
  return digits;
}

export async function sendZapiText(phone: string, message: string): Promise<{ ok: boolean; status: number; data: any }> {
  const url = `${base()}/send-text`;
  const body = { phone: normalizePhone(phone), message };
  const res = await fetch(url, { method: "POST", headers: headers(), body: JSON.stringify(body) });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

async function postZapi(path: string, body: Record<string, any>): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await fetch(`${base()}/${path}`, { method: "POST", headers: headers(), body: JSON.stringify(body) });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

export function sendZapiImage(phone: string, imageUrl: string, caption?: string) {
  return postZapi("send-image", { phone: normalizePhone(phone), image: imageUrl, caption: caption ?? "" });
}
export function sendZapiVideo(phone: string, videoUrl: string, caption?: string) {
  return postZapi("send-video", { phone: normalizePhone(phone), video: videoUrl, caption: caption ?? "" });
}
export function sendZapiAudio(phone: string, audioUrl: string) {
  return postZapi("send-audio", { phone: normalizePhone(phone), audio: audioUrl });
}
export function sendZapiDocument(phone: string, docUrl: string, fileName: string, extension = "pdf") {
  return postZapi(`send-document/${extension}`, { phone: normalizePhone(phone), document: docUrl, fileName });
}

// -------- Webhook configuration --------
// The Z-API dashboard has per-instance webhook URLs. We set the inbound (message
// received) hook to our public endpoint so the AI actually triggers.
async function putZapi(path: string, body: Record<string, any>) {
  const res = await fetch(`${base()}/${path}`, { method: "PUT", headers: headers(), body: JSON.stringify(body) });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

async function getZapi(path: string) {
  const res = await fetch(`${base()}/${path}`, { headers: headers() });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

/** Configure all inbound webhooks to point at our public endpoint. */
export async function configureZapiWebhooks(webhookUrl: string) {
  const value = String(webhookUrl ?? "").trim();
  if (!value) throw new Error("URL do webhook obrigatória.");
  const body = { value, notifySentByMe: false };
  const received = await putZapi("update-webhook-received", body);
  const delivery = await putZapi("update-webhook-delivery", body);
  return { received, delivery };
}

export async function getZapiWebhookStatus() {
  const [received, delivery, device] = await Promise.all([
    getZapi("webhook-received"),
    getZapi("webhook-delivery"),
    getZapi("device"),
  ]);
  return {
    received: received.data,
    delivery: delivery.data,
    device: device.data,
    connected: Boolean(device.data?.connected ?? device.data?.deviceConnected),
  };
}