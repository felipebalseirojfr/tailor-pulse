-- Remover políticas existentes
DROP POLICY IF EXISTS "PCP_Closer pode criar itens" ON fechamento_itens;
DROP POLICY IF EXISTS "PCP_Closer pode atualizar itens" ON fechamento_itens;

-- Criar nova política de INSERT incluindo commercial
CREATE POLICY "Usuários autorizados podem criar itens" ON fechamento_itens
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'pcp_closer'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'commercial'::app_role)
  );

-- Criar nova política de UPDATE incluindo commercial
CREATE POLICY "Usuários autorizados podem atualizar itens" ON fechamento_itens
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM fechamentos f
      WHERE f.id = fechamento_itens.fechamento_id
      AND (
        (has_role(auth.uid(), 'pcp_closer'::app_role) AND f.status = 'em_aberto')
        OR (has_role(auth.uid(), 'backoffice_fiscal'::app_role) AND f.status = 'em_conferencia')
        OR has_role(auth.uid(), 'admin'::app_role)
        OR (has_role(auth.uid(), 'commercial'::app_role) AND f.status = 'em_aberto')
      )
    )
  );