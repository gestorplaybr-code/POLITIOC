
CREATE OR REPLACE FUNCTION public.apply_enquete_template(_enquete_id uuid, _perguntas jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _politico uuid;
  _base int;
  _p jsonb;
  _new_pid uuid;
  _op jsonb;
  _op_ordem int;
BEGIN
  SELECT politico_id INTO _politico FROM public.enquetes WHERE id = _enquete_id;
  IF _politico IS NULL THEN
    RAISE EXCEPTION 'enquete_nao_encontrada';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gestor'::app_role)
    OR _politico = public.current_politico_id()
  ) THEN
    RAISE EXCEPTION 'sem_permissao';
  END IF;

  IF _perguntas IS NULL OR jsonb_typeof(_perguntas) <> 'array' THEN
    RAISE EXCEPTION 'perguntas_invalidas';
  END IF;

  SELECT COALESCE(MAX(ordem) + 1, 0) INTO _base
  FROM public.enquete_perguntas WHERE enquete_id = _enquete_id;

  FOR _p IN SELECT * FROM jsonb_array_elements(_perguntas)
  LOOP
    INSERT INTO public.enquete_perguntas (enquete_id, texto, tipo, ordem, obrigatoria, permitir_outro)
    VALUES (
      _enquete_id,
      COALESCE(_p->>'texto', ''),
      COALESCE(_p->>'tipo', 'unica'),
      _base,
      COALESCE((_p->>'obrigatoria')::boolean, false),
      COALESCE((_p->>'permitir_outro')::boolean, false)
    )
    RETURNING id INTO _new_pid;
    _base := _base + 1;

    IF (_p ? 'opcoes') AND jsonb_typeof(_p->'opcoes') = 'array' THEN
      _op_ordem := 0;
      FOR _op IN SELECT * FROM jsonb_array_elements(_p->'opcoes')
      LOOP
        INSERT INTO public.enquete_opcoes (pergunta_id, texto, ordem)
        VALUES (_new_pid, COALESCE(_op #>> '{}', ''), _op_ordem);
        _op_ordem := _op_ordem + 1;
      END LOOP;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_enquete_template(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_enquete_template(uuid, jsonb) TO authenticated;
