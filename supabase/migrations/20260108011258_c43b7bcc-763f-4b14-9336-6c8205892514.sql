-- Criar tabela de capacidade mensal
CREATE TABLE IF NOT EXISTS public.capacidade_mensal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes text UNIQUE NOT NULL, -- formato YYYY-MM
  capacidade_pecas integer NOT NULL CHECK (capacidade_pecas > 0),
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de alertas de ocupação
CREATE TABLE IF NOT EXISTS public.alertas_ocupacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes text NOT NULL, -- YYYY-MM
  ocupacao_percentual numeric NOT NULL,
  capacidade_pecas integer NOT NULL,
  demanda_pecas integer NOT NULL,
  tipo_alerta text NOT NULL CHECK (tipo_alerta IN ('amarelo', 'laranja', 'vermelho')),
  notificado_em timestamptz DEFAULT now(),
  visualizado boolean DEFAULT false,
  visualizado_por uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.capacidade_mensal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas_ocupacao ENABLE ROW LEVEL SECURITY;

-- Políticas para capacidade_mensal
CREATE POLICY "Usuarios autenticados podem ver capacidade"
  ON public.capacidade_mensal FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin e Commercial podem inserir capacidade"
  ON public.capacidade_mensal FOR INSERT
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'commercial'::app_role]));

CREATE POLICY "Admin e Commercial podem atualizar capacidade"
  ON public.capacidade_mensal FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'commercial'::app_role]));

CREATE POLICY "Admin pode deletar capacidade"
  ON public.capacidade_mensal FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas para alertas_ocupacao
CREATE POLICY "Usuarios autenticados podem ver alertas"
  ON public.alertas_ocupacao FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Sistema pode criar alertas"
  ON public.alertas_ocupacao FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Usuarios podem marcar como visualizado"
  ON public.alertas_ocupacao FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Trigger para updated_at em capacidade_mensal
CREATE TRIGGER update_capacidade_mensal_updated_at
  BEFORE UPDATE ON public.capacidade_mensal
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();