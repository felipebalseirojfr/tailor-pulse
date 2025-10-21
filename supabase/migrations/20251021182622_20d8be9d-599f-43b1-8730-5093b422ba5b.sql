-- Adicionar campos de QR Code na tabela pedidos
ALTER TABLE public.pedidos 
ADD COLUMN IF NOT EXISTS qr_code_ref TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS qr_code_gerado_em TIMESTAMP WITH TIME ZONE;

-- Criar tabela para histórico de escaneamentos
CREATE TABLE IF NOT EXISTS public.escaneamentos_qr (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  etapa_atualizada TEXT NOT NULL,
  fornecedor_nome TEXT,
  user_agent TEXT,
  ip_address TEXT,
  escaneado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_escaneamentos_pedido_id ON public.escaneamentos_qr(pedido_id);
CREATE INDEX IF NOT EXISTS idx_escaneamentos_device ON public.escaneamentos_qr(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_pedidos_qr_ref ON public.pedidos(qr_code_ref);

-- Habilitar RLS na tabela escaneamentos_qr
ALTER TABLE public.escaneamentos_qr ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para escaneamentos_qr
CREATE POLICY "Usuários autenticados podem ver escaneamentos"
  ON public.escaneamentos_qr
  FOR SELECT
  USING (true);

CREATE POLICY "Sistema pode criar escaneamentos"
  ON public.escaneamentos_qr
  FOR INSERT
  WITH CHECK (true);

-- Função para gerar referência única de QR Code
CREATE OR REPLACE FUNCTION public.gerar_qr_code_ref()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.qr_code_ref IS NULL THEN
    NEW.qr_code_ref := 'PROD-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NEW.id::TEXT) FROM 1 FOR 8));
    NEW.qr_code_gerado_em := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para gerar QR Code automaticamente ao criar pedido
DROP TRIGGER IF EXISTS trigger_gerar_qr_code ON public.pedidos;
CREATE TRIGGER trigger_gerar_qr_code
  BEFORE INSERT ON public.pedidos
  FOR EACH ROW
  EXECUTE FUNCTION public.gerar_qr_code_ref();

-- Atualizar pedidos existentes com QR Code
UPDATE public.pedidos
SET qr_code_ref = 'PROD-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT) FROM 1 FOR 8)),
    qr_code_gerado_em = now()
WHERE qr_code_ref IS NULL;