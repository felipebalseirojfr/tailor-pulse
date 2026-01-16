-- Fix overly permissive INSERT policies on audit/log tables

-- 1. Fix pedidos_auditoria: Only admin, commercial, and production roles can insert audit logs
DROP POLICY IF EXISTS "Sistema pode criar logs de auditoria" ON public.pedidos_auditoria;
CREATE POLICY "Roles autorizadas podem criar logs de auditoria"
ON public.pedidos_auditoria
FOR INSERT
TO authenticated
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'commercial'::app_role, 'production'::app_role])
);

-- 2. Fix fechamento_logs: Only pcp_closer, backoffice_fiscal, commercial, and admin can insert logs
DROP POLICY IF EXISTS "Sistema pode criar logs" ON public.fechamento_logs;
CREATE POLICY "Roles autorizadas podem criar logs de fechamento"
ON public.fechamento_logs
FOR INSERT
TO authenticated
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pcp_closer'::app_role, 'backoffice_fiscal'::app_role, 'commercial'::app_role])
);

-- 3. Fix escaneamentos_qr: Allow edge functions (service role) or admin to insert
-- Edge functions use service role which bypasses RLS, but we need to allow null auth for service operations
DROP POLICY IF EXISTS "Sistema pode criar escaneamentos" ON public.escaneamentos_qr;
CREATE POLICY "Sistema e admin podem criar escaneamentos"
ON public.escaneamentos_qr
FOR INSERT
WITH CHECK (
  auth.uid() IS NULL OR has_role(auth.uid(), 'admin'::app_role)
);

-- 4. Fix alertas_ocupacao: Only admin and commercial roles can create alerts
DROP POLICY IF EXISTS "Sistema pode criar alertas" ON public.alertas_ocupacao;
CREATE POLICY "Roles autorizadas podem criar alertas"
ON public.alertas_ocupacao
FOR INSERT
TO authenticated
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'commercial'::app_role])
);