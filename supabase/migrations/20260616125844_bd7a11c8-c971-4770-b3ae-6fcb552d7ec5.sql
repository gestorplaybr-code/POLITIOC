
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin','gestor','coordenador','operador','visualizador');
CREATE TYPE public.entity_status AS ENUM ('ativo','inativo','arquivado');
CREATE TYPE public.pleito_status AS ENUM ('ativo','encerrado','arquivado');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  telefone TEXT,
  politico_id UUID,
  status public.entity_status NOT NULL DEFAULT 'ativo',
  ultimo_acesso TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- get current user's politico_id (avoids RLS recursion on profiles)
CREATE OR REPLACE FUNCTION public.current_politico_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT politico_id FROM public.profiles WHERE id = auth.uid()
$$;

-- politicos
CREATE TABLE public.politicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  partido TEXT,
  bio TEXT,
  cargo TEXT,
  cidade TEXT,
  estado TEXT,
  foto_url TEXT,
  whatsapp TEXT,
  email TEXT,
  coordenador_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  link_publico TEXT UNIQUE,
  codigo_unico TEXT UNIQUE,
  rede_id UUID,
  status public.entity_status NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.politicos TO authenticated;
GRANT ALL ON public.politicos TO service_role;
ALTER TABLE public.politicos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER politicos_updated BEFORE UPDATE ON public.politicos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add FK from profiles to politicos
ALTER TABLE public.profiles ADD CONSTRAINT profiles_politico_fk FOREIGN KEY (politico_id) REFERENCES public.politicos(id) ON DELETE SET NULL;

-- gen code/link
CREATE OR REPLACE FUNCTION public.gen_politico_codigo()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE novo TEXT;
BEGIN
  IF NEW.codigo_unico IS NULL OR NEW.codigo_unico = '' THEN
    LOOP
      novo := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.politicos WHERE codigo_unico = novo);
    END LOOP;
    NEW.codigo_unico := novo;
  END IF;
  IF NEW.link_publico IS NULL OR NEW.link_publico = '' THEN
    NEW.link_publico := lower(regexp_replace(NEW.nome, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || lower(NEW.codigo_unico);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER politicos_codigo BEFORE INSERT ON public.politicos FOR EACH ROW EXECUTE FUNCTION public.gen_politico_codigo();

-- pleitos
CREATE TABLE public.pleitos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ano INTEGER,
  tipo TEXT,
  cidade TEXT,
  estado TEXT,
  descricao TEXT,
  status public.pleito_status NOT NULL DEFAULT 'ativo',
  data_inicio DATE,
  data_fim DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pleitos TO authenticated;
GRANT ALL ON public.pleitos TO service_role;
ALTER TABLE public.pleitos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER pleitos_updated BEFORE UPDATE ON public.pleitos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- pleito_politicos
CREATE TABLE public.pleito_politicos (
  pleito_id UUID NOT NULL REFERENCES public.pleitos(id) ON DELETE CASCADE,
  politico_id UUID NOT NULL REFERENCES public.politicos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (pleito_id, politico_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pleito_politicos TO authenticated;
GRANT ALL ON public.pleito_politicos TO service_role;
ALTER TABLE public.pleito_politicos ENABLE ROW LEVEL SECURITY;

-- candidatos
CREATE TABLE public.candidatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  partido TEXT,
  cidade TEXT,
  estado TEXT,
  cargo_pretendido TEXT,
  numero TEXT,
  foto_url TEXT,
  bio TEXT,
  politico_id UUID REFERENCES public.politicos(id) ON DELETE SET NULL,
  pleito_id UUID REFERENCES public.pleitos(id) ON DELETE SET NULL,
  status public.entity_status NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidatos TO authenticated;
GRANT ALL ON public.candidatos TO service_role;
ALTER TABLE public.candidatos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER candidatos_updated BEFORE UPDATE ON public.candidatos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- auditoria
CREATE TABLE public.auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acao TEXT NOT NULL,
  entidade TEXT NOT NULL,
  entidade_id UUID,
  descricao TEXT,
  ip TEXT,
  data_hora TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.auditoria TO authenticated;
GRANT ALL ON public.auditoria TO service_role;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- profiles: self read/update; admin all
CREATE POLICY profiles_select_self ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY profiles_admin_insert ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR auth.uid() = id);
CREATE POLICY profiles_admin_delete ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- user_roles: self select; admin all
CREATE POLICY ur_select ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- politicos
CREATE POLICY politicos_admin_all ON public.politicos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY politicos_own_select ON public.politicos FOR SELECT TO authenticated
  USING (id = public.current_politico_id());

-- pleitos: admin all; gestor/coord see pleitos with their politico
CREATE POLICY pleitos_admin_all ON public.pleitos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY pleitos_own_select ON public.pleitos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pleito_politicos pp WHERE pp.pleito_id = pleitos.id AND pp.politico_id = public.current_politico_id()));

-- pleito_politicos
CREATE POLICY pp_admin_all ON public.pleito_politicos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY pp_own_select ON public.pleito_politicos FOR SELECT TO authenticated
  USING (politico_id = public.current_politico_id());

-- candidatos
CREATE POLICY candidatos_admin_all ON public.candidatos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY candidatos_own_select ON public.candidatos FOR SELECT TO authenticated
  USING (politico_id = public.current_politico_id());

-- auditoria: admin select, authenticated insert
CREATE POLICY aud_admin_select ON public.auditoria FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY aud_insert ON public.auditoria FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);

-- ============ Auto profile + first-user-as-admin ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_count INTEGER;
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)), NEW.email);

  SELECT count(*) INTO user_count FROM auth.users;
  IF user_count <= 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'visualizador') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
