-- ==========================================
-- 1. CRIAR TABELA DE REFERÊNCIAS
-- ==========================================

-- Criar enum para etapas de referência
CREATE TYPE etapa_referencia AS ENUM ('corte', 'costura', 'acabamento', 'pronto');

-- Criar tabela de referências
CREATE TABLE public.referencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID NOT NULL,
  codigo_referencia TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  tecido_material TEXT,
  etapa_producao etapa_referencia NOT NULL DEFAULT 'corte',
  data_inicio_producao DATE,
  data_termino DATE,
  valor_unitario DECIMAL(10,2) DEFAULT 0,
  valor_total DECIMAL(10,2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT fk_pedido
    FOREIGN KEY (pedido_id)
    REFERENCES public.pedidos(id)
    ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX idx_referencias_pedido_id ON public.referencias(pedido_id);
CREATE INDEX idx_referencias_etapa ON public.referencias(etapa_producao);

-- ==========================================
-- 2. AJUSTAR TABELA DE PEDIDOS
-- ==========================================

-- Adicionar novos campos aos pedidos
ALTER TABLE public.pedidos 
  ADD COLUMN IF NOT EXISTS codigo_pedido TEXT,
  ADD COLUMN IF NOT EXISTS quantidade_total_referencias INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_total_pedido DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS observacoes_pedido TEXT;

-- Criar índice único para código do pedido
CREATE UNIQUE INDEX IF NOT EXISTS idx_pedidos_codigo ON public.pedidos(codigo_pedido) WHERE codigo_pedido IS NOT NULL;

-- ==========================================
-- 3. AJUSTAR ETAPAS DE PRODUÇÃO
-- ==========================================

-- Adicionar referência_id às etapas (mantém pedido_id também)
ALTER TABLE public.etapas_producao
  ADD COLUMN IF NOT EXISTS referencia_id UUID,
  ADD CONSTRAINT fk_referencia
    FOREIGN KEY (referencia_id)
    REFERENCES public.referencias(id)
    ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_etapas_referencia_id ON public.etapas_producao(referencia_id);

-- ==========================================
-- 4. AJUSTAR TABELA DE CLIENTES
-- ==========================================

-- Adicionar campos para status e contadores
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS status_geral TEXT DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS total_pedidos_ativos INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS observacoes_gerais TEXT;

-- ==========================================
-- 5. FUNÇÕES DE ATUALIZAÇÃO AUTOMÁTICA
-- ==========================================

-- Função para atualizar totais do pedido
CREATE OR REPLACE FUNCTION public.atualizar_totais_pedido()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quantidade_total INTEGER;
  v_valor_total DECIMAL(10,2);
  v_todas_prontas BOOLEAN;
BEGIN
  -- Calcular totais
  SELECT 
    COALESCE(SUM(quantidade), 0),
    COALESCE(SUM(valor_total), 0),
    BOOL_AND(etapa_producao = 'pronto')
  INTO v_quantidade_total, v_valor_total, v_todas_prontas
  FROM public.referencias
  WHERE pedido_id = COALESCE(NEW.pedido_id, OLD.pedido_id);

  -- Atualizar pedido
  UPDATE public.pedidos
  SET 
    quantidade_total_referencias = v_quantidade_total,
    valor_total_pedido = v_valor_total,
    status_geral = CASE
      WHEN v_todas_prontas THEN 'concluido'
      WHEN v_quantidade_total > 0 THEN 'em_producao'
      ELSE 'aguardando'
    END,
    updated_at = now()
  WHERE id = COALESCE(NEW.pedido_id, OLD.pedido_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers para atualizar totais do pedido
DROP TRIGGER IF EXISTS trigger_atualizar_totais_pedido_insert ON public.referencias;
CREATE TRIGGER trigger_atualizar_totais_pedido_insert
  AFTER INSERT ON public.referencias
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_totais_pedido();

DROP TRIGGER IF EXISTS trigger_atualizar_totais_pedido_update ON public.referencias;
CREATE TRIGGER trigger_atualizar_totais_pedido_update
  AFTER UPDATE ON public.referencias
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_totais_pedido();

DROP TRIGGER IF EXISTS trigger_atualizar_totais_pedido_delete ON public.referencias;
CREATE TRIGGER trigger_atualizar_totais_pedido_delete
  AFTER DELETE ON public.referencias
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_totais_pedido();

-- Função para atualizar status do cliente
CREATE OR REPLACE FUNCTION public.atualizar_status_cliente()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_ativos INTEGER;
BEGIN
  -- Contar pedidos ativos do cliente
  SELECT COUNT(*)
  INTO v_total_ativos
  FROM public.pedidos
  WHERE cliente_id = COALESCE(NEW.cliente_id, OLD.cliente_id)
    AND status_geral IN ('em_producao', 'aguardando');

  -- Atualizar cliente
  UPDATE public.clientes
  SET 
    total_pedidos_ativos = v_total_ativos,
    status_geral = CASE
      WHEN v_total_ativos > 0 THEN 'ativo'
      ELSE 'sem_pedidos'
    END,
    updated_at = now()
  WHERE id = COALESCE(NEW.cliente_id, OLD.cliente_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers para atualizar status do cliente
DROP TRIGGER IF EXISTS trigger_atualizar_status_cliente_insert ON public.pedidos;
CREATE TRIGGER trigger_atualizar_status_cliente_insert
  AFTER INSERT ON public.pedidos
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_status_cliente();

DROP TRIGGER IF EXISTS trigger_atualizar_status_cliente_update ON public.pedidos;
CREATE TRIGGER trigger_atualizar_status_cliente_update
  AFTER UPDATE ON public.pedidos
  FOR EACH ROW
  WHEN (OLD.status_geral IS DISTINCT FROM NEW.status_geral OR OLD.cliente_id IS DISTINCT FROM NEW.cliente_id)
  EXECUTE FUNCTION public.atualizar_status_cliente();

DROP TRIGGER IF EXISTS trigger_atualizar_status_cliente_delete ON public.pedidos;
CREATE TRIGGER trigger_atualizar_status_cliente_delete
  AFTER DELETE ON public.pedidos
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_status_cliente();

-- Trigger para updated_at em referências
DROP TRIGGER IF EXISTS trigger_referencias_updated_at ON public.referencias;
CREATE TRIGGER trigger_referencias_updated_at
  BEFORE UPDATE ON public.referencias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- 6. RLS POLICIES PARA REFERÊNCIAS
-- ==========================================

ALTER TABLE public.referencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autorizados podem ver referências"
  ON public.referencias FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'commercial'::app_role, 'production'::app_role, 'viewer'::app_role])
  );

CREATE POLICY "Admin e Commercial podem criar referências"
  ON public.referencias FOR INSERT
  WITH CHECK (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'commercial'::app_role])
  );

CREATE POLICY "Usuários autorizados podem atualizar referências"
  ON public.referencias FOR UPDATE
  USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'commercial'::app_role, 'production'::app_role])
  );

CREATE POLICY "Admin e Commercial podem deletar referências"
  ON public.referencias FOR DELETE
  USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'commercial'::app_role])
  );

-- ==========================================
-- 7. GERAÇÃO AUTOMÁTICA DE CÓDIGO DE PEDIDO
-- ==========================================

CREATE OR REPLACE FUNCTION public.gerar_codigo_pedido()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.codigo_pedido IS NULL THEN
    NEW.codigo_pedido := 'PED-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('pedidos_sequence')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Criar sequence para códigos de pedido
CREATE SEQUENCE IF NOT EXISTS pedidos_sequence START 1;

-- Trigger para gerar código automaticamente
DROP TRIGGER IF EXISTS trigger_gerar_codigo_pedido ON public.pedidos;
CREATE TRIGGER trigger_gerar_codigo_pedido
  BEFORE INSERT ON public.pedidos
  FOR EACH ROW
  EXECUTE FUNCTION public.gerar_codigo_pedido();