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
      clientes: {
        Row: {
          contato: string | null
          created_at: string | null
          email: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          contato?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          contato?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
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
          data_termino: string | null
          id: string
          observacoes: string | null
          ordem: number
          pedido_id: string
          responsavel_id: string | null
          status: Database["public"]["Enums"]["status_etapa"] | null
          tipo_etapa: Database["public"]["Enums"]["tipo_etapa"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_inicio?: string | null
          data_termino?: string | null
          id?: string
          observacoes?: string | null
          ordem: number
          pedido_id: string
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["status_etapa"] | null
          tipo_etapa: Database["public"]["Enums"]["tipo_etapa"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_inicio?: string | null
          data_termino?: string | null
          id?: string
          observacoes?: string | null
          ordem?: number
          pedido_id?: string
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
        ]
      }
      pedidos: {
        Row: {
          arquivos: Json | null
          aviamentos: string[] | null
          cliente_id: string
          created_at: string | null
          data_inicio: string
          grade_tamanhos: Json | null
          id: string
          prazo_final: string
          prioridade: Database["public"]["Enums"]["prioridade_pedido"] | null
          produto_modelo: string
          progresso_percentual: number | null
          qr_code_gerado_em: string | null
          qr_code_link: string | null
          qr_code_ref: string | null
          quantidade_total: number
          responsavel_comercial_id: string
          status_geral: string | null
          tecido: string | null
          tem_personalizacao: boolean | null
          tipo_peca: string
          tipos_personalizacao: string[] | null
          updated_at: string | null
        }
        Insert: {
          arquivos?: Json | null
          aviamentos?: string[] | null
          cliente_id: string
          created_at?: string | null
          data_inicio: string
          grade_tamanhos?: Json | null
          id?: string
          prazo_final: string
          prioridade?: Database["public"]["Enums"]["prioridade_pedido"] | null
          produto_modelo: string
          progresso_percentual?: number | null
          qr_code_gerado_em?: string | null
          qr_code_link?: string | null
          qr_code_ref?: string | null
          quantidade_total: number
          responsavel_comercial_id: string
          status_geral?: string | null
          tecido?: string | null
          tem_personalizacao?: boolean | null
          tipo_peca: string
          tipos_personalizacao?: string[] | null
          updated_at?: string | null
        }
        Update: {
          arquivos?: Json | null
          aviamentos?: string[] | null
          cliente_id?: string
          created_at?: string | null
          data_inicio?: string
          grade_tamanhos?: Json | null
          id?: string
          prazo_final?: string
          prioridade?: Database["public"]["Enums"]["prioridade_pedido"] | null
          produto_modelo?: string
          progresso_percentual?: number | null
          qr_code_gerado_em?: string | null
          qr_code_link?: string | null
          qr_code_ref?: string | null
          quantidade_total?: number
          responsavel_comercial_id?: string
          status_geral?: string | null
          tecido?: string | null
          tem_personalizacao?: boolean | null
          tipo_peca?: string
          tipos_personalizacao?: string[] | null
          updated_at?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      prioridade_pedido: "baixa" | "media" | "alta"
      status_etapa: "pendente" | "em_andamento" | "concluido"
      tipo_etapa:
        | "lacre_piloto"
        | "liberacao_corte"
        | "corte"
        | "personalizacao"
        | "costura"
        | "acabamento"
        | "entrega"
        | "estampa"
        | "bordado"
        | "lavado"
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
      prioridade_pedido: ["baixa", "media", "alta"],
      status_etapa: ["pendente", "em_andamento", "concluido"],
      tipo_etapa: [
        "lacre_piloto",
        "liberacao_corte",
        "corte",
        "personalizacao",
        "costura",
        "acabamento",
        "entrega",
        "estampa",
        "bordado",
        "lavado",
      ],
    },
  },
} as const
