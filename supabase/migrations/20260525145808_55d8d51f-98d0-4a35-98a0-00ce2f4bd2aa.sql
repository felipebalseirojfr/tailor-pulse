
-- Make referencia_id nullable to support pedido-level fechamentos (when there are no referencias)
ALTER TABLE public.fechamentos ALTER COLUMN referencia_id DROP NOT NULL;

-- Replace unique constraint with a partial unique index that treats NULL as a single key per pedido
ALTER TABLE public.fechamentos DROP CONSTRAINT IF EXISTS fechamentos_pedido_id_referencia_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS fechamentos_pedido_referencia_uidx
  ON public.fechamentos (pedido_id, referencia_id)
  WHERE referencia_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS fechamentos_pedido_only_uidx
  ON public.fechamentos (pedido_id)
  WHERE referencia_id IS NULL;

-- Update sync function: handle pedidos com OU sem referencias
CREATE OR REPLACE FUNCTION public.sync_fechamento_acabamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cliente_id uuid;
  v_quantidade integer;
BEGIN
  IF NEW.tipo_etapa = 'acabamento'
     AND NEW.status IN ('em_andamento','concluido') THEN

    SELECT cliente_id, quantidade_total INTO v_cliente_id, v_quantidade
    FROM public.pedidos WHERE id = NEW.pedido_id;

    IF v_cliente_id IS NOT NULL THEN
      IF NEW.referencia_id IS NOT NULL THEN
        SELECT quantidade INTO v_quantidade FROM public.referencias WHERE id = NEW.referencia_id;
        INSERT INTO public.fechamentos (pedido_id, referencia_id, cliente_id, quantidade_prevista)
        VALUES (NEW.pedido_id, NEW.referencia_id, v_cliente_id, COALESCE(v_quantidade, 0))
        ON CONFLICT (pedido_id, referencia_id) WHERE referencia_id IS NOT NULL DO NOTHING;
      ELSE
        -- Pedido sem referencia: criar UM fechamento por pedido
        INSERT INTO public.fechamentos (pedido_id, referencia_id, cliente_id, quantidade_prevista)
        VALUES (NEW.pedido_id, NULL, v_cliente_id, COALESCE(v_quantidade, 0))
        ON CONFLICT (pedido_id) WHERE referencia_id IS NULL DO NOTHING;
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.tipo_etapa = 'acabamento'
     AND OLD.status IN ('em_andamento','concluido')
     AND NEW.status = 'pendente' THEN
    UPDATE public.fechamentos
       SET data_fechamento = NULL,
           status_nf = 'pendente'
     WHERE pedido_id = OLD.pedido_id
       AND (referencia_id = OLD.referencia_id OR (referencia_id IS NULL AND OLD.referencia_id IS NULL));
  END IF;

  RETURN NEW;
END;
$function$;

-- Create the trigger (was missing!)
DROP TRIGGER IF EXISTS trg_sync_fechamento_acabamento ON public.etapas_producao;
CREATE TRIGGER trg_sync_fechamento_acabamento
AFTER INSERT OR UPDATE ON public.etapas_producao
FOR EACH ROW EXECUTE FUNCTION public.sync_fechamento_acabamento();

-- Backfill: criar fechamentos para todos os pedidos cuja etapa acabamento já está em_andamento ou concluido
INSERT INTO public.fechamentos (pedido_id, referencia_id, cliente_id, quantidade_prevista)
SELECT DISTINCT e.pedido_id, e.referencia_id, p.cliente_id,
       COALESCE((SELECT quantidade FROM public.referencias r WHERE r.id = e.referencia_id), p.quantidade_total, 0)
FROM public.etapas_producao e
JOIN public.pedidos p ON p.id = e.pedido_id
WHERE e.tipo_etapa = 'acabamento'
  AND e.status IN ('em_andamento','concluido')
  AND NOT EXISTS (
    SELECT 1 FROM public.fechamentos f
    WHERE f.pedido_id = e.pedido_id
      AND ((f.referencia_id = e.referencia_id) OR (f.referencia_id IS NULL AND e.referencia_id IS NULL))
  );
