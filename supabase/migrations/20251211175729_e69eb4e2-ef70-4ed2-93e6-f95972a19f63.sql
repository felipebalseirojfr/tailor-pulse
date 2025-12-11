-- Adicionar campos de Nota Fiscal na tabela fechamentos
ALTER TABLE public.fechamentos 
ADD COLUMN IF NOT EXISTS numero_nf TEXT,
ADD COLUMN IF NOT EXISTS data_emissao_nf DATE,
ADD COLUMN IF NOT EXISTS valor_total_nf DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS status_nf TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS link_arquivo_nf TEXT;

-- Comentários para documentação
COMMENT ON COLUMN public.fechamentos.numero_nf IS 'Número da Nota Fiscal';
COMMENT ON COLUMN public.fechamentos.data_emissao_nf IS 'Data de emissão da NF';
COMMENT ON COLUMN public.fechamentos.valor_total_nf IS 'Valor total da NF';
COMMENT ON COLUMN public.fechamentos.status_nf IS 'Status da NF: pendente ou emitida';
COMMENT ON COLUMN public.fechamentos.link_arquivo_nf IS 'Link para arquivo XML/PDF da NF';