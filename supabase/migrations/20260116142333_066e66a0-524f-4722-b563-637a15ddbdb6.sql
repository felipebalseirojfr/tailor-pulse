-- Criar função para gerar código OP único
CREATE OR REPLACE FUNCTION public.gerar_codigo_op()
RETURNS TRIGGER AS $$
DECLARE
  data_hoje TEXT;
  sequencia INT;
  novo_codigo TEXT;
BEGIN
  -- Formato: OP-YYYYMMDD-XXXX
  data_hoje := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  
  -- Contar quantos pedidos já foram criados hoje para gerar sequência
  SELECT COUNT(*) + 1 INTO sequencia
  FROM public.pedidos
  WHERE codigo_pedido LIKE 'OP-' || data_hoje || '-%';
  
  -- Gerar código com 4 dígitos de sequência
  novo_codigo := 'OP-' || data_hoje || '-' || LPAD(sequencia::TEXT, 4, '0');
  
  NEW.codigo_pedido := novo_codigo;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para gerar OP automaticamente ao inserir pedido
DROP TRIGGER IF EXISTS trigger_gerar_codigo_op ON public.pedidos;
CREATE TRIGGER trigger_gerar_codigo_op
  BEFORE INSERT ON public.pedidos
  FOR EACH ROW
  WHEN (NEW.codigo_pedido IS NULL)
  EXECUTE FUNCTION public.gerar_codigo_op();