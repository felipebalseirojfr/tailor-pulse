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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      alertas_ocupacao: {
        Row: {
          capacidade_pecas: number
          created_at: string | null
          demanda_pecas: number
          id: string
          mes: string
          notificado_em: string | null
          ocupacao_percentual: number
          tipo_alerta: string
          visualizado: boolean | null
          visualizado_por: string | null
        }
        Insert: {
          capacidade_pecas: number
          created_at?: string | null
          demanda_pecas: number
          id?: string
          mes: string
          notificado_em?: string | null
          ocupacao_percentual: number
          tipo_alerta: string
          visualizado?: boolean | null
          visualizado_por?: string | null
        }
        Update: {
          capacidade_pecas?: number
          created_at?: string | null
          demanda_pecas?: number
          id?: string
          mes?: string
          notificado_em?: string | null
          ocupacao_percentual?: number
          tipo_alerta?: string
          visualizado?: boolean | null
          visualizado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alertas_ocupacao_visualizado_por_fkey"
            columns: ["visualizado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      aviamento_price_history: {
        Row: {
          aviamento_id: string
          changed_at: string
          changed_by: string | null
          id: string
          price_per_piece: number
        }
        Insert: {
          aviamento_id: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          price_per_piece: number
        }
        Update: {
          aviamento_id?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          price_per_piece?: number
        }
        Relationships: [
          {
            foreignKeyName: "aviamento_price_history_aviamento_id_fkey"
            columns: ["aviamento_id"]
            isOneToOne: false
            referencedRelation: "aviamentos_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      aviamentos: {
        Row: {
          ativo: boolean
          categoria: string
          cor: string | null
          created_at: string
          estoque: number
          id: string
          nome: string
          observacoes: string | null
          tamanho_medida: string | null
          unidade: Database["public"]["Enums"]["unidade_medida_aviamento"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria: string
          cor?: string | null
          created_at?: string
          estoque?: number
          id?: string
          nome: string
          observacoes?: string | null
          tamanho_medida?: string | null
          unidade: Database["public"]["Enums"]["unidade_medida_aviamento"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          cor?: string | null
          created_at?: string
          estoque?: number
          id?: string
          nome?: string
          observacoes?: string | null
          tamanho_medida?: string | null
          unidade?: Database["public"]["Enums"]["unidade_medida_aviamento"]
          updated_at?: string
        }
        Relationships: []
      }
      aviamentos_catalog: {
        Row: {
          active: boolean
          created_at: string
          current_price_per_piece: number
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          current_price_per_piece?: number
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          current_price_per_piece?: number
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      aviamentos_fornecedores_precos: {
        Row: {
          ativo: boolean
          aviamento_id: string
          created_at: string
          fornecedor_id: string
          id: string
          preco_por_unidade: number
          ultima_atualizacao: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          aviamento_id: string
          created_at?: string
          fornecedor_id: string
          id?: string
          preco_por_unidade: number
          ultima_atualizacao?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          aviamento_id?: string
          created_at?: string
          fornecedor_id?: string
          id?: string
          preco_por_unidade?: number
          ultima_atualizacao?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aviamentos_fornecedores_precos_aviamento_id_fkey"
            columns: ["aviamento_id"]
            isOneToOne: false
            referencedRelation: "aviamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aviamentos_fornecedores_precos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      capacidade_mensal: {
        Row: {
          capacidade_pecas: number
          created_at: string | null
          id: string
          mes: string
          observacoes: string | null
          updated_at: string | null
        }
        Insert: {
          capacidade_pecas: number
          created_at?: string | null
          id?: string
          mes: string
          observacoes?: string | null
          updated_at?: string | null
        }
        Update: {
          capacidade_pecas?: number
          created_at?: string | null
          id?: string
          mes?: string
          observacoes?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      clientes: {
        Row: {
          abreviacao_2_letras: string | null
          active: boolean
          cnpj: string | null
          contato: string | null
          created_at: string | null
          email: string | null
          endereco: string | null
          id: string
          nome: string
          observacoes_gerais: string | null
          status_geral: string | null
          telefone: string | null
          total_pedidos_ativos: number | null
          updated_at: string | null
        }
        Insert: {
          abreviacao_2_letras?: string | null
          active?: boolean
          cnpj?: string | null
          contato?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          observacoes_gerais?: string | null
          status_geral?: string | null
          telefone?: string | null
          total_pedidos_ativos?: number | null
          updated_at?: string | null
        }
        Update: {
          abreviacao_2_letras?: string | null
          active?: boolean
          cnpj?: string | null
          contato?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          observacoes_gerais?: string | null
          status_geral?: string | null
          telefone?: string | null
          total_pedidos_ativos?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      company_parameters: {
        Row: {
          accounting: number
          bad_debt_provision_pct: number
          capital_cost_monthly_pct: number
          cash_payment_pct: number
          commission_default_pct: number
          created_at: string
          created_by: string | null
          cut_inputs_per_piece: number
          default_lead_time_days: number
          effective_from: string
          effective_to: string | null
          id: string
          installment_avg_days: number
          logistics_operational: number
          margin_comfort_pct: number
          margin_floor_pct: number
          margin_premium_pct: number
          margin_target_pct: number
          monthly_capacity_pieces: number
          notes: string | null
          prolabore: number
          rent: number
          software: number
          tax_das_pct: number
          tax_others_pct: number
          team_internal: number
          updated_at: string
          utilities: number
        }
        Insert: {
          accounting?: number
          bad_debt_provision_pct?: number
          capital_cost_monthly_pct?: number
          cash_payment_pct?: number
          commission_default_pct?: number
          created_at?: string
          created_by?: string | null
          cut_inputs_per_piece?: number
          default_lead_time_days?: number
          effective_from?: string
          effective_to?: string | null
          id?: string
          installment_avg_days?: number
          logistics_operational?: number
          margin_comfort_pct?: number
          margin_floor_pct?: number
          margin_premium_pct?: number
          margin_target_pct?: number
          monthly_capacity_pieces?: number
          notes?: string | null
          prolabore?: number
          rent?: number
          software?: number
          tax_das_pct?: number
          tax_others_pct?: number
          team_internal?: number
          updated_at?: string
          utilities?: number
        }
        Update: {
          accounting?: number
          bad_debt_provision_pct?: number
          capital_cost_monthly_pct?: number
          cash_payment_pct?: number
          commission_default_pct?: number
          created_at?: string
          created_by?: string | null
          cut_inputs_per_piece?: number
          default_lead_time_days?: number
          effective_from?: string
          effective_to?: string | null
          id?: string
          installment_avg_days?: number
          logistics_operational?: number
          margin_comfort_pct?: number
          margin_floor_pct?: number
          margin_premium_pct?: number
          margin_target_pct?: number
          monthly_capacity_pieces?: number
          notes?: string | null
          prolabore?: number
          rent?: number
          software?: number
          tax_das_pct?: number
          tax_others_pct?: number
          team_internal?: number
          updated_at?: string
          utilities?: number
        }
        Relationships: []
      }
      company_profile: {
        Row: {
          address: string | null
          cnpj: string | null
          created_at: string
          default_payment_terms: string | null
          default_production_lead_text: string | null
          email: string | null
          footer_text: string | null
          id: string
          legal_name: string | null
          logo_url: string | null
          phone: string | null
          proposal_validity_text: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          created_at?: string
          default_payment_terms?: string | null
          default_production_lead_text?: string | null
          email?: string | null
          footer_text?: string | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          phone?: string | null
          proposal_validity_text?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          created_at?: string
          default_payment_terms?: string | null
          default_production_lead_text?: string | null
          email?: string | null
          footer_text?: string | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          phone?: string | null
          proposal_validity_text?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      escaneamentos_qr: {
        Row: {
          created_at: string
          device_fingerprint: string
          escaneado_em: string
          etapa_atualizada: string
          fornecedor_nome: string | null
          id: string
          ip_address: string | null
          pedido_id: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          device_fingerprint: string
          escaneado_em?: string
          etapa_atualizada: string
          fornecedor_nome?: string | null
          id?: string
          ip_address?: string | null
          pedido_id: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          device_fingerprint?: string
          escaneado_em?: string
          etapa_atualizada?: string
          fornecedor_nome?: string | null
          id?: string
          ip_address?: string | null
          pedido_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escaneamentos_qr_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      etapas_producao: {
        Row: {
          created_at: string | null
          data_inicio: string | null
          data_inicio_prevista: string | null
          data_termino: string | null
          data_termino_prevista: string | null
          id: string
          observacoes: string | null
          ordem: number
          pedido_id: string
          referencia_id: string | null
          responsavel_id: string | null
          status: Database["public"]["Enums"]["status_etapa"] | null
          terceiro_id: string | null
          tipo_etapa: Database["public"]["Enums"]["tipo_etapa"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_inicio?: string | null
          data_inicio_prevista?: string | null
          data_termino?: string | null
          data_termino_prevista?: string | null
          id?: string
          observacoes?: string | null
          ordem: number
          pedido_id: string
          referencia_id?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["status_etapa"] | null
          terceiro_id?: string | null
          tipo_etapa: Database["public"]["Enums"]["tipo_etapa"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_inicio?: string | null
          data_inicio_prevista?: string | null
          data_termino?: string | null
          data_termino_prevista?: string | null
          id?: string
          observacoes?: string | null
          ordem?: number
          pedido_id?: string
          referencia_id?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["status_etapa"] | null
          terceiro_id?: string | null
          tipo_etapa?: Database["public"]["Enums"]["tipo_etapa"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "etapas_producao_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etapas_producao_referencia_id_fkey"
            columns: ["referencia_id"]
            isOneToOne: false
            referencedRelation: "referencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etapas_producao_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etapas_producao_terceiro_id_fkey"
            columns: ["terceiro_id"]
            isOneToOne: false
            referencedRelation: "terceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      fabric_price_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          fabric_id: string
          id: string
          price_per_kg: number
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          fabric_id: string
          id?: string
          price_per_kg: number
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          fabric_id?: string
          id?: string
          price_per_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "fabric_price_history_fabric_id_fkey"
            columns: ["fabric_id"]
            isOneToOne: false
            referencedRelation: "fabrics_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      fabrics_catalog: {
        Row: {
          active: boolean
          created_at: string
          current_price_per_kg: number
          grams_per_meter: number | null
          id: string
          name: string
          notes: string | null
          stock_kg: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          current_price_per_kg?: number
          grams_per_meter?: number | null
          id?: string
          name: string
          notes?: string | null
          stock_kg?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          current_price_per_kg?: number
          grams_per_meter?: number | null
          id?: string
          name?: string
          notes?: string | null
          stock_kg?: number
          updated_at?: string
        }
        Relationships: []
      }
      fechamentos: {
        Row: {
          arquivo_nf_url: string | null
          cliente_id: string
          created_at: string
          data_emissao_nf: string | null
          data_entrada: string | null
          data_fechamento: string | null
          data_saida: string | null
          grade_entrada: Json | null
          grade_saida: Json | null
          id: string
          numero_nf: string | null
          observacao_perda: string | null
          pedido_id: string
          quantidade_caixas: number | null
          quantidade_entrada: number | null
          quantidade_prevista: number
          quantidade_saida: number | null
          referencia_id: string | null
          responsavel_entrada: string | null
          responsavel_saida: string | null
          status_nf: Database["public"]["Enums"]["status_nf_fechamento"]
          updated_at: string
        }
        Insert: {
          arquivo_nf_url?: string | null
          cliente_id: string
          created_at?: string
          data_emissao_nf?: string | null
          data_entrada?: string | null
          data_fechamento?: string | null
          data_saida?: string | null
          grade_entrada?: Json | null
          grade_saida?: Json | null
          id?: string
          numero_nf?: string | null
          observacao_perda?: string | null
          pedido_id: string
          quantidade_caixas?: number | null
          quantidade_entrada?: number | null
          quantidade_prevista?: number
          quantidade_saida?: number | null
          referencia_id?: string | null
          responsavel_entrada?: string | null
          responsavel_saida?: string | null
          status_nf?: Database["public"]["Enums"]["status_nf_fechamento"]
          updated_at?: string
        }
        Update: {
          arquivo_nf_url?: string | null
          cliente_id?: string
          created_at?: string
          data_emissao_nf?: string | null
          data_entrada?: string | null
          data_fechamento?: string | null
          data_saida?: string | null
          grade_entrada?: Json | null
          grade_saida?: Json | null
          id?: string
          numero_nf?: string | null
          observacao_perda?: string | null
          pedido_id?: string
          quantidade_caixas?: number | null
          quantidade_entrada?: number | null
          quantidade_prevista?: number
          quantidade_saida?: number | null
          referencia_id?: string | null
          responsavel_entrada?: string | null
          responsavel_saida?: string | null
          status_nf?: Database["public"]["Enums"]["status_nf_fechamento"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fechamentos_referencia_id_fkey"
            columns: ["referencia_id"]
            isOneToOne: false
            referencedRelation: "referencias"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          ativo: boolean
          cnpj: string | null
          contato_nome: string | null
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cnpj?: string | null
          contato_nome?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cnpj?: string | null
          contato_nome?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lead_interacoes: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          resumo: string
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          resumo: string
          tipo?: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          resumo?: string
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_interacoes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_interacoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          cidade: string | null
          contato_email: string | null
          contato_instagram: string | null
          contato_nome: string | null
          contato_whatsapp: string | null
          created_at: string
          data_proxima_acao: string
          estado: string | null
          id: string
          lead_nome: string
          observacoes: string | null
          origem: Database["public"]["Enums"]["origem_comercial"] | null
          proxima_acao: string
          responsavel_id: string
          segmento: Database["public"]["Enums"]["segmento_comercial"] | null
          status_prospeccao: Database["public"]["Enums"]["status_prospeccao"]
          ticket_estimado: number | null
          updated_at: string
          volume_estimado: number | null
        }
        Insert: {
          cidade?: string | null
          contato_email?: string | null
          contato_instagram?: string | null
          contato_nome?: string | null
          contato_whatsapp?: string | null
          created_at?: string
          data_proxima_acao: string
          estado?: string | null
          id?: string
          lead_nome: string
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["origem_comercial"] | null
          proxima_acao: string
          responsavel_id: string
          segmento?: Database["public"]["Enums"]["segmento_comercial"] | null
          status_prospeccao?: Database["public"]["Enums"]["status_prospeccao"]
          ticket_estimado?: number | null
          updated_at?: string
          volume_estimado?: number | null
        }
        Update: {
          cidade?: string | null
          contato_email?: string | null
          contato_instagram?: string | null
          contato_nome?: string | null
          contato_whatsapp?: string | null
          created_at?: string
          data_proxima_acao?: string
          estado?: string | null
          id?: string
          lead_nome?: string
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["origem_comercial"] | null
          proxima_acao?: string
          responsavel_id?: string
          segmento?: Database["public"]["Enums"]["segmento_comercial"] | null
          status_prospeccao?: Database["public"]["Enums"]["status_prospeccao"]
          ticket_estimado?: number | null
          updated_at?: string
          volume_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_targets: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          month: number
          target_revenue: number
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          month: number
          target_revenue?: number
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          month?: number
          target_revenue?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      negociacao_interacoes: {
        Row: {
          created_at: string
          id: string
          negociacao_id: string
          resumo: string
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          negociacao_id: string
          resumo: string
          tipo?: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          negociacao_id?: string
          resumo?: string
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "negociacao_interacoes_negociacao_id_fkey"
            columns: ["negociacao_id"]
            isOneToOne: false
            referencedRelation: "negociacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negociacao_interacoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      negociacoes: {
        Row: {
          bloqueado_por:
            | Database["public"]["Enums"]["bloqueado_por_comercial"]
            | null
          created_at: string
          data_proxima_acao: string
          data_ultima_interacao: string | null
          id: string
          lead_origem_id: string | null
          marca_nome: string
          observacoes: string | null
          origem: Database["public"]["Enums"]["origem_comercial"] | null
          previsao_fechamento: string | null
          prioridade: Database["public"]["Enums"]["prioridade_comercial"]
          proxima_acao: string
          responsavel_id: string
          segmento: Database["public"]["Enums"]["segmento_comercial"] | null
          status_pipeline: Database["public"]["Enums"]["status_pipeline"]
          temperatura:
            | Database["public"]["Enums"]["temperatura_comercial"]
            | null
          ticket_estimado_mes: number | null
          updated_at: string
          volume_estimado_mes: number | null
        }
        Insert: {
          bloqueado_por?:
            | Database["public"]["Enums"]["bloqueado_por_comercial"]
            | null
          created_at?: string
          data_proxima_acao: string
          data_ultima_interacao?: string | null
          id?: string
          lead_origem_id?: string | null
          marca_nome: string
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["origem_comercial"] | null
          previsao_fechamento?: string | null
          prioridade?: Database["public"]["Enums"]["prioridade_comercial"]
          proxima_acao: string
          responsavel_id: string
          segmento?: Database["public"]["Enums"]["segmento_comercial"] | null
          status_pipeline?: Database["public"]["Enums"]["status_pipeline"]
          temperatura?:
            | Database["public"]["Enums"]["temperatura_comercial"]
            | null
          ticket_estimado_mes?: number | null
          updated_at?: string
          volume_estimado_mes?: number | null
        }
        Update: {
          bloqueado_por?:
            | Database["public"]["Enums"]["bloqueado_por_comercial"]
            | null
          created_at?: string
          data_proxima_acao?: string
          data_ultima_interacao?: string | null
          id?: string
          lead_origem_id?: string | null
          marca_nome?: string
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["origem_comercial"] | null
          previsao_fechamento?: string | null
          prioridade?: Database["public"]["Enums"]["prioridade_comercial"]
          proxima_acao?: string
          responsavel_id?: string
          segmento?: Database["public"]["Enums"]["segmento_comercial"] | null
          status_pipeline?: Database["public"]["Enums"]["status_pipeline"]
          temperatura?:
            | Database["public"]["Enums"]["temperatura_comercial"]
            | null
          ticket_estimado_mes?: number | null
          updated_at?: string
          volume_estimado_mes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "negociacoes_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          arquivos: Json | null
          aviamentos: string[] | null
          cliente_id: string
          codigo_pedido: string | null
          codigo_produto_cliente: string | null
          comentario_corte: string | null
          composicao_tecido: string | null
          cor_tecido: string | null
          corte_prioritario: boolean
          created_at: string | null
          data_inicio: string
          etiqueta_composicao_responsavel: string | null
          foto_modelo_url: string | null
          grade_corte_real: Json | null
          grade_tamanhos: Json | null
          id: string
          observacoes_pedido: string | null
          observacoes_personalizacao: Json | null
          prazo_final: string
          preco_venda: number | null
          prioridade: Database["public"]["Enums"]["prioridade_pedido"] | null
          produto_modelo: string
          progresso_percentual: number | null
          qr_code_gerado_em: string | null
          qr_code_link: string | null
          qr_code_ref: string | null
          quantidade_total: number
          quantidade_total_referencias: number | null
          responsavel_comercial_id: string
          status_geral: string | null
          tecido: string | null
          tem_personalizacao: boolean | null
          tipo_peca: string
          tipos_personalizacao: string[] | null
          updated_at: string | null
          valor_total_pedido: number | null
        }
        Insert: {
          arquivos?: Json | null
          aviamentos?: string[] | null
          cliente_id: string
          codigo_pedido?: string | null
          codigo_produto_cliente?: string | null
          comentario_corte?: string | null
          composicao_tecido?: string | null
          cor_tecido?: string | null
          corte_prioritario?: boolean
          created_at?: string | null
          data_inicio: string
          etiqueta_composicao_responsavel?: string | null
          foto_modelo_url?: string | null
          grade_corte_real?: Json | null
          grade_tamanhos?: Json | null
          id?: string
          observacoes_pedido?: string | null
          observacoes_personalizacao?: Json | null
          prazo_final: string
          preco_venda?: number | null
          prioridade?: Database["public"]["Enums"]["prioridade_pedido"] | null
          produto_modelo: string
          progresso_percentual?: number | null
          qr_code_gerado_em?: string | null
          qr_code_link?: string | null
          qr_code_ref?: string | null
          quantidade_total: number
          quantidade_total_referencias?: number | null
          responsavel_comercial_id: string
          status_geral?: string | null
          tecido?: string | null
          tem_personalizacao?: boolean | null
          tipo_peca: string
          tipos_personalizacao?: string[] | null
          updated_at?: string | null
          valor_total_pedido?: number | null
        }
        Update: {
          arquivos?: Json | null
          aviamentos?: string[] | null
          cliente_id?: string
          codigo_pedido?: string | null
          codigo_produto_cliente?: string | null
          comentario_corte?: string | null
          composicao_tecido?: string | null
          cor_tecido?: string | null
          corte_prioritario?: boolean
          created_at?: string | null
          data_inicio?: string
          etiqueta_composicao_responsavel?: string | null
          foto_modelo_url?: string | null
          grade_corte_real?: Json | null
          grade_tamanhos?: Json | null
          id?: string
          observacoes_pedido?: string | null
          observacoes_personalizacao?: Json | null
          prazo_final?: string
          preco_venda?: number | null
          prioridade?: Database["public"]["Enums"]["prioridade_pedido"] | null
          produto_modelo?: string
          progresso_percentual?: number | null
          qr_code_gerado_em?: string | null
          qr_code_link?: string | null
          qr_code_ref?: string | null
          quantidade_total?: number
          quantidade_total_referencias?: number | null
          responsavel_comercial_id?: string
          status_geral?: string | null
          tecido?: string | null
          tem_personalizacao?: boolean | null
          tipo_peca?: string
          tipos_personalizacao?: string[] | null
          updated_at?: string | null
          valor_total_pedido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_responsavel_comercial_id_fkey"
            columns: ["responsavel_comercial_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_auditoria: {
        Row: {
          acao: string
          campos_alterados: Json | null
          created_at: string | null
          dados_antes: Json | null
          dados_depois: Json | null
          id: string
          ip_address: string | null
          pedido_id: string
          user_agent: string | null
          usuario_id: string | null
          usuario_nome: string | null
        }
        Insert: {
          acao: string
          campos_alterados?: Json | null
          created_at?: string | null
          dados_antes?: Json | null
          dados_depois?: Json | null
          id?: string
          ip_address?: string | null
          pedido_id: string
          user_agent?: string | null
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Update: {
          acao?: string
          campos_alterados?: Json | null
          created_at?: string | null
          dados_antes?: Json | null
          dados_depois?: Json | null
          id?: string
          ip_address?: string | null
          pedido_id?: string
          user_agent?: string | null
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_auditoria_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          cargo: string | null
          created_at: string | null
          email: string
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          cargo?: string | null
          created_at?: string | null
          email: string
          id: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          cargo?: string | null
          created_at?: string | null
          email?: string
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      quote_activity_log: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          quote_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          quote_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          quote_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_activity_log_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_aviamentos: {
        Row: {
          aviamento_id: string | null
          cost_per_piece: number
          created_at: string
          id: string
          item_label: string
          quote_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          aviamento_id?: string | null
          cost_per_piece?: number
          created_at?: string
          id?: string
          item_label: string
          quote_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          aviamento_id?: string | null
          cost_per_piece?: number
          created_at?: string
          id?: string
          item_label?: string
          quote_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_aviamentos_aviamento_id_fkey"
            columns: ["aviamento_id"]
            isOneToOne: false
            referencedRelation: "aviamentos_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_aviamentos_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_customizations: {
        Row: {
          cost_per_piece: number
          created_at: string
          fixed_cost: number
          id: string
          item_label: string
          quote_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          cost_per_piece?: number
          created_at?: string
          fixed_cost?: number
          id?: string
          item_label: string
          quote_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          cost_per_piece?: number
          created_at?: string
          fixed_cost?: number
          id?: string
          item_label?: string
          quote_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_customizations_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_deliveries: {
        Row: {
          created_at: string
          expected_delivery_date: string
          id: string
          production_status: string
          quantity: number
          quote_id: string
          sort_order: number
          status_notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          expected_delivery_date: string
          id?: string
          production_status?: string
          quantity: number
          quote_id: string
          sort_order?: number
          status_notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          expected_delivery_date?: string
          id?: string
          production_status?: string
          quantity?: number
          quote_id?: string
          sort_order?: number
          status_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_deliveries_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_development: {
        Row: {
          created_at: string
          id: string
          item_label: string
          quote_id: string
          sort_order: number
          total_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_label: string
          quote_id: string
          sort_order?: number
          total_cost?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_label?: string
          quote_id?: string
          sort_order?: number
          total_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_development_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_logistics: {
        Row: {
          created_at: string
          id: string
          item_label: string
          quote_id: string
          sort_order: number
          total_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_label: string
          quote_id: string
          sort_order?: number
          total_cost?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_label?: string
          quote_id?: string
          sort_order?: number
          total_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_logistics_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_materials: {
        Row: {
          consumption_kg: number
          created_at: string
          fabric_id: string | null
          id: string
          item_label: string
          price_per_kg: number
          quote_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          consumption_kg?: number
          created_at?: string
          fabric_id?: string | null
          id?: string
          item_label: string
          price_per_kg?: number
          quote_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          consumption_kg?: number
          created_at?: string
          fabric_id?: string | null
          id?: string
          item_label?: string
          price_per_kg?: number
          quote_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_materials_fabric_id_fkey"
            columns: ["fabric_id"]
            isOneToOne: false
            referencedRelation: "fabrics_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_materials_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_number_seq: {
        Row: {
          last_seq: number
          year: number
        }
        Insert: {
          last_seq?: number
          year: number
        }
        Update: {
          last_seq?: number
          year?: number
        }
        Relationships: []
      }
      quote_processes: {
        Row: {
          cost_per_piece: number
          created_at: string
          id: string
          process_label: string
          quote_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          cost_per_piece?: number
          created_at?: string
          id?: string
          process_label: string
          quote_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          cost_per_piece?: number
          created_at?: string
          id?: string
          process_label?: string
          quote_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_processes_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          cash_payment_pct: number | null
          charged_price: number | null
          client_id: string
          commission_pct: number
          created_at: string
          created_by: string | null
          id: string
          installment_avg_days: number | null
          loss_reason: string | null
          parameters_snapshot_id: string | null
          parent_quote_id: string | null
          piece_description: string
          quantity: number | null
          quote_date: string
          quote_number: string
          reference_code: string | null
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          cash_payment_pct?: number | null
          charged_price?: number | null
          client_id: string
          commission_pct?: number
          created_at?: string
          created_by?: string | null
          id?: string
          installment_avg_days?: number | null
          loss_reason?: string | null
          parameters_snapshot_id?: string | null
          parent_quote_id?: string | null
          piece_description: string
          quantity?: number | null
          quote_date?: string
          quote_number?: string
          reference_code?: string | null
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          cash_payment_pct?: number | null
          charged_price?: number | null
          client_id?: string
          commission_pct?: number
          created_at?: string
          created_by?: string | null
          id?: string
          installment_avg_days?: number | null
          loss_reason?: string | null
          parameters_snapshot_id?: string | null
          parent_quote_id?: string | null
          piece_description?: string
          quantity?: number | null
          quote_date?: string
          quote_number?: string
          reference_code?: string | null
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_parameters_snapshot_id_fkey"
            columns: ["parameters_snapshot_id"]
            isOneToOne: false
            referencedRelation: "company_parameters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_parent_quote_id_fkey"
            columns: ["parent_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      referencias: {
        Row: {
          ativo: boolean
          cliente_id: string
          codigo: string
          created_at: string
          criado_por: string | null
          descricao: string | null
          id: string
          modelagem_origem_id: string | null
          sequencial: number
          status: string
          tipo_peca_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cliente_id: string
          codigo: string
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          modelagem_origem_id?: string | null
          sequencial: number
          status?: string
          tipo_peca_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cliente_id?: string
          codigo?: string
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          modelagem_origem_id?: string | null
          sequencial?: number
          status?: string
          tipo_peca_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referencias_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referencias_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referencias_modelagem_origem_id_fkey"
            columns: ["modelagem_origem_id"]
            isOneToOne: false
            referencedRelation: "referencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referencias_tipo_peca_id_fkey"
            columns: ["tipo_peca_id"]
            isOneToOne: false
            referencedRelation: "tipos_peca"
            referencedColumns: ["id"]
          },
        ]
      }
      tecidos: {
        Row: {
          ativo: boolean
          composicao: string
          created_at: string
          gramatura_g_m2: number
          id: string
          largura_m: number
          nome: string
          observacoes: string | null
          rendimento_m_kg: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          composicao: string
          created_at?: string
          gramatura_g_m2: number
          id?: string
          largura_m: number
          nome: string
          observacoes?: string | null
          rendimento_m_kg: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          composicao?: string
          created_at?: string
          gramatura_g_m2?: number
          id?: string
          largura_m?: number
          nome?: string
          observacoes?: string | null
          rendimento_m_kg?: number
          updated_at?: string
        }
        Relationships: []
      }
      tecidos_fornecedores_precos: {
        Row: {
          ativo: boolean
          created_at: string
          fornecedor_id: string
          id: string
          preco_por_kg: number
          tecido_variacao_id: string
          ultima_atualizacao: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          fornecedor_id: string
          id?: string
          preco_por_kg: number
          tecido_variacao_id: string
          ultima_atualizacao?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          fornecedor_id?: string
          id?: string
          preco_por_kg?: number
          tecido_variacao_id?: string
          ultima_atualizacao?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tecidos_fornecedores_precos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tecidos_fornecedores_precos_tecido_variacao_id_fkey"
            columns: ["tecido_variacao_id"]
            isOneToOne: false
            referencedRelation: "tecidos_variacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      tecidos_variacoes: {
        Row: {
          ativo: boolean
          cor: string
          created_at: string
          estoque_kg: number
          id: string
          tecido_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor: string
          created_at?: string
          estoque_kg?: number
          id?: string
          tecido_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string
          created_at?: string
          estoque_kg?: number
          id?: string
          tecido_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tecidos_variacoes_tecido_id_fkey"
            columns: ["tecido_id"]
            isOneToOne: false
            referencedRelation: "tecidos"
            referencedColumns: ["id"]
          },
        ]
      }
      terceiros: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          nome: string
          tipo_etapa: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome: string
          tipo_etapa: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome?: string
          tipo_etapa?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tipos_peca: {
        Row: {
          abreviacao_2_letras: string
          ativo: boolean
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          abreviacao_2_letras: string
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          abreviacao_2_letras?: string
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      etapa_em_atraso: {
        Args: {
          etapa_row: Database["public"]["Tables"]["etapas_producao"]["Row"]
        }
        Returns: boolean
      }
      gerar_codigo_op: { Args: never; Returns: string }
      gerar_codigo_op_aleatorio: { Args: never; Returns: string }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_quote_number: { Args: never; Returns: string }
      proximo_sequencial_referencia: {
        Args: { _cliente_id: string; _tipo_peca_id: string }
        Returns: number
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "commercial"
        | "production"
        | "viewer"
        | "pcp_closer"
        | "backoffice_fiscal"
        | "corte"
      bloqueado_por_comercial:
        | "aguardando_cliente"
        | "aguardando_interno"
        | "aguardando_piloto"
        | "aguardando_proposta"
        | "outro"
      etapa_referencia: "corte" | "costura" | "acabamento" | "pronto"
      origem_comercial:
        | "indicacao"
        | "instagram"
        | "evento"
        | "pesquisa_ativa"
        | "representante"
        | "outro"
      prioridade_comercial: "alta" | "media" | "baixa"
      prioridade_pedido: "baixa" | "media" | "alta"
      segmento_comercial:
        | "private_label_moda"
        | "uniformes"
        | "esportivo"
        | "outros"
      status_etapa: "pendente" | "em_andamento" | "concluido"
      status_nf_fechamento: "pendente" | "emitida"
      status_pipeline:
        | "lead_qualificado"
        | "reuniao_realizada"
        | "interesse_confirmado"
        | "escopo_definido"
        | "piloto_solicitada"
        | "piloto_enviada"
        | "proposta_comercial"
        | "negociacao"
        | "fechado"
        | "perdido"
      status_prospeccao:
        | "identificado"
        | "contato_feito"
        | "reuniao_marcada"
        | "qualificado"
        | "descartado"
      temperatura_comercial: "frio" | "morno" | "quente"
      tipo_etapa:
        | "pilotagem"
        | "liberacao_corte"
        | "corte"
        | "lavanderia"
        | "costura"
        | "caseado"
        | "estamparia_bordado"
        | "acabamento"
        | "entrega"
        | "estamparia"
        | "bordado"
        | "compra_de_insumos"
        | "aplicacao_travete"
      unidade_medida_aviamento:
        | "peca"
        | "kg"
        | "metro"
        | "cone"
        | "metragem"
        | "rolo"
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
      app_role: [
        "admin",
        "commercial",
        "production",
        "viewer",
        "pcp_closer",
        "backoffice_fiscal",
        "corte",
      ],
      bloqueado_por_comercial: [
        "aguardando_cliente",
        "aguardando_interno",
        "aguardando_piloto",
        "aguardando_proposta",
        "outro",
      ],
      etapa_referencia: ["corte", "costura", "acabamento", "pronto"],
      origem_comercial: [
        "indicacao",
        "instagram",
        "evento",
        "pesquisa_ativa",
        "representante",
        "outro",
      ],
      prioridade_comercial: ["alta", "media", "baixa"],
      prioridade_pedido: ["baixa", "media", "alta"],
      segmento_comercial: [
        "private_label_moda",
        "uniformes",
        "esportivo",
        "outros",
      ],
      status_etapa: ["pendente", "em_andamento", "concluido"],
      status_nf_fechamento: ["pendente", "emitida"],
      status_pipeline: [
        "lead_qualificado",
        "reuniao_realizada",
        "interesse_confirmado",
        "escopo_definido",
        "piloto_solicitada",
        "piloto_enviada",
        "proposta_comercial",
        "negociacao",
        "fechado",
        "perdido",
      ],
      status_prospeccao: [
        "identificado",
        "contato_feito",
        "reuniao_marcada",
        "qualificado",
        "descartado",
      ],
      temperatura_comercial: ["frio", "morno", "quente"],
      tipo_etapa: [
        "pilotagem",
        "liberacao_corte",
        "corte",
        "lavanderia",
        "costura",
        "caseado",
        "estamparia_bordado",
        "acabamento",
        "entrega",
        "estamparia",
        "bordado",
        "compra_de_insumos",
        "aplicacao_travete",
      ],
      unidade_medida_aviamento: [
        "peca",
        "kg",
        "metro",
        "cone",
        "metragem",
        "rolo",
      ],
    },
  },
} as const
