import { supabase } from "@/integrations/supabase/client";

/**
 * Available CONFIGURABLE stages (user picks the order in between).
 * Fixed stages NOT in this list:
 *  - desenvolvimento_modelagem  → always FIRST
 *  - piloto_enviada_cliente     → always second-to-last
 *  - aguardando_aprovacao_cliente → always last
 *
 * lacre_piloto is NOT a sequence stage anymore — it became an ACTION
 * triggered from `aguardando_aprovacao_cliente` (see lacrarPiloto()).
 */
export const PILOTO_ETAPAS_CONFIGURAVEIS = [
  "plotagem_risco",
  "corte",
  "costura",
  "lavanderia",
  "estamparia",
  "estamparia_bordado",
  "bordado",
  "caseado",
  "acabamento",
] as const;

export const PILOTO_ETAPAS_FIXAS_INICIO = ["desenvolvimento_modelagem"] as const;
export const PILOTO_ETAPAS_FIXAS_FIM = [
  "piloto_enviada_cliente",
  "aguardando_aprovacao_cliente",
] as const;

/** Full list (used for "Pilotos por Etapa" counters, fila iteration, etc.) */
export const PILOTO_ETAPAS_DISPONIVEIS = [
  ...PILOTO_ETAPAS_FIXAS_INICIO,
  ...PILOTO_ETAPAS_CONFIGURAVEIS,
  ...PILOTO_ETAPAS_FIXAS_FIM,
] as const;
export type PilotoEtapa = typeof PILOTO_ETAPAS_DISPONIVEIS[number];

export const ETAPA_LABELS: Record<string, string> = {
  desenvolvimento_modelagem: "Desenvolvimento de Modelagem",
  plotagem_risco: "Plotagem / Risco",
  corte: "Corte",
  costura: "Costura",
  lavanderia: "Lavanderia",
  estamparia: "Estamparia",
  estamparia_bordado: "Estamparia + Bordado",
  bordado: "Bordado",
  caseado: "Caseado",
  acabamento: "Acabamento",
  piloto_enviada_cliente: "Piloto Enviada ao Cliente",
  aguardando_aprovacao_cliente: "Aguardando Aprovação do Cliente",
  lacre_piloto: "Lacre da Piloto", // legacy display only
};

export const ETAPAS_COM_TERCEIRO = new Set([
  "lavanderia",
  "estamparia",
  "estamparia_bordado",
  "bordado",
  "caseado",
]);

/** Etapas que pertencem ao bloco "Em Terceiros" das filas (read-only) */
export const ETAPAS_TERCEIROS = [
  "lavanderia",
  "estamparia",
  "estamparia_bordado",
  "bordado",
] as const;

export const labelEtapa = (e: string) => ETAPA_LABELS[e] || e;

