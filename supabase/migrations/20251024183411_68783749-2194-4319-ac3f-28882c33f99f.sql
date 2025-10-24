-- =============================================
-- CORRIGIR EXPOSIÇÃO PÚBLICA DA TABELA PROFILES
-- =============================================

-- Remover política antiga que não requer autenticação
DROP POLICY IF EXISTS "Usuários autenticados podem ver perfis" ON public.profiles;

-- Criar política que requer autenticação
CREATE POLICY "Usuários autenticados podem ver perfis"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- =============================================
-- CORRIGIR EXPOSIÇÃO PÚBLICA DA TABELA CLIENTES
-- =============================================

-- Remover política antiga
DROP POLICY IF EXISTS "Usuários autorizados podem ver clientes" ON public.clientes;

-- Criar política que requer autenticação E role apropriado
CREATE POLICY "Usuários autorizados podem ver clientes"
ON public.clientes
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  public.has_any_role(auth.uid(), ARRAY['admin', 'commercial', 'production']::app_role[])
);

-- =============================================
-- CORRIGIR EXPOSIÇÃO PÚBLICA DA TABELA PEDIDOS
-- =============================================

-- Remover política antiga
DROP POLICY IF EXISTS "Usuários autorizados podem ver pedidos" ON public.pedidos;

-- Criar política que requer autenticação E role apropriado
CREATE POLICY "Usuários autorizados podem ver pedidos"
ON public.pedidos
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  public.has_any_role(auth.uid(), ARRAY['admin', 'commercial', 'production', 'viewer']::app_role[])
);

-- =============================================
-- CORRIGIR EXPOSIÇÃO PÚBLICA DA TABELA ETAPAS_PRODUCAO
-- =============================================

-- Remover política antiga
DROP POLICY IF EXISTS "Usuários autorizados podem ver etapas" ON public.etapas_producao;

-- Criar política que requer autenticação E role apropriado
CREATE POLICY "Usuários autorizados podem ver etapas"
ON public.etapas_producao
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  public.has_any_role(auth.uid(), ARRAY['admin', 'commercial', 'production', 'viewer']::app_role[])
);