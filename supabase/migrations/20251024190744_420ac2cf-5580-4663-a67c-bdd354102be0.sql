-- =============================================
-- PERMITIR COMMERCIAL DELETAR CLIENTES SEM PEDIDOS
-- =============================================

-- Remover política antiga de DELETE
DROP POLICY IF EXISTS "Apenas Admin pode deletar clientes" ON public.clientes;

-- Criar nova política que permite admin e commercial deletar
CREATE POLICY "Admin e Commercial podem deletar clientes"
ON public.clientes
FOR DELETE
USING (
  public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'commercial'::app_role])
);