-- Criar enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'commercial', 'production', 'viewer');

-- Criar tabela de roles de usuários
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- Habilitar RLS na tabela user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Política para permitir usuários verem seus próprios roles
CREATE POLICY "Usuários podem ver seus próprios roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Política para admins gerenciarem roles
CREATE POLICY "Admins podem gerenciar roles"
ON public.user_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Criar função security definer para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Criar função para verificar se usuário tem qualquer role administrativa
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  )
$$;

-- =============================================
-- ATUALIZAR RLS POLICIES DA TABELA CLIENTES
-- =============================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Usuários autenticados podem ver clientes" ON public.clientes;
DROP POLICY IF EXISTS "Usuários autenticados podem criar clientes" ON public.clientes;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar clientes" ON public.clientes;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar clientes" ON public.clientes;

-- Criar novas políticas baseadas em roles para CLIENTES

-- SELECT: Admin, Commercial e Production podem ver clientes
CREATE POLICY "Usuários autorizados podem ver clientes"
ON public.clientes
FOR SELECT
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'commercial', 'production']::app_role[])
);

-- INSERT: Apenas Admin e Commercial podem criar clientes
CREATE POLICY "Admin e Commercial podem criar clientes"
ON public.clientes
FOR INSERT
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin', 'commercial']::app_role[])
);

-- UPDATE: Apenas Admin e Commercial podem atualizar clientes
CREATE POLICY "Admin e Commercial podem atualizar clientes"
ON public.clientes
FOR UPDATE
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'commercial']::app_role[])
);

-- DELETE: Apenas Admin pode deletar clientes
CREATE POLICY "Apenas Admin pode deletar clientes"
ON public.clientes
FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- =============================================
-- ATUALIZAR RLS POLICIES DA TABELA PEDIDOS
-- =============================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Usuários autenticados podem ver pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Usuários autenticados podem criar pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar pedidos" ON public.pedidos;

-- Criar novas políticas baseadas em roles para PEDIDOS

-- SELECT: Todos os roles podem ver pedidos
CREATE POLICY "Usuários autorizados podem ver pedidos"
ON public.pedidos
FOR SELECT
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'commercial', 'production', 'viewer']::app_role[])
);

-- INSERT: Admin e Commercial podem criar pedidos
CREATE POLICY "Admin e Commercial podem criar pedidos"
ON public.pedidos
FOR INSERT
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin', 'commercial']::app_role[])
);

-- UPDATE: Admin, Commercial e Production podem atualizar pedidos
CREATE POLICY "Usuários autorizados podem atualizar pedidos"
ON public.pedidos
FOR UPDATE
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'commercial', 'production']::app_role[])
);

-- DELETE: Apenas Admin pode deletar pedidos
CREATE POLICY "Apenas Admin pode deletar pedidos"
ON public.pedidos
FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- =============================================
-- ATUALIZAR RLS POLICIES DA TABELA ETAPAS_PRODUCAO
-- =============================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Usuários autenticados podem ver etapas" ON public.etapas_producao;
DROP POLICY IF EXISTS "Usuários autenticados podem criar etapas" ON public.etapas_producao;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar etapas" ON public.etapas_producao;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar etapas" ON public.etapas_producao;

-- Criar novas políticas para ETAPAS_PRODUCAO

-- SELECT: Todos os roles podem ver etapas
CREATE POLICY "Usuários autorizados podem ver etapas"
ON public.etapas_producao
FOR SELECT
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'commercial', 'production', 'viewer']::app_role[])
);

-- INSERT: Admin e Commercial podem criar etapas
CREATE POLICY "Admin e Commercial podem criar etapas"
ON public.etapas_producao
FOR INSERT
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin', 'commercial']::app_role[])
);

-- UPDATE: Admin, Commercial e Production podem atualizar etapas
CREATE POLICY "Usuários autorizados podem atualizar etapas"
ON public.etapas_producao
FOR UPDATE
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'commercial', 'production']::app_role[])
);

-- DELETE: Apenas Admin pode deletar etapas
CREATE POLICY "Apenas Admin pode deletar etapas"
ON public.etapas_producao
FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Inserir role de admin para o primeiro usuário (você precisará ajustar o email)
-- Isso é temporário para você conseguir acessar o sistema
-- IMPORTANTE: Substitua 'seu-email@exemplo.com' pelo email que você usa no sistema
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'seu-email@exemplo.com'
ON CONFLICT (user_id, role) DO NOTHING;