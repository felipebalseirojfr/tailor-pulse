-- Adicionar novas roles ao enum app_role se ainda não existem
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'app_role' AND e.enumlabel = 'pcp_closer') THEN
    ALTER TYPE app_role ADD VALUE 'pcp_closer';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'app_role' AND e.enumlabel = 'backoffice_fiscal') THEN
    ALTER TYPE app_role ADD VALUE 'backoffice_fiscal';
  END IF;
END $$;

-- Atualizar a função criar_fechamento_automatico para trabalhar com etapas
DROP FUNCTION IF EXISTS public.criar_fechamento_automatico() CASCADE;

CREATE OR REPLACE FUNCTION public.criar_fechamento_automatico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_fechamento_id UUID;
  v_pedido_id UUID;
BEGIN
  -- Verificar se a etapa é "entrega" e foi concluída
  IF NEW.tipo_etapa = 'entrega' AND NEW.status = 'concluido' THEN
    v_pedido_id := NEW.pedido_id;
    
    -- Verificar se já existe fechamento para este pedido
    SELECT id INTO v_fechamento_id
    FROM public.fechamentos
    WHERE pedido_id = v_pedido_id
    LIMIT 1;
    
    -- Se não existir, criar novo fechamento
    IF v_fechamento_id IS NULL THEN
      -- Criar fechamento
      INSERT INTO public.fechamentos (
        pedido_id,
        lote_of,
        status,
        atribuido_para
      )
      SELECT
        p.id,
        COALESCE(p.codigo_pedido, 'SEM-LOTE'),
        'em_aberto',
        NULL
      FROM public.pedidos p
      WHERE p.id = v_pedido_id
      RETURNING id INTO v_fechamento_id;
      
      -- Criar itens do fechamento baseado nas referências do pedido
      INSERT INTO public.fechamento_itens (
        fechamento_id,
        sku,
        modelo,
        cor,
        tamanho,
        saldo_a_fechar,
        caixas,
        unidades
      )
      SELECT
        v_fechamento_id,
        r.codigo_referencia,
        COALESCE(r.tecido_material, p.produto_modelo),
        COALESCE(r.observacoes, 'Padrão'),
        'UN',
        r.quantidade,
        0,
        0
      FROM public.referencias r
      JOIN public.pedidos p ON r.pedido_id = p.id
      WHERE r.pedido_id = v_pedido_id;
      
      -- Log da criação
      INSERT INTO public.fechamento_logs (
        fechamento_id,
        usuario_id,
        acao,
        dados_depois
      ) VALUES (
        v_fechamento_id,
        auth.uid(),
        'Fechamento criado automaticamente',
        jsonb_build_object(
          'pedido_id', v_pedido_id,
          'status', 'em_aberto',
          'origem', 'trigger_etapa_entrega'
        )
      );
    ELSE
      -- Se já existe e está fechado, não fazer nada
      -- Se está em_aberto ou em_conferencia, atualizar para em_aberto
      UPDATE public.fechamentos
      SET status = 'em_aberto',
          updated_at = now()
      WHERE id = v_fechamento_id
      AND status NOT IN ('fechado');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Criar trigger na tabela etapas_producao
DROP TRIGGER IF EXISTS trigger_criar_fechamento_automatico ON public.etapas_producao;

CREATE TRIGGER trigger_criar_fechamento_automatico
AFTER UPDATE OF status ON public.etapas_producao
FOR EACH ROW
WHEN (NEW.tipo_etapa = 'entrega' AND NEW.status = 'concluido' AND OLD.status != 'concluido')
EXECUTE FUNCTION public.criar_fechamento_automatico();

-- Atualizar RLS policies para fechamentos (se necessário)
DROP POLICY IF EXISTS "PCP_Closer pode ver fechamentos atribuídos" ON public.fechamentos;
CREATE POLICY "PCP_Closer pode ver fechamentos atribuídos"
ON public.fechamentos
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'pcp_closer'::app_role) AND
  (atribuido_para = auth.uid() OR atribuido_para IS NULL)
);

DROP POLICY IF EXISTS "PCP_Closer pode criar fechamentos" ON public.fechamentos;
CREATE POLICY "PCP_Closer pode criar fechamentos"
ON public.fechamentos
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'pcp_closer'::app_role));

DROP POLICY IF EXISTS "PCP_Closer pode atualizar fechamentos em aberto" ON public.fechamentos;
CREATE POLICY "PCP_Closer pode atualizar fechamentos em aberto"
ON public.fechamentos
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'pcp_closer'::app_role) AND
  status = 'em_aberto' AND
  (atribuido_para = auth.uid() OR atribuido_para IS NULL)
);

DROP POLICY IF EXISTS "Backoffice_Fiscal pode ver todos fechamentos" ON public.fechamentos;
CREATE POLICY "Backoffice_Fiscal pode ver todos fechamentos"
ON public.fechamentos
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'backoffice_fiscal'::app_role));

DROP POLICY IF EXISTS "Backoffice_Fiscal pode atualizar fechamentos em conferência" ON public.fechamentos;
CREATE POLICY "Backoffice_Fiscal pode atualizar fechamentos em conferência"
ON public.fechamentos
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'backoffice_fiscal'::app_role) AND
  status IN ('em_conferencia', 'fechado')
);

DROP POLICY IF EXISTS "Admin pode gerenciar todos fechamentos" ON public.fechamentos;
CREATE POLICY "Admin pode gerenciar todos fechamentos"
ON public.fechamentos
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies para fechamento_itens
DROP POLICY IF EXISTS "PCP_Closer pode ver itens de seus fechamentos" ON public.fechamento_itens;
CREATE POLICY "PCP_Closer pode ver itens de seus fechamentos"
ON public.fechamento_itens
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM fechamentos f
    WHERE f.id = fechamento_itens.fechamento_id
    AND has_role(auth.uid(), 'pcp_closer'::app_role)
    AND (f.atribuido_para = auth.uid() OR f.atribuido_para IS NULL)
  )
);

DROP POLICY IF EXISTS "PCP_Closer pode criar itens" ON public.fechamento_itens;
CREATE POLICY "PCP_Closer pode criar itens"
ON public.fechamento_itens
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM fechamentos f
    WHERE f.id = fechamento_itens.fechamento_id
    AND has_role(auth.uid(), 'pcp_closer'::app_role)
  )
);

DROP POLICY IF EXISTS "PCP_Closer pode atualizar itens de fechamentos em aberto" ON public.fechamento_itens;
CREATE POLICY "PCP_Closer pode atualizar itens de fechamentos em aberto"
ON public.fechamento_itens
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM fechamentos f
    WHERE f.id = fechamento_itens.fechamento_id
    AND has_role(auth.uid(), 'pcp_closer'::app_role)
    AND f.status = 'em_aberto'
  )
);

DROP POLICY IF EXISTS "Backoffice_Fiscal pode ver todos itens" ON public.fechamento_itens;
CREATE POLICY "Backoffice_Fiscal pode ver todos itens"
ON public.fechamento_itens
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'backoffice_fiscal'::app_role));

DROP POLICY IF EXISTS "Backoffice_Fiscal pode atualizar itens em conferência" ON public.fechamento_itens;
CREATE POLICY "Backoffice_Fiscal pode atualizar itens em conferência"
ON public.fechamento_itens
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM fechamentos f
    WHERE f.id = fechamento_itens.fechamento_id
    AND has_role(auth.uid(), 'backoffice_fiscal'::app_role)
    AND f.status = 'em_conferencia'
  )
);

DROP POLICY IF EXISTS "Admin pode gerenciar todos itens" ON public.fechamento_itens;
CREATE POLICY "Admin pode gerenciar todos itens"
ON public.fechamento_itens
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));