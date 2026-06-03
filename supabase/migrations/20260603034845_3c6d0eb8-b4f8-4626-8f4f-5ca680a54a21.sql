-- Allow commercial and production roles to update references (needed for soft-delete / inactivate)
CREATE POLICY "Commercial and production can update referencias"
ON public.referencias
FOR UPDATE
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'commercial'::app_role, 'production'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'commercial'::app_role, 'production'::app_role]));