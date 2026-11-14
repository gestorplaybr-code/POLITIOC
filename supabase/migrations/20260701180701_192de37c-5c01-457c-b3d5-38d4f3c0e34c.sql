CREATE OR REPLACE FUNCTION public.enforce_enquete_coordenador_ativa()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'ativa' AND NEW.coordenador_id IS NULL THEN
    RAISE EXCEPTION 'Escolha o coordenador responsável antes de ativar a enquete.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enquete_coordenador_ativa ON public.enquetes;
CREATE TRIGGER trg_enquete_coordenador_ativa
BEFORE INSERT OR UPDATE ON public.enquetes
FOR EACH ROW EXECUTE FUNCTION public.enforce_enquete_coordenador_ativa();