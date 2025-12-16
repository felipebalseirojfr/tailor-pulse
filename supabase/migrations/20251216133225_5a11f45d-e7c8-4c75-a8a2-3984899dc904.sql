-- Atualizar política de UPDATE para permitir que commercial também emita NF
DROP POLICY IF EXISTS "Roles autorizadas podem atualizar fechamentos" ON public.fechamentos;

CREATE POLICY "Roles autorizadas podem atualizar fechamentos" 
ON public.fechamentos 
FOR UPDATE
USING (
  -- Admin pode tudo
  has_role(auth.uid(), 'admin'::app_role)
  -- Commercial/PCP_Closer podem atualizar em_aberto e em_conferencia (para emitir NF)
  OR ((has_role(auth.uid(), 'commercial'::app_role) OR has_role(auth.uid(), 'pcp_closer'::app_role)) 
      AND status IN ('em_aberto', 'em_conferencia'))
  -- Backoffice_fiscal pode atualizar em_conferencia e fechado
  OR (has_role(auth.uid(), 'backoffice_fiscal'::app_role) 
      AND status IN ('em_conferencia', 'fechado'))
)
WITH CHECK (
  -- Admin pode tudo
  has_role(auth.uid(), 'admin'::app_role)
  -- Commercial/PCP_Closer podem definir status em_aberto, em_conferencia ou fechado
  OR ((has_role(auth.uid(), 'commercial'::app_role) OR has_role(auth.uid(), 'pcp_closer'::app_role)) 
      AND status IN ('em_aberto', 'em_conferencia', 'fechado'))
  -- Backoffice_fiscal pode definir status em_conferencia ou fechado
  OR (has_role(auth.uid(), 'backoffice_fiscal'::app_role) 
      AND status IN ('em_conferencia', 'fechado'))
);