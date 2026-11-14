
-- BAIRROS
CREATE TABLE public.bairros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politico_id UUID NOT NULL REFERENCES public.politicos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cidade TEXT,
  uf TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bairros TO authenticated;
GRANT ALL ON public.bairros TO service_role;
ALTER TABLE public.bairros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bairros_admin_all" ON public.bairros FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "bairros_politico_scope" ON public.bairros FOR ALL TO authenticated
  USING (politico_id = public.current_politico_id())
  WITH CHECK (politico_id = public.current_politico_id());

CREATE TRIGGER trg_bairros_updated BEFORE UPDATE ON public.bairros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- COORDENADORES
CREATE TABLE public.coordenadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politico_id UUID NOT NULL REFERENCES public.politicos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  regiao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coordenadores TO authenticated;
GRANT ALL ON public.coordenadores TO service_role;
ALTER TABLE public.coordenadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coord_admin_all" ON public.coordenadores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "coord_politico_scope" ON public.coordenadores FOR ALL TO authenticated
  USING (politico_id = public.current_politico_id())
  WITH CHECK (politico_id = public.current_politico_id());

CREATE TRIGGER trg_coord_updated BEFORE UPDATE ON public.coordenadores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ELEITORES
CREATE TABLE public.eleitores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politico_id UUID NOT NULL REFERENCES public.politicos(id) ON DELETE CASCADE,
  coordenador_id UUID REFERENCES public.coordenadores(id) ON DELETE SET NULL,
  bairro_id UUID REFERENCES public.bairros(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  cpf TEXT,
  data_nascimento DATE,
  genero TEXT,
  cep TEXT,
  rua TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  uf TEXT,
  observacoes TEXT,
  tags TEXT[],
  origem TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_eleitores_politico ON public.eleitores(politico_id);
CREATE INDEX idx_eleitores_coord ON public.eleitores(coordenador_id);
CREATE INDEX idx_eleitores_bairro ON public.eleitores(bairro_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.eleitores TO authenticated;
GRANT ALL ON public.eleitores TO service_role;
ALTER TABLE public.eleitores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "elei_admin_all" ON public.eleitores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "elei_politico_scope" ON public.eleitores FOR ALL TO authenticated
  USING (politico_id = public.current_politico_id())
  WITH CHECK (politico_id = public.current_politico_id());

CREATE TRIGGER trg_eleitores_updated BEFORE UPDATE ON public.eleitores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Política pública de leitura para políticos (página pública via link_publico)
CREATE POLICY "politicos_public_read" ON public.politicos FOR SELECT TO anon
  USING (true);
GRANT SELECT ON public.politicos TO anon;
