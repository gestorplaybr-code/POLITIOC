
ALTER TABLE public.enquetes
  ADD COLUMN IF NOT EXISTS coordenador_id uuid REFERENCES public.coordenadores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS token_convite text UNIQUE;

ALTER TABLE public.enquete_sessoes_whatsapp
  ADD COLUMN IF NOT EXISTS coordenador_id uuid REFERENCES public.coordenadores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS historico jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.respostas
  ADD COLUMN IF NOT EXISTS coordenador_id uuid REFERENCES public.coordenadores(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.gen_enquete_token()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE novo TEXT;
BEGIN
  IF NEW.token_convite IS NULL OR NEW.token_convite = '' THEN
    LOOP
      novo := lower(substr(md5(random()::text || clock_timestamp()::text), 1, 10));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.enquetes WHERE token_convite = novo);
    END LOOP;
    NEW.token_convite := novo;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gen_enquete_token ON public.enquetes;
CREATE TRIGGER trg_gen_enquete_token
BEFORE INSERT ON public.enquetes
FOR EACH ROW EXECUTE FUNCTION public.gen_enquete_token();

UPDATE public.enquetes SET token_convite = lower(substr(md5(id::text || random()::text), 1, 10))
WHERE token_convite IS NULL;

DROP POLICY IF EXISTS "public read enquete by token" ON public.enquetes;
CREATE POLICY "public read enquete by token"
ON public.enquetes FOR SELECT
TO anon, authenticated
USING (token_convite IS NOT NULL);

DROP POLICY IF EXISTS "coordenador vê enquetes atribuídas" ON public.enquetes;
CREATE POLICY "coordenador vê enquetes atribuídas"
ON public.enquetes FOR SELECT
TO authenticated
USING (coordenador_id = public.current_coordenador_id());

GRANT SELECT ON public.enquetes TO anon;
