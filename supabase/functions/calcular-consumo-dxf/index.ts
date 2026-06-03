// Edge function: calcular-consumo-dxf
// Computes per-piece fabric consumption (kg + m) from an active DXF
// and the selected tecido variation. If any required data is missing
// or the DXF cannot be parsed, returns a structured error so the UI
// can fall back to manual entry.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MARGEM = 0.15;

interface Body {
  referencia_id: string;
  tecido_variacao_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as Body;
    if (!body?.referencia_id || !body?.tecido_variacao_id) {
      return json({ ok: false, error: "missing_params" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) DXF ativo
    const { data: dxf } = await supabase
      .from("modelagens_dxf")
      .select("id, arquivo_url")
      .eq("referencia_id", body.referencia_id)
      .eq("ativo", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!dxf) {
      return json({ ok: false, error: "no_dxf", message: "Sem DXF ativo" });
    }

    // 2) Tecido variação → tecido master (largura, gramatura)
    const { data: variacao } = await supabase
      .from("tecidos_variacoes")
      .select("id, tecido_id")
      .eq("id", body.tecido_variacao_id)
      .maybeSingle();
    if (!variacao) {
      return json({ ok: false, error: "no_tecido", message: "Tecido não encontrado" });
    }
    const { data: tecido } = await supabase
      .from("tecidos")
      .select("largura_m, gramatura_g_m2")
      .eq("id", (variacao as any).tecido_id)
      .maybeSingle();
    const largura_m = Number((tecido as any)?.largura_m || 0);
    const gramatura = Number((tecido as any)?.gramatura_g_m2 || 0);
    if (!largura_m) {
      return json({ ok: false, error: "no_width", message: "Tecido sem largura cadastrada" });
    }

    // 3) Baixa o DXF e calcula área a partir do EXTMIN/EXTMAX (bounding box).
    //    Parsing geométrico completo está fora de escopo — usamos bounding box
    //    como aproximação inicial. Se o DXF não tiver EXTMIN/EXTMAX, retorna erro.
    const { data: file } = await supabase.storage
      .from("modelagens-dxf")
      .download((dxf as any).arquivo_url);
    if (!file) {
      return json({ ok: false, error: "dxf_download", message: "Erro ao baixar DXF" });
    }
    const text = await file.text();

    const extMin = readPoint(text, "$EXTMIN");
    const extMax = readPoint(text, "$EXTMAX");
    if (!extMin || !extMax) {
      return json({ ok: false, error: "dxf_parse", message: "DXF sem EXTMIN/EXTMAX" });
    }
    // Assume DXF em mm — converte para cm
    const widthCm = Math.abs(extMax.x - extMin.x) / 10;
    const heightCm = Math.abs(extMax.y - extMin.y) / 10;
    const areaCm2 = widthCm * heightCm;
    if (!areaCm2) {
      return json({ ok: false, error: "dxf_parse", message: "Área zero" });
    }

    // 4) Consumo
    const larguraCm = largura_m * 100;
    const consumo_m = (heightCm / larguraCm) * (widthCm / larguraCm); // placeholder
    // melhor: comprimento necessário = areaTotal / larguraTecido, em metros
    const consumo_m_final = (areaCm2 / larguraCm) / 100 * (1 + MARGEM);
    const consumo_kg = gramatura
      ? (consumo_m_final * largura_m * gramatura) / 1000
      : null;

    return json({
      ok: true,
      area_cm2: Math.round(areaCm2),
      largura_cm: Math.round(larguraCm),
      margem_pct: MARGEM * 100,
      consumo_m: Number(consumo_m_final.toFixed(3)),
      consumo_kg: consumo_kg ? Number(consumo_kg.toFixed(3)) : null,
    });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: "internal", message: String(e) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function readPoint(text: string, name: string): { x: number; y: number } | null {
  // DXF header: looking for "  9\n$EXTMIN\n 10\n<x>\n 20\n<y>"
  const re = new RegExp(`\\b9\\s*\\n\\s*\\${name}\\s*\\n\\s*10\\s*\\n\\s*(-?[0-9.eE+-]+)\\s*\\n\\s*20\\s*\\n\\s*(-?[0-9.eE+-]+)`);
  const m = text.match(re);
  if (!m) return null;
  return { x: parseFloat(m[1]), y: parseFloat(m[2]) };
}
