DROP POLICY IF EXISTS "Authorized roles can view fechamentos" ON public.fechamentos;

CREATE POLICY "Authorized roles can view fechamentos"
ON public.fechamentos
FOR SELECT
TO authenticated
USING (
  public.has_any_role(
    auth.uid(),
    ARRAY[
      'admin'::public.app_role,
      'commercial'::public.app_role,
      'production'::public.app_role,
      'pcp_closer'::public.app_role,
      'backoffice_fiscal'::public.app_role
    ]
  )
);