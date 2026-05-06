
-- Tighten clientes SELECT to admin and commercial only
DROP POLICY IF EXISTS "Usuários autorizados podem ver clientes" ON public.clientes;
CREATE POLICY "Admin e Commercial podem ver clientes"
ON public.clientes FOR SELECT
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'commercial'::app_role]));

-- Tighten fechamento_itens SELECT to specific roles
DROP POLICY IF EXISTS "Usuários autenticados podem ver todos itens" ON public.fechamento_itens;
CREATE POLICY "Roles autorizados podem ver itens de fechamento"
ON public.fechamento_itens FOR SELECT
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'commercial'::app_role, 'backoffice_fiscal'::app_role, 'pcp_closer'::app_role]));
