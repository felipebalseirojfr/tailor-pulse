-- Add new columns to referencias for queue priority and fitting tracking
ALTER TABLE public.referencias 
  ADD COLUMN IF NOT EXISTS prioridade_desenvolvimento integer NOT NULL DEFAULT 0;

ALTER TABLE public.referencias 
  ADD COLUMN IF NOT EXISTS numero_rodada_piloto integer NOT NULL DEFAULT 1;

ALTER TABLE public.referencias 
  ADD COLUMN IF NOT EXISTS alteracoes_fitting text NULL;

ALTER TABLE public.referencias 
  ADD COLUMN IF NOT EXISTS aprovada_com_alteracoes boolean NOT NULL DEFAULT false;

-- Add new enum values to tipo_etapa (must be separate statements; cannot run in same tx as use)
ALTER TYPE public.tipo_etapa ADD VALUE IF NOT EXISTS 'piloto_enviada_cliente';
ALTER TYPE public.tipo_etapa ADD VALUE IF NOT EXISTS 'aguardando_aprovacao_cliente';