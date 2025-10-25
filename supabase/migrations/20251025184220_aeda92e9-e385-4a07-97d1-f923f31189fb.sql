-- Atualizar política de DELETE para pedidos (permitir admin e commercial)
DROP POLICY IF EXISTS "Apenas Admin pode deletar pedidos" ON public.pedidos;

CREATE POLICY "Admin e Commercial podem deletar pedidos"
ON public.pedidos
FOR DELETE
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'commercial'::app_role]));

-- Atualizar política de DELETE para etapas_producao (permitir admin e commercial)
DROP POLICY IF EXISTS "Apenas Admin pode deletar etapas" ON public.etapas_producao;

CREATE POLICY "Admin e Commercial podem deletar etapas"
ON public.etapas_producao
FOR DELETE
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'commercial'::app_role]));