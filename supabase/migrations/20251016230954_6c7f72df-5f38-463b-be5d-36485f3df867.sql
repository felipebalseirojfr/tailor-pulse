-- Alterar campo aviamentos para array
ALTER TABLE pedidos ALTER COLUMN aviamentos TYPE text[] USING CASE 
  WHEN aviamentos IS NULL OR aviamentos = '' THEN ARRAY[]::text[]
  ELSE string_to_array(aviamentos, ',')
END;

-- Alterar valores padrão
ALTER TABLE pedidos ALTER COLUMN aviamentos SET DEFAULT ARRAY[]::text[];