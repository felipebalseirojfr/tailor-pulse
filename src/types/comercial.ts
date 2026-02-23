// Types for the Comercial module - matches DB schema

export type StatusPipeline =
  | 'lead_qualificado'
  | 'reuniao_realizada'
  | 'interesse_confirmado'
  | 'escopo_definido'
  | 'piloto_solicitada'
  | 'piloto_enviada'
  | 'proposta_comercial'
  | 'negociacao'
  | 'fechado'
  | 'perdido';

export type StatusProspeccao =
  | 'identificado'
  | 'contato_feito'
  | 'reuniao_marcada'
  | 'qualificado'
  | 'descartado';

export type PrioridadeComercial = 'alta' | 'media' | 'baixa';
export type SegmentoComercial = 'private_label_moda' | 'uniformes' | 'esportivo' | 'outros';
export type OrigemComercial = 'indicacao' | 'instagram' | 'evento' | 'pesquisa_ativa' | 'representante' | 'outro';
export type TemperaturaComercial = 'frio' | 'morno' | 'quente';
export type BloqueadoPorComercial = 'aguardando_cliente' | 'aguardando_interno' | 'aguardando_piloto' | 'aguardando_proposta' | 'outro';

export interface Negociacao {
  id: string;
  marca_nome: string;
  status_pipeline: StatusPipeline;
  prioridade: PrioridadeComercial;
  proxima_acao: string;
  data_proxima_acao: string;
  responsavel_id: string;
  segmento?: SegmentoComercial | null;
  origem?: OrigemComercial | null;
  volume_estimado_mes?: number | null;
  ticket_estimado_mes?: number | null;
  temperatura?: TemperaturaComercial | null;
  bloqueado_por?: BloqueadoPorComercial | null;
  data_ultima_interacao?: string | null;
  previsao_fechamento?: string | null;
  observacoes?: string | null;
  lead_origem_id?: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  responsavel?: { nome: string } | null;
}

export interface Lead {
  id: string;
  lead_nome: string;
  status_prospeccao: StatusProspeccao;
  proxima_acao: string;
  data_proxima_acao: string;
  responsavel_id: string;
  segmento?: SegmentoComercial | null;
  origem?: OrigemComercial | null;
  volume_estimado?: number | null;
  ticket_estimado?: number | null;
  observacoes?: string | null;
  contato_nome?: string | null;
  contato_whatsapp?: string | null;
  contato_email?: string | null;
  contato_instagram?: string | null;
  cidade?: string | null;
  estado?: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  responsavel?: { nome: string } | null;
}

export interface Interacao {
  id: string;
  negociacao_id?: string;
  lead_id?: string;
  tipo: string;
  resumo: string;
  usuario_id?: string | null;
  created_at: string;
  usuario?: { nome: string } | null;
}

// Labels
export const STATUS_PIPELINE_LABELS: Record<StatusPipeline, string> = {
  lead_qualificado: 'Lead Qualificado',
  reuniao_realizada: 'Reunião Realizada',
  interesse_confirmado: 'Interesse Confirmado',
  escopo_definido: 'Escopo Definido',
  piloto_solicitada: 'Piloto Solicitada',
  piloto_enviada: 'Piloto Enviada',
  proposta_comercial: 'Proposta Comercial',
  negociacao: 'Negociação',
  fechado: 'Fechado',
  perdido: 'Perdido',
};

export const STATUS_PIPELINE_ORDER: StatusPipeline[] = [
  'lead_qualificado',
  'reuniao_realizada',
  'interesse_confirmado',
  'escopo_definido',
  'piloto_solicitada',
  'piloto_enviada',
  'proposta_comercial',
  'negociacao',
  'fechado',
  'perdido',
];

export const STATUS_PROSPECCAO_LABELS: Record<StatusProspeccao, string> = {
  identificado: 'Identificado',
  contato_feito: 'Contato Feito',
  reuniao_marcada: 'Reunião Marcada',
  qualificado: 'Qualificado',
  descartado: 'Descartado',
};

export const PRIORIDADE_LABELS: Record<PrioridadeComercial, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};

export const SEGMENTO_LABELS: Record<SegmentoComercial, string> = {
  private_label_moda: 'Private Label Moda',
  uniformes: 'Uniformes',
  esportivo: 'Esportivo',
  outros: 'Outros',
};

export const ORIGEM_LABELS: Record<OrigemComercial, string> = {
  indicacao: 'Indicação',
  instagram: 'Instagram',
  evento: 'Evento',
  pesquisa_ativa: 'Pesquisa Ativa',
  representante: 'Representante',
  outro: 'Outro',
};

export const TEMPERATURA_LABELS: Record<TemperaturaComercial, string> = {
  frio: 'Frio',
  morno: 'Morno',
  quente: 'Quente',
};

export const BLOQUEADO_POR_LABELS: Record<BloqueadoPorComercial, string> = {
  aguardando_cliente: 'Aguardando Cliente',
  aguardando_interno: 'Aguardando Interno',
  aguardando_piloto: 'Aguardando Piloto',
  aguardando_proposta: 'Aguardando Proposta',
  outro: 'Outro',
};

export const FINALIZED_PIPELINE_STATUSES: StatusPipeline[] = ['fechado', 'perdido'];
export const FINALIZED_PROSPECCAO_STATUSES: StatusProspeccao[] = ['qualificado', 'descartado'];
