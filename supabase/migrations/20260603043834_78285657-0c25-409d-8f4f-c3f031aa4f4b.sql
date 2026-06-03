CREATE POLICY "Admin manage fotos-piloto"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'fotos-piloto' AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'fotos-piloto' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Viewer read fotos-piloto"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'fotos-piloto' AND has_role(auth.uid(), 'viewer'::app_role));