-- Criar enum para status das etapas
CREATE TYPE public.status_etapa AS ENUM ('pendente', 'em_andamento', 'concluido');

-- Criar enum para tipos de etapa
CREATE TYPE public.tipo_etapa AS ENUM (
  'lacre_piloto',
  'liberacao_corte',
  'corte',
  'personalizacao',
  'costura',
  'acabamento',
  'entrega'
);

-- Tabela de perfis de usuários
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  cargo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de clientes (marcas)
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  contato TEXT,
  email TEXT,
  telefone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de pedidos
CREATE TABLE public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  produto_modelo TEXT NOT NULL,
  tipo_peca TEXT NOT NULL,
  tecido TEXT,
  aviamentos TEXT,
  quantidade_total INTEGER NOT NULL CHECK (quantidade_total > 0),
  data_inicio DATE NOT NULL,
  prazo_final DATE NOT NULL,
  responsavel_comercial_id UUID NOT NULL REFERENCES public.profiles(id),
  status_geral TEXT DEFAULT 'em_producao',
  progresso_percentual INTEGER DEFAULT 0 CHECK (progresso_percentual >= 0 AND progresso_percentual <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de etapas de produção
CREATE TABLE public.etapas_producao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  tipo_etapa tipo_etapa NOT NULL,
  ordem INTEGER NOT NULL,
  status status_etapa DEFAULT 'pendente',
  data_inicio TIMESTAMP WITH TIME ZONE,
  data_termino TIMESTAMP WITH TIME ZONE,
  responsavel_id UUID REFERENCES public.profiles(id),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pedido_id, tipo_etapa)
);

-- Índices para melhor performance
CREATE INDEX idx_pedidos_cliente ON public.pedidos(cliente_id);
CREATE INDEX idx_pedidos_responsavel ON public.pedidos(responsavel_comercial_id);
CREATE INDEX idx_etapas_pedido ON public.etapas_producao(pedido_id);
CREATE INDEX idx_etapas_status ON public.etapas_producao(status);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pedidos_updated_at
  BEFORE UPDATE ON public.pedidos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_etapas_updated_at
  BEFORE UPDATE ON public.etapas_producao
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar perfil automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Função para criar etapas automaticamente ao criar pedido
CREATE OR REPLACE FUNCTION public.criar_etapas_pedido()
RETURNS TRIGGER AS $$
DECLARE
  etapa tipo_etapa;
  ordem_atual INTEGER := 1;
BEGIN
  FOREACH etapa IN ARRAY ARRAY['lacre_piloto', 'liberacao_corte', 'corte', 'personalizacao', 'costura', 'acabamento', 'entrega']::tipo_etapa[] LOOP
    INSERT INTO public.etapas_producao (pedido_id, tipo_etapa, ordem, status)
    VALUES (NEW.id, etapa, ordem_atual, 'pendente');
    ordem_atual := ordem_atual + 1;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_criar_etapas_pedido
  AFTER INSERT ON public.pedidos
  FOR EACH ROW
  EXECUTE FUNCTION public.criar_etapas_pedido();

-- Função para atualizar progresso do pedido
CREATE OR REPLACE FUNCTION public.atualizar_progresso_pedido()
RETURNS TRIGGER AS $$
DECLARE
  total_etapas INTEGER;
  etapas_concluidas INTEGER;
  novo_progresso INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_etapas
  FROM public.etapas_producao
  WHERE pedido_id = NEW.pedido_id;

  SELECT COUNT(*) INTO etapas_concluidas
  FROM public.etapas_producao
  WHERE pedido_id = NEW.pedido_id AND status = 'concluido';

  novo_progresso := ROUND((etapas_concluidas::NUMERIC / total_etapas::NUMERIC) * 100);

  UPDATE public.pedidos
  SET progresso_percentual = novo_progresso,
      status_geral = CASE
        WHEN novo_progresso = 100 THEN 'concluido'
        WHEN novo_progresso > 0 THEN 'em_producao'
        ELSE 'aguardando'
      END
  WHERE id = NEW.pedido_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_progresso_pedido
  AFTER INSERT OR UPDATE ON public.etapas_producao
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_progresso_pedido();

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etapas_producao ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles (usuários autenticados podem ver todos os perfis)
CREATE POLICY "Usuários podem ver todos os perfis"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Políticas RLS para clientes (todos os usuários autenticados podem gerenciar)
CREATE POLICY "Usuários autenticados podem ver clientes"
  ON public.clientes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem criar clientes"
  ON public.clientes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar clientes"
  ON public.clientes FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem deletar clientes"
  ON public.clientes FOR DELETE
  TO authenticated
  USING (true);

-- Políticas RLS para pedidos
CREATE POLICY "Usuários autenticados podem ver pedidos"
  ON public.pedidos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem criar pedidos"
  ON public.pedidos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar pedidos"
  ON public.pedidos FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem deletar pedidos"
  ON public.pedidos FOR DELETE
  TO authenticated
  USING (true);

-- Políticas RLS para etapas de produção
CREATE POLICY "Usuários autenticados podem ver etapas"
  ON public.etapas_producao FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem criar etapas"
  ON public.etapas_producao FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar etapas"
  ON public.etapas_producao FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem deletar etapas"
  ON public.etapas_producao FOR DELETE
  TO authenticated
  USING (true);