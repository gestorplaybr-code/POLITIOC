
DO $seed$
DECLARE
  v_admin uuid;
  v_p1 uuid; v_p2 uuid; v_p3 uuid;
  v_b_ids uuid[];
  v_c_ids uuid[];
  v_e_ids uuid[];
  v_enq uuid; v_perg uuid; v_opc uuid;
  v_pleito1 uuid; v_pleito2 uuid;
  v_cand uuid[];
  v_tpl1 uuid; v_tpl2 uuid;
  v_camp uuid;
  v_resp uuid;
  v_pol uuid;
  i int; j int; k int;
  nomes_m text[] := ARRAY['João Silva','Pedro Santos','Carlos Oliveira','Antonio Souza','José Lima','Paulo Costa','Marcos Pereira','Lucas Almeida','Rafael Ribeiro','Daniel Carvalho','Fernando Gomes','Bruno Martins','Eduardo Rocha','Felipe Dias','Gustavo Barbosa','Henrique Cardoso','Igor Teixeira','Júlio Mendes','Leandro Castro','Marcelo Araújo','Nelson Pinto','Otávio Cunha','Rodrigo Moreira','Sérgio Nunes','Thiago Freitas','Vinícius Ramos','Wesley Cavalcanti','André Monteiro','Bernardo Reis','Caio Vieira'];
  nomes_f text[] := ARRAY['Maria Souza','Ana Costa','Juliana Pereira','Fernanda Lima','Patrícia Santos','Camila Oliveira','Beatriz Ribeiro','Larissa Almeida','Carla Mendes','Renata Gomes','Aline Martins','Vanessa Rocha','Bruna Dias','Tatiana Barbosa','Cristina Cardoso','Sandra Teixeira','Luciana Castro','Adriana Araújo','Mônica Pinto','Daniela Cunha','Rosana Moreira','Simone Nunes','Mariana Freitas','Letícia Ramos','Priscila Cavalcanti','Karen Monteiro','Bianca Reis','Isabela Vieira','Natália Carvalho','Gabriela Silva'];
  bairros_sp text[] := ARRAY['Centro','Vila Madalena','Pinheiros','Tatuapé','Mooca','Santana','Vila Mariana'];
  bairros_bh text[] := ARRAY['Savassi','Centro','Pampulha','Buritis','Lourdes'];
  bairros_cwb text[] := ARRAY['Centro','Batel','Água Verde','Boa Vista','Portão'];
  profissoes text[] := ARRAY['Professor','Comerciante','Autônomo','Aposentado','Estudante','Funcionário Público','Empresário','Motorista','Enfermeiro','Advogado','Dona de Casa','Vendedor'];
  generos text[] := ARRAY['masculino','feminino','outro'];
  v_nome text; v_idx int;
BEGIN
  -- Guard idempotência
  IF EXISTS (SELECT 1 FROM public.politicos WHERE nome='Ana Beatriz Moraes [DEMO]') THEN
    RAISE NOTICE 'Seed já aplicado, abortando';
    RETURN;
  END IF;

  -- Admin user (primeiro registrado). Necessário para created_by.
  SELECT id INTO v_admin FROM auth.users ORDER BY created_at ASC LIMIT 1;

  -- ============= POLÍTICOS =============
  INSERT INTO public.politicos (nome, partido, cargo, cidade, estado, whatsapp, email, bio)
  VALUES ('Ana Beatriz Moraes [DEMO]','PSDB','Vereadora','São Paulo','SP','11987654321','ana.moraes@exemplo.com','Vereadora com foco em educação e mobilidade urbana.')
  RETURNING id INTO v_p1;

  INSERT INTO public.politicos (nome, partido, cargo, cidade, estado, whatsapp, email, bio)
  VALUES ('Carlos Henrique Lima [DEMO]','PT','Deputado Estadual','Belo Horizonte','MG','31987651234','carlos.lima@exemplo.com','Deputado estadual em primeiro mandato, atuação em saúde pública.')
  RETURNING id INTO v_p2;

  INSERT INTO public.politicos (nome, partido, cargo, cidade, estado, whatsapp, email, bio)
  VALUES ('Roberto Tavares [DEMO]','MDB','Prefeito','Curitiba','PR','41987659876','roberto.tavares@exemplo.com','Prefeito reeleito, prioridades em infraestrutura e segurança.')
  RETURNING id INTO v_p3;

  -- ============= BAIRROS =============
  FOR i IN 1..array_length(bairros_sp,1) LOOP
    INSERT INTO public.bairros (politico_id, nome, cidade, uf) VALUES (v_p1, bairros_sp[i],'São Paulo','SP');
  END LOOP;
  FOR i IN 1..array_length(bairros_bh,1) LOOP
    INSERT INTO public.bairros (politico_id, nome, cidade, uf) VALUES (v_p2, bairros_bh[i],'Belo Horizonte','MG');
  END LOOP;
  FOR i IN 1..array_length(bairros_cwb,1) LOOP
    INSERT INTO public.bairros (politico_id, nome, cidade, uf) VALUES (v_p3, bairros_cwb[i],'Curitiba','PR');
  END LOOP;

  -- ============= COORDENADORES (2 por político) =============
  INSERT INTO public.coordenadores (politico_id, nome, telefone, email, regiao, ativo) VALUES
    (v_p1,'Mariana Costa [DEMO]','11991110001','mariana.coord@exemplo.com','Zona Oeste',true),
    (v_p1,'Roberto Alves [DEMO]','11991110002','roberto.coord@exemplo.com','Zona Leste',true),
    (v_p2,'Juliana Reis [DEMO]','31991110003','juliana.coord@exemplo.com','Região Centro-Sul',true),
    (v_p2,'Pedro Henrique [DEMO]','31991110004','pedro.coord@exemplo.com','Região Norte',true),
    (v_p3,'Camila Borges [DEMO]','41991110005','camila.coord@exemplo.com','Matriz',true),
    (v_p3,'Diego Schmidt [DEMO]','41991110006','diego.coord@exemplo.com','Boqueirão',true);

  -- ============= ELEITORES (~40 por político) =============
  FOR v_pol IN SELECT unnest(ARRAY[v_p1,v_p2,v_p3]) LOOP
    SELECT array_agg(id) INTO v_b_ids FROM public.bairros WHERE politico_id = v_pol;
    SELECT array_agg(id) INTO v_c_ids FROM public.coordenadores WHERE politico_id = v_pol;
    FOR i IN 1..40 LOOP
      IF i % 2 = 0 THEN
        v_nome := nomes_f[((i-1) % array_length(nomes_f,1)) + 1] || ' [DEMO]';
      ELSE
        v_nome := nomes_m[((i-1) % array_length(nomes_m,1)) + 1] || ' [DEMO]';
      END IF;
      INSERT INTO public.eleitores (
        politico_id, coordenador_id, bairro_id, nome, telefone, email,
        data_nascimento, genero, cidade, uf, tags, status, origem
      ) VALUES (
        v_pol,
        v_c_ids[((i-1) % array_length(v_c_ids,1)) + 1],
        v_b_ids[((i-1) % array_length(v_b_ids,1)) + 1],
        v_nome,
        '11' || lpad((900000000 + (random()*99999999)::int)::text, 9, '0'),
        lower(replace(split_part(v_nome,' ',1),'á','a')) || i || '@exemplo.com',
        (current_date - ((18 + (random()*57)::int) * 365))::date,
        generos[1 + (i % 3)],
        (SELECT cidade FROM public.politicos WHERE id=v_pol),
        (SELECT estado FROM public.politicos WHERE id=v_pol),
        CASE WHEN i % 5 = 0 THEN ARRAY['liderança comunitária'] WHEN i % 7 = 0 THEN ARRAY['voluntário','apoiador'] ELSE NULL END,
        'ativo',
        CASE i % 3 WHEN 0 THEN 'manual' WHEN 1 THEN 'whatsapp' ELSE 'enquete' END
      );
    END LOOP;
  END LOOP;

  -- ============= PLEITOS =============
  INSERT INTO public.pleitos (nome, ano, tipo, cidade, estado, descricao, status, data_inicio, data_fim)
  VALUES ('Eleições Municipais 2024 [DEMO]', 2024, 'municipal','São Paulo','SP','Pleito municipal concluído', 'encerrado', '2024-08-01','2024-10-30')
  RETURNING id INTO v_pleito1;

  INSERT INTO public.pleitos (nome, ano, tipo, cidade, estado, descricao, status, data_inicio, data_fim)
  VALUES ('Eleições Municipais 2028 [DEMO]', 2028, 'municipal','Curitiba','PR','Próximo pleito municipal', 'ativo', '2028-08-01','2028-10-29')
  RETURNING id INTO v_pleito2;

  INSERT INTO public.pleito_politicos (pleito_id, politico_id) VALUES
    (v_pleito1, v_p1),(v_pleito2, v_p3),(v_pleito2, v_p1);

  -- ============= CANDIDATOS =============
  INSERT INTO public.candidatos (nome, partido, cidade, estado, cargo_pretendido, numero, bio, politico_id, pleito_id)
  VALUES
    ('Ana Beatriz Moraes [DEMO]','PSDB','São Paulo','SP','Vereadora','45123', 'Candidata à reeleição', v_p1, v_pleito2),
    ('Roberto Tavares [DEMO]','MDB','Curitiba','PR','Prefeito','15', 'Candidato à reeleição', v_p3, v_pleito2),
    ('Fernando Oliveira [DEMO]','PSD','Curitiba','PR','Prefeito','55', 'Candidato de oposição', NULL, v_pleito2),
    ('Patrícia Mendes [DEMO]','PL','Curitiba','PR','Prefeito','22', 'Candidata empresarial', NULL, v_pleito2);

  -- ============= ENQUETES + perguntas + opções + respostas =============
  -- Helper inline: cria enquete e retorna id
  -- Enquete 1 (Ana, anônima, intenção de voto)
  INSERT INTO public.enquetes (politico_id, titulo, descricao, slug, status, created_by, mostrar_politico, data_inicio, mensagem_inicial, mensagem_final)
  VALUES (v_p1, 'Pesquisa de intenção de voto — Prefeitura', 'Sua opinião é anônima e ajuda a construir políticas melhores.', '', 'ativa', v_admin, false, now() - interval '14 days', 'Obrigado por participar!', 'Sua resposta foi registrada.')
  RETURNING id INTO v_enq;

  INSERT INTO public.enquete_perguntas (enquete_id, texto, tipo, ordem, obrigatoria)
  VALUES (v_enq, 'Se a eleição fosse hoje, em quem você votaria?', 'unica', 1, true)
  RETURNING id INTO v_perg;

  INSERT INTO public.enquete_opcoes (pergunta_id, texto, ordem) VALUES
    (v_perg,'Ana Beatriz Moraes',1),
    (v_perg,'Roberto Tavares',2),
    (v_perg,'Fernando Oliveira',3),
    (v_perg,'Patrícia Mendes',4),
    (v_perg,'Branco / Nulo',5),
    (v_perg,'Indeciso',6);

  -- 60 respostas com distribuição não-uniforme
  FOR i IN 1..60 LOOP
    INSERT INTO public.respostas (enquete_id, nome, origem, consentimento_lgpd, created_at)
    VALUES (v_enq,
      CASE WHEN i % 4 = 0 THEN NULL ELSE 'Respondente ' || i || ' [DEMO]' END,
      CASE i % 3 WHEN 0 THEN 'whatsapp' WHEN 1 THEN 'link' ELSE 'qrcode' END,
      true,
      now() - (random() * interval '14 days'))
    RETURNING id INTO v_resp;
    -- distribuição: 35% op1, 25% op2, 15% op3, 10% op4, 5% op5, 10% op6
    v_idx := CASE
      WHEN i <= 21 THEN 1
      WHEN i <= 36 THEN 2
      WHEN i <= 45 THEN 3
      WHEN i <= 51 THEN 4
      WHEN i <= 54 THEN 5
      ELSE 6 END;
    SELECT id INTO v_opc FROM public.enquete_opcoes WHERE pergunta_id = v_perg AND ordem = v_idx;
    INSERT INTO public.resposta_itens (resposta_id, pergunta_id, opcao_id) VALUES (v_resp, v_perg, v_opc);
  END LOOP;

  -- Enquete 2 (Ana, prioridade do bairro, múltipla)
  INSERT INTO public.enquetes (politico_id, titulo, descricao, slug, status, created_by, mostrar_politico, data_inicio)
  VALUES (v_p1, 'Qual a maior prioridade para o seu bairro?', 'Selecione até 3 prioridades.', '', 'ativa', v_admin, true, now() - interval '20 days')
  RETURNING id INTO v_enq;

  INSERT INTO public.enquete_perguntas (enquete_id, texto, tipo, ordem, obrigatoria)
  VALUES (v_enq, 'Quais áreas você considera prioritárias?', 'multipla', 1, true)
  RETURNING id INTO v_perg;

  INSERT INTO public.enquete_opcoes (pergunta_id, texto, ordem) VALUES
    (v_perg,'Saúde',1),(v_perg,'Segurança',2),(v_perg,'Educação',3),
    (v_perg,'Transporte',4),(v_perg,'Lazer e cultura',5),(v_perg,'Limpeza urbana',6);

  INSERT INTO public.enquete_perguntas (enquete_id, texto, tipo, ordem, obrigatoria)
  VALUES (v_enq, 'Como você avalia o atendimento de saúde no seu bairro? (1=péssimo, 5=ótimo)', 'escala', 2, false);

  FOR i IN 1..45 LOOP
    INSERT INTO public.respostas (enquete_id, nome, origem, consentimento_lgpd, created_at)
    VALUES (v_enq, 'Morador ' || i || ' [DEMO]', 'link', true, now() - (random() * interval '20 days'))
    RETURNING id INTO v_resp;
    -- 2-3 opções por resposta
    FOR j IN 1..(2 + (i % 2)) LOOP
      v_idx := 1 + ((i + j) % 6);
      SELECT id INTO v_opc FROM public.enquete_opcoes WHERE pergunta_id = v_perg AND ordem = v_idx;
      INSERT INTO public.resposta_itens (resposta_id, pergunta_id, opcao_id) VALUES (v_resp, v_perg, v_opc);
    END LOOP;
    -- escala
    INSERT INTO public.resposta_itens (resposta_id, pergunta_id, numero)
    VALUES (v_resp, (SELECT id FROM public.enquete_perguntas WHERE enquete_id=v_enq AND ordem=2), 1 + (i % 5));
  END LOOP;

  -- Enquete 3 (Carlos, avaliação da gestão, escala, encerrada)
  INSERT INTO public.enquetes (politico_id, titulo, descricao, slug, status, created_by, mostrar_politico, data_inicio, data_fim)
  VALUES (v_p2, 'Avaliação da gestão atual', 'Pesquisa encerrada — resultado disponível.', '', 'encerrada', v_admin, true, now() - interval '60 days', now() - interval '7 days')
  RETURNING id INTO v_enq;

  INSERT INTO public.enquete_perguntas (enquete_id, texto, tipo, ordem, obrigatoria)
  VALUES (v_enq, 'De 1 a 5, como você avalia a gestão estadual atual?', 'escala', 1, true)
  RETURNING id INTO v_perg;

  FOR i IN 1..38 LOOP
    INSERT INTO public.respostas (enquete_id, nome, origem, consentimento_lgpd, created_at)
    VALUES (v_enq, 'Cidadão ' || i || ' [DEMO]', 'qrcode', true, now() - interval '7 days' - (random() * interval '50 days'))
    RETURNING id INTO v_resp;
    INSERT INTO public.resposta_itens (resposta_id, pergunta_id, numero)
    VALUES (v_resp, v_perg, 1 + (i % 5));
  END LOOP;

  -- Enquete 4 (Carlos, ciclovia, sim/não)
  INSERT INTO public.enquetes (politico_id, titulo, descricao, slug, status, created_by, mostrar_politico, data_inicio)
  VALUES (v_p2, 'Você apoia o projeto da nova ciclovia?', 'Projeto em discussão na Assembleia.', '', 'ativa', v_admin, true, now() - interval '5 days')
  RETURNING id INTO v_enq;

  INSERT INTO public.enquete_perguntas (enquete_id, texto, tipo, ordem, obrigatoria)
  VALUES (v_enq, 'Qual sua posição?', 'unica', 1, true)
  RETURNING id INTO v_perg;

  INSERT INTO public.enquete_opcoes (pergunta_id, texto, ordem) VALUES
    (v_perg,'Sim, apoio',1),(v_perg,'Não apoio',2),(v_perg,'Não tenho opinião',3);

  FOR i IN 1..28 LOOP
    INSERT INTO public.respostas (enquete_id, origem, consentimento_lgpd, created_at)
    VALUES (v_enq, 'link', true, now() - (random() * interval '5 days'))
    RETURNING id INTO v_resp;
    v_idx := CASE WHEN i <= 18 THEN 1 WHEN i <= 24 THEN 2 ELSE 3 END;
    SELECT id INTO v_opc FROM public.enquete_opcoes WHERE pergunta_id = v_perg AND ordem = v_idx;
    INSERT INTO public.resposta_itens (resposta_id, pergunta_id, opcao_id) VALUES (v_resp, v_perg, v_opc);
  END LOOP;

  -- Enquete 5 (Roberto, sugestões abertas)
  INSERT INTO public.enquetes (politico_id, titulo, descricao, slug, status, created_by, mostrar_politico, data_inicio)
  VALUES (v_p3, 'O que a Prefeitura pode melhorar?', 'Sua sugestão é lida pela equipe.', '', 'ativa', v_admin, true, now() - interval '10 days')
  RETURNING id INTO v_enq;

  INSERT INTO public.enquete_perguntas (enquete_id, texto, tipo, ordem, obrigatoria)
  VALUES (v_enq, 'Qual a principal melhoria que você sugere?', 'texto', 1, true)
  RETURNING id INTO v_perg;

  FOR i IN 1..22 LOOP
    INSERT INTO public.respostas (enquete_id, nome, origem, consentimento_lgpd, created_at)
    VALUES (v_enq, 'Cidadão ' || i || ' [DEMO]', 'link', true, now() - (random() * interval '10 days'))
    RETURNING id INTO v_resp;
    INSERT INTO public.resposta_itens (resposta_id, pergunta_id, texto)
    VALUES (v_resp, v_perg,
      (ARRAY['Melhorar a iluminação pública','Mais creches no bairro','Recapeamento das ruas','Postos de saúde abertos no fim de semana','Mais segurança nas praças','Coleta de lixo mais frequente','Investir em ciclovias','Apoiar pequenos comerciantes'])[1 + (i % 8)]);
  END LOOP;

  -- Enquete 6 (Roberto, rascunho)
  INSERT INTO public.enquetes (politico_id, titulo, descricao, slug, status, created_by, mostrar_politico)
  VALUES (v_p3, 'Pesquisa interna — Plano 2027', 'Rascunho para validação interna.', '', 'rascunho', v_admin, false)
  RETURNING id INTO v_enq;

  INSERT INTO public.enquete_perguntas (enquete_id, texto, tipo, ordem)
  VALUES (v_enq, 'Áreas prioritárias para o próximo orçamento?', 'multipla', 1);

  -- ============= WHATSAPP =============
  INSERT INTO public.whatsapp_templates (politico_id, nome, conteudo, descricao, created_by)
  VALUES (v_p1, 'Boas-vindas [DEMO]', 'Olá {{nome}}! Obrigado por se cadastrar. Conte conosco!', 'Mensagem inicial', v_admin)
  RETURNING id INTO v_tpl1;

  INSERT INTO public.whatsapp_templates (politico_id, nome, conteudo, descricao, created_by)
  VALUES (v_p1, 'Convite para enquete [DEMO]', 'Olá {{nome}}, sua opinião é importante! Participe: {{link}}', 'Disparo de enquete', v_admin)
  RETURNING id INTO v_tpl2;

  -- Campanha enviada
  INSERT INTO public.whatsapp_campanhas (politico_id, nome, template_id, mensagem, status, total_alvo, total_enviado, total_falha, iniciada_em, concluida_em, created_by)
  VALUES (v_p1,'Campanha Boas-vindas — Outubro [DEMO]', v_tpl1, 'Olá! Obrigado por se cadastrar. Conte conosco!', 'concluida', 25, 23, 2, now() - interval '15 days', now() - interval '15 days' + interval '2 hours', v_admin)
  RETURNING id INTO v_camp;

  -- Envios
  FOR i IN 1..25 LOOP
    INSERT INTO public.whatsapp_envios (campanha_id, telefone, mensagem, status, enviado_em, lido_em)
    VALUES (v_camp,
      '11' || lpad((900000000 + (random()*99999999)::int)::text, 9, '0'),
      'Olá! Obrigado por se cadastrar.',
      CASE WHEN i <= 18 THEN 'lido' WHEN i <= 23 THEN 'entregue' ELSE 'falha' END,
      CASE WHEN i <= 23 THEN now() - interval '15 days' + (random() * interval '2 hours') ELSE NULL END,
      CASE WHEN i <= 18 THEN now() - interval '14 days' + (random() * interval '6 hours') ELSE NULL END
    );
  END LOOP;

  -- Campanha agendada
  INSERT INTO public.whatsapp_campanhas (politico_id, nome, template_id, mensagem, status, total_alvo, agendada_para, created_by)
  VALUES (v_p1,'Convite enquete — Nova ciclovia [DEMO]', v_tpl2, 'Olá! Participe da nossa enquete: https://exemplo.com/e/...', 'agendada', 40, now() + interval '3 days', v_admin);

  -- Campanha rascunho
  INSERT INTO public.whatsapp_campanhas (politico_id, nome, mensagem, status, created_by)
  VALUES (v_p2,'Rascunho — Avaliação 2026 [DEMO]', 'Em construção...', 'rascunho', v_admin);

  RAISE NOTICE 'Seed concluído com sucesso.';
END $seed$;
