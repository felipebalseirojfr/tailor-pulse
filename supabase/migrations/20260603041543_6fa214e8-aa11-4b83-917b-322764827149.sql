
-- Ficha Técnica JFR — Dev-3

CREATE TABLE public.fichas_tecnicas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referencia_id uuid NOT NULL UNIQUE REFERENCES public.referencias(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'rascunho',
  observacoes_gerais text NULL,
  referencia_cliente text NULL,
  colecao text NULL,
  finalizada_em timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fichas_tecnicas TO authenticated;
GRANT ALL ON public.fichas_tecnicas TO service_role;
ALTER TABLE public.fichas_tecnicas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access fichas_tecnicas" ON public.fichas_tecnicas FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Viewer read fichas_tecnicas" ON public.fichas_tecnicas FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'viewer'::app_role));
CREATE TRIGGER trg_fichas_tecnicas_updated BEFORE UPDATE ON public.fichas_tecnicas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.fichas_tecnicas_tecidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_tecnica_id uuid NOT NULL REFERENCES public.fichas_tecnicas(id) ON DELETE CASCADE,
  tecido_variacao_id uuid NOT NULL REFERENCES public.tecidos_variacoes(id) ON DELETE RESTRICT,
  consumo_kg_por_peca numeric NULL CHECK (consumo_kg_por_peca > 0),
  consumo_m_por_peca numeric NULL CHECK (consumo_m_por_peca > 0),
  fornecido_pelo_cliente boolean NOT NULL DEFAULT false,
  observacoes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ficha_tecnica_id, tecido_variacao_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fichas_tecnicas_tecidos TO authenticated;
GRANT ALL ON public.fichas_tecnicas_tecidos TO service_role;
ALTER TABLE public.fichas_tecnicas_tecidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access fichas_tecnicas_tecidos" ON public.fichas_tecnicas_tecidos FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Viewer read fichas_tecnicas_tecidos" ON public.fichas_tecnicas_tecidos FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'viewer'::app_role));
CREATE TRIGGER trg_ftt_updated BEFORE UPDATE ON public.fichas_tecnicas_tecidos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.fichas_tecnicas_aviamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_tecnica_id uuid NOT NULL REFERENCES public.fichas_tecnicas(id) ON DELETE CASCADE,
  aviamento_id uuid NOT NULL REFERENCES public.aviamentos(id) ON DELETE RESTRICT,
  quantidade_por_peca numeric NOT NULL CHECK (quantidade_por_peca > 0),
  localizacao text NULL,
  observacoes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ficha_tecnica_id, aviamento_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fichas_tecnicas_aviamentos TO authenticated;
GRANT ALL ON public.fichas_tecnicas_aviamentos TO service_role;
ALTER TABLE public.fichas_tecnicas_aviamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access fichas_tecnicas_aviamentos" ON public.fichas_tecnicas_aviamentos FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Viewer read fichas_tecnicas_aviamentos" ON public.fichas_tecnicas_aviamentos FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'viewer'::app_role));
CREATE TRIGGER trg_fta_updated BEFORE UPDATE ON public.fichas_tecnicas_aviamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.fichas_tecnicas_medidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_tecnica_id uuid NOT NULL REFERENCES public.fichas_tecnicas(id) ON DELETE CASCADE,
  nome_medida text NOT NULL,
  tamanho_base text NOT NULL,
  valor_cm numeric NOT NULL CHECK (valor_cm > 0),
  gradacao_obs text NULL,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fichas_tecnicas_medidas TO authenticated;
GRANT ALL ON public.fichas_tecnicas_medidas TO service_role;
ALTER TABLE public.fichas_tecnicas_medidas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access fichas_tecnicas_medidas" ON public.fichas_tecnicas_medidas FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Viewer read fichas_tecnicas_medidas" ON public.fichas_tecnicas_medidas FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'viewer'::app_role));
CREATE TRIGGER trg_ftm_updated BEFORE UPDATE ON public.fichas_tecnicas_medidas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.fichas_tecnicas_customizacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_tecnica_id uuid NOT NULL REFERENCES public.fichas_tecnicas(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  descricao text NOT NULL,
  localizacao text NULL,
  arte_url text NULL,
  observacoes text NULL,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fichas_tecnicas_customizacoes TO authenticated;
GRANT ALL ON public.fichas_tecnicas_customizacoes TO service_role;
ALTER TABLE public.fichas_tecnicas_customizacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access fichas_tecnicas_customizacoes" ON public.fichas_tecnicas_customizacoes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Viewer read fichas_tecnicas_customizacoes" ON public.fichas_tecnicas_customizacoes FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'viewer'::app_role));
CREATE TRIGGER trg_ftc_updated BEFORE UPDATE ON public.fichas_tecnicas_customizacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.fichas_tecnicas_arquivos_cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_tecnica_id uuid NOT NULL REFERENCES public.fichas_tecnicas(id) ON DELETE CASCADE,
  nome_arquivo text NOT NULL,
  arquivo_url text NOT NULL,
  tamanho_bytes integer NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fichas_tecnicas_arquivos_cliente TO authenticated;
GRANT ALL ON public.fichas_tecnicas_arquivos_cliente TO service_role;
ALTER TABLE public.fichas_tecnicas_arquivos_cliente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access fichas_tecnicas_arquivos_cliente" ON public.fichas_tecnicas_arquivos_cliente FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Viewer read fichas_tecnicas_arquivos_cliente" ON public.fichas_tecnicas_arquivos_cliente FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'viewer'::app_role));
CREATE TRIGGER trg_ftac_updated BEFORE UPDATE ON public.fichas_tecnicas_arquivos_cliente
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_ftt_ficha ON public.fichas_tecnicas_tecidos(ficha_tecnica_id);
CREATE INDEX idx_fta_ficha ON public.fichas_tecnicas_aviamentos(ficha_tecnica_id);
CREATE INDEX idx_ftm_ficha ON public.fichas_tecnicas_medidas(ficha_tecnica_id);
CREATE INDEX idx_ftc_ficha ON public.fichas_tecnicas_customizacoes(ficha_tecnica_id);
CREATE INDEX idx_ftac_ficha ON public.fichas_tecnicas_arquivos_cliente(ficha_tecnica_id);

-- Storage policies for fichas-tecnicas-cliente bucket
CREATE POLICY "Admin full access ft cliente files" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'fichas-tecnicas-cliente' AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'fichas-tecnicas-cliente' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Viewer read ft cliente files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'fichas-tecnicas-cliente' AND has_role(auth.uid(), 'viewer'::app_role));
