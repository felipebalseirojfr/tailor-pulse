-- =============================================
-- RESTRINGIR ACESSO AOS ESCANEAMENTOS APENAS PARA ADMINS
-- =============================================

-- Remover política antiga
DROP POLICY IF EXISTS "Usuários autenticados podem ver escaneamentos" ON public.escaneamentos_qr;

-- Criar política que requer autenticação E role de admin
CREATE POLICY "Apenas admins podem ver escaneamentos"
ON public.escaneamentos_qr
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  public.has_role(auth.uid(), 'admin'::app_role)
);