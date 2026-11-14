
-- Gestor pode tudo nas tabelas operacionais (espelhando admin)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['politicos','pleitos','candidatos','eleitores','coordenadores','bairros','enquetes','enquete_perguntas','enquete_opcoes','pleito_politicos','whatsapp_campanhas','whatsapp_templates','whatsapp_config','whatsapp_envios','plataforma_config']
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      t || '_gestor_all', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''gestor''::app_role)) WITH CHECK (public.has_role(auth.uid(), ''gestor''::app_role))',
      t || '_gestor_all', t
    );
  END LOOP;
END $$;

-- Backfill: qualquer usuário sem papel vira admin
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id)
ON CONFLICT DO NOTHING;
