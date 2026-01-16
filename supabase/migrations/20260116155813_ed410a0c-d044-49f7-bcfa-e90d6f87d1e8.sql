-- Remover trigger que depende da função
DROP TRIGGER IF EXISTS trigger_gerar_codigo_op ON public.pedidos;

-- Remover a função existente
DROP FUNCTION IF EXISTS public.gerar_codigo_op() CASCADE;

-- Função auxiliar para gerar código OP aleatório (4 números + 4 letras embaralhados)
CREATE OR REPLACE FUNCTION public.gerar_codigo_op_aleatorio()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  numeros text := '';
  letras text := '';
  codigo_completo text := '';
  caracteres char[] := ARRAY[]::char[];
  i integer;
  idx integer;
  resultado text := '';
BEGIN
  -- Gerar 4 números aleatórios
  FOR i IN 1..4 LOOP
    numeros := numeros || floor(random() * 10)::text;
  END LOOP;
  
  -- Gerar 4 letras aleatórias (A-Z)
  FOR i IN 1..4 LOOP
    letras := letras || chr(65 + floor(random() * 26)::integer);
  END LOOP;
  
  -- Combinar todos os 8 caracteres em um array
  FOR i IN 1..4 LOOP
    caracteres := array_append(caracteres, substr(numeros, i, 1)::char);
  END LOOP;
  FOR i IN 1..4 LOOP
    caracteres := array_append(caracteres, substr(letras, i, 1)::char);
  END LOOP;
  
  -- Embaralhar usando Fisher-Yates
  FOR i IN REVERSE 8..2 LOOP
    idx := 1 + floor(random() * i)::integer;
    -- Trocar caracteres[i] com caracteres[idx]
    IF i != idx THEN
      codigo_completo := caracteres[i];
      caracteres[i] := caracteres[idx];
      caracteres[idx] := codigo_completo::char;
    END IF;
  END LOOP;
  
  -- Montar o resultado
  resultado := '';
  FOR i IN 1..8 LOOP
    resultado := resultado || caracteres[i];
  END LOOP;
  
  RETURN resultado;
END;
$$;

-- Recriar a função principal 
CREATE FUNCTION public.gerar_codigo_op()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  novo_codigo text;
  codigo_existe boolean;
BEGIN
  LOOP
    -- Gerar código aleatório
    novo_codigo := gerar_codigo_op_aleatorio();
    
    -- Verificar se já existe
    SELECT EXISTS(SELECT 1 FROM pedidos WHERE codigo_pedido = novo_codigo) INTO codigo_existe;
    
    -- Se não existe, retornar
    IF NOT codigo_existe THEN
      RETURN novo_codigo;
    END IF;
  END LOOP;
END;
$$;

-- Função trigger para gerar codigo_pedido automaticamente
CREATE OR REPLACE FUNCTION public.trigger_fn_gerar_codigo_op()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.codigo_pedido IS NULL OR NEW.codigo_pedido = '' THEN
    NEW.codigo_pedido := gerar_codigo_op();
  END IF;
  RETURN NEW;
END;
$$;

-- Recriar o trigger
CREATE TRIGGER trigger_gerar_codigo_op
BEFORE INSERT ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION trigger_fn_gerar_codigo_op();