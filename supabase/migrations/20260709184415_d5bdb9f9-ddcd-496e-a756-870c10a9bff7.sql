
-- RG column on eleitores
ALTER TABLE public.eleitores ADD COLUMN IF NOT EXISTS rg text;

-- Token for coordinator public capture
ALTER TABLE public.coordenadores ADD COLUMN IF NOT EXISTS token_captacao text UNIQUE;

CREATE OR REPLACE FUNCTION public.gen_coordenador_token()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE novo text;
BEGIN
  IF NEW.token_captacao IS NULL OR NEW.token_captacao = '' THEN
    LOOP
      novo := lower(substr(md5(random()::text || clock_timestamp()::text), 1, 10));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.coordenadores WHERE token_captacao = novo);
    END LOOP;
    NEW.token_captacao := novo;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_gen_coordenador_token ON public.coordenadores;
CREATE TRIGGER trg_gen_coordenador_token BEFORE INSERT OR UPDATE ON public.coordenadores
  FOR EACH ROW EXECUTE FUNCTION public.gen_coordenador_token();

-- Backfill
UPDATE public.coordenadores SET token_captacao = lower(substr(md5(random()::text || id::text || clock_timestamp()::text),1,10))
WHERE token_captacao IS NULL;

-- Public read function: coordenador + politico name by token
CREATE OR REPLACE FUNCTION public.get_captacao_info(p_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb;
BEGIN
  SELECT jsonb_build_object(
    'coordenador_nome', c.nome,
    'politico_nome', p.nome,
    'ativo', COALESCE(c.ativo, true)
  ) INTO v
  FROM public.coordenadores c
  LEFT JOIN public.politicos p ON p.id = c.politico_id
  WHERE c.token_captacao = p_token
  LIMIT 1;
  IF v IS NULL THEN
    RAISE EXCEPTION 'Link inválido ou expirado.' USING ERRCODE='P0002';
  END IF;
  RETURN v;
END $$;

GRANT EXECUTE ON FUNCTION public.get_captacao_info(text) TO anon, authenticated;

-- Submit function
CREATE OR REPLACE FUNCTION public.submit_captacao_publica(p_token text, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_coord uuid; v_pol uuid;
  v_nome text; v_tel text; v_tel_norm text;
  v_cpf text; v_rg text; v_dn date;
  v_cidade text; v_uf text; v_zona text; v_secao text;
  v_existing uuid;
BEGIN
  IF NOT COALESCE((p_payload->>'consentimento')::boolean, false) THEN
    RAISE EXCEPTION 'Você precisa aceitar a Política de Privacidade (LGPD).' USING ERRCODE='P0001';
  END IF;

  SELECT id, politico_id INTO v_coord, v_pol FROM public.coordenadores WHERE token_captacao = p_token LIMIT 1;
  IF v_coord IS NULL THEN
    RAISE EXCEPTION 'Link inválido.' USING ERRCODE='P0002';
  END IF;

  v_nome := NULLIF(btrim(COALESCE(p_payload->>'nome','')),'');
  v_tel := NULLIF(btrim(COALESCE(p_payload->>'telefone','')),'');
  v_cpf := NULLIF(regexp_replace(COALESCE(p_payload->>'cpf',''), '\D','','g'),'');
  v_rg := NULLIF(btrim(COALESCE(p_payload->>'rg','')),'');
  v_cidade := NULLIF(btrim(COALESCE(p_payload->>'cidade','')),'');
  v_uf := NULLIF(upper(btrim(COALESCE(p_payload->>'uf',''))),'');
  v_zona := NULLIF(btrim(COALESCE(p_payload->>'zona','')),'');
  v_secao := NULLIF(btrim(COALESCE(p_payload->>'secao','')),'');
  BEGIN v_dn := NULLIF(p_payload->>'data_nascimento','')::date; EXCEPTION WHEN OTHERS THEN v_dn := NULL; END;

  IF v_nome IS NULL OR length(v_nome) < 2 THEN
    RAISE EXCEPTION 'Informe seu nome completo.' USING ERRCODE='P0001';
  END IF;
  IF v_tel IS NULL THEN
    RAISE EXCEPTION 'Informe seu WhatsApp.' USING ERRCODE='P0001';
  END IF;
  v_tel_norm := regexp_replace(v_tel, '\D','','g');
  IF length(v_tel_norm) < 10 OR length(v_tel_norm) > 11 THEN
    RAISE EXCEPTION 'WhatsApp inválido.' USING ERRCODE='P0001';
  END IF;
  IF v_cpf IS NULL AND v_rg IS NULL THEN
    RAISE EXCEPTION 'Informe CPF ou RG.' USING ERRCODE='P0001';
  END IF;
  IF v_cpf IS NOT NULL AND length(v_cpf) <> 11 THEN
    RAISE EXCEPTION 'CPF inválido.' USING ERRCODE='P0001';
  END IF;
  IF v_cidade IS NULL THEN
    RAISE EXCEPTION 'Informe a cidade.' USING ERRCODE='P0001';
  END IF;

  -- Dedup by telefone within político
  SELECT id INTO v_existing FROM public.eleitores
   WHERE politico_id = v_pol
     AND regexp_replace(COALESCE(telefone,''),'\D','','g') = v_tel_norm
   LIMIT 1;

  IF v_existing IS NOT NULL THEN
    UPDATE public.eleitores SET
      nome = COALESCE(NULLIF(nome,''), v_nome),
      coordenador_id = COALESCE(coordenador_id, v_coord),
      cpf = COALESCE(cpf, v_cpf),
      rg = COALESCE(rg, v_rg),
      data_nascimento = COALESCE(data_nascimento, v_dn),
      cidade = COALESCE(cidade, v_cidade),
      uf = COALESCE(uf, v_uf),
      zona = COALESCE(zona, v_zona),
      secao = COALESCE(secao, v_secao),
      updated_at = now()
    WHERE id = v_existing;
    RETURN jsonb_build_object('ok', true, 'id', v_existing, 'updated', true);
  END IF;

  INSERT INTO public.eleitores (
    politico_id, coordenador_id, nome, telefone, cpf, rg, data_nascimento,
    cidade, uf, zona, secao, origem, status
  ) VALUES (
    v_pol, v_coord, v_nome, v_tel, v_cpf, v_rg, v_dn,
    v_cidade, v_uf, v_zona, v_secao, 'qr_coordenador', 'ativo'
  ) RETURNING id INTO v_existing;

  RETURN jsonb_build_object('ok', true, 'id', v_existing, 'updated', false);
END $$;

GRANT EXECUTE ON FUNCTION public.submit_captacao_publica(text, jsonb) TO anon, authenticated;
