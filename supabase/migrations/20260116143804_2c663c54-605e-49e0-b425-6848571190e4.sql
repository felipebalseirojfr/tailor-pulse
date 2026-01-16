
-- Drop the existing function and recreate with new format
CREATE OR REPLACE FUNCTION public.gerar_codigo_op()
RETURNS TRIGGER AS $$
DECLARE
  novo_codigo TEXT;
  numeros TEXT;
  letras TEXT;
BEGIN
  -- Generate 4 random numbers
  numeros := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  
  -- Generate 4 random uppercase letters
  letras := CHR(65 + FLOOR(RANDOM() * 26)::INT) ||
            CHR(65 + FLOOR(RANDOM() * 26)::INT) ||
            CHR(65 + FLOOR(RANDOM() * 26)::INT) ||
            CHR(65 + FLOOR(RANDOM() * 26)::INT);
  
  novo_codigo := numeros || letras;
  
  -- Check for collision and regenerate if needed
  WHILE EXISTS (SELECT 1 FROM public.pedidos WHERE codigo_pedido = novo_codigo) LOOP
    numeros := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    letras := CHR(65 + FLOOR(RANDOM() * 26)::INT) ||
              CHR(65 + FLOOR(RANDOM() * 26)::INT) ||
              CHR(65 + FLOOR(RANDOM() * 26)::INT) ||
              CHR(65 + FLOOR(RANDOM() * 26)::INT);
    novo_codigo := numeros || letras;
  END LOOP;
  
  NEW.codigo_pedido := novo_codigo;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
