-- Tabela tecidos
CREATE TABLE public.tecidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  composicao text NOT NULL,
  gramatura_g_m2 numeric NOT NULL CHECK (gramatura_g_m2 > 0),
  largura_m numeric NOT NULL CHECK (largura_m > 0),
  rendimento_m_kg numeric NOT NULL CHECK (rendimento_m_kg > 0),
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tecidos TO authenticated;
GRANT ALL ON public.tecidos TO service_role;

ALTER TABLE public.tecidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access tecidos" ON public.tecidos
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Commercial and viewer can read tecidos" ON public.tecidos
  FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'commercial'::app_role, 'viewer'::app_role]));

CREATE INDEX idx_tecidos_nome ON public.tecidos (nome);
CREATE INDEX idx_tecidos_ativo ON public.tecidos (ativo);

CREATE TRIGGER trg_tecidos_updated_at
  BEFORE UPDATE ON public.tecidos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela tecidos_variacoes
CREATE TABLE public.tecidos_variacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tecido_id uuid NOT NULL REFERENCES public.tecidos(id) ON DELETE CASCADE,
  cor text NOT NULL,
  estoque_kg numeric NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tecido_id, cor)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tecidos_variacoes TO authenticated;
GRANT ALL ON public.tecidos_variacoes TO service_role;

ALTER TABLE public.tecidos_variacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access tecidos_variacoes" ON public.tecidos_variacoes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Commercial and viewer can read tecidos_variacoes" ON public.tecidos_variacoes
  FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'commercial'::app_role, 'viewer'::app_role]));

CREATE INDEX idx_tecidos_variacoes_tecido_id ON public.tecidos_variacoes (tecido_id);
CREATE INDEX idx_tecidos_variacoes_ativo ON public.tecidos_variacoes (ativo);

CREATE TRIGGER trg_tecidos_variacoes_updated_at
  BEFORE UPDATE ON public.tecidos_variacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela tecidos_fornecedores_precos
CREATE TABLE public.tecidos_fornecedores_precos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tecido_variacao_id uuid NOT NULL REFERENCES public.tecidos_variacoes(id) ON DELETE CASCADE,
  fornecedor_id uuid NOT NULL REFERENCES public.fornecedores(id) ON DELETE RESTRICT,
  preco_por_kg numeric NOT NULL CHECK (preco_por_kg >= 0),
  ativo boolean NOT NULL DEFAULT true,
  ultima_atualizacao timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tecido_variacao_id, fornecedor_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tecidos_fornecedores_precos TO authenticated;
GRANT ALL ON public.tecidos_fornecedores_precos TO service_role;

ALTER TABLE public.tecidos_fornecedores_precos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access tecidos_fornecedores_precos" ON public.tecidos_fornecedores_precos
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Commercial and viewer can read tecidos_fornecedores_precos" ON public.tecidos_fornecedores_precos
  FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'commercial'::app_role, 'viewer'::app_role]));

CREATE INDEX idx_tfp_variacao_id ON public.tecidos_fornecedores_precos (tecido_variacao_id);
CREATE INDEX idx_tfp_fornecedor_id ON public.tecidos_fornecedores_precos (fornecedor_id);

CREATE TRIGGER trg_tfp_updated_at
  BEFORE UPDATE ON public.tecidos_fornecedores_precos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();