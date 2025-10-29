-- Parte 2: Criar tabelas e políticas
-- Criar tabela de fechamentos
CREATE TABLE IF NOT EXISTS public.fechamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  lote_of TEXT NOT NULL,
  referencia_id UUID REFERENCES public.referencias(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'em_aberto' CHECK (status IN ('em_aberto', 'em_conferencia', 'fechado')),
  atribuido_para UUID,
  foto_caderno_url TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  fechado_por UUID,
  fechado_em TIMESTAMP WITH TIME ZONE
);

-- Criar tabela de itens do fechamento
CREATE TABLE IF NOT EXISTS public.fechamento_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fechamento_id UUID NOT NULL REFERENCES public.fechamentos(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  modelo TEXT NOT NULL,
  cor TEXT NOT NULL,
  tamanho TEXT NOT NULL,
  saldo_a_fechar INTEGER NOT NULL DEFAULT 0,
  caixas INTEGER DEFAULT 0,
  unidades INTEGER DEFAULT 0,
  total_calculado INTEGER GENERATED ALWAYS AS (COALESCE(caixas, 0) * COALESCE(unidades, 0)) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS public.fechamento_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fechamento_id UUID NOT NULL REFERENCES public.fechamentos(id) ON DELETE CASCADE,
  usuario_id UUID,
  acao TEXT NOT NULL,
  dados_antes JSONB,
  dados_depois JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_fechamentos_pedido ON public.fechamentos(pedido_id);
CREATE INDEX IF NOT EXISTS idx_fechamentos_status ON public.fechamentos(status);
CREATE INDEX IF NOT EXISTS idx_fechamentos_atribuido ON public.fechamentos(atribuido_para);
CREATE INDEX IF NOT EXISTS idx_fechamento_itens_fechamento ON public.fechamento_itens(fechamento_id);
CREATE INDEX IF NOT EXISTS idx_fechamento_logs_fechamento ON public.fechamento_logs(fechamento_id);

-- Habilitar RLS
ALTER TABLE public.fechamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fechamento_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fechamento_logs ENABLE ROW LEVEL SECURITY;

-- Policies para fechamentos (PCP_Closer)
CREATE POLICY "PCP_Closer pode ver fechamentos atribuídos"
ON public.fechamentos FOR SELECT
USING (
  has_role(auth.uid(), 'pcp_closer'::app_role) AND 
  (atribuido_para = auth.uid() OR atribuido_para IS NULL)
);

CREATE POLICY "PCP_Closer pode criar fechamentos"
ON public.fechamentos FOR INSERT
WITH CHECK (has_role(auth.uid(), 'pcp_closer'::app_role));

CREATE POLICY "PCP_Closer pode atualizar fechamentos em aberto"
ON public.fechamentos FOR UPDATE
USING (
  has_role(auth.uid(), 'pcp_closer'::app_role) AND 
  status = 'em_aberto' AND
  (atribuido_para = auth.uid() OR atribuido_para IS NULL)
);

-- Policies para fechamentos (Backoffice_Fiscal)
CREATE POLICY "Backoffice_Fiscal pode ver todos fechamentos"
ON public.fechamentos FOR SELECT
USING (has_role(auth.uid(), 'backoffice_fiscal'::app_role));

CREATE POLICY "Backoffice_Fiscal pode atualizar fechamentos em conferência"
ON public.fechamentos FOR UPDATE
USING (
  has_role(auth.uid(), 'backoffice_fiscal'::app_role) AND 
  status IN ('em_conferencia', 'fechado')
);

-- Policies para Admin
CREATE POLICY "Admin pode gerenciar todos fechamentos"
ON public.fechamentos FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies para fechamento_itens (PCP_Closer)
CREATE POLICY "PCP_Closer pode ver itens de seus fechamentos"
ON public.fechamento_itens FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.fechamentos f
    WHERE f.id = fechamento_id
    AND has_role(auth.uid(), 'pcp_closer'::app_role)
    AND (f.atribuido_para = auth.uid() OR f.atribuido_para IS NULL)
  )
);

