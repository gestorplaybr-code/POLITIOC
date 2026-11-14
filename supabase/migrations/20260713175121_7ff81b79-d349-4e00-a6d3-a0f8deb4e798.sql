
-- 1) Drop broad gestor_all policies
DROP POLICY IF EXISTS politicos_gestor_all ON public.politicos;
DROP POLICY IF EXISTS eleitores_gestor_all ON public.eleitores;
DROP POLICY IF EXISTS coordenadores_gestor_all ON public.coordenadores;
DROP POLICY IF EXISTS candidatos_gestor_all ON public.candidatos;
DROP POLICY IF EXISTS pleitos_gestor_all ON public.pleitos;
DROP POLICY IF EXISTS bairros_gestor_all ON public.bairros;
DROP POLICY IF EXISTS enquetes_gestor_all ON public.enquetes;
DROP POLICY IF EXISTS enquete_perguntas_gestor_all ON public.enquete_perguntas;
DROP POLICY IF EXISTS enquete_opcoes_gestor_all ON public.enquete_opcoes;
DROP POLICY IF EXISTS sess_gestor_all ON public.enquete_sessoes_whatsapp;
DROP POLICY IF EXISTS respostas_gestor_all ON public.respostas;
DROP POLICY IF EXISTS resposta_itens_gestor_all ON public.resposta_itens;
DROP POLICY IF EXISTS whatsapp_envios_gestor_all ON public.whatsapp_envios;
DROP POLICY IF EXISTS whatsapp_campanhas_gestor_all ON public.whatsapp_campanhas;
DROP POLICY IF EXISTS whatsapp_templates_gestor_all ON public.whatsapp_templates;
DROP POLICY IF EXISTS whatsapp_config_gestor_all ON public.whatsapp_config;
DROP POLICY IF EXISTS cand_coord_gestor_all ON public.candidato_coordenadores;
DROP POLICY IF EXISTS pleito_politicos_gestor_all ON public.pleito_politicos;

-- 2) politicos (id = current_politico_id)
DROP POLICY IF EXISTS politicos_restrict_non_admin ON public.politicos;
CREATE POLICY politicos_restrict_non_admin ON public.politicos
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR id = public.current_politico_id())
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR id = public.current_politico_id());

-- 3) Tables with direct politico_id
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'eleitores','coordenadores','candidatos','bairros','enquetes',
    'whatsapp_campanhas','whatsapp_templates','whatsapp_config'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_restrict_non_admin ON public.%I;', t, t);
    EXECUTE format($f$
      CREATE POLICY %I_restrict_non_admin ON public.%I
        AS RESTRICTIVE FOR ALL TO authenticated
        USING (public.has_role(auth.uid(), 'admin') OR politico_id = public.current_politico_id())
        WITH CHECK (public.has_role(auth.uid(), 'admin') OR politico_id = public.current_politico_id());
    $f$, t, t);
  END LOOP;
END $$;

-- 4) Child tables via enquete
DROP POLICY IF EXISTS enquete_perguntas_restrict_non_admin ON public.enquete_perguntas;
CREATE POLICY enquete_perguntas_restrict_non_admin ON public.enquete_perguntas
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.enquetes e WHERE e.id = enquete_perguntas.enquete_id AND e.politico_id = public.current_politico_id()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.enquetes e WHERE e.id = enquete_perguntas.enquete_id AND e.politico_id = public.current_politico_id()));

DROP POLICY IF EXISTS enquete_opcoes_restrict_non_admin ON public.enquete_opcoes;
CREATE POLICY enquete_opcoes_restrict_non_admin ON public.enquete_opcoes
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.enquete_perguntas p JOIN public.enquetes e ON e.id=p.enquete_id WHERE p.id = enquete_opcoes.pergunta_id AND e.politico_id = public.current_politico_id()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.enquete_perguntas p JOIN public.enquetes e ON e.id=p.enquete_id WHERE p.id = enquete_opcoes.pergunta_id AND e.politico_id = public.current_politico_id()));

DROP POLICY IF EXISTS sess_restrict_non_admin ON public.enquete_sessoes_whatsapp;
CREATE POLICY sess_restrict_non_admin ON public.enquete_sessoes_whatsapp
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.enquetes e WHERE e.id = enquete_sessoes_whatsapp.enquete_id AND e.politico_id = public.current_politico_id()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.enquetes e WHERE e.id = enquete_sessoes_whatsapp.enquete_id AND e.politico_id = public.current_politico_id()));

DROP POLICY IF EXISTS respostas_restrict_non_admin ON public.respostas;
CREATE POLICY respostas_restrict_non_admin ON public.respostas
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.enquetes e WHERE e.id = respostas.enquete_id AND e.politico_id = public.current_politico_id()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.enquetes e WHERE e.id = respostas.enquete_id AND e.politico_id = public.current_politico_id()));

DROP POLICY IF EXISTS resposta_itens_restrict_non_admin ON public.resposta_itens;
CREATE POLICY resposta_itens_restrict_non_admin ON public.resposta_itens
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.respostas r JOIN public.enquetes e ON e.id=r.enquete_id WHERE r.id = resposta_itens.resposta_id AND e.politico_id = public.current_politico_id()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.respostas r JOIN public.enquetes e ON e.id=r.enquete_id WHERE r.id = resposta_itens.resposta_id AND e.politico_id = public.current_politico_id()));

-- 5) whatsapp_envios via campanha
DROP POLICY IF EXISTS whatsapp_envios_restrict_non_admin ON public.whatsapp_envios;
CREATE POLICY whatsapp_envios_restrict_non_admin ON public.whatsapp_envios
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.whatsapp_campanhas c WHERE c.id = whatsapp_envios.campanha_id AND c.politico_id = public.current_politico_id()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.whatsapp_campanhas c WHERE c.id = whatsapp_envios.campanha_id AND c.politico_id = public.current_politico_id()));

-- 6) candidato_coordenadores via candidato
DROP POLICY IF EXISTS cand_coord_restrict_non_admin ON public.candidato_coordenadores;
CREATE POLICY cand_coord_restrict_non_admin ON public.candidato_coordenadores
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.candidatos c WHERE c.id = candidato_coordenadores.candidato_id AND c.politico_id = public.current_politico_id()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.candidatos c WHERE c.id = candidato_coordenadores.candidato_id AND c.politico_id = public.current_politico_id()));

-- 7) pleito_politicos direct politico_id
DROP POLICY IF EXISTS pleito_politicos_restrict_non_admin ON public.pleito_politicos;
CREATE POLICY pleito_politicos_restrict_non_admin ON public.pleito_politicos
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR politico_id = public.current_politico_id())
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR politico_id = public.current_politico_id());

-- 8) pleitos: só via junção (parceiro vê pleitos ligados ao seu político)
DROP POLICY IF EXISTS pleitos_restrict_non_admin ON public.pleitos;
CREATE POLICY pleitos_restrict_non_admin ON public.pleitos
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.pleito_politicos pp WHERE pp.pleito_id = pleitos.id AND pp.politico_id = public.current_politico_id()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
