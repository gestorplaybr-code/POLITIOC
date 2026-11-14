
ALTER TABLE public.enquetes DROP CONSTRAINT IF EXISTS enquetes_modo_entrega_check;
UPDATE public.enquetes SET modo_entrega = 'whatsapp_ia' WHERE modo_entrega IS DISTINCT FROM 'whatsapp_ia';
ALTER TABLE public.enquetes ALTER COLUMN modo_entrega SET DEFAULT 'whatsapp_ia';
ALTER TABLE public.enquetes
  ADD CONSTRAINT enquetes_modo_entrega_check CHECK (modo_entrega IN ('whatsapp_ia','whatsapp','formulario','ambos'));
