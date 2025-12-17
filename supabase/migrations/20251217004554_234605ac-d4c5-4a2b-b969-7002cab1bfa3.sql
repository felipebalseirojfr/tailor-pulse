-- Habilitar REPLICA IDENTITY FULL para capturar dados completos nas mudanças
ALTER TABLE escaneamentos_qr REPLICA IDENTITY FULL;

-- Adicionar tabela à publicação do Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE escaneamentos_qr;