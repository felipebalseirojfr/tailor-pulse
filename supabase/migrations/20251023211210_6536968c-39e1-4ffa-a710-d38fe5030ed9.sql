-- Primeiro, alterar a coluna tipo_etapa para text temporariamente
ALTER TABLE public.etapas_producao ALTER COLUMN tipo_etapa TYPE text;

-- Atualizar registros existentes para os novos valores
UPDATE public.etapas_producao SET tipo_etapa = 'pilotagem' WHERE tipo_etapa = 'lacre_piloto';
UPDATE public.etapas_producao SET tipo_etapa = 'lavanderia' WHERE tipo_etapa = 'lavado';
UPDATE public.etapas_producao SET tipo_etapa = 'estamparia_bordado' WHERE tipo_etapa IN ('estampa', 'bordado', 'personalizacao');

-- Deletar o tipo enum antigo (CASCADE irá remover a dependência)
DROP TYPE IF EXISTS public.tipo_etapa CASCADE;

-- Criar novo tipo enum com as etapas corretas
CREATE TYPE public.tipo_etapa AS ENUM (
  'pilotagem',
  'liberacao_corte',
  'corte',
  'lavanderia',
  'costura',
  'caseado',
  'estamparia_bordado',
  'acabamento',
  'entrega'
);

-- Converter a coluna de volta para o novo enum
ALTER TABLE public.etapas_producao 
  ALTER COLUMN tipo_etapa TYPE public.tipo_etapa 
  USING tipo_etapa::public.tipo_etapa;