-- Enum
CREATE TYPE public.unidade_medida_aviamento AS ENUM ('peca','kg','metro','cone','metragem','rolo');

-- Tabela aviamentos
CREATE TABLE public.aviamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  categoria text NOT NULL,
  tamanho_medida text,
  cor text,
  unidade public.unidade_medida_aviamento NOT NULL,
  estoque numeric NOT NULL DEFAULT 0,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_aviamentos_nome ON public.aviamentos (nome);
CREATE INDEX idx_aviamentos_categoria ON public.aviamentos (categoria);
CREATE INDEX idx_aviamentos_ativo ON public.aviamentos (ativo);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.aviamentos TO authenticated;
GRANT ALL ON public.aviamentos TO service_role;

ALTER TABLE public.aviamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access aviamentos"
  ON public.aviamentos FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Commercial and viewer can read aviamentos"
  ON public.aviamentos FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'commercial'::app_role,'viewer'::app_role]));

CREATE TRIGGER trg_aviamentos_updated_at
  BEFORE UPDATE ON public.aviamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela aviamentos_fornecedores_precos
CREATE TABLE public.aviamentos_fornecedores_precos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aviamento_id uuid NOT NULL REFERENCES public.aviamentos(id) ON DELETE CASCADE,
  fornecedor_id uuid NOT NULL REFERENCES public.fornecedores(id) ON DELETE RESTRICT,
  preco_por_unidade numeric NOT NULL CHECK (preco_por_unidade >= 0),
  ativo boolean NOT NULL DEFAULT true,
  ultima_atualizacao timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (aviamento_id, fornecedor_id)
);

CREATE INDEX idx_avi_precos_aviamento ON public.aviamentos_fornecedores_precos (aviamento_id);
CREATE INDEX idx_avi_precos_fornecedor ON public.aviamentos_fornecedores_precos (fornecedor_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.aviamentos_fornecedores_precos TO authenticated;
GRANT ALL ON public.aviamentos_fornecedores_precos TO service_role;

ALTER TABLE public.aviamentos_fornecedores_precos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access aviamentos_fornecedores_precos"
  ON public.aviamentos_fornecedores_precos FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Commercial and viewer can read aviamentos_fornecedores_precos"
  ON public.aviamentos_fornecedores_precos FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'commercial'::app_role,'viewer'::app_role]));

CREATE TRIGGER trg_avi_precos_updated_at
  BEFORE UPDATE ON public.aviamentos_fornecedores_precos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();