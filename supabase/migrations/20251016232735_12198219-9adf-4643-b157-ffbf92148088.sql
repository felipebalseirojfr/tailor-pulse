-- Drop the old trigger that's causing duplicate entries
DROP TRIGGER IF EXISTS trigger_criar_etapas_pedido ON pedidos;