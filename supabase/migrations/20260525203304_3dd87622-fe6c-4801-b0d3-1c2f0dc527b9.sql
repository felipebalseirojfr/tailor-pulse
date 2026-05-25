CREATE OR REPLACE FUNCTION public.sync_fechamento_acabamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cliente_id uuid;
  v_quantidade integer;
  v_grade jsonb;
  v_grade_sum integer;
BEGIN
  IF NEW.tipo_etapa = 'acabamento'
     AND NEW.status IN ('em_andamento','concluido') THEN

    SELECT cliente_id, quantidade_total, grade_tamanhos
      INTO v_cliente_id, v_quantidade, v_grade
    FROM public.pedidos WHERE id = NEW.pedido_id;

    IF v_grade IS NOT NULL AND jsonb_typeof(v_grade) = 'object' THEN
      SELECT COALESCE(SUM((value)::int), 0) INTO v_grade_sum
      FROM jsonb_each_text(v_grade)
      WHERE value ~ '^[0-9]+$';
      IF v_grade_sum > 0 THEN
        v_quantidade := v_grade_sum;
      END IF;
    END IF;

    IF v_cliente_id IS NOT NULL THEN
      IF NEW.referencia_id IS NOT NULL THEN
        SELECT COALESCE(quantidade, v_quantidade) INTO v_quantidade
        FROM public.referencias WHERE id = NEW.referencia_id;
        INSERT INTO public.fechamentos (pedido_id, referencia_id, cliente_id, quantidade_prevista)
        VALUES (NEW.pedido_id, NEW.referencia_id, v_cliente_id, COALESCE(v_quantidade, 0))
        ON CONFLICT (pedido_id, referencia_id) WHERE referencia_id IS NOT NULL DO NOTHING;
      ELSE
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

UPDATE public.fechamentos f
SET quantidade_prevista = sub.qtd_real
FROM (
  SELECT p.id AS pedido_id,
         COALESCE(
           (SELECT SUM((value)::int)
              FROM jsonb_each_text(p.grade_tamanhos)
             WHERE value ~ '^[0-9]+$'),
           p.quantidade_total,
           0
         ) AS qtd_real
  FROM public.pedidos p
  WHERE p.grade_tamanhos IS NOT NULL
) sub
WHERE f.pedido_id = sub.pedido_id
  AND f.referencia_id IS NULL
  AND f.quantidade_prevista <> sub.qtd_real;