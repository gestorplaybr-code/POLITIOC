
-- =========================================================
-- PART 1: SECURITY DEFINER function to submit survey answers
-- =========================================================
CREATE OR REPLACE FUNCTION public.submit_resposta_publica(
  p_slug TEXT,
  p_nome TEXT,
  p_telefone TEXT,
  p_email TEXT,
  p_cpf TEXT,
  p_consentimento BOOLEAN,
  p_dispositivo TEXT,
  p_origem TEXT,
  p_itens JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enq RECORD;
  v_resp_id UUID;
  v_now TIMESTAMPTZ := now();
  v_item JSONB;
BEGIN
  IF NOT COALESCE(p_consentimento, FALSE) THEN
    RAISE EXCEPTION 'Você precisa aceitar a política de privacidade.' USING ERRCODE='P0001';
  END IF;

  SELECT id, status, data_inicio, data_fim, permitir_anonimo, exigir_whatsapp, exigir_cpf
    INTO v_enq
    FROM public.enquetes
   WHERE slug = p_slug
   LIMIT 1;

  IF v_enq.id IS NULL THEN
    RAISE EXCEPTION 'Enquete não encontrada.' USING ERRCODE='P0002';
  END IF;
  IF v_enq.status <> 'ativa' THEN
    RAISE EXCEPTION 'Esta enquete não está ativa.' USING ERRCODE='P0003';
  END IF;
  IF v_enq.data_inicio IS NOT NULL AND v_enq.data_inicio > v_now THEN
    RAISE EXCEPTION 'Esta enquete ainda não começou.' USING ERRCODE='P0003';
  END IF;
  IF v_enq.data_fim IS NOT NULL AND v_enq.data_fim < v_now THEN
    RAISE EXCEPTION 'Esta enquete já encerrou.' USING ERRCODE='P0003';
  END IF;

  IF NOT COALESCE(v_enq.permitir_anonimo, TRUE) AND (p_nome IS NULL OR btrim(p_nome) = '') THEN
    RAISE EXCEPTION 'Informe seu nome.' USING ERRCODE='P0001';
  END IF;
  IF COALESCE(v_enq.exigir_whatsapp, FALSE) AND (p_telefone IS NULL OR btrim(p_telefone) = '') THEN
    RAISE EXCEPTION 'Informe seu WhatsApp.' USING ERRCODE='P0001';
  END IF;
  IF COALESCE(v_enq.exigir_cpf, FALSE) AND (p_cpf IS NULL OR length(regexp_replace(p_cpf, '\D','','g')) <> 11) THEN
    RAISE EXCEPTION 'CPF inválido.' USING ERRCODE='P0001';
  END IF;

  INSERT INTO public.respostas (
    enquete_id, nome, telefone, email, origem, consentimento_lgpd, dispositivo
  ) VALUES (
    v_enq.id,
    NULLIF(btrim(COALESCE(p_nome,'')),''),
    NULLIF(btrim(COALESCE(p_telefone,'')),''),
    NULLIF(btrim(COALESCE(p_email,'')),''),
    COALESCE(NULLIF(btrim(COALESCE(p_origem,'')),''),'link_publico'),
    TRUE,
    NULLIF(btrim(COALESCE(p_dispositivo,'')),'')
  ) RETURNING id INTO v_resp_id;

  IF p_itens IS NOT NULL AND jsonb_typeof(p_itens) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens) LOOP
      INSERT INTO public.resposta_itens (
        resposta_id, pergunta_id, opcao_id, texto, texto_outro, numero
      ) VALUES (
        v_resp_id,
        NULLIF(v_item->>'pergunta_id','')::UUID,
        NULLIF(v_item->>'opcao_id','')::UUID,
        NULLIF(v_item->>'texto',''),
        NULLIF(v_item->>'texto_outro',''),
        CASE WHEN v_item ? 'numero' AND v_item->>'numero' <> '' THEN (v_item->>'numero')::NUMERIC ELSE NULL END
      );
    END LOOP;
  END IF;

  RETURN jsonb_build_object('id', v_resp_id, 'enquete_id', v_enq.id);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_resposta_publica(TEXT,TEXT,TEXT,TEXT,TEXT,BOOLEAN,TEXT,TEXT,JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_resposta_publica(TEXT,TEXT,TEXT,TEXT,TEXT,BOOLEAN,TEXT,TEXT,JSONB) TO anon, authenticated, service_role;

-- =========================================================
-- PART 2: WhatsApp conversational flow
-- =========================================================

ALTER TABLE public.enquetes
  ADD COLUMN IF NOT EXISTS modo_entrega TEXT NOT NULL DEFAULT 'ambos'
    CHECK (modo_entrega IN ('formulario','whatsapp','ambos')),
  ADD COLUMN IF NOT EXISTS palavra_chave_whatsapp TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS enquetes_palavra_chave_unique
  ON public.enquetes (lower(palavra_chave_whatsapp))
  WHERE palavra_chave_whatsapp IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.enquete_sessoes_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquete_id UUID NOT NULL REFERENCES public.enquetes(id) ON DELETE CASCADE,
  telefone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento','concluida','abandonada','cancelada')),
  pergunta_atual_id UUID REFERENCES public.enquete_perguntas(id) ON DELETE SET NULL,
  passo INT NOT NULL DEFAULT 0,
  dados JSONB NOT NULL DEFAULT '{}'::jsonb,
  respostas JSONB NOT NULL DEFAULT '[]'::jsonb,
  resposta_id UUID REFERENCES public.respostas(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_msg_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS enquete_sessoes_whatsapp_tel_idx ON public.enquete_sessoes_whatsapp (telefone, status);
CREATE INDEX IF NOT EXISTS enquete_sessoes_whatsapp_enq_idx ON public.enquete_sessoes_whatsapp (enquete_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.enquete_sessoes_whatsapp TO authenticated;
GRANT ALL ON public.enquete_sessoes_whatsapp TO service_role;

ALTER TABLE public.enquete_sessoes_whatsapp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sess_admin_all" ON public.enquete_sessoes_whatsapp
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "sess_gestor_all" ON public.enquete_sessoes_whatsapp
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gestor'))
  WITH CHECK (public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "sess_politico_scope" ON public.enquete_sessoes_whatsapp
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.enquetes e WHERE e.id = enquete_sessoes_whatsapp.enquete_id AND e.politico_id = public.current_politico_id()));
