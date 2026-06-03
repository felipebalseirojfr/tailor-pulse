CREATE POLICY "Admin manage modelagens-dxf"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'modelagens-dxf' AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'modelagens-dxf' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated read modelagens-dxf"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'modelagens-dxf' AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'viewer'::app_role, 'commercial'::app_role]));