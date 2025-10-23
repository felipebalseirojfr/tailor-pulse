-- Criar bucket para arquivos de pedidos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pedidos-arquivos',
  'pedidos-arquivos',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Políticas RLS para o bucket de arquivos de pedidos
CREATE POLICY "Usuários autenticados podem fazer upload de arquivos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'pedidos-arquivos' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Usuários autenticados podem ver arquivos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'pedidos-arquivos' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Usuários autenticados podem deletar arquivos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'pedidos-arquivos' AND
  auth.uid() IS NOT NULL
);

-- Adicionar coluna para armazenar metadados dos arquivos
ALTER TABLE public.pedidos 
ADD COLUMN arquivos JSONB DEFAULT '[]'::jsonb;