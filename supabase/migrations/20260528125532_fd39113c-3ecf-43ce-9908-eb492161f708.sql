REVOKE EXECUTE ON FUNCTION public.gerar_codigo_op() FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.gerar_codigo_op_aleatorio() FROM authenticated, anon;

ALTER FUNCTION public.gerar_codigo_op() SECURITY DEFINER;
ALTER FUNCTION public.gerar_codigo_op_aleatorio() SECURITY DEFINER;
ALTER FUNCTION public.trigger_fn_gerar_codigo_op() SECURITY DEFINER;