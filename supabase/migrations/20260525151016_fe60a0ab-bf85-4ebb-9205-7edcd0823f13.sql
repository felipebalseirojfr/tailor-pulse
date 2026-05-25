ALTER TABLE public.fechamentos
ADD COLUMN IF NOT EXISTS grade_entrada jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS grade_saida jsonb DEFAULT '{}'::jsonb;