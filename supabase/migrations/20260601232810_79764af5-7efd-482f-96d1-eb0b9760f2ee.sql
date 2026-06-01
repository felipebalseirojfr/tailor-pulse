-- Create referencias table
CREATE TABLE public.referencias (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo text NOT NULL,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  tipo_peca_id uuid NOT NULL REFERENCES public.tipos_peca(id) ON DELETE RESTRICT,
  sequencial integer NOT NULL,
  descricao text NULL,
  modelagem_origem_id uuid NULL REFERENCES public.referencias(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'em_desenvolvimento',
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referencias_codigo_format CHECK (codigo ~ '^[A-Z]{2}\.[A-Z]{2}\.[0-9]{4}$'),
  CONSTRAINT referencias_modelagem_origem_not_self CHECK (modelagem_origem_id IS NULL OR modelagem_origem_id != id)
);

CREATE UNIQUE INDEX referencias_codigo_unique ON public.referencias (codigo);
CREATE UNIQUE INDEX referencias_sequencial_unique ON public.referencias (cliente_id, tipo_peca_id, sequencial);
CREATE INDEX referencias_cliente_id_idx ON public.referencias (cliente_id);
CREATE INDEX referencias_tipo_peca_id_idx ON public.referencias (tipo_peca_id);
CREATE INDEX referencias_ativo_idx ON public.referencias (ativo);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referencias TO authenticated;
GRANT ALL ON public.referencias TO service_role;

-- RLS
ALTER TABLE public.referencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access referencias"
ON public.referencias FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Commercial and viewer can read referencias"
ON public.referencias FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'commercial'::app_role, 'viewer'::app_role]));

-- updated_at trigger
CREATE TRIGGER update_referencias_updated_at
BEFORE UPDATE ON public.referencias
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-generate sequencial and codigo on insert
CREATE OR REPLACE FUNCTION public.gerar_codigo_referencia()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_abrev text;
  v_tipo_abrev text;
  v_next_seq integer;
BEGIN
  SELECT abreviacao_2_letras INTO v_cliente_abrev
  FROM public.clientes WHERE id = NEW.cliente_id;

  IF v_cliente_abrev IS NULL THEN
    RAISE EXCEPTION 'Cliente não tem abreviação cadastrada';
  END IF;

  SELECT abreviacao_2_letras INTO v_tipo_abrev
  FROM public.tipos_peca WHERE id = NEW.tipo_peca_id;

  IF v_tipo_abrev IS NULL THEN
    RAISE EXCEPTION 'Tipo de peça não tem abreviação cadastrada';
  END IF;

  -- Lock to avoid race conditions
  SELECT COALESCE(MAX(sequencial), 0) + 1
  INTO v_next_seq
  FROM public.referencias
  WHERE cliente_id = NEW.cliente_id AND tipo_peca_id = NEW.tipo_peca_id;

  NEW.sequencial := v_next_seq;
  NEW.codigo := UPPER(v_tipo_abrev) || '.' || UPPER(v_cliente_abrev) || '.' || LPAD(v_next_seq::text, 4, '0');

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_gerar_codigo_referencia
BEFORE INSERT ON public.referencias
FOR EACH ROW EXECUTE FUNCTION public.gerar_codigo_referencia();

-- Helper function for preview (next sequential)
CREATE OR REPLACE FUNCTION public.proximo_sequencial_referencia(_cliente_id uuid, _tipo_peca_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(sequencial), 0) + 1
  FROM public.referencias
  WHERE cliente_id = _cliente_id AND tipo_peca_id = _tipo_peca_id
$$;

-- Re-add FK constraints on existing columns
ALTER TABLE public.etapas_producao
  ADD CONSTRAINT etapas_producao_referencia_id_fkey
  FOREIGN KEY (referencia_id) REFERENCES public.referencias(id) ON DELETE SET NULL;

ALTER TABLE public.fechamentos
  ADD CONSTRAINT fechamentos_referencia_id_fkey
  FOREIGN KEY (referencia_id) REFERENCES public.referencias(id) ON DELETE SET NULL;