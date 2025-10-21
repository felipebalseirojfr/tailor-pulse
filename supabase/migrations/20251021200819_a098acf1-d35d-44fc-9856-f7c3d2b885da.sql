-- Ativar realtime para a tabela etapas_producao
ALTER TABLE public.etapas_producao REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.etapas_producao;

-- Ativar realtime para a tabela pedidos
ALTER TABLE public.pedidos REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;