CREATE POLICY "PCP_Closer pode criar itens"
ON public.fechamento_itens FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.fechamentos f
    WHERE f.id = fechamento_id
    AND has_role(auth.uid(), 'pcp_closer'::app_role)
  )
);

CREATE POLICY "PCP_Closer pode atualizar itens de fechamentos em aberto"
ON public.fechamento_itens FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.fechamentos f
    WHERE f.id = fechamento_id
    AND has_role(auth.uid(), 'pcp_closer'::app_role)
    AND f.status = 'em_aberto'
  )
);

-- Policies para fechamento_itens (Backoffice_Fiscal)
CREATE POLICY "Backoffice_Fiscal pode ver todos itens"
ON public.fechamento_itens FOR SELECT
USING (has_role(auth.uid(), 'backoffice_fiscal'::app_role));

CREATE POLICY "Backoffice_Fiscal pode atualizar itens em conferência"
ON public.fechamento_itens FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.fechamentos f
    WHERE f.id = fechamento_id
    AND has_role(auth.uid(), 'backoffice_fiscal'::app_role)
    AND f.status = 'em_conferencia'
  )
);

-- Policies para Admin
CREATE POLICY "Admin pode gerenciar todos itens"
ON public.fechamento_itens FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies para logs (apenas leitura para Backoffice e Admin)
CREATE POLICY "Backoffice_Fiscal e Admin podem ver logs"
ON public.fechamento_logs FOR SELECT
USING (
  has_any_role(auth.uid(), ARRAY['backoffice_fiscal'::app_role, 'admin'::app_role])
);

CREATE POLICY "Sistema pode criar logs"
ON public.fechamento_logs FOR INSERT
WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_fechamentos_updated_at
BEFORE UPDATE ON public.fechamentos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fechamento_itens_updated_at
BEFORE UPDATE ON public.fechamento_itens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar fechamento automaticamente quando pedido vai para "Entrega"
CREATE OR REPLACE FUNCTION public.criar_fechamento_automatico()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fechamento_id UUID;
BEGIN
  -- Verificar se o status mudou para concluído ou 100%
  IF NEW.status_geral = 'concluido' OR NEW.progresso_percentual = 100 THEN
    -- Verificar se já existe fechamento para este pedido
    SELECT id INTO v_fechamento_id
    FROM public.fechamentos
    WHERE pedido_id = NEW.id
    AND status IN ('em_aberto', 'em_conferencia')
    LIMIT 1;
    
    -- Se não existir, criar novo fechamento
    IF v_fechamento_id IS NULL THEN
      INSERT INTO public.fechamentos (
        pedido_id,
        lote_of,
        status
      ) VALUES (
        NEW.id,
        COALESCE(NEW.codigo_pedido, 'SEM-LOTE'),
        'em_aberto'
      ) RETURNING id INTO v_fechamento_id;
      
      -- Criar itens do fechamento baseado nas referências do pedido
      INSERT INTO public.fechamento_itens (
        fechamento_id,
        sku,
        modelo,
        cor,
        tamanho,
        saldo_a_fechar
      )
      SELECT
        v_fechamento_id,
        r.codigo_referencia,
        COALESCE(r.tecido_material, NEW.produto_modelo),
        COALESCE(r.observacoes, 'Padrão'),
        'UN',
        r.quantidade
      FROM public.referencias r
      WHERE r.pedido_id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para criar fechamento automaticamente
DROP TRIGGER IF EXISTS trigger_criar_fechamento_automatico ON public.pedidos;
CREATE TRIGGER trigger_criar_fechamento_automatico
AFTER UPDATE ON public.pedidos
FOR EACH ROW
WHEN (NEW.status_geral = 'concluido' OR NEW.progresso_percentual = 100)
EXECUTE FUNCTION public.criar_fechamento_automatico();