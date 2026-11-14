
CREATE OR REPLACE FUNCTION public.log_auditoria()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_id UUID;
  v_acao TEXT;
BEGIN
  IF v_user IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_acao := 'criou';
    v_id := NEW.id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_acao := 'editou';
    v_id := NEW.id;
  ELSE
    v_acao := 'excluiu';
    v_id := OLD.id;
  END IF;

  INSERT INTO public.auditoria (usuario_id, acao, entidade, entidade_id, descricao)
  VALUES (v_user, v_acao, TG_TABLE_NAME, v_id, TG_OP);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['politicos','candidatos','pleitos','eleitores','coordenadores','enquetes','user_roles']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%I ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_auditoria()',
      t, t
    );
  END LOOP;
END $$;
