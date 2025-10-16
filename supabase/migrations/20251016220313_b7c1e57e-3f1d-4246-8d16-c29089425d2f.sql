-- Adicionar colunas de personalização na tabela pedidos
ALTER TABLE public.pedidos 
ADD COLUMN tem_personalizacao BOOLEAN DEFAULT false,
ADD COLUMN tipos_personalizacao TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Comentários para documentação
COMMENT ON COLUMN public.pedidos.tem_personalizacao IS 'Indica se o pedido tem algum tipo de personalização';
COMMENT ON COLUMN public.pedidos.tipos_personalizacao IS 'Array com os tipos de personalização: estamparia, bordado, caseado, lavanderia';

-- Atualizar a função de criar etapas para considerar personalização
CREATE OR REPLACE FUNCTION public.criar_etapas_pedido_com_personalizacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  etapas_base tipo_etapa[];
  etapa tipo_etapa;
  ordem_atual INTEGER := 1;
BEGIN
  -- Definir etapas base (sempre presentes)
  etapas_base := ARRAY['lacre_piloto', 'liberacao_corte', 'corte']::tipo_etapa[];
  
  -- Adicionar etapa de personalização se necessário
  IF NEW.tem_personalizacao = true THEN
    etapas_base := array_append(etapas_base, 'personalizacao'::tipo_etapa);
  END IF;
  
  -- Adicionar etapas finais
  etapas_base := array_cat(etapas_base, ARRAY['costura', 'acabamento', 'entrega']::tipo_etapa[]);
  
  -- Criar as etapas
  FOREACH etapa IN ARRAY etapas_base LOOP
    INSERT INTO public.etapas_producao (pedido_id, tipo_etapa, ordem, status)
    VALUES (NEW.id, etapa, ordem_atual, 'pendente');
    ordem_atual := ordem_atual + 1;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Remover trigger antigo e criar novo
DROP TRIGGER IF EXISTS criar_etapas_producao_trigger ON public.pedidos;

CREATE TRIGGER criar_etapas_producao_trigger
AFTER INSERT ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.criar_etapas_pedido_com_personalizacao();