export interface PilotoEtapaRow {
  id: string;
  referencia_id: string;
  tipo_etapa: string;
  ordem: number;
  status: string;
  terceiro_id: string | null;
  data_inicio: string | null;
  data_termino: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchPilotoEtapas(referenciaId: string): Promise<PilotoEtapaRow[]> {
  const { data } = await (supabase.from("piloto_etapas") as any)
    .select("*")
    .eq("referencia_id", referenciaId)
    .order("ordem", { ascending: true });
  return (data || []) as PilotoEtapaRow[];
}

export async function hasActiveDxf(referenciaId: string): Promise<boolean> {
  const { data } = await (supabase.from("modelagens_dxf") as any)
    .select("id")
    .eq("referencia_id", referenciaId)
    .eq("ativo", true)
    .limit(1);
  return !!(data && data.length);
}

/**
 * Checks if Ficha Técnica AND Ficha de Costura exist and are finalized.
 * Tables fichas_tecnicas / fichas_costura come in Dev-3 and Dev-4.
 * If a table doesn't exist yet (PostgREST 42P01), we treat it as "missing".
 * Returns { tecnica, costura } — both true means lacre is allowed.
 */
export async function checkFichasFinalizadas(referenciaId: string): Promise<{
  tecnica: boolean;
  costura: boolean;
}> {
  const result = { tecnica: false, costura: false };

  try {
    const { data, error } = await (supabase.from("fichas_tecnicas") as any)
      .select("id, status")
      .eq("referencia_id", referenciaId)
      .eq("status", "finalizada")
      .limit(1);
    if (!error && data && data.length) result.tecnica = true;
  } catch { /* table not yet created */ }

  try {
    const { data, error } = await (supabase.from("fichas_costura") as any)
      .select("id, status")
      .eq("referencia_id", referenciaId)
      .eq("status", "finalizada")
      .limit(1);
    if (!error && data && data.length) result.costura = true;
  } catch { /* table not yet created */ }

  return result;
}

/**
 * Status sync rules when advancing:
 *  - First stage (desenvolvimento_modelagem) running → em_desenvolvimento
 *  - Any stage AFTER desenvolvimento_modelagem (configurable) → piloto_em_producao
 *  - piloto_enviada_cliente OR aguardando_aprovacao_cliente → piloto_pronta
 *
 * Note: This function NEVER lacres automatically. Use lacrarPiloto() for that.
 *
 * When a pedido is auto-created from this referencia after pricing approval,
 * the most recent round's piloto_etapas serve as the source-of-truth template
 * for the new pedido's etapas_producao (preserving order, tipo_etapa, terceiro_id).
 */
function statusRefParaEtapa(tipoEtapa: string): string {
  if (tipoEtapa === "desenvolvimento_modelagem") return "em_desenvolvimento";
  if (tipoEtapa === "piloto_enviada_cliente" || tipoEtapa === "aguardando_aprovacao_cliente") {
    return "piloto_pronta";
  }
  return "piloto_em_producao";
}

export async function avancarEtapa(referenciaId: string): Promise<{ ok: boolean; error?: string; isAprovacaoCliente?: boolean }> {
  const etapas = await fetchPilotoEtapas(referenciaId);
  if (!etapas.length) return { ok: false, error: "Etapas não configuradas" };
  const atual = etapas.find((e) => e.status === "em_andamento");
  if (!atual) return { ok: false, error: "Nenhuma etapa em andamento" };

  // Gate: cannot leave desenvolvimento_modelagem without an active DXF
  if (atual.tipo_etapa === "desenvolvimento_modelagem") {
    const ok = await hasActiveDxf(referenciaId);
    if (!ok) return { ok: false, error: "Envie o arquivo DXF antes de avançar para o corte." };
  }

  // The final stage (aguardando_aprovacao_cliente) is not advanced by this function.
  // Caller should open the decision modal (lacrarPiloto / solicitarFittingNovaPiloto).
  if (atual.tipo_etapa === "aguardando_aprovacao_cliente") {
    return { ok: false, isAprovacaoCliente: true, error: "Use o modal de decisão para esta etapa." };
  }

  const now = new Date().toISOString();
  const { error: e1 } = await (supabase.from("piloto_etapas") as any)
    .update({ status: "concluido", data_termino: now })
    .eq("id", atual.id);
  if (e1) return { ok: false, error: e1.message };

  const proxima = etapas.find((e) => e.ordem > atual.ordem && e.status === "pendente");
  if (!proxima) return { ok: true };

  const { error: e2 } = await (supabase.from("piloto_etapas") as any)
    .update({ status: "em_andamento", data_inicio: now })
    .eq("id", proxima.id);
  if (e2) return { ok: false, error: e2.message };

  await (supabase.from("referencias") as any)
    .update({ status: statusRefParaEtapa(proxima.tipo_etapa), updated_at: now })
    .eq("id", referenciaId);

  return { ok: true };
}

/**
 * Lacre da piloto — chamado a partir de aguardando_aprovacao_cliente.
 * - Valida fichas finalizadas
 * - Marca etapa atual como concluida
 * - Atualiza referencias.status = 'piloto_lacrada'
 * - Se aprovadaComAlteracoes=true salva campo + texto alteracoes
 */
export async function lacrarPiloto(
  referenciaId: string,
  opts: { aprovadaComAlteracoes?: boolean; alteracoes?: string | null } = {}
): Promise<{ ok: boolean; error?: string; fichas?: { tecnica: boolean; costura: boolean } }> {
  const fichas = await checkFichasFinalizadas(referenciaId);
  if (!fichas.tecnica || !fichas.costura) {
    return { ok: false, error: "Fichas obrigatórias não finalizadas", fichas };
  }

  const etapas = await fetchPilotoEtapas(referenciaId);
  const atual = etapas.find((e) => e.status === "em_andamento");
  const now = new Date().toISOString();

  if (atual) {
    await (supabase.from("piloto_etapas") as any)
      .update({ status: "concluido", data_termino: now })
      .eq("id", atual.id);
  }

  const refUpdate: Record<string, unknown> = {
    status: "piloto_lacrada",
    updated_at: now,
    aprovada_com_alteracoes: !!opts.aprovadaComAlteracoes,
  };
  if (opts.aprovadaComAlteracoes && opts.alteracoes != null) {
    refUpdate.alteracoes_fitting = opts.alteracoes;
  }

  const { error } = await (supabase.from("referencias") as any)
    .update(refUpdate)
    .eq("id", referenciaId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Fluxo de Fitting (nova piloto necessária):
 * - Salva alteracoes
 * - Incrementa numero_rodada_piloto
 * - Marca todas as etapas atuais como concluidas (arquiva a rodada)
 * - Cria nova rodada com mesma sequência tipo_etapa/terceiro_id, partindo de em_andamento
 * - referencias.status = 'em_correcao'
 */
export async function solicitarFittingNovaPiloto(
  referenciaId: string,
  alteracoes: string
): Promise<{ ok: boolean; error?: string }> {
  if (!alteracoes.trim()) return { ok: false, error: "Descreva as correções solicitadas" };

  const etapasAntigas = await fetchPilotoEtapas(referenciaId);
  if (!etapasAntigas.length) return { ok: false, error: "Etapas não configuradas" };

  const now = new Date().toISOString();

  // 1) Pega rodada atual
  const { data: refRow } = await (supabase.from("referencias") as any)
    .select("numero_rodada_piloto")
    .eq("id", referenciaId)
    .single();
  const rodadaAtual = (refRow as any)?.numero_rodada_piloto || 1;

  // 2) Arquivar etapas atuais
  const { error: eUp } = await (supabase.from("piloto_etapas") as any)
    .update({ status: "concluido", data_termino: now })
    .eq("referencia_id", referenciaId)
    .neq("status", "concluido");
  if (eUp) return { ok: false, error: eUp.message };

  // 3) Criar nova rodada (mesma sequência, mesmos terceiros)
  // Ordenar para reaproveitar tipo_etapa + terceiro_id em ordem original
  const seq = etapasAntigas
    .slice()
    .sort((a, b) => a.ordem - b.ordem);

  const payload = seq.map((e, idx) => ({
    referencia_id: referenciaId,
    tipo_etapa: e.tipo_etapa,
    ordem: idx + 1,
    status: idx === 0 ? "em_andamento" : "pendente",
    data_inicio: idx === 0 ? now : null,
    terceiro_id: e.terceiro_id,
  }));

  const { error: eIns } = await (supabase.from("piloto_etapas") as any).insert(payload);
  if (eIns) return { ok: false, error: eIns.message };

  // 4) Atualiza referência
  const { error: eRef } = await (supabase.from("referencias") as any)
    .update({
      status: "em_correcao",
      numero_rodada_piloto: rodadaAtual + 1,
      alteracoes_fitting: alteracoes.trim(),
      aprovada_com_alteracoes: false,
      updated_at: now,
    })
    .eq("id", referenciaId);
  if (eRef) return { ok: false, error: eRef.message };

  return { ok: true };
}
