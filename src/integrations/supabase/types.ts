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
          contato: string | null
          created_at: string | null
          email: string | null
          id: string
          nome: string
          observacoes_gerais: string | null
          status_geral: string | null
          telefone: string | null
          total_pedidos_ativos: number | null
          updated_at: string | null
        }
        Insert: {
          contato?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome: string
          observacoes_gerais?: string | null
          status_geral?: string | null
          telefone?: string | null
          total_pedidos_ativos?: number | null
          updated_at?: string | null
        }
        Update: {
          contato?: string | null
          created_at?: string | null
          email?: string | null
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
            foreignKeyName: "etapas_producao_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_referencia"
            columns: ["referencia_id"]
            isOneToOne: false
            referencedRelation: "referencias"
            referencedColumns: ["id"]
          },
        ]
      }
      fechamento_itens: {
        Row: {
          caixas: number | null
          cor: string
          created_at: string | null
          fechamento_id: string
          id: string
          modelo: string
          saldo_a_fechar: number
          sku: string
          tamanho: string
          total_calculado: number | null
          unidades: number | null
          updated_at: string | null
        }
        Insert: {
          caixas?: number | null
          cor: string
          created_at?: string | null
          fechamento_id: string
          id?: string
          modelo: string
          saldo_a_fechar?: number
          sku: string
          tamanho: string
          total_calculado?: number | null
          unidades?: number | null
          updated_at?: string | null
        }
        Update: {
          caixas?: number | null
          cor?: string
          created_at?: string | null
          fechamento_id?: string
          id?: string
          modelo?: string
          saldo_a_fechar?: number
          sku?: string
          tamanho?: string
          total_calculado?: number | null
          unidades?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fechamento_itens_fechamento_id_fkey"
            columns: ["fechamento_id"]
            isOneToOne: false
            referencedRelation: "fechamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      fechamento_logs: {
        Row: {
          acao: string
          created_at: string | null
          dados_antes: Json | null
          dados_depois: Json | null
          fechamento_id: string
          id: string
          ip_address: string | null
          user_agent: string | null
          usuario_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string | null
          dados_antes?: Json | null
          dados_depois?: Json | null
          fechamento_id: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string | null
          dados_antes?: Json | null
          dados_depois?: Json | null
          fechamento_id?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fechamento_logs_fechamento_id_fkey"
            columns: ["fechamento_id"]
            isOneToOne: false
            referencedRelation: "fechamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      fechamentos: {
        Row: {
          atribuido_para: string | null
          created_at: string | null
          data_emissao_nf: string | null
          fechado_em: string | null
          fechado_por: string | null
          foto_caderno_url: string | null
          id: string
          link_arquivo_nf: string | null
          lote_of: string
          numero_nf: string | null
          observacoes: string | null
          pedido_id: string
          referencia_id: string | null
          status: string
          status_nf: string | null
          updated_at: string | null
          valor_total_nf: number | null
        }
        Insert: {
          atribuido_para?: string | null
          created_at?: string | null
          data_emissao_nf?: string | null
          fechado_em?: string | null
          fechado_por?: string | null
          foto_caderno_url?: string | null
          id?: string
          link_arquivo_nf?: string | null
          lote_of: string
          numero_nf?: string | null
          observacoes?: string | null
          pedido_id: string
          referencia_id?: string | null
          status?: string
          status_nf?: string | null
          updated_at?: string | null
          valor_total_nf?: number | null
        }
        Update: {
          atribuido_para?: string | null
          created_at?: string | null
          data_emissao_nf?: string | null
          fechado_em?: string | null
          fechado_por?: string | null
          foto_caderno_url?: string | null
          id?: string
          link_arquivo_nf?: string | null
          lote_of?: string
          numero_nf?: string | null
          observacoes?: string | null
          pedido_id?: string
          referencia_id?: string | null
          status?: string
          status_nf?: string | null
          updated_at?: string | null
          valor_total_nf?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fechamentos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fechamentos_referencia_id_fkey"
            columns: ["referencia_id"]
            isOneToOne: false
            referencedRelation: "referencias"
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
          composicao_tecido: string | null
          created_at: string | null
          data_inicio: string
          grade_tamanhos: Json | null
          id: string
          observacoes_pedido: string | null
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
          composicao_tecido?: string | null
          created_at?: string | null
          data_inicio: string
          grade_tamanhos?: Json | null
          id?: string
          observacoes_pedido?: string | null
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
          composicao_tecido?: string | null
          created_at?: string | null
          data_inicio?: string
          grade_tamanhos?: Json | null
          id?: string
          observacoes_pedido?: string | null
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
          cargo: string | null
          created_at: string | null
          email: string
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          cargo?: string | null
          created_at?: string | null
          email: string
          id: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          cargo?: string | null
          created_at?: string | null
          email?: string
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      referencias: {
        Row: {
          codigo_referencia: string
          created_at: string | null
          data_inicio_producao: string | null
          data_termino: string | null
          etapa_producao: Database["public"]["Enums"]["etapa_referencia"]
          id: string
          observacoes: string | null
          pedido_id: string
          quantidade: number
          tecido_material: string | null
          updated_at: string | null
          valor_total: number | null
          valor_unitario: number | null
        }
        Insert: {
          codigo_referencia: string
          created_at?: string | null
          data_inicio_producao?: string | null
          data_termino?: string | null
          etapa_producao?: Database["public"]["Enums"]["etapa_referencia"]
          id?: string
          observacoes?: string | null
          pedido_id: string
          quantidade?: number
          tecido_material?: string | null
          updated_at?: string | null
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Update: {
          codigo_referencia?: string
          created_at?: string | null
          data_inicio_producao?: string | null
          data_termino?: string | null
          etapa_producao?: Database["public"]["Enums"]["etapa_referencia"]
          id?: string
          observacoes?: string | null
          pedido_id?: string
          quantidade?: number
          tecido_material?: string | null
          updated_at?: string | null
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_pedido"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Enums: {
      app_role:
        | "admin"
        | "commercial"
        | "production"
        | "viewer"
        | "pcp_closer"
        | "backoffice_fiscal"
      etapa_referencia: "corte" | "costura" | "acabamento" | "pronto"
      prioridade_pedido: "baixa" | "media" | "alta"
      status_etapa: "pendente" | "em_andamento" | "concluido"
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
      ],
      etapa_referencia: ["corte", "costura", "acabamento", "pronto"],
      prioridade_pedido: ["baixa", "media", "alta"],
      status_etapa: ["pendente", "em_andamento", "concluido"],
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
      ],
    },
  },
} as const
