ALTER TABLE public.fechamentos
ADD COLUMN IF NOT EXISTS data_entrada date,
ADD COLUMN IF NOT EXISTS responsavel_entrada text,
ADD COLUMN IF NOT EXISTS data_saida date,
ADD COLUMN IF NOT EXISTS responsavel_saida text;