-- Corrigir search_path nas funções existentes para segurança

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.criar_etapas_pedido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  etapa tipo_etapa;
  ordem_atual INTEGER := 1;
BEGIN
  FOREACH etapa IN ARRAY ARRAY['lacre_piloto', 'liberacao_corte', 'corte', 'personalizacao', 'costura', 'acabamento', 'entrega']::tipo_etapa[] LOOP
    INSERT INTO public.etapas_producao (pedido_id, tipo_etapa, ordem, status)
    VALUES (NEW.id, etapa, ordem_atual, 'pendente');
    ordem_atual := ordem_atual + 1;
  END LOOP;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.atualizar_progresso_pedido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  total_etapas INTEGER;
  etapas_concluidas INTEGER;
  novo_progresso INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_etapas
  FROM public.etapas_producao
  WHERE pedido_id = NEW.pedido_id;

  SELECT COUNT(*) INTO etapas_concluidas
  FROM public.etapas_producao
  WHERE pedido_id = NEW.pedido_id AND status = 'concluido';

  novo_progresso := ROUND((etapas_concluidas::NUMERIC / total_etapas::NUMERIC) * 100);

  UPDATE public.pedidos
  SET progresso_percentual = novo_progresso,
      status_geral = CASE
        WHEN novo_progresso = 100 THEN 'concluido'
        WHEN novo_progresso > 0 THEN 'em_producao'
        ELSE 'aguardando'
      END
  WHERE id = NEW.pedido_id;

  RETURN NEW;
END;
$function$;