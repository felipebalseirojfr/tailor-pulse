CREATE TABLE public.tipos_peca (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  abreviacao_2_letras varchar(2) NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tipos_peca_abreviacao_format CHECK (abreviacao_2_letras ~ '^[A-Z]{2}$')
);

CREATE UNIQUE INDEX tipos_peca_nome_unique ON public.tipos_peca (LOWER(nome));
CREATE UNIQUE INDEX tipos_peca_abreviacao_unique ON public.tipos_peca (abreviacao_2_letras);
CREATE INDEX tipos_peca_nome_idx ON public.tipos_peca (nome);
CREATE INDEX tipos_peca_ativo_idx ON public.tipos_peca (ativo);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tipos_peca TO authenticated;
GRANT ALL ON public.tipos_peca TO service_role;

ALTER TABLE public.tipos_peca ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access tipos_peca"
ON public.tipos_peca
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Commercial and viewer can read tipos_peca"
ON public.tipos_peca
FOR SELECT
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'commercial'::app_role, 'viewer'::app_role]));

CREATE TRIGGER update_tipos_peca_updated_at
BEFORE UPDATE ON public.tipos_peca
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();