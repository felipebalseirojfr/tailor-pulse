-- Remover política problemática que causa recursão
DROP POLICY IF EXISTS "Admins podem gerenciar roles" ON public.user_roles;

-- Recriar política usando a função has_role (SECURITY DEFINER) para evitar recursão
CREATE POLICY "Admins podem gerenciar roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));