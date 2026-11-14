
-- whatsapp_config
CREATE TABLE public.whatsapp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politico_id UUID NOT NULL REFERENCES public.politicos(id) ON DELETE CASCADE UNIQUE,
  instance_id TEXT,
  token TEXT,
  telefone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_config TO authenticated;
GRANT ALL ON public.whatsapp_config TO service_role;
ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY wcfg_admin ON public.whatsapp_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY wcfg_gestor_select ON public.whatsapp_config FOR SELECT TO authenticated
  USING (politico_id = public.current_politico_id());

CREATE TRIGGER wcfg_updated BEFORE UPDATE ON public.whatsapp_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- whatsapp_templates
CREATE TABLE public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politico_id UUID NOT NULL REFERENCES public.politicos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  descricao TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_templates TO authenticated;
GRANT ALL ON public.whatsapp_templates TO service_role;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY wtpl_admin ON public.whatsapp_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY wtpl_gestor ON public.whatsapp_templates FOR ALL TO authenticated
  USING (politico_id = public.current_politico_id())
  WITH CHECK (politico_id = public.current_politico_id());

CREATE TRIGGER wtpl_updated BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- whatsapp_campanhas
CREATE TABLE public.whatsapp_campanhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politico_id UUID NOT NULL REFERENCES public.politicos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  template_id UUID REFERENCES public.whatsapp_templates(id) ON DELETE SET NULL,
  mensagem TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'rascunho',
  filtro_bairro TEXT,
  filtro_cidade TEXT,
  total_alvo INT NOT NULL DEFAULT 0,
  total_enviado INT NOT NULL DEFAULT 0,
  total_falha INT NOT NULL DEFAULT 0,
  agendada_para TIMESTAMPTZ,
  iniciada_em TIMESTAMPTZ,
  concluida_em TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_campanhas TO authenticated;
GRANT ALL ON public.whatsapp_campanhas TO service_role;
ALTER TABLE public.whatsapp_campanhas ENABLE ROW LEVEL SECURITY;

CREATE POLICY wcamp_admin ON public.whatsapp_campanhas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY wcamp_gestor ON public.whatsapp_campanhas FOR ALL TO authenticated
  USING (politico_id = public.current_politico_id())
  WITH CHECK (politico_id = public.current_politico_id());

CREATE TRIGGER wcamp_updated BEFORE UPDATE ON public.whatsapp_campanhas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- whatsapp_envios
CREATE TABLE public.whatsapp_envios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id UUID NOT NULL REFERENCES public.whatsapp_campanhas(id) ON DELETE CASCADE,
  eleitor_id UUID REFERENCES public.eleitores(id) ON DELETE SET NULL,
  telefone TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  erro TEXT,
  enviado_em TIMESTAMPTZ,
  lido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_envios TO authenticated;
GRANT ALL ON public.whatsapp_envios TO service_role;
ALTER TABLE public.whatsapp_envios ENABLE ROW LEVEL SECURITY;

CREATE INDEX wenv_camp_idx ON public.whatsapp_envios (campanha_id);
CREATE INDEX wenv_status_idx ON public.whatsapp_envios (status);

CREATE POLICY wenv_admin ON public.whatsapp_envios FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY wenv_gestor ON public.whatsapp_envios FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.whatsapp_campanhas c
    WHERE c.id = campanha_id AND c.politico_id = public.current_politico_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.whatsapp_campanhas c
    WHERE c.id = campanha_id AND c.politico_id = public.current_politico_id()
  ));
