-- Drop old module
DROP TRIGGER IF EXISTS criar_fechamento_automatico_trigger ON public.etapas_producao;
DROP TRIGGER IF EXISTS trg_criar_fechamento_automatico ON public.etapas_producao;
DROP FUNCTION IF EXISTS public.criar_fechamento_automatico() CASCADE;
DROP TABLE IF EXISTS public.fechamento_logs CASCADE;
DROP TABLE IF EXISTS public.fechamento_itens CASCADE;
DROP TABLE IF EXISTS public.fechamentos CASCADE;

-- Enum
DO $$ BEGIN
  CREATE TYPE public.status_nf_fechamento AS ENUM ('pendente','emitida');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- New table
CREATE TABLE public.fechamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL,
  referencia_id uuid NOT NULL,
  cliente_id uuid NOT NULL,
  quantidade_prevista integer NOT NULL DEFAULT 0,
  quantidade_entrada integer,
  quantidade_saida integer,
  quantidade_caixas integer,
  observacao_perda text,
  status_nf public.status_nf_fechamento NOT NULL DEFAULT 'pendente',
  numero_nf text,
  data_emissao_nf date,
  arquivo_nf_url text,
  data_fechamento timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pedido_id, referencia_id)
);

CREATE INDEX idx_fechamentos_cliente ON public.fechamentos(cliente_id);
CREATE INDEX idx_fechamentos_status_nf ON public.fechamentos(status_nf);
CREATE INDEX idx_fechamentos_created_at ON public.fechamentos(created_at);

ALTER TABLE public.fechamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view fechamentos"
  ON public.fechamentos FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized roles can update fechamentos"
  ON public.fechamentos FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'commercial'::app_role,'production'::app_role,'pcp_closer'::app_role,'backoffice_fiscal'::app_role]));

CREATE POLICY "Authorized roles can insert fechamentos"
  ON public.fechamentos FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role,'commercial'::app_role,'production'::app_role,'pcp_closer'::app_role,'backoffice_fiscal'::app_role]));

CREATE POLICY "Admin can delete fechamentos"
  ON public.fechamentos FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_fechamentos_updated_at
  BEFORE UPDATE ON public.fechamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sync trigger from etapas_producao
CREATE OR REPLACE FUNCTION public.sync_fechamento_acabamento()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cliente_id uuid;
  v_quantidade integer;
BEGIN
  -- Entering acabamento: create fechamento row if missing
  IF NEW.tipo_etapa = 'acabamento'
     AND NEW.status IN ('em_andamento','concluido')
     AND NEW.referencia_id IS NOT NULL THEN
    SELECT cliente_id INTO v_cliente_id FROM public.pedidos WHERE id = NEW.pedido_id;
    SELECT quantidade INTO v_quantidade FROM public.referencias WHERE id = NEW.referencia_id;
    IF v_cliente_id IS NOT NULL THEN
      INSERT INTO public.fechamentos (pedido_id, referencia_id, cliente_id, quantidade_prevista)
      VALUES (NEW.pedido_id, NEW.referencia_id, v_cliente_id, COALESCE(v_quantidade, 0))
      ON CONFLICT (pedido_id, referencia_id) DO NOTHING;
    END IF;
  END IF;

  -- Moving back from acabamento to pendente: reset NF status
  IF TG_OP = 'UPDATE'
     AND OLD.tipo_etapa = 'acabamento'
     AND OLD.status IN ('em_andamento','concluido')
     AND NEW.status = 'pendente'
     AND OLD.referencia_id IS NOT NULL THEN
    UPDATE public.fechamentos
       SET data_fechamento = NULL,
           status_nf = 'pendente'
     WHERE pedido_id = OLD.pedido_id AND referencia_id = OLD.referencia_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_fechamento_acabamento
  AFTER INSERT OR UPDATE ON public.etapas_producao
  FOR EACH ROW EXECUTE FUNCTION public.sync_fechamento_acabamento();

-- Storage bucket for NF files
INSERT INTO storage.buckets (id, name, public)
VALUES ('nf-files', 'nf-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read nf-files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'nf-files');

CREATE POLICY "Authenticated upload nf-files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'nf-files');

CREATE POLICY "Authenticated update nf-files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'nf-files');

CREATE POLICY "Authenticated delete nf-files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'nf-files');

-- Backfill: create fechamentos for refs currently in/past acabamento
INSERT INTO public.fechamentos (pedido_id, referencia_id, cliente_id, quantidade_prevista)
SELECT DISTINCT ep.pedido_id, ep.referencia_id, p.cliente_id, COALESCE(r.quantidade, 0)
FROM public.etapas_producao ep
JOIN public.pedidos p ON p.id = ep.pedido_id
LEFT JOIN public.referencias r ON r.id = ep.referencia_id
WHERE ep.tipo_etapa = 'acabamento'
  AND ep.status IN ('em_andamento','concluido')
  AND ep.referencia_id IS NOT NULL
ON CONFLICT (pedido_id, referencia_id) DO NOTHING;