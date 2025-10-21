-- Remover política antiga que permite acesso público
DROP POLICY IF EXISTS "Usuários podem ver todos os perfis" ON public.profiles;

-- Criar nova política que exige autenticação
CREATE POLICY "Usuários autenticados podem ver perfis" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);