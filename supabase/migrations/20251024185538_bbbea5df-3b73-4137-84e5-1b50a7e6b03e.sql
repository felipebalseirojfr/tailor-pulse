-- =============================================
-- ATRIBUIR ROLES PARA USUÁRIOS EXISTENTES E NOVOS
-- =============================================

-- Atribuir role 'commercial' para todos os usuários existentes que não têm role
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'commercial'::app_role
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Criar função para atribuir role automaticamente a novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atribuir role 'commercial' por padrão para novos usuários
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'commercial'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para atribuir role automaticamente
DROP TRIGGER IF EXISTS on_auth_user_role_created ON public.profiles;
CREATE TRIGGER on_auth_user_role_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();