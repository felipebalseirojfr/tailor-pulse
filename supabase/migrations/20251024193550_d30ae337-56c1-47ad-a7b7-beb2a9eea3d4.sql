-- Garantir que a tabela pedidos tenha REPLICA IDENTITY FULL para realtime funcionar corretamente
ALTER TABLE public.pedidos REPLICA IDENTITY FULL;