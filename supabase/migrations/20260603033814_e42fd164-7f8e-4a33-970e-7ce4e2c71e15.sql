ALTER TABLE public.referencias
ADD COLUMN IF NOT EXISTS prazo_termino date;

-- Backfill: criadas + 30 dias para registros antigos
UPDATE public.referencias
SET prazo_termino = (created_at::date + INTERVAL '30 days')::date
WHERE prazo_termino IS NULL;

-- Default para novas referências
ALTER TABLE public.referencias
ALTER COLUMN prazo_termino SET DEFAULT (CURRENT_DATE + INTERVAL '30 days')::date;