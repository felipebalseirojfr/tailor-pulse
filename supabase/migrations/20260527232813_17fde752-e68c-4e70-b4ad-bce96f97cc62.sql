
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS grade_corte_real jsonb,
  ADD COLUMN IF NOT EXISTS comentario_corte text,
  ADD COLUMN IF NOT EXISTS corte_prioritario boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Usuários autorizados podem ver pedidos" ON public.pedidos;
CREATE POLICY "Usuários autorizados podem ver pedidos"
  ON public.pedidos FOR SELECT
  USING ((auth.uid() IS NOT NULL) AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'commercial'::app_role, 'production'::app_role, 'viewer'::app_role, 'corte'::app_role]));

DROP POLICY IF EXISTS "Usuários autorizados podem atualizar pedidos" ON public.pedidos;
CREATE POLICY "Usuários autorizados podem atualizar pedidos"
  ON public.pedidos FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'commercial'::app_role, 'production'::app_role, 'corte'::app_role]));

DROP POLICY IF EXISTS "Usuários autorizados podem ver etapas" ON public.etapas_producao;
CREATE POLICY "Usuários autorizados podem ver etapas"
  ON public.etapas_producao FOR SELECT
  USING ((auth.uid() IS NOT NULL) AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'commercial'::app_role, 'production'::app_role, 'viewer'::app_role, 'corte'::app_role]));

DROP POLICY IF EXISTS "Usuários autorizados podem atualizar etapas" ON public.etapas_producao;
CREATE POLICY "Usuários autorizados podem atualizar etapas"
  ON public.etapas_producao FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'commercial'::app_role, 'production'::app_role, 'corte'::app_role]));

DROP POLICY IF EXISTS "Admin e Commercial podem ver clientes" ON public.clientes;
CREATE POLICY "Usuários autorizados podem ver clientes"
  ON public.clientes FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'commercial'::app_role, 'corte'::app_role]));
