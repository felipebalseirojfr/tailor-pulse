-- Add new enum values for development workflow
ALTER TYPE tipo_etapa ADD VALUE IF NOT EXISTS 'desenvolvimento_modelagem';
ALTER TYPE tipo_etapa ADD VALUE IF NOT EXISTS 'lacre_piloto';

-- piloto_etapas
CREATE TABLE public.piloto_etapas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referencia_id uuid NOT NULL REFERENCES public.referencias(id) ON DELETE CASCADE,
  tipo_etapa tipo_etapa NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  status status_etapa NOT NULL DEFAULT 'pendente',
  terceiro_id uuid NULL REFERENCES public.terceiros(id) ON DELETE SET NULL,
  data_inicio timestamptz NULL,
  data_termino timestamptz NULL,
  data_inicio_prevista timestamptz NULL,
  data_termino_prevista timestamptz NULL,
  observacoes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_piloto_etapas_referencia ON public.piloto_etapas(referencia_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.piloto_etapas TO authenticated;
GRANT ALL ON public.piloto_etapas TO service_role;

ALTER TABLE public.piloto_etapas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access piloto_etapas"
ON public.piloto_etapas FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Viewer read piloto_etapas"
ON public.piloto_etapas FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'viewer'::app_role));

CREATE TRIGGER trg_piloto_etapas_updated
BEFORE UPDATE ON public.piloto_etapas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- modelagens_dxf
CREATE TABLE public.modelagens_dxf (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referencia_id uuid NOT NULL REFERENCES public.referencias(id) ON DELETE CASCADE,
  nome_arquivo text NOT NULL,
  arquivo_url text NOT NULL,
  tamanho_bytes integer NULL,
  versao text NULL,
  observacoes text NULL,
  enviado_por uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_modelagens_dxf_referencia ON public.modelagens_dxf(referencia_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.modelagens_dxf TO authenticated;
GRANT ALL ON public.modelagens_dxf TO service_role;

ALTER TABLE public.modelagens_dxf ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access modelagens_dxf"
ON public.modelagens_dxf FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Viewer read modelagens_dxf"
ON public.modelagens_dxf FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'viewer'::app_role));

CREATE TRIGGER trg_modelagens_dxf_updated
BEFORE UPDATE ON public.modelagens_dxf
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();