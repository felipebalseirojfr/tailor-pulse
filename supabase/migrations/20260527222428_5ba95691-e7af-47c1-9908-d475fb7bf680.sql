
-- 1. Fechamentos: remove 'production' role from financial closing access
DROP POLICY IF EXISTS "Authorized roles can view fechamentos" ON public.fechamentos;
DROP POLICY IF EXISTS "Authorized roles can insert fechamentos" ON public.fechamentos;
DROP POLICY IF EXISTS "Authorized roles can update fechamentos" ON public.fechamentos;

CREATE POLICY "Authorized roles can view fechamentos" ON public.fechamentos
FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'commercial'::app_role, 'pcp_closer'::app_role, 'backoffice_fiscal'::app_role]));

CREATE POLICY "Authorized roles can insert fechamentos" ON public.fechamentos
FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'commercial'::app_role, 'pcp_closer'::app_role, 'backoffice_fiscal'::app_role]));

CREATE POLICY "Authorized roles can update fechamentos" ON public.fechamentos
FOR UPDATE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'commercial'::app_role, 'pcp_closer'::app_role, 'backoffice_fiscal'::app_role]));

-- 2. Storage: pedidos-arquivos — remove broad authenticated policies, add role-scoped view
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload de arquivos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem ver arquivos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar arquivos" ON storage.objects;

-- Allow authorized roles to view all pedidos-arquivos (needed for admin/commercial/production to access order files)
CREATE POLICY "Roles autorizadas podem ver arquivos de pedidos" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'pedidos-arquivos'
  AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'commercial'::app_role, 'production'::app_role, 'viewer'::app_role])
);

-- 3. Storage: modelos-fotos — restrict writes to admin/commercial
DROP POLICY IF EXISTS "Authenticated can upload modelo photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update modelo photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete modelo photos" ON storage.objects;

CREATE POLICY "Admin/commercial can upload modelo photos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'modelos-fotos'
  AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'commercial'::app_role])
);

CREATE POLICY "Admin/commercial can update modelo photos" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'modelos-fotos'
  AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'commercial'::app_role])
);

CREATE POLICY "Admin/commercial can delete modelo photos" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'modelos-fotos'
  AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'commercial'::app_role])
);

-- 4. Profiles: restrict SELECT to authenticated role
DROP POLICY IF EXISTS "Usuarios podem ver apenas seu perfil ou admin pode ver todos" ON public.profiles;

CREATE POLICY "Usuarios podem ver apenas seu perfil ou admin pode ver todos"
ON public.profiles
FOR SELECT TO authenticated
USING ((auth.uid() = id) OR has_role(auth.uid(), 'admin'::app_role));
