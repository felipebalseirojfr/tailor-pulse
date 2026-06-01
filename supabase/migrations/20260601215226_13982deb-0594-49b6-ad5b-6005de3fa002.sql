ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS abreviacao_2_letras varchar(2) NULL,
  ADD COLUMN IF NOT EXISTS cnpj text NULL,
  ADD COLUMN IF NOT EXISTS endereco text NULL;

ALTER TABLE public.clientes
  ADD CONSTRAINT clientes_abreviacao_format
  CHECK (abreviacao_2_letras IS NULL OR abreviacao_2_letras ~ '^[A-Z]{2}$');

CREATE UNIQUE INDEX IF NOT EXISTS clientes_abreviacao_unique
  ON public.clientes (abreviacao_2_letras)
  WHERE abreviacao_2_letras IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS clientes_cnpj_unique
  ON public.clientes (cnpj)
  WHERE cnpj IS NOT NULL;