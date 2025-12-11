-- Remover política antiga
DROP POLICY IF EXISTS "PCP_Closer pode atualizar fechamentos em aberto" ON fechamentos;

-- Criar política atualizada incluindo commercial
CREATE POLICY "Roles autorizadas podem atualizar fechamentos" 
ON fechamentos FOR UPDATE 
USING (
  -- Fase FECHAMENTO (em_aberto): commercial, pcp_closer, admin
  ((has_role(auth.uid(), 'commercial'::app_role) OR has_role(auth.uid(), 'pcp_closer'::app_role)) 
   AND status = 'em_aberto')
  -- Fase EMISSÃO NF (em_conferencia, fechado): backoffice_fiscal, admin  
  OR (has_role(auth.uid(), 'backoffice_fiscal'::app_role) 
      AND status IN ('em_conferencia', 'fechado'))
  -- Admin sempre pode
  OR has_role(auth.uid(), 'admin'::app_role)
);