-- Phase enhancements: new columns for richer features

-- Respostas: arquivamento lógico
ALTER TABLE public.respostas ADD COLUMN IF NOT EXISTS arquivada boolean NOT NULL DEFAULT false;

-- Enquete perguntas: permitir "Outro"
ALTER TABLE public.enquete_perguntas ADD COLUMN IF NOT EXISTS permitir_outro boolean NOT NULL DEFAULT false;

-- Profiles: aceite LGPD
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS aceite_lgpd_em timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telefone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS foto_url text;

-- WhatsApp envios: fila
ALTER TABLE public.whatsapp_envios ADD COLUMN IF NOT EXISTS tentativas integer NOT NULL DEFAULT 0;
ALTER TABLE public.whatsapp_envios ADD COLUMN IF NOT EXISTS agendado_para timestamptz;

-- Resposta itens: campo "outro" livre
ALTER TABLE public.resposta_itens ADD COLUMN IF NOT EXISTS texto_outro text;

-- Enquete: campos de configuração já existem (exigir_cpf etc.) — confirmar via migration idempotente
ALTER TABLE public.enquetes ADD COLUMN IF NOT EXISTS mensagem_inicial text;
ALTER TABLE public.enquetes ADD COLUMN IF NOT EXISTS mensagem_final text;
ALTER TABLE public.enquetes ADD COLUMN IF NOT EXISTS exigir_cpf boolean NOT NULL DEFAULT false;
ALTER TABLE public.enquetes ADD COLUMN IF NOT EXISTS exigir_whatsapp boolean NOT NULL DEFAULT false;
ALTER TABLE public.enquetes ADD COLUMN IF NOT EXISTS exigir_localizacao boolean NOT NULL DEFAULT false;
ALTER TABLE public.enquetes ADD COLUMN IF NOT EXISTS permitir_anonimo boolean NOT NULL DEFAULT true;
ALTER TABLE public.enquetes ADD COLUMN IF NOT EXISTS data_inicio timestamptz;
ALTER TABLE public.enquetes ADD COLUMN IF NOT EXISTS data_fim timestamptz;

-- Resposta itens: dado livre (numero, data, etc.)
ALTER TABLE public.resposta_itens ADD COLUMN IF NOT EXISTS numero numeric;

-- Plataforma config (singleton)
CREATE TABLE IF NOT EXISTS public.plataforma_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  nome text NOT NULL DEFAULT 'Política+',
  termo_privacidade text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plataforma_config TO anon, authenticated;
GRANT ALL ON public.plataforma_config TO service_role;
ALTER TABLE public.plataforma_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Plataforma config select all" ON public.plataforma_config;
CREATE POLICY "Plataforma config select all" ON public.plataforma_config FOR SELECT USING (true);
DROP POLICY IF EXISTS "Plataforma config admin write" ON public.plataforma_config;
CREATE POLICY "Plataforma config admin write" ON public.plataforma_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.plataforma_config (id) VALUES (true) ON CONFLICT DO NOTHING;