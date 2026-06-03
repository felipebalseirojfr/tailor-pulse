
-- =========== Ficha de Costura (Dev-4) ===========

CREATE TABLE public.fichas_costura (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referencia_id uuid NOT NULL UNIQUE REFERENCES public.referencias(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'rascunho',
  observacoes_gerais text NULL,
  finalizada_em timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fichas_costura TO authenticated;
GRANT ALL ON public.fichas_costura TO service_role;
ALTER TABLE public.fichas_costura ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access fichas_costura" ON public.fichas_costura
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Viewer read fichas_costura" ON public.fichas_costura
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'viewer'::app_role));
CREATE TRIGGER trg_fichas_costura_updated BEFORE UPDATE ON public.fichas_costura
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tecidos
CREATE TABLE public.fichas_costura_tecidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_costura_id uuid NOT NULL REFERENCES public.fichas_costura(id) ON DELETE CASCADE,
  tecido_variacao_id uuid NOT NULL REFERENCES public.tecidos_variacoes(id) ON DELETE RESTRICT,
  consumo_kg_por_peca numeric NULL CHECK (consumo_kg_por_peca IS NULL OR consumo_kg_por_peca > 0),
  consumo_m_por_peca numeric NULL CHECK (consumo_m_por_peca IS NULL OR consumo_m_por_peca > 0),
  consumo_calculado_automaticamente boolean NOT NULL DEFAULT false,
  fornecido_pelo_cliente boolean NOT NULL DEFAULT false,
  observacoes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ficha_costura_id, tecido_variacao_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fichas_costura_tecidos TO authenticated;
GRANT ALL ON public.fichas_costura_tecidos TO service_role;
ALTER TABLE public.fichas_costura_tecidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access fichas_costura_tecidos" ON public.fichas_costura_tecidos
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Viewer read fichas_costura_tecidos" ON public.fichas_costura_tecidos
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'viewer'::app_role));
CREATE TRIGGER trg_fct_tecidos_updated BEFORE UPDATE ON public.fichas_costura_tecidos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_fct_tecidos_ficha ON public.fichas_costura_tecidos(ficha_costura_id);

-- Medidas
CREATE TABLE public.fichas_costura_medidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_costura_id uuid NOT NULL REFERENCES public.fichas_costura(id) ON DELETE CASCADE,
  nome_medida text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  medidas_por_tamanho jsonb NOT NULL DEFAULT '{}'::jsonb,
  gradacao_obs text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fichas_costura_medidas TO authenticated;
GRANT ALL ON public.fichas_costura_medidas TO service_role;
ALTER TABLE public.fichas_costura_medidas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access fichas_costura_medidas" ON public.fichas_costura_medidas
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Viewer read fichas_costura_medidas" ON public.fichas_costura_medidas
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'viewer'::app_role));
CREATE TRIGGER trg_fct_medidas_updated BEFORE UPDATE ON public.fichas_costura_medidas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_fct_medidas_ficha ON public.fichas_costura_medidas(ficha_costura_id);

-- Aviamentos grade
CREATE TABLE public.fichas_costura_aviamentos_grade (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_costura_id uuid NOT NULL REFERENCES public.fichas_costura(id) ON DELETE CASCADE,
  aviamento_id uuid NOT NULL REFERENCES public.aviamentos(id) ON DELETE RESTRICT,
  localizacao text NULL,
  como_pregar text NULL,
  medidas_por_tamanho jsonb NOT NULL DEFAULT '{}'::jsonb,
  quantidade_por_tamanho jsonb NOT NULL DEFAULT '{}'::jsonb,
  observacoes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ficha_costura_id, aviamento_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fichas_costura_aviamentos_grade TO authenticated;
GRANT ALL ON public.fichas_costura_aviamentos_grade TO service_role;
ALTER TABLE public.fichas_costura_aviamentos_grade ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access fichas_costura_aviamentos_grade" ON public.fichas_costura_aviamentos_grade
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Viewer read fichas_costura_aviamentos_grade" ON public.fichas_costura_aviamentos_grade
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'viewer'::app_role));
CREATE TRIGGER trg_fct_avi_updated BEFORE UPDATE ON public.fichas_costura_aviamentos_grade
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_fct_avi_ficha ON public.fichas_costura_aviamentos_grade(ficha_costura_id);

-- Linhas
CREATE TABLE public.fichas_costura_linhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_costura_id uuid NOT NULL REFERENCES public.fichas_costura(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  cor text NOT NULL,
  numero_fio text NULL,
  localizacao text NULL,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fichas_costura_linhas TO authenticated;
GRANT ALL ON public.fichas_costura_linhas TO service_role;
ALTER TABLE public.fichas_costura_linhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access fichas_costura_linhas" ON public.fichas_costura_linhas
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Viewer read fichas_costura_linhas" ON public.fichas_costura_linhas
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'viewer'::app_role));
CREATE TRIGGER trg_fct_linhas_updated BEFORE UPDATE ON public.fichas_costura_linhas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_fct_linhas_ficha ON public.fichas_costura_linhas(ficha_costura_id);

-- Pontos
CREATE TABLE public.fichas_costura_pontos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_costura_id uuid NOT NULL REFERENCES public.fichas_costura(id) ON DELETE CASCADE,
  parte_peca text NOT NULL,
  tipo_ponto text NOT NULL,
  observacoes text NULL,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fichas_costura_pontos TO authenticated;
GRANT ALL ON public.fichas_costura_pontos TO service_role;
ALTER TABLE public.fichas_costura_pontos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access fichas_costura_pontos" ON public.fichas_costura_pontos
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Viewer read fichas_costura_pontos" ON public.fichas_costura_pontos
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'viewer'::app_role));
CREATE TRIGGER trg_fct_pontos_updated BEFORE UPDATE ON public.fichas_costura_pontos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_fct_pontos_ficha ON public.fichas_costura_pontos(ficha_costura_id);

-- Entretelas
CREATE TABLE public.fichas_costura_entretelas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_costura_id uuid NOT NULL REFERENCES public.fichas_costura(id) ON DELETE CASCADE,
  localizacao text NOT NULL,
  tipo_entretela text NOT NULL,
  observacoes text NULL,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fichas_costura_entretelas TO authenticated;
GRANT ALL ON public.fichas_costura_entretelas TO service_role;
ALTER TABLE public.fichas_costura_entretelas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access fichas_costura_entretelas" ON public.fichas_costura_entretelas
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Viewer read fichas_costura_entretelas" ON public.fichas_costura_entretelas
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'viewer'::app_role));
CREATE TRIGGER trg_fct_entre_updated BEFORE UPDATE ON public.fichas_costura_entretelas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_fct_entre_ficha ON public.fichas_costura_entretelas(ficha_costura_id);

-- Dobras
CREATE TABLE public.fichas_costura_dobras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_costura_id uuid NOT NULL REFERENCES public.fichas_costura(id) ON DELETE CASCADE,
  parte_peca text NOT NULL,
  descricao text NOT NULL,
  medida_cm numeric NULL,
  observacoes text NULL,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fichas_costura_dobras TO authenticated;
GRANT ALL ON public.fichas_costura_dobras TO service_role;
ALTER TABLE public.fichas_costura_dobras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access fichas_costura_dobras" ON public.fichas_costura_dobras
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Viewer read fichas_costura_dobras" ON public.fichas_costura_dobras
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'viewer'::app_role));
CREATE TRIGGER trg_fct_dobras_updated BEFORE UPDATE ON public.fichas_costura_dobras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_fct_dobras_ficha ON public.fichas_costura_dobras(ficha_costura_id);

-- Montagem
CREATE TABLE public.fichas_costura_montagem (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_costura_id uuid NOT NULL REFERENCES public.fichas_costura(id) ON DELETE CASCADE,
  passo integer NOT NULL,
  descricao text NOT NULL,
  observacoes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fichas_costura_montagem TO authenticated;
GRANT ALL ON public.fichas_costura_montagem TO service_role;
ALTER TABLE public.fichas_costura_montagem ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access fichas_costura_montagem" ON public.fichas_costura_montagem
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Viewer read fichas_costura_montagem" ON public.fichas_costura_montagem
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'viewer'::app_role));
CREATE TRIGGER trg_fct_mont_updated BEFORE UPDATE ON public.fichas_costura_montagem
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_fct_mont_ficha ON public.fichas_costura_montagem(ficha_costura_id);

-- Fotos
CREATE TABLE public.fichas_costura_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_costura_id uuid NOT NULL REFERENCES public.fichas_costura(id) ON DELETE CASCADE,
  foto_url text NOT NULL,
  legenda text NULL,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fichas_costura_fotos TO authenticated;
GRANT ALL ON public.fichas_costura_fotos TO service_role;
ALTER TABLE public.fichas_costura_fotos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access fichas_costura_fotos" ON public.fichas_costura_fotos
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Viewer read fichas_costura_fotos" ON public.fichas_costura_fotos
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'viewer'::app_role));
CREATE TRIGGER trg_fct_fotos_updated BEFORE UPDATE ON public.fichas_costura_fotos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_fct_fotos_ficha ON public.fichas_costura_fotos(ficha_costura_id);

-- Storage policies for fichas-costura-fotos (bucket created via tool)
CREATE POLICY "Admin manage fichas-costura-fotos" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'fichas-costura-fotos' AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'fichas-costura-fotos' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Viewer read fichas-costura-fotos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'fichas-costura-fotos' AND has_role(auth.uid(), 'viewer'::app_role));
