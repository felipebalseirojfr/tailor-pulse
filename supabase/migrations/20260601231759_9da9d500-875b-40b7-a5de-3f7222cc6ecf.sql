ALTER TABLE public.etapas_producao DROP CONSTRAINT IF EXISTS etapas_producao_referencia_id_fkey;
ALTER TABLE public.etapas_producao DROP CONSTRAINT IF EXISTS fk_referencia;
ALTER TABLE public.fechamentos DROP CONSTRAINT IF EXISTS fechamentos_referencia_id_fkey;
ALTER TABLE public.fechamentos DROP CONSTRAINT IF EXISTS fk_referencia;

DROP TABLE IF EXISTS public.referencias;