ALTER TABLE public.respostas ADD COLUMN IF NOT EXISTS consentimento_lgpd boolean NOT NULL DEFAULT false;
ALTER TABLE public.respostas ADD COLUMN IF NOT EXISTS dispositivo text;
ALTER TABLE public.respostas ADD COLUMN IF NOT EXISTS ip text;