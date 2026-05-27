UPDATE public.fechamentos f
SET quantidade_prevista = sub.qtd
FROM (
  SELECT p.id AS pedido_id, COALESCE(SUM((value)::int), 0) AS qtd
  FROM public.pedidos p, jsonb_each_text(p.grade_tamanhos)
  WHERE jsonb_typeof(p.grade_tamanhos) = 'object'
    AND value ~ '^[0-9]+$'
  GROUP BY p.id
) sub
WHERE f.pedido_id = sub.pedido_id
  AND f.referencia_id IS NULL
  AND sub.qtd > 0
  AND f.quantidade_prevista <> sub.qtd;