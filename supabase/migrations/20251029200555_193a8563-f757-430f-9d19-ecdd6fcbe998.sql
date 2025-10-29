-- Atualizar policies de fechamentos para permitir visualização por todos usuários autenticados

-- Remover policies antigas de SELECT
DROP POLICY IF EXISTS "PCP_Closer pode ver fechamentos atribuídos" ON public.fechamentos;
DROP POLICY IF EXISTS "Backoffice_Fiscal pode ver todos fechamentos" ON public.fechamentos;
DROP POLICY IF EXISTS "Admin pode gerenciar todos fechamentos" ON public.fechamentos;

-- Criar policy simples para SELECT - todos usuários autenticados podem ver
CREATE POLICY "Usuários autenticados podem ver todos fechamentos"
ON public.fechamentos
FOR SELECT
TO authenticated
USING (true);

-- Manter policies de INSERT/UPDATE/DELETE apenas para roles específicas
DROP POLICY IF EXISTS "PCP_Closer pode criar fechamentos" ON public.fechamentos;
CREATE POLICY "PCP_Closer pode criar fechamentos"
ON public.fechamentos
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'pcp_closer'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "PCP_Closer pode atualizar fechamentos em aberto" ON public.fechamentos;
CREATE POLICY "PCP_Closer pode atualizar fechamentos em aberto"
ON public.fechamentos
FOR UPDATE
TO authenticated
USING (
  (has_role(auth.uid(), 'pcp_closer'::app_role) AND status = 'em_aberto') OR
  (has_role(auth.uid(), 'backoffice_fiscal'::app_role) AND status IN ('em_conferencia', 'fechado')) OR
  has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Backoffice_Fiscal pode atualizar fechamentos em conferência" ON public.fechamentos;

CREATE POLICY "Admin pode deletar fechamentos"
ON public.fechamentos
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Atualizar policies de fechamento_itens para permitir visualização por todos
DROP POLICY IF EXISTS "PCP_Closer pode ver itens de seus fechamentos" ON public.fechamento_itens;
DROP POLICY IF EXISTS "Backoffice_Fiscal pode ver todos itens" ON public.fechamento_itens;
DROP POLICY IF EXISTS "Admin pode gerenciar todos itens" ON public.fechamento_itens;

CREATE POLICY "Usuários autenticados podem ver todos itens"
ON public.fechamento_itens
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "PCP_Closer pode criar itens" ON public.fechamento_itens;
CREATE POLICY "PCP_Closer pode criar itens"
ON public.fechamento_itens
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'pcp_closer'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "PCP_Closer pode atualizar itens de fechamentos em aberto" ON public.fechamento_itens;
CREATE POLICY "PCP_Closer pode atualizar itens"
ON public.fechamento_itens
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM fechamentos f
    WHERE f.id = fechamento_itens.fechamento_id
    AND (
      (has_role(auth.uid(), 'pcp_closer'::app_role) AND f.status = 'em_aberto') OR
      (has_role(auth.uid(), 'backoffice_fiscal'::app_role) AND f.status = 'em_conferencia') OR
      has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

DROP POLICY IF EXISTS "Backoffice_Fiscal pode atualizar itens em conferência" ON public.fechamento_itens;

CREATE POLICY "Admin pode deletar itens"
ON public.fechamento_itens
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));