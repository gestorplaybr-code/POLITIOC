export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      auditoria: {
        Row: {
          acao: string
          data_hora: string
          descricao: string | null
          entidade: string
          entidade_id: string | null
          id: string
          ip: string | null
          usuario_id: string | null
        }
        Insert: {
          acao: string
          data_hora?: string
          descricao?: string | null
          entidade: string
          entidade_id?: string | null
          id?: string
          ip?: string | null
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          data_hora?: string
          descricao?: string | null
          entidade?: string
          entidade_id?: string | null
          id?: string
          ip?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      bairros: {
        Row: {
          cidade: string | null
          created_at: string
          id: string
          nome: string
          politico_id: string
          uf: string | null
          updated_at: string
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          id?: string
          nome: string
          politico_id: string
          uf?: string | null
          updated_at?: string
        }
        Update: {
          cidade?: string | null
          created_at?: string
          id?: string
          nome?: string
          politico_id?: string
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bairros_politico_id_fkey"
            columns: ["politico_id"]
            isOneToOne: false
            referencedRelation: "politicos"
            referencedColumns: ["id"]
          },
        ]
      }
      candidato_coordenadores: {
        Row: {
          candidato_id: string
          coordenador_id: string
          created_at: string
        }
        Insert: {
          candidato_id: string
          coordenador_id: string
          created_at?: string
        }
        Update: {
          candidato_id?: string
          coordenador_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidato_coordenadores_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidato_coordenadores_coordenador_id_fkey"
            columns: ["coordenador_id"]
            isOneToOne: false
            referencedRelation: "coordenadores"
            referencedColumns: ["id"]
          },
        ]
      }
      candidatos: {
        Row: {
          bio: string | null
          cargo_pretendido: string | null
          cidade: string | null
          created_at: string
          estado: string | null
          foto_url: string | null
          id: string
          nome: string
          numero: string | null
          partido: string | null
          pleito_id: string | null
          politico_id: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          bio?: string | null
          cargo_pretendido?: string | null
          cidade?: string | null
          created_at?: string
          estado?: string | null
          foto_url?: string | null
          id?: string
          nome: string
          numero?: string | null
          partido?: string | null
          pleito_id?: string | null
          politico_id?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          bio?: string | null
          cargo_pretendido?: string | null
          cidade?: string | null
          created_at?: string
          estado?: string | null
          foto_url?: string | null
          id?: string
          nome?: string
          numero?: string | null
          partido?: string | null
          pleito_id?: string | null
          politico_id?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidatos_pleito_id_fkey"
            columns: ["pleito_id"]
            isOneToOne: false
            referencedRelation: "pleitos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidatos_politico_id_fkey"
            columns: ["politico_id"]
            isOneToOne: false
            referencedRelation: "politicos"
            referencedColumns: ["id"]
          },
        ]
      }
      coordenadores: {
        Row: {
          ativo: boolean
          created_at: string
          email: string | null
          id: string
          nome: string
          politico_id: string
          regiao: string | null
          telefone: string | null
          token_captacao: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          politico_id: string
          regiao?: string | null
          telefone?: string | null
          token_captacao?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          politico_id?: string
          regiao?: string | null
          telefone?: string | null
          token_captacao?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coordenadores_politico_id_fkey"
            columns: ["politico_id"]
            isOneToOne: false
            referencedRelation: "politicos"
            referencedColumns: ["id"]
          },
        ]
      }
      eleitores: {
        Row: {
          bairro: string | null
          bairro_id: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          coordenador_id: string | null
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          email: string | null
          genero: string | null
          id: string
          nome: string
          numero: string | null
          observacoes: string | null
          origem: string | null
          politico_id: string
          rg: string | null
          rua: string | null
          secao: string | null
          status: string
          tags: string[] | null
          telefone: string | null
          titulo_eleitor: string | null
          uf: string | null
          updated_at: string
          zona: string | null
        }
        Insert: {
          bairro?: string | null
          bairro_id?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          coordenador_id?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          genero?: string | null
          id?: string
          nome: string
          numero?: string | null
          observacoes?: string | null
          origem?: string | null
          politico_id: string
          rg?: string | null
          rua?: string | null
          secao?: string | null
          status?: string
          tags?: string[] | null
          telefone?: string | null
          titulo_eleitor?: string | null
          uf?: string | null
          updated_at?: string
          zona?: string | null
        }
        Update: {
          bairro?: string | null
          bairro_id?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          coordenador_id?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          genero?: string | null
          id?: string
          nome?: string
          numero?: string | null
          observacoes?: string | null
          origem?: string | null
          politico_id?: string
          rg?: string | null
          rua?: string | null
          secao?: string | null
          status?: string
          tags?: string[] | null
          telefone?: string | null
          titulo_eleitor?: string | null
          uf?: string | null
          updated_at?: string
          zona?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eleitores_bairro_id_fkey"
            columns: ["bairro_id"]
            isOneToOne: false
            referencedRelation: "bairros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eleitores_coordenador_id_fkey"
            columns: ["coordenador_id"]
            isOneToOne: false
            referencedRelation: "coordenadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eleitores_politico_id_fkey"
            columns: ["politico_id"]
            isOneToOne: false
            referencedRelation: "politicos"
            referencedColumns: ["id"]
          },
        ]
      }
      enquete_convite_cliques: {
        Row: {
          created_at: string
          enquete_id: string | null
          id: string
          ip: string | null
          token: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          enquete_id?: string | null
          id?: string
          ip?: string | null
          token: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          enquete_id?: string | null
          id?: string
          ip?: string | null
          token?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enquete_convite_cliques_enquete_id_fkey"
            columns: ["enquete_id"]
            isOneToOne: false
            referencedRelation: "enquetes"
            referencedColumns: ["id"]
          },
        ]
      }
      enquete_opcoes: {
        Row: {
          id: string
          ordem: number
          pergunta_id: string
          texto: string
        }
        Insert: {
          id?: string
          ordem?: number
          pergunta_id: string
          texto: string
        }
        Update: {
          id?: string
          ordem?: number
          pergunta_id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "enquete_opcoes_pergunta_id_fkey"
            columns: ["pergunta_id"]
            isOneToOne: false
            referencedRelation: "enquete_perguntas"
            referencedColumns: ["id"]
          },
        ]
      }
      enquete_perguntas: {
        Row: {
          created_at: string
          enquete_id: string
          id: string
          obrigatoria: boolean
          ordem: number
          permitir_outro: boolean
          texto: string
          tipo: string
        }
        Insert: {
          created_at?: string
          enquete_id: string
          id?: string
          obrigatoria?: boolean
          ordem?: number
          permitir_outro?: boolean
          texto: string
          tipo?: string
        }
        Update: {
          created_at?: string
          enquete_id?: string
          id?: string
          obrigatoria?: boolean
          ordem?: number
          permitir_outro?: boolean
          texto?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "enquete_perguntas_enquete_id_fkey"
            columns: ["enquete_id"]
            isOneToOne: false
            referencedRelation: "enquetes"
            referencedColumns: ["id"]
          },
        ]
      }
      enquete_sessoes_whatsapp: {
        Row: {
          coordenador_id: string | null
          dados: Json
          ended_at: string | null
          enquete_id: string
          historico: Json | null
          id: string
          last_msg_at: string
          passo: number
          pergunta_atual_id: string | null
          resposta_id: string | null
          respostas: Json
          started_at: string
          status: string
          telefone: string
        }
        Insert: {
          coordenador_id?: string | null
          dados?: Json
          ended_at?: string | null
          enquete_id: string
          historico?: Json | null
          id?: string
          last_msg_at?: string
          passo?: number
          pergunta_atual_id?: string | null
          resposta_id?: string | null
          respostas?: Json
          started_at?: string
          status?: string
          telefone: string
        }
        Update: {
          coordenador_id?: string | null
          dados?: Json
          ended_at?: string | null
          enquete_id?: string
          historico?: Json | null
          id?: string
          last_msg_at?: string
          passo?: number
          pergunta_atual_id?: string | null
          resposta_id?: string | null
          respostas?: Json
          started_at?: string
          status?: string
          telefone?: string
        }
        Relationships: [
          {
            foreignKeyName: "enquete_sessoes_whatsapp_coordenador_id_fkey"
            columns: ["coordenador_id"]
            isOneToOne: false
            referencedRelation: "coordenadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquete_sessoes_whatsapp_enquete_id_fkey"
            columns: ["enquete_id"]
            isOneToOne: false
            referencedRelation: "enquetes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquete_sessoes_whatsapp_pergunta_atual_id_fkey"
            columns: ["pergunta_atual_id"]
            isOneToOne: false
            referencedRelation: "enquete_perguntas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquete_sessoes_whatsapp_resposta_id_fkey"
            columns: ["resposta_id"]
            isOneToOne: false
            referencedRelation: "respostas"
            referencedColumns: ["id"]
          },
        ]
      }
      enquetes: {
        Row: {
          coordenador_id: string | null
          created_at: string
          created_by: string | null
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          exigir_cpf: boolean
          exigir_localizacao: boolean
          exigir_whatsapp: boolean
          id: string
          mensagem_final: string | null
          mensagem_inicial: string | null
          modo_entrega: string
          mostrar_politico: boolean
          numero_whatsapp_bot: string | null
          palavra_chave_whatsapp: string | null
          permite_anonimo: boolean
          permitir_anonimo: boolean
          politico_id: string
          slug: string
          status: string
          titulo: string
          token_convite: string | null
          updated_at: string
        }
        Insert: {
          coordenador_id?: string | null
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          exigir_cpf?: boolean
          exigir_localizacao?: boolean
          exigir_whatsapp?: boolean
          id?: string
          mensagem_final?: string | null
          mensagem_inicial?: string | null
          modo_entrega?: string
          mostrar_politico?: boolean
          numero_whatsapp_bot?: string | null
          palavra_chave_whatsapp?: string | null
          permite_anonimo?: boolean
          permitir_anonimo?: boolean
          politico_id: string
          slug: string
          status?: string
          titulo: string
          token_convite?: string | null
          updated_at?: string
        }
        Update: {
          coordenador_id?: string | null
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          exigir_cpf?: boolean
          exigir_localizacao?: boolean
          exigir_whatsapp?: boolean
          id?: string
          mensagem_final?: string | null
          mensagem_inicial?: string | null
          modo_entrega?: string
          mostrar_politico?: boolean
          numero_whatsapp_bot?: string | null
          palavra_chave_whatsapp?: string | null
          permite_anonimo?: boolean
          permitir_anonimo?: boolean
          politico_id?: string
          slug?: string
          status?: string
          titulo?: string
          token_convite?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enquetes_coordenador_id_fkey"
            columns: ["coordenador_id"]
            isOneToOne: false
            referencedRelation: "coordenadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquetes_politico_id_fkey"
            columns: ["politico_id"]
            isOneToOne: false
            referencedRelation: "politicos"
            referencedColumns: ["id"]
          },
        ]
      }
      plataforma_config: {
        Row: {
          id: boolean
          nome: string
          termo_privacidade: string | null
          updated_at: string
        }
        Insert: {
          id?: boolean
          nome?: string
          termo_privacidade?: string | null
          updated_at?: string
        }
        Update: {
          id?: boolean
          nome?: string
          termo_privacidade?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pleito_politicos: {
        Row: {
          created_at: string
          pleito_id: string
          politico_id: string
        }
        Insert: {
          created_at?: string
          pleito_id: string
          politico_id: string
        }
        Update: {
          created_at?: string
          pleito_id?: string
          politico_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pleito_politicos_pleito_id_fkey"
            columns: ["pleito_id"]
            isOneToOne: false
            referencedRelation: "pleitos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pleito_politicos_politico_id_fkey"
            columns: ["politico_id"]
            isOneToOne: false
            referencedRelation: "politicos"
            referencedColumns: ["id"]
          },
        ]
      }
      pleitos: {
        Row: {
          ano: number | null
          cidade: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          estado: string | null
          id: string
          nome: string
          status: Database["public"]["Enums"]["pleito_status"]
          tipo: string | null
          updated_at: string
        }
        Insert: {
          ano?: number | null
          cidade?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          estado?: string | null
          id?: string
          nome: string
          status?: Database["public"]["Enums"]["pleito_status"]
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          ano?: number | null
          cidade?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          estado?: string | null
          id?: string
          nome?: string
          status?: Database["public"]["Enums"]["pleito_status"]
          tipo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      politicos: {
        Row: {
          bio: string | null
          cargo: string | null
          cidade: string | null
          codigo_unico: string | null
          coordenador_id: string | null
          created_at: string
          email: string | null
          estado: string | null
          foto_url: string | null
          id: string
          link_publico: string | null
          nome: string
          partido: string | null
          rede_id: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          bio?: string | null
          cargo?: string | null
          cidade?: string | null
          codigo_unico?: string | null
          coordenador_id?: string | null
          created_at?: string
          email?: string | null
          estado?: string | null
          foto_url?: string | null
          id?: string
          link_publico?: string | null
          nome: string
          partido?: string | null
          rede_id?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          bio?: string | null
          cargo?: string | null
          cidade?: string | null
          codigo_unico?: string | null
          coordenador_id?: string | null
          created_at?: string
          email?: string | null
          estado?: string | null
          foto_url?: string | null
          id?: string
          link_publico?: string | null
          nome?: string
          partido?: string | null
          rede_id?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          aceite_lgpd_em: string | null
          created_at: string
          email: string
          foto_url: string | null
          id: string
          nome: string
          politico_id: string | null
          status: Database["public"]["Enums"]["entity_status"]
          telefone: string | null
          ultimo_acesso: string | null
          updated_at: string
        }
        Insert: {
          aceite_lgpd_em?: string | null
          created_at?: string
          email: string
          foto_url?: string | null
          id: string
          nome?: string
          politico_id?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          telefone?: string | null
          ultimo_acesso?: string | null
          updated_at?: string
        }
        Update: {
          aceite_lgpd_em?: string | null
          created_at?: string
          email?: string
          foto_url?: string | null
          id?: string
          nome?: string
          politico_id?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          telefone?: string | null
          ultimo_acesso?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_politico_fk"
            columns: ["politico_id"]
            isOneToOne: false
            referencedRelation: "politicos"
            referencedColumns: ["id"]
          },
        ]
      }
      resposta_itens: {
        Row: {
          created_at: string
          id: string
          numero: number | null
          opcao_id: string | null
          pergunta_id: string
          resposta_id: string
          texto: string | null
          texto_outro: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          numero?: number | null
          opcao_id?: string | null
          pergunta_id: string
          resposta_id: string
          texto?: string | null
          texto_outro?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          numero?: number | null
          opcao_id?: string | null
          pergunta_id?: string
          resposta_id?: string
          texto?: string | null
          texto_outro?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resposta_itens_opcao_id_fkey"
            columns: ["opcao_id"]
            isOneToOne: false
            referencedRelation: "enquete_opcoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resposta_itens_pergunta_id_fkey"
            columns: ["pergunta_id"]
            isOneToOne: false
            referencedRelation: "enquete_perguntas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resposta_itens_resposta_id_fkey"
            columns: ["resposta_id"]
            isOneToOne: false
            referencedRelation: "respostas"
            referencedColumns: ["id"]
          },
        ]
      }
      respostas: {
        Row: {
          arquivada: boolean
          candidato_id: string | null
          consentimento_lgpd: boolean
          coordenador_id: string | null
          created_at: string
          dispositivo: string | null
          eleitor_id: string | null
          email: string | null
          enquete_id: string
          id: string
          ip: string | null
          nome: string | null
          origem: string | null
          telefone: string | null
        }
        Insert: {
          arquivada?: boolean
          candidato_id?: string | null
          consentimento_lgpd?: boolean
          coordenador_id?: string | null
          created_at?: string
          dispositivo?: string | null
          eleitor_id?: string | null
          email?: string | null
          enquete_id: string
          id?: string
          ip?: string | null
          nome?: string | null
          origem?: string | null
          telefone?: string | null
        }
        Update: {
          arquivada?: boolean
          candidato_id?: string | null
          consentimento_lgpd?: boolean
          coordenador_id?: string | null
          created_at?: string
          dispositivo?: string | null
          eleitor_id?: string | null
          email?: string | null
          enquete_id?: string
          id?: string
          ip?: string | null
          nome?: string | null
          origem?: string | null
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "respostas_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "politicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_coordenador_id_fkey"
            columns: ["coordenador_id"]
            isOneToOne: false
            referencedRelation: "coordenadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_eleitor_id_fkey"
            columns: ["eleitor_id"]
            isOneToOne: false
            referencedRelation: "eleitores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_enquete_id_fkey"
            columns: ["enquete_id"]
            isOneToOne: false
            referencedRelation: "enquetes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_campanhas: {
        Row: {
          agendada_para: string | null
          concluida_em: string | null
          created_at: string
          created_by: string | null
          enquete_id: string | null
          filtro_bairro: string | null
          filtro_cidade: string | null
          id: string
          iniciada_em: string | null
          mensagem: string
          midia_legenda: string | null
          midia_nome: string | null
          midia_url: string | null
          nome: string
          politico_id: string
          status: string
          template_id: string | null
          tipo_midia: string
          total_alvo: number
          total_enviado: number
          total_falha: number
          updated_at: string
        }
        Insert: {
          agendada_para?: string | null
          concluida_em?: string | null
          created_at?: string
          created_by?: string | null
          enquete_id?: string | null
          filtro_bairro?: string | null
          filtro_cidade?: string | null
          id?: string
          iniciada_em?: string | null
          mensagem: string
          midia_legenda?: string | null
          midia_nome?: string | null
          midia_url?: string | null
          nome: string
          politico_id: string
          status?: string
          template_id?: string | null
          tipo_midia?: string
          total_alvo?: number
          total_enviado?: number
          total_falha?: number
          updated_at?: string
        }
        Update: {
          agendada_para?: string | null
          concluida_em?: string | null
          created_at?: string
          created_by?: string | null
          enquete_id?: string | null
          filtro_bairro?: string | null
          filtro_cidade?: string | null
          id?: string
          iniciada_em?: string | null
          mensagem?: string
          midia_legenda?: string | null
          midia_nome?: string | null
          midia_url?: string | null
          nome?: string
          politico_id?: string
          status?: string
          template_id?: string | null
          tipo_midia?: string
          total_alvo?: number
          total_enviado?: number
          total_falha?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_campanhas_enquete_id_fkey"
            columns: ["enquete_id"]
            isOneToOne: false
            referencedRelation: "enquetes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_campanhas_politico_id_fkey"
            columns: ["politico_id"]
            isOneToOne: false
            referencedRelation: "politicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_campanhas_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_config: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          instance_id: string | null
          politico_id: string
          telefone: string | null
          token: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          instance_id?: string | null
          politico_id: string
          telefone?: string | null
          token?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          instance_id?: string | null
          politico_id?: string
          telefone?: string | null
          token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_config_politico_id_fkey"
            columns: ["politico_id"]
            isOneToOne: true
            referencedRelation: "politicos"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_envios: {
        Row: {
          agendado_para: string | null
          campanha_id: string
          created_at: string
          eleitor_id: string | null
          enviado_em: string | null
          erro: string | null
          id: string
          lido_em: string | null
          mensagem: string
          status: string
          telefone: string
          tentativas: number
        }
        Insert: {
          agendado_para?: string | null
          campanha_id: string
          created_at?: string
          eleitor_id?: string | null
          enviado_em?: string | null
          erro?: string | null
          id?: string
          lido_em?: string | null
          mensagem: string
          status?: string
          telefone: string
          tentativas?: number
        }
        Update: {
          agendado_para?: string | null
          campanha_id?: string
          created_at?: string
          eleitor_id?: string | null
          enviado_em?: string | null
          erro?: string | null
          id?: string
          lido_em?: string | null
          mensagem?: string
          status?: string
          telefone?: string
          tentativas?: number
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_envios_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_envios_eleitor_id_fkey"
            columns: ["eleitor_id"]
            isOneToOne: false
            referencedRelation: "eleitores"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          conteudo: string
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          politico_id: string
          updated_at: string
        }
        Insert: {
          conteudo: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          politico_id: string
          updated_at?: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          politico_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_politico_id_fkey"
            columns: ["politico_id"]
            isOneToOne: false
            referencedRelation: "politicos"
            referencedColumns: ["id"]
          },
        ]
      }
      zapi_webhook_log: {
        Row: {
          created_at: string
          erro: string | null
          from_me: boolean | null
          id: string
          is_group: boolean | null
          payload: Json | null
          phone: string | null
          resultado: string | null
          tipo: string | null
        }
        Insert: {
          created_at?: string
          erro?: string | null
          from_me?: boolean | null
          id?: string
          is_group?: boolean | null
          payload?: Json | null
          phone?: string | null
          resultado?: string | null
          tipo?: string | null
        }
        Update: {
          created_at?: string
          erro?: string | null
          from_me?: boolean | null
          id?: string
          is_group?: boolean | null
          payload?: Json | null
          phone?: string | null
          resultado?: string | null
          tipo?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_enquete_template: {
        Args: { _enquete_id: string; _perguntas: Json }
        Returns: undefined
      }
      current_coordenador_id: { Args: never; Returns: string }
      current_politico_id: { Args: never; Returns: string }
      get_captacao_info: { Args: { p_token: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_user_active: { Args: { _user_id: string }; Returns: boolean }
      submit_captacao_publica: {
        Args: { p_payload: Json; p_token: string }
        Returns: Json
      }
      submit_resposta_publica: {
        Args: {
          p_consentimento: boolean
          p_cpf: string
          p_dispositivo: string
          p_email: string
          p_itens: Json
          p_nome: string
          p_origem: string
          p_slug: string
          p_telefone: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "gestor" | "coordenador" | "operador" | "visualizador"
      entity_status: "ativo" | "inativo" | "arquivado"
      pleito_status: "ativo" | "encerrado" | "arquivado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "gestor", "coordenador", "operador", "visualizador"],
      entity_status: ["ativo", "inativo", "arquivado"],
      pleito_status: ["ativo", "encerrado", "arquivado"],
    },
  },
} as const
