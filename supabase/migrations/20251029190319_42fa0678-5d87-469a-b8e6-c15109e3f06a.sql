-- Atualizar trigger para criar fechamento quando pedido entrar na etapa "Entrega"
DROP TRIGGER IF EXISTS criar_fechamento_automatico_trigger ON public.pedidos CASCADE;
DROP TRIGGER IF EXISTS trigger_criar_fechamento_automatico ON public.pedidos CASCADE;
DROP FUNCTION IF EXISTS public.criar_fechamento_automatico() CASCADE;

CREATE OR REPLACE FUNCTION public.criar_fechamento_automatico()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fechamento_id UUID;
  v_has_entrega BOOLEAN;
BEGIN
  -- Verificar se existe etapa "entrega" ou "expedicao" concluída para este pedido
  SELECT EXISTS (
    SELECT 1 
    FROM public.etapas_producao 
    WHERE pedido_id = NEW.id 
    AND tipo_etapa IN ('entrega', 'expedicao')
    AND status = 'concluido'
  ) INTO v_has_entrega;
  
  -- Se tem etapa de entrega concluída, criar fechamento
  IF v_has_entrega THEN
    -- Verificar se já existe fechamento para este pedido
    SELECT id INTO v_fechamento_id
    FROM public.fechamentos
    WHERE pedido_id = NEW.id
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

CREATE TRIGGER criar_fechamento_automatico_trigger
AFTER INSERT OR UPDATE ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.criar_fechamento_automatico();

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_fechamentos_status ON public.fechamentos(status);
CREATE INDEX IF NOT EXISTS idx_fechamentos_pedido_id ON public.fechamentos(pedido_id);
CREATE INDEX IF NOT EXISTS idx_fechamento_itens_fechamento_id ON public.fechamento_itens(fechamento_id);
CREATE INDEX IF NOT EXISTS idx_etapas_producao_tipo_status ON public.etapas_producao(tipo_etapa, status);