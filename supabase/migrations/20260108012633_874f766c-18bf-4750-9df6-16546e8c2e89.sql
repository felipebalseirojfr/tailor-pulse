-- Remover política existente de SELECT
DROP POLICY IF EXISTS "Usuários autenticados podem ver perfis" ON public.profiles;

-- Criar nova política restritiva: apenas próprio perfil ou admin
CREATE POLICY "Usuarios podem ver apenas seu perfil ou admin pode ver todos"
  ON public.profiles
  FOR SELECT
  USING (
    (auth.uid() = id) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );