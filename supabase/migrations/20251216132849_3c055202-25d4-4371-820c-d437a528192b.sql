-- Atualizar bucket pedidos-arquivos para aceitar arquivos XML
UPDATE storage.buckets
SET allowed_mime_types = array_cat(
  COALESCE(allowed_mime_types, ARRAY[]::text[]),
  ARRAY['text/xml', 'application/xml']
)
WHERE id = 'pedidos-arquivos';