-- Modificar a função de criação de etapas para que a primeira etapa já comece automaticamente
CREATE OR REPLACE FUNCTION public.criar_etapas_pedido_com_personalizacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  etapas_base tipo_etapa[];
  etapa tipo_etapa;
  ordem_atual INTEGER := 1;
  primeira_etapa BOOLEAN := true;
BEGIN
  -- Definir etapas base (sempre presentes)
  etapas_base := ARRAY['lacre_piloto', 'liberacao_corte', 'corte']::tipo_etapa[];
  
  -- Adicionar etapas de personalização baseadas no array tipos_personalizacao
  IF NEW.tipos_personalizacao IS NOT NULL AND array_length(NEW.tipos_personalizacao, 1) > 0 THEN
    -- Adicionar estampa se estiver no array
    IF 'estamparia' = ANY(NEW.tipos_personalizacao) THEN
      etapas_base := array_append(etapas_base, 'estampa'::tipo_etapa);
    END IF;
    
    -- Adicionar bordado se estiver no array
    IF 'bordado' = ANY(NEW.tipos_personalizacao) THEN
      etapas_base := array_append(etapas_base, 'bordado'::tipo_etapa);
    END IF;
    
    -- Adicionar lavado se estiver no array (lavanderia)
    IF 'lavanderia' = ANY(NEW.tipos_personalizacao) THEN
      etapas_base := array_append(etapas_base, 'lavado'::tipo_etapa);
    END IF;
  END IF;
  
  -- Adicionar etapas finais
  etapas_base := array_cat(etapas_base, ARRAY['costura', 'acabamento', 'entrega']::tipo_etapa[]);
  
  -- Criar as etapas
  FOREACH etapa IN ARRAY etapas_base LOOP
    -- A primeira etapa já começa em andamento com data_inicio
    IF primeira_etapa THEN
      INSERT INTO public.etapas_producao (pedido_id, tipo_etapa, ordem, status, data_inicio)
      VALUES (NEW.id, etapa, ordem_atual, 'em_andamento', now());
      primeira_etapa := false;
    ELSE
      INSERT INTO public.etapas_producao (pedido_id, tipo_etapa, ordem, status)
      VALUES (NEW.id, etapa, ordem_atual, 'pendente');
    END IF;
    ordem_atual := ordem_atual + 1;
  END LOOP;
  
  RETURN NEW;
END;
$function$;