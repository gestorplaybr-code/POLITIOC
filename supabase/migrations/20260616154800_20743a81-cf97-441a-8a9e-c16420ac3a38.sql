
DO $$
DECLARE
  v_admin uuid := gen_random_uuid();
  v_gestor uuid := gen_random_uuid();
  v_coord uuid := gen_random_uuid();
  v_oper uuid := gen_random_uuid();
  v_view uuid := gen_random_uuid();
  v_politico uuid;
  v_pw text := crypt('Alterar123', gen_salt('bf'));
  emails text[] := ARRAY['admin@teste.com','gestor@teste.com','coordenador@teste.com','operador@teste.com','visualizador@teste.com'];
  names  text[] := ARRAY['Admin Teste','Gestor Teste','Coordenador Teste','Operador Teste','Visualizador Teste'];
  ids    uuid[];
  i int;
  uid uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = ANY(emails)) THEN
    RAISE NOTICE 'Test users already exist, skipping';
    RETURN;
  END IF;

  ids := ARRAY[v_admin, v_gestor, v_coord, v_oper, v_view];

  FOR i IN 1..array_length(emails,1) LOOP
    uid := ids[i];
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      emails[i], v_pw, now(), now(), now(),
      jsonb_build_object('provider','email','providers',jsonb_build_array('email')),
      jsonb_build_object('nome', names[i]),
      false, false
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), uid,
      jsonb_build_object('sub', uid::text, 'email', emails[i], 'email_verified', true),
      'email', emails[i], now(), now(), now()
    );
  END LOOP;

  UPDATE public.user_roles SET role='admin'::app_role WHERE user_id=v_admin;
  UPDATE public.user_roles SET role='gestor'::app_role WHERE user_id=v_gestor;
  UPDATE public.user_roles SET role='coordenador'::app_role WHERE user_id=v_coord;
  UPDATE public.user_roles SET role='operador'::app_role WHERE user_id=v_oper;

  INSERT INTO public.politicos (nome, partido, cargo, cidade, estado, email)
  VALUES ('Político Teste', 'PT', 'Vereador', 'São Paulo', 'SP', 'politico@teste.com')
  RETURNING id INTO v_politico;

  UPDATE public.profiles SET politico_id = v_politico WHERE id IN (v_gestor, v_oper);

  INSERT INTO public.coordenadores (politico_id, user_id, nome, email)
  VALUES (v_politico, v_coord, 'Coordenador Teste', 'coordenador@teste.com');
END $$;
