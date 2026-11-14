
-- ENQUETES
CREATE TABLE public.enquetes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politico_id UUID NOT NULL REFERENCES public.politicos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'rascunho', -- rascunho | ativa | encerrada
  permite_anonimo BOOLEAN NOT NULL DEFAULT true,
  data_inicio TIMESTAMPTZ,
  data_fim TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enquetes TO authenticated;
GRANT SELECT ON public.enquetes TO anon;
GRANT ALL ON public.enquetes TO service_role;
ALTER TABLE public.enquetes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enq_admin_all" ON public.enquetes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "enq_politico_scope" ON public.enquetes FOR ALL TO authenticated
  USING (politico_id = public.current_politico_id())
  WITH CHECK (politico_id = public.current_politico_id());
CREATE POLICY "enq_public_active_read" ON public.enquetes FOR SELECT TO anon
  USING (status = 'ativa');
CREATE POLICY "enq_auth_active_read" ON public.enquetes FOR SELECT TO authenticated
  USING (status = 'ativa');

CREATE TRIGGER trg_enquetes_updated BEFORE UPDATE ON public.enquetes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-gera slug
CREATE OR REPLACE FUNCTION public.gen_enquete_slug()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE base TEXT; final TEXT; i INT := 0;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base := lower(regexp_replace(NEW.titulo, '[^a-zA-Z0-9]+', '-', 'g'));
    base := trim(both '-' from base);
    IF base = '' THEN base := 'enquete'; END IF;
    final := base;
    WHILE EXISTS (SELECT 1 FROM public.enquetes WHERE slug = final) LOOP
      i := i + 1;
      final := base || '-' || i;
    END LOOP;
    NEW.slug := final;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_enquete_slug BEFORE INSERT ON public.enquetes
  FOR EACH ROW EXECUTE FUNCTION public.gen_enquete_slug();

-- PERGUNTAS
CREATE TABLE public.enquete_perguntas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquete_id UUID NOT NULL REFERENCES public.enquetes(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'unica', -- unica | multipla | texto
  ordem INT NOT NULL DEFAULT 0,
  obrigatoria BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enquete_perguntas TO authenticated;
GRANT SELECT ON public.enquete_perguntas TO anon;
GRANT ALL ON public.enquete_perguntas TO service_role;
ALTER TABLE public.enquete_perguntas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perg_admin_all" ON public.enquete_perguntas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "perg_politico_scope" ON public.enquete_perguntas FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.enquetes e WHERE e.id = enquete_id AND e.politico_id = public.current_politico_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.enquetes e WHERE e.id = enquete_id AND e.politico_id = public.current_politico_id()));
CREATE POLICY "perg_public_active_read" ON public.enquete_perguntas FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.enquetes e WHERE e.id = enquete_id AND e.status = 'ativa'));
CREATE POLICY "perg_auth_active_read" ON public.enquete_perguntas FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.enquetes e WHERE e.id = enquete_id AND e.status = 'ativa'));

-- OPCOES
CREATE TABLE public.enquete_opcoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pergunta_id UUID NOT NULL REFERENCES public.enquete_perguntas(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  ordem INT NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enquete_opcoes TO authenticated;
GRANT SELECT ON public.enquete_opcoes TO anon;
GRANT ALL ON public.enquete_opcoes TO service_role;
ALTER TABLE public.enquete_opcoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "opc_admin_all" ON public.enquete_opcoes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "opc_politico_scope" ON public.enquete_opcoes FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.enquete_perguntas p
    JOIN public.enquetes e ON e.id = p.enquete_id
    WHERE p.id = pergunta_id AND e.politico_id = public.current_politico_id()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.enquete_perguntas p
    JOIN public.enquetes e ON e.id = p.enquete_id
    WHERE p.id = pergunta_id AND e.politico_id = public.current_politico_id()));
CREATE POLICY "opc_public_active_read" ON public.enquete_opcoes FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.enquete_perguntas p
    JOIN public.enquetes e ON e.id = p.enquete_id
    WHERE p.id = pergunta_id AND e.status = 'ativa'));
CREATE POLICY "opc_auth_active_read" ON public.enquete_opcoes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.enquete_perguntas p
    JOIN public.enquetes e ON e.id = p.enquete_id
    WHERE p.id = pergunta_id AND e.status = 'ativa'));

-- RESPOSTAS
CREATE TABLE public.respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquete_id UUID NOT NULL REFERENCES public.enquetes(id) ON DELETE CASCADE,
  eleitor_id UUID REFERENCES public.eleitores(id) ON DELETE SET NULL,
  nome TEXT,
  telefone TEXT,
  email TEXT,
  origem TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_resp_enquete ON public.respostas(enquete_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.respostas TO authenticated;
GRANT INSERT ON public.respostas TO anon;
GRANT ALL ON public.respostas TO service_role;
ALTER TABLE public.respostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resp_admin_all" ON public.respostas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "resp_politico_scope_read" ON public.respostas FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.enquetes e WHERE e.id = enquete_id AND e.politico_id = public.current_politico_id()));
CREATE POLICY "resp_politico_scope_delete" ON public.respostas FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.enquetes e WHERE e.id = enquete_id AND e.politico_id = public.current_politico_id()));
CREATE POLICY "resp_public_insert" ON public.respostas FOR INSERT TO anon
  WITH CHECK (EXISTS (SELECT 1 FROM public.enquetes e WHERE e.id = enquete_id AND e.status = 'ativa'));
CREATE POLICY "resp_auth_insert" ON public.respostas FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.enquetes e WHERE e.id = enquete_id AND e.status = 'ativa'));

-- ITENS DE RESPOSTA
CREATE TABLE public.resposta_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resposta_id UUID NOT NULL REFERENCES public.respostas(id) ON DELETE CASCADE,
  pergunta_id UUID NOT NULL REFERENCES public.enquete_perguntas(id) ON DELETE CASCADE,
  opcao_id UUID REFERENCES public.enquete_opcoes(id) ON DELETE SET NULL,
  texto TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_resp_itens_resp ON public.resposta_itens(resposta_id);
CREATE INDEX idx_resp_itens_perg ON public.resposta_itens(pergunta_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.resposta_itens TO authenticated;
GRANT INSERT ON public.resposta_itens TO anon;
GRANT ALL ON public.resposta_itens TO service_role;
ALTER TABLE public.resposta_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ri_admin_all" ON public.resposta_itens FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "ri_politico_scope_read" ON public.resposta_itens FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.respostas r
    JOIN public.enquetes e ON e.id = r.enquete_id
    WHERE r.id = resposta_id AND e.politico_id = public.current_politico_id()));
CREATE POLICY "ri_public_insert" ON public.resposta_itens FOR INSERT TO anon
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.respostas r
    JOIN public.enquetes e ON e.id = r.enquete_id
    WHERE r.id = resposta_id AND e.status = 'ativa'));
CREATE POLICY "ri_auth_insert" ON public.resposta_itens FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.respostas r
    JOIN public.enquetes e ON e.id = r.enquete_id
    WHERE r.id = resposta_id AND e.status = 'ativa'));
