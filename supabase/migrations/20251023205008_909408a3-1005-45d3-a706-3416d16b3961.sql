-- Corrigir função com search_path
CREATE OR REPLACE FUNCTION public.etapa_em_atraso(etapa_row public.etapas_producao)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    etapa_row.status != 'concluido' AND 
    etapa_row.data_termino_prevista IS NOT NULL AND 
    etapa_row.data_termino_prevista < CURRENT_DATE
$$;