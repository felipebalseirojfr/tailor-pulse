-- Adicionar coluna qr_code_link na tabela pedidos
ALTER TABLE public.pedidos
ADD COLUMN IF NOT EXISTS qr_code_link TEXT;

-- Criar bucket público para armazenar QR Codes
INSERT INTO storage.buckets (id, name, public)
VALUES ('qrcodes', 'qrcodes', true)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir leitura pública dos QR codes
CREATE POLICY "QR Codes são publicamente acessíveis"
ON storage.objects
FOR SELECT
USING (bucket_id = 'qrcodes');

-- Política para permitir sistema criar QR codes
CREATE POLICY "Sistema pode fazer upload de QR codes"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'qrcodes');