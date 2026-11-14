
-- Log de webhooks Z-API (para diagnóstico do gatilho da IA)
CREATE TABLE public.zapi_webhook_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT,
  phone TEXT,
  from_me BOOLEAN,
  is_group BOOLEAN,
  payload JSONB,
  resultado TEXT,
  erro TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.zapi_webhook_log TO authenticated;
GRANT ALL ON public.zapi_webhook_log TO service_role;
ALTER TABLE public.zapi_webhook_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin lê webhook log"
  ON public.zapi_webhook_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX zapi_webhook_log_created_idx ON public.zapi_webhook_log (created_at DESC);

-- Cliques no link público da enquete (funil)
CREATE TABLE public.enquete_convite_cliques (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enquete_id UUID REFERENCES public.enquetes(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.enquete_convite_cliques TO authenticated;
GRANT INSERT ON public.enquete_convite_cliques TO anon;
GRANT ALL ON public.enquete_convite_cliques TO service_role;
ALTER TABLE public.enquete_convite_cliques ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Qualquer um registra clique" ON public.enquete_convite_cliques
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Autenticados leem cliques" ON public.enquete_convite_cliques
  FOR SELECT TO authenticated USING (true);
CREATE INDEX enquete_convite_cliques_enq_idx ON public.enquete_convite_cliques (enquete_id, created_at DESC);

-- Realtime nas sessões (para o painel ao vivo)
ALTER PUBLICATION supabase_realtime ADD TABLE public.enquete_sessoes_whatsapp;
