
-- ===== ENUMS DO MÓDULO COMERCIAL =====
CREATE TYPE public.status_pipeline AS ENUM (
  'lead_qualificado',
  'reuniao_realizada',
  'interesse_confirmado',
  'escopo_definido',
  'piloto_solicitada',
  'piloto_enviada',
  'proposta_comercial',
  'negociacao',
  'fechado',
  'perdido'
);

CREATE TYPE public.status_prospeccao AS ENUM (
  'identificado',
  'contato_feito',
  'reuniao_marcada',
  'qualificado',
  'descartado'
);

CREATE TYPE public.prioridade_comercial AS ENUM ('alta', 'media', 'baixa');
CREATE TYPE public.segmento_comercial AS ENUM ('private_label_moda', 'uniformes', 'esportivo', 'outros');
CREATE TYPE public.origem_comercial AS ENUM ('indicacao', 'instagram', 'evento', 'pesquisa_ativa', 'representante', 'outro');
CREATE TYPE public.temperatura_comercial AS ENUM ('frio', 'morno', 'quente');
CREATE TYPE public.bloqueado_por_comercial AS ENUM ('aguardando_cliente', 'aguardando_interno', 'aguardando_piloto', 'aguardando_proposta', 'outro');

-- ===== TABELA NEGOCIAÇÕES =====
CREATE TABLE public.negociacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  marca_nome TEXT NOT NULL,
  status_pipeline public.status_pipeline NOT NULL DEFAULT 'lead_qualificado',
  prioridade public.prioridade_comercial NOT NULL DEFAULT 'media',
  proxima_acao TEXT NOT NULL,
  data_proxima_acao DATE NOT NULL,
  responsavel_id UUID NOT NULL REFERENCES public.profiles(id),
  segmento public.segmento_comercial,
  origem public.origem_comercial,
  volume_estimado_mes INTEGER,
  ticket_estimado_mes NUMERIC(12,2),
  temperatura public.temperatura_comercial,
  bloqueado_por public.bloqueado_por_comercial,
  data_ultima_interacao DATE,
  previsao_fechamento DATE,
  observacoes TEXT,
  lead_origem_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== TABELA LEADS =====
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_nome TEXT NOT NULL,
  status_prospeccao public.status_prospeccao NOT NULL DEFAULT 'identificado',
  proxima_acao TEXT NOT NULL,
  data_proxima_acao DATE NOT NULL,
  responsavel_id UUID NOT NULL REFERENCES public.profiles(id),
  segmento public.segmento_comercial,
  origem public.origem_comercial,
  volume_estimado INTEGER,
  ticket_estimado NUMERIC(12,2),
  observacoes TEXT,
  contato_nome TEXT,
  contato_whatsapp TEXT,
  contato_email TEXT,
  contato_instagram TEXT,
  cidade TEXT,
  estado TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== TABELA INTERAÇÕES NEGOCIAÇÃO =====
CREATE TABLE public.negociacao_interacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  negociacao_id UUID NOT NULL REFERENCES public.negociacoes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'nota',
  resumo TEXT NOT NULL,
  usuario_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== TABELA INTERAÇÕES LEAD =====
CREATE TABLE public.lead_interacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'nota',
  resumo TEXT NOT NULL,
  usuario_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== RLS =====
ALTER TABLE public.negociacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negociacao_interacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_interacoes ENABLE ROW LEVEL SECURITY;

-- Negociacoes policies
CREATE POLICY "Admin/commercial can view negociacoes"
ON public.negociacoes FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'commercial'::public.app_role]));

CREATE POLICY "Admin/commercial can insert negociacoes"
ON public.negociacoes FOR INSERT
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'commercial'::public.app_role]));

CREATE POLICY "Admin/commercial can update negociacoes"
ON public.negociacoes FOR UPDATE
USING (has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'commercial'::public.app_role]));

CREATE POLICY "Admin can delete negociacoes"
ON public.negociacoes FOR DELETE
USING (has_role(auth.uid(), 'admin'::public.app_role));

-- Leads policies
CREATE POLICY "Admin/commercial can view leads"
ON public.leads FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'commercial'::public.app_role]));

CREATE POLICY "Admin/commercial can insert leads"
ON public.leads FOR INSERT
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'commercial'::public.app_role]));

CREATE POLICY "Admin/commercial can update leads"
ON public.leads FOR UPDATE
USING (has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'commercial'::public.app_role]));

CREATE POLICY "Admin can delete leads"
ON public.leads FOR DELETE
USING (has_role(auth.uid(), 'admin'::public.app_role));

-- Negociacao interacoes policies
CREATE POLICY "Admin/commercial can view negociacao_interacoes"
ON public.negociacao_interacoes FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'commercial'::public.app_role]));

CREATE POLICY "Admin/commercial can insert negociacao_interacoes"
ON public.negociacao_interacoes FOR INSERT
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'commercial'::public.app_role]));

-- Lead interacoes policies
CREATE POLICY "Admin/commercial can view lead_interacoes"
ON public.lead_interacoes FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'commercial'::public.app_role]));

CREATE POLICY "Admin/commercial can insert lead_interacoes"
ON public.lead_interacoes FOR INSERT
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'commercial'::public.app_role]));

-- ===== TRIGGERS updated_at =====
CREATE TRIGGER update_negociacoes_updated_at
BEFORE UPDATE ON public.negociacoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ===== INDEXES =====
CREATE INDEX idx_negociacoes_status ON public.negociacoes(status_pipeline);
CREATE INDEX idx_negociacoes_data_proxima ON public.negociacoes(data_proxima_acao);
CREATE INDEX idx_negociacoes_responsavel ON public.negociacoes(responsavel_id);
CREATE INDEX idx_negociacoes_prioridade ON public.negociacoes(prioridade);
CREATE INDEX idx_leads_status ON public.leads(status_prospeccao);
CREATE INDEX idx_leads_data_proxima ON public.leads(data_proxima_acao);
CREATE INDEX idx_leads_responsavel ON public.leads(responsavel_id);
