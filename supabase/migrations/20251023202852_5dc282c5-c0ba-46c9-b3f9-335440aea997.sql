-- Adicionar campo para armazenar grade de tamanhos
ALTER TABLE public.pedidos 
ADD COLUMN grade_tamanhos JSONB DEFAULT '{}'::jsonb;