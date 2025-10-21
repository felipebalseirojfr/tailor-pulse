-- Remover política antiga que permite acesso público aos escaneamentos
DROP POLICY IF EXISTS "Usuários autenticados podem ver escaneamentos" ON public.escaneamentos_qr;

-- Criar nova política que exige autenticação
CREATE POLICY "Usuários autenticados podem ver escaneamentos" 
ON public.escaneamentos_qr 
FOR SELECT 
USING (auth.uid() IS NOT NULL);