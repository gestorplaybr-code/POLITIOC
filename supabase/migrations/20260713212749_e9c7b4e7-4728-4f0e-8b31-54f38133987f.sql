
-- 1) Fechar vazamento cross-tenant em enquetes
DROP POLICY IF EXISTS enq_auth_active_read ON public.enquetes;
DROP POLICY IF EXISTS perg_auth_active_read ON public.enquete_perguntas;
DROP POLICY IF EXISTS opc_auth_active_read ON public.enquete_opcoes;

-- 2) Coordenadores: separar leitura (todos do escopo) de escrita (só gestor)
DROP POLICY IF EXISTS coord_politico_scope ON public.coordenadores;
CREATE POLICY coord_politico_read ON public.coordenadores
  FOR SELECT TO authenticated
  USING (politico_id = public.current_politico_id());
CREATE POLICY coord_gestor_write ON public.coordenadores
  FOR ALL TO authenticated
  USING (politico_id = public.current_politico_id() AND public.has_role(auth.uid(), 'gestor'))
  WITH CHECK (politico_id = public.current_politico_id() AND public.has_role(auth.uid(), 'gestor'));
-- Coordenador lê o próprio registro (para current_coordenador_id())
CREATE POLICY coord_self_read ON public.coordenadores
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 3) Bairros
DROP POLICY IF EXISTS bairros_politico_scope ON public.bairros;
CREATE POLICY bairros_politico_read ON public.bairros
  FOR SELECT TO authenticated
  USING (politico_id = public.current_politico_id());
CREATE POLICY bairros_gestor_write ON public.bairros
  FOR ALL TO authenticated
  USING (politico_id = public.current_politico_id() AND public.has_role(auth.uid(), 'gestor'))
  WITH CHECK (politico_id = public.current_politico_id() AND public.has_role(auth.uid(), 'gestor'));

-- 4) Enquetes
DROP POLICY IF EXISTS enq_politico_scope ON public.enquetes;
CREATE POLICY enq_politico_read ON public.enquetes
  FOR SELECT TO authenticated
  USING (politico_id = public.current_politico_id());
CREATE POLICY enq_gestor_write ON public.enquetes
  FOR ALL TO authenticated
  USING (politico_id = public.current_politico_id() AND public.has_role(auth.uid(), 'gestor'))
  WITH CHECK (politico_id = public.current_politico_id() AND public.has_role(auth.uid(), 'gestor'));

-- 5) Perguntas / Opções (escrita só via gestor do político dono da enquete)
DROP POLICY IF EXISTS perg_politico_scope ON public.enquete_perguntas;
CREATE POLICY perg_politico_read ON public.enquete_perguntas
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.enquetes e WHERE e.id = enquete_perguntas.enquete_id AND e.politico_id = public.current_politico_id()));
CREATE POLICY perg_gestor_write ON public.enquete_perguntas
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'gestor') AND EXISTS (SELECT 1 FROM public.enquetes e WHERE e.id = enquete_perguntas.enquete_id AND e.politico_id = public.current_politico_id()))
  WITH CHECK (public.has_role(auth.uid(),'gestor') AND EXISTS (SELECT 1 FROM public.enquetes e WHERE e.id = enquete_perguntas.enquete_id AND e.politico_id = public.current_politico_id()));

DROP POLICY IF EXISTS opc_politico_scope ON public.enquete_opcoes;
CREATE POLICY opc_politico_read ON public.enquete_opcoes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.enquete_perguntas p JOIN public.enquetes e ON e.id = p.enquete_id
                 WHERE p.id = enquete_opcoes.pergunta_id AND e.politico_id = public.current_politico_id()));
CREATE POLICY opc_gestor_write ON public.enquete_opcoes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'gestor') AND EXISTS (SELECT 1 FROM public.enquete_perguntas p JOIN public.enquetes e ON e.id = p.enquete_id
         WHERE p.id = enquete_opcoes.pergunta_id AND e.politico_id = public.current_politico_id()))
  WITH CHECK (public.has_role(auth.uid(),'gestor') AND EXISTS (SELECT 1 FROM public.enquete_perguntas p JOIN public.enquetes e ON e.id = p.enquete_id
         WHERE p.id = enquete_opcoes.pergunta_id AND e.politico_id = public.current_politico_id()));

-- 6) Eleitores: escrita só admin ou gestor do político; coordenador continua nos seus (via RESTRICTIVE elei_coord_scope)
DROP POLICY IF EXISTS elei_politico_scope ON public.eleitores;
CREATE POLICY elei_politico_read ON public.eleitores
  FOR SELECT TO authenticated
  USING (politico_id = public.current_politico_id());
CREATE POLICY elei_gestor_write ON public.eleitores
  FOR ALL TO authenticated
  USING (politico_id = public.current_politico_id() AND public.has_role(auth.uid(), 'gestor'))
  WITH CHECK (politico_id = public.current_politico_id() AND public.has_role(auth.uid(), 'gestor'));
-- Coordenador escreve nos próprios eleitores
CREATE POLICY elei_coord_write ON public.eleitores
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'coordenador') AND coordenador_id = public.current_coordenador_id())
  WITH CHECK (public.has_role(auth.uid(),'coordenador') AND coordenador_id = public.current_coordenador_id());

-- 7) WhatsApp: campanhas / templates / envios / config
DROP POLICY IF EXISTS wcamp_gestor ON public.whatsapp_campanhas;
CREATE POLICY wcamp_read ON public.whatsapp_campanhas
  FOR SELECT TO authenticated
  USING (politico_id = public.current_politico_id());
CREATE POLICY wcamp_write ON public.whatsapp_campanhas
  FOR ALL TO authenticated
  USING (politico_id = public.current_politico_id() AND public.has_role(auth.uid(),'gestor'))
  WITH CHECK (politico_id = public.current_politico_id() AND public.has_role(auth.uid(),'gestor'));

DROP POLICY IF EXISTS wtpl_gestor ON public.whatsapp_templates;
CREATE POLICY wtpl_read ON public.whatsapp_templates
  FOR SELECT TO authenticated
  USING (politico_id = public.current_politico_id());
CREATE POLICY wtpl_write ON public.whatsapp_templates
  FOR ALL TO authenticated
  USING (politico_id = public.current_politico_id() AND public.has_role(auth.uid(),'gestor'))
  WITH CHECK (politico_id = public.current_politico_id() AND public.has_role(auth.uid(),'gestor'));

DROP POLICY IF EXISTS wenv_gestor ON public.whatsapp_envios;
CREATE POLICY wenv_read ON public.whatsapp_envios
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.whatsapp_campanhas c WHERE c.id = whatsapp_envios.campanha_id AND c.politico_id = public.current_politico_id()));
CREATE POLICY wenv_write ON public.whatsapp_envios
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'gestor') AND EXISTS (SELECT 1 FROM public.whatsapp_campanhas c WHERE c.id = whatsapp_envios.campanha_id AND c.politico_id = public.current_politico_id()))
  WITH CHECK (public.has_role(auth.uid(),'gestor') AND EXISTS (SELECT 1 FROM public.whatsapp_campanhas c WHERE c.id = whatsapp_envios.campanha_id AND c.politico_id = public.current_politico_id()));

DROP POLICY IF EXISTS wcfg_gestor_select ON public.whatsapp_config;
CREATE POLICY wcfg_read ON public.whatsapp_config
  FOR SELECT TO authenticated
  USING (politico_id = public.current_politico_id());
CREATE POLICY wcfg_write ON public.whatsapp_config
  FOR ALL TO authenticated
  USING (politico_id = public.current_politico_id() AND public.has_role(auth.uid(),'gestor'))
  WITH CHECK (politico_id = public.current_politico_id() AND public.has_role(auth.uid(),'gestor'));

-- 8) Candidatos / Pleitos: dar escrita para gestor do político
CREATE POLICY candidatos_gestor_write ON public.candidatos
  FOR ALL TO authenticated
  USING (politico_id = public.current_politico_id() AND public.has_role(auth.uid(),'gestor'))
  WITH CHECK (politico_id = public.current_politico_id() AND public.has_role(auth.uid(),'gestor'));

CREATE POLICY pleitos_gestor_write ON public.pleitos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'gestor') AND EXISTS (SELECT 1 FROM public.pleito_politicos pp WHERE pp.pleito_id = pleitos.id AND pp.politico_id = public.current_politico_id()))
  WITH CHECK (public.has_role(auth.uid(),'gestor'));

CREATE POLICY pleito_pol_gestor_write ON public.pleito_politicos
  FOR ALL TO authenticated
  USING (politico_id = public.current_politico_id() AND public.has_role(auth.uid(),'gestor'))
  WITH CHECK (politico_id = public.current_politico_id() AND public.has_role(auth.uid(),'gestor'));

-- 9) Plataforma config: só admin escreve
DROP POLICY IF EXISTS plataforma_config_gestor_all ON public.plataforma_config;

-- 10) Ajustar candidato_coordenadores (se existir política ampla, garantir escopo gestor)
-- (Mantido: já validado via trigger validate_candidato_coordenador; leitura escopada por RLS existentes.)
