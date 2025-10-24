-- =============================================
-- CORRIGIR EXPOSIÇÃO PÚBLICA DA TABELA ESCANEAMENTOS_QR
-- =============================================

-- Remover política antiga que não requer autenticação
DROP POLICY IF EXISTS "Usuários autenticados podem ver escaneamentos" ON public.escaneamentos_qr;

-- Criar política que requer autenticação
CREATE POLICY "Usuários autenticados podem ver escaneamentos"
ON public.escaneamentos_qr
FOR SELECT
USING (auth.uid() IS NOT NULL);