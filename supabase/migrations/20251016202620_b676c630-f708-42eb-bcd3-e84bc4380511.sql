-- Adicionar campo de prioridade aos pedidos
CREATE TYPE public.prioridade_pedido AS ENUM ('baixa', 'media', 'alta');

ALTER TABLE public.pedidos 
ADD COLUMN prioridade prioridade_pedido DEFAULT 'media';

-- Adicionar índices para melhorar performance de consultas (apenas os que não existem)
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON public.pedidos(status_geral);
CREATE INDEX IF NOT EXISTS idx_pedidos_prazo ON public.pedidos(prazo_final);
CREATE INDEX IF NOT EXISTS idx_etapas_pedido ON public.etapas_producao(pedido_id, ordem);