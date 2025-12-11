-- Adicionar campos de preço de venda e composição do tecido
ALTER TABLE public.pedidos 
ADD COLUMN preco_venda DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN composicao_tecido TEXT DEFAULT NULL;

-- Comentários para documentação
COMMENT ON COLUMN public.pedidos.preco_venda IS 'Preço de venda unitário do produto';
COMMENT ON COLUMN public.pedidos.composicao_tecido IS 'Composição do tecido para classificação NCM';