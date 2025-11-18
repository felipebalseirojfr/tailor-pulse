-- Criar tabela de auditoria de pedidos
CREATE TABLE IF NOT EXISTS public.pedidos_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES auth.users(id),
  usuario_nome TEXT,
  acao TEXT NOT NULL,
  campos_alterados JSONB,
  dados_antes JSONB,
  dados_depois JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.pedidos_auditoria ENABLE ROW LEVEL SECURITY;

-- Política: Usuários autorizados podem ver logs de auditoria
CREATE POLICY "Usuários autorizados podem ver auditoria"
ON public.pedidos_auditoria
FOR SELECT
TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'commercial'::app_role, 'production'::app_role])
);

-- Política: Sistema pode inserir logs
CREATE POLICY "Sistema pode criar logs de auditoria"
ON public.pedidos_auditoria
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Criar índices para melhor performance
CREATE INDEX idx_pedidos_auditoria_pedido_id ON public.pedidos_auditoria(pedido_id);
CREATE INDEX idx_pedidos_auditoria_created_at ON public.pedidos_auditoria(created_at DESC);