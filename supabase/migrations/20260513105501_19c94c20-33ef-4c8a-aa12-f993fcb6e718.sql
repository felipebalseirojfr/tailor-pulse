-- Add foto_modelo_url column to pedidos
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS foto_modelo_url text;

-- Create public bucket for modelo photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('modelos-fotos', 'modelos-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public can view modelo photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'modelos-fotos');

CREATE POLICY "Authenticated can upload modelo photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'modelos-fotos');

CREATE POLICY "Authenticated can update modelo photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'modelos-fotos');

CREATE POLICY "Authenticated can delete modelo photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'modelos-fotos');