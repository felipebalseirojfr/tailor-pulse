-- Corrigir política de UPDATE para permitir transição de status
DROP POLICY IF EXISTS "Roles autorizadas podem atualizar fechamentos" ON fechamentos;

CREATE POLICY "Roles autorizadas podem atualizar fechamentos" 
ON fechamentos FOR UPDATE 
USING (
  -- Quem pode VER para atualizar (estado ANTES)
  ((has_role(auth.uid(), 'commercial'::app_role) OR has_role(auth.uid(), 'pcp_closer'::app_role)) 
   AND status = 'em_aberto')
  OR (has_role(auth.uid(), 'backoffice_fiscal'::app_role) 
      AND status IN ('em_conferencia', 'fechado'))
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  -- Quem pode SALVAR (estado DEPOIS) - permitir transições válidas
  ((has_role(auth.uid(), 'commercial'::app_role) OR has_role(auth.uid(), 'pcp_closer'::app_role)) 
   AND status IN ('em_aberto', 'em_conferencia'))
  OR (has_role(auth.uid(), 'backoffice_fiscal'::app_role) 
      AND status IN ('em_conferencia', 'fechado'))
  OR has_role(auth.uid(), 'admin'::app_role)
);