-- Remover trigger de criação automática de etapas com CASCADE
DROP TRIGGER IF EXISTS criar_etapas_producao_trigger ON public.pedidos CASCADE;
DROP FUNCTION IF EXISTS public.criar_etapas_pedido_com_personalizacao() CASCADE;
DROP FUNCTION IF EXISTS public.criar_etapas_pedido() CASCADE;

-- Adicionar campos de prazo previsto nas etapas
ALTER TABLE public.etapas_producao 
ADD COLUMN IF NOT EXISTS data_inicio_prevista date,
ADD COLUMN IF NOT EXISTS data_termino_prevista date;

-- Criar função para verificar se uma etapa está em atraso
CREATE OR REPLACE FUNCTION public.etapa_em_atraso(etapa_row public.etapas_producao)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT 
    etapa_row.status != 'concluido' AND 
    etapa_row.data_termino_prevista IS NOT NULL AND 
    etapa_row.data_termino_prevista < CURRENT_DATE
$$;