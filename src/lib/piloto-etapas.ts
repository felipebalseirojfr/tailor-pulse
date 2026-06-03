import { supabase } from "@/integrations/supabase/client";

export const PILOTO_ETAPAS_DISPONIVEIS = [
  "desenvolvimento_modelagem",
  "plotagem_risco",
  "corte",
  "costura",
  "lavanderia",
  "estamparia",
  "estamparia_bordado",
  "bordado",
  "caseado",
  "acabamento",
  "lacre_piloto",
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
  lacre_piloto: "Lacre da Piloto",
};

export const ETAPAS_COM_TERCEIRO = new Set([
  "lavanderia",
  "estamparia",
  "estamparia_bordado",
  "bordado",
  "caseado",
]);

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
 * Advances the current "em_andamento" stage to "concluido" and starts the next "pendente" one.
 * Also syncs referencias.status:
 *  - first stage starts => em_desenvolvimento
 *  - any stage past desenvolvimento_modelagem starts => piloto_em_producao
 *  - last (lacre_piloto) completed => piloto_lacrada
 *
 * NOTE: When a pedido is auto-created from this referencia after pricing approval,
 * these piloto_etapas records become the source-of-truth template for the new
 * pedido's etapas_producao (preserving order, tipo_etapa and terceiro_id).
 */
export async function avancarEtapa(referenciaId: string): Promise<{ ok: boolean; error?: string; lacrou?: boolean }> {
  const etapas = await fetchPilotoEtapas(referenciaId);
  if (!etapas.length) return { ok: false, error: "Etapas não configuradas" };
  const atual = etapas.find((e) => e.status === "em_andamento");
  if (!atual) return { ok: false, error: "Nenhuma etapa em andamento" };

  if (atual.tipo_etapa === "desenvolvimento_modelagem") {
    const ok = await hasActiveDxf(referenciaId);
    if (!ok) return { ok: false, error: "Envie o arquivo DXF antes de avançar para o corte." };
  }

  const now = new Date().toISOString();
  const { error: e1 } = await (supabase.from("piloto_etapas") as any)
    .update({ status: "concluido", data_termino: now })
    .eq("id", atual.id);
  if (e1) return { ok: false, error: e1.message };

  const proxima = etapas.find((e) => e.ordem > atual.ordem && e.status === "pendente");

  if (!proxima) {
    // last one was lacre_piloto
    await (supabase.from("referencias") as any)
      .update({ status: "piloto_lacrada", updated_at: now })
      .eq("id", referenciaId);
    return { ok: true, lacrou: true };
  }

  const { error: e2 } = await (supabase.from("piloto_etapas") as any)
    .update({ status: "em_andamento", data_inicio: now })
    .eq("id", proxima.id);
  if (e2) return { ok: false, error: e2.message };

  const novoStatusRef =
    proxima.tipo_etapa === "desenvolvimento_modelagem"
      ? "em_desenvolvimento"
      : "piloto_em_producao";

  await (supabase.from("referencias") as any)
    .update({ status: novoStatusRef, updated_at: now })
    .eq("id", referenciaId);

  return { ok: true };
}
