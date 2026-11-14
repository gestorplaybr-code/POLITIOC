DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_resposta_link_before_insert'
  ) THEN
    CREATE TRIGGER trg_resposta_link_before_insert
      BEFORE INSERT ON public.respostas
      FOR EACH ROW
      EXECUTE FUNCTION public.trg_resposta_link_fn();
  END IF;
END $$;