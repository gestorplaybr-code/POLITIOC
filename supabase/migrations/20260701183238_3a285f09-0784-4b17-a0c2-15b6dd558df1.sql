CREATE OR REPLACE FUNCTION public.enforce_enquete_coordenador_mesmo_politico()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE v_coord_pol uuid;
BEGIN
  IF NEW.coordenador_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT politico_id INTO v_coord_pol FROM public.coordenadores WHERE id = NEW.coordenador_id;
  IF v_coord_pol IS NULL OR v_coord_pol <> NEW.politico_id THEN
    RAISE EXCEPTION 'O coordenador escolhido não pertence ao político desta enquete.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enquete_coordenador_mesmo_politico ON public.enquetes;
CREATE TRIGGER trg_enquete_coordenador_mesmo_politico
BEFORE INSERT OR UPDATE OF coordenador_id, politico_id ON public.enquetes
FOR EACH ROW EXECUTE FUNCTION public.enforce_enquete_coordenador_mesmo_politico();