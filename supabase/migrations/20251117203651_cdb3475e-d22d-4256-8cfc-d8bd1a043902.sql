-- Políticas RLS para bucket pedidos-arquivos
-- Permitir que usuários autenticados façam upload de seus próprios arquivos

CREATE POLICY "Usuários podem fazer upload de seus próprios arquivos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pedidos-arquivos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Usuários podem ver seus próprios arquivos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'pedidos-arquivos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Usuários podem atualizar seus próprios arquivos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'pedidos-arquivos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Usuários podem deletar seus próprios arquivos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'pedidos-arquivos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);