
ALTER TABLE public.eleitores
  ADD COLUMN IF NOT EXISTS zona text,
  ADD COLUMN IF NOT EXISTS secao text,
  ADD COLUMN IF NOT EXISTS titulo_eleitor text;

ALTER TABLE public.respostas
  ADD COLUMN IF NOT EXISTS candidato_id uuid REFERENCES public.politicos(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_resp_candidato ON public.respostas(candidato_id);
CREATE INDEX IF NOT EXISTS idx_resp_coord ON public.respostas(coordenador_id);
CREATE INDEX IF NOT EXISTS idx_resp_eleitor ON public.respostas(eleitor_id);

CREATE OR REPLACE FUNCTION public.trg_resposta_link_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_politico_id uuid;
  v_coord_id uuid;
  v_tel_norm text;
  v_eleitor_id uuid;
BEGIN
  SELECT e.politico_id, COALESCE(NEW.coordenador_id, e.coordenador_id)
    INTO v_politico_id, v_coord_id
    FROM public.enquetes e
   WHERE e.id = NEW.enquete_id;

  IF NEW.candidato_id IS NULL THEN NEW.candidato_id := v_politico_id; END IF;
  IF NEW.coordenador_id IS NULL THEN NEW.coordenador_id := v_coord_id; END IF;

  IF NEW.eleitor_id IS NULL AND NEW.telefone IS NOT NULL AND btrim(NEW.telefone) <> '' THEN
    v_tel_norm := regexp_replace(NEW.telefone, '\D', '', 'g');
    IF length(v_tel_norm) >= 10 THEN
      SELECT id INTO v_eleitor_id
        FROM public.eleitores
       WHERE politico_id = v_politico_id
         AND regexp_replace(COALESCE(telefone,''), '\D','','g') = v_tel_norm
       LIMIT 1;

      IF v_eleitor_id IS NULL AND v_politico_id IS NOT NULL THEN
        INSERT INTO public.eleitores (politico_id, coordenador_id, nome, telefone, origem, status)
        VALUES (v_politico_id, v_coord_id,
                COALESCE(NULLIF(btrim(NEW.nome),''), 'Eleitor ' || right(v_tel_norm, 4)),
                NEW.telefone, 'enquete', 'ativo')
        RETURNING id INTO v_eleitor_id;
      END IF;

      NEW.eleitor_id := v_eleitor_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_resposta_link ON public.respostas;
CREATE TRIGGER trg_resposta_link
  BEFORE INSERT ON public.respostas
  FOR EACH ROW EXECUTE FUNCTION public.trg_resposta_link_fn();

UPDATE public.respostas r
   SET candidato_id = e.politico_id
  FROM public.enquetes e
 WHERE r.enquete_id = e.id AND r.candidato_id IS NULL;

ALTER TABLE public.whatsapp_campanhas
  ADD COLUMN IF NOT EXISTS tipo_midia text NOT NULL DEFAULT 'texto',
  ADD COLUMN IF NOT EXISTS midia_url text,
  ADD COLUMN IF NOT EXISTS midia_nome text,
  ADD COLUMN IF NOT EXISTS midia_legenda text;

DROP POLICY IF EXISTS "wmidia_read_auth" ON storage.objects;
CREATE POLICY "wmidia_read_auth" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'whatsapp-midia');

DROP POLICY IF EXISTS "wmidia_write_auth" ON storage.objects;
CREATE POLICY "wmidia_write_auth" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'whatsapp-midia');

DROP POLICY IF EXISTS "wmidia_delete_auth" ON storage.objects;
CREATE POLICY "wmidia_delete_auth" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'whatsapp-midia');
