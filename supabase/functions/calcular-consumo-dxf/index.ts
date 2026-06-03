// Edge function: calcular-consumo-dxf
// Computes per-piece fabric consumption (kg + m) from an active DXF
// and the selected tecido variation. Strategy:
//   1) Try $EXTMIN/$EXTMAX in HEADER section
//   2) Fallback: scan ENTITIES section, compute bounding box from
//      all group-code 10 (X) and 20 (Y) coordinate pairs.
// Assumes DXF units = millimeters (industry standard for apparel CAD).

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

    const { data: dxf } = await supabase
      .from("modelagens_dxf")
      .select("id, arquivo_url")
      .eq("referencia_id", body.referencia_id)
      .eq("ativo", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!dxf) return json({ ok: false, error: "no_dxf", message: "Sem DXF ativo" });

    const { data: variacao } = await supabase
      .from("tecidos_variacoes")
      .select("id, tecido_id")
      .eq("id", body.tecido_variacao_id)
      .maybeSingle();
    if (!variacao) return json({ ok: false, error: "no_tecido", message: "Tecido não encontrado" });

    const { data: tecido } = await supabase
      .from("tecidos")
      .select("largura_m, gramatura_g_m2")
      .eq("id", (variacao as any).tecido_id)
      .maybeSingle();
    const largura_m = Number((tecido as any)?.largura_m || 0);
    const gramatura = Number((tecido as any)?.gramatura_g_m2 || 0);
    if (!largura_m) return json({ ok: false, error: "no_width", message: "Tecido sem largura cadastrada" });

    const { data: file, error: dlErr } = await supabase.storage
      .from("modelagens-dxf")
      .download((dxf as any).arquivo_url);
    if (!file || dlErr) {
      return json({ ok: false, error: "dxf_download", message: "Erro ao baixar DXF" });
    }
    const text = await file.text();

    // Compute bbox in DXF units (assumed mm)
    let bbox = readExtFromHeader(text);
    let source: "header" | "entities" = "header";
    if (!bbox) {
      bbox = scanEntitiesBBox(text);
      source = "entities";
    }
    if (!bbox) {
      const sample = text.slice(0, 800);
      const hasExtmin = text.includes("$EXTMIN");
      const hasEntities = text.includes("ENTITIES");
      const has10 = /\n\s*10\s*\n/.test(text);
      return json({
        ok: false,
        error: "dxf_parse",
        message: "DXF sem coordenadas legíveis",
        debug: { size: text.length, hasExtmin, hasEntities, has10, sample },
      });
    }

    const widthMm = Math.abs(bbox.maxX - bbox.minX);
    const heightMm = Math.abs(bbox.maxY - bbox.minY);
    if (!widthMm || !heightMm) {
      return json({ ok: false, error: "dxf_parse", message: "Área zero" });
    }

    // Convert to cm
    const widthCm = widthMm / 10;
    const heightCm = heightMm / 10;
    const areaCm2 = widthCm * heightCm;

    // Linear meters of fabric: area / width-of-fabric
    const larguraCm = largura_m * 100;
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
      source,
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

// Parse DXF into [code, value] pairs (line by line).
function* iterPairs(text: string): Generator<[number, string]> {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = parseInt(lines[i].trim(), 10);
    const value = lines[i + 1] ?? "";
    if (!Number.isNaN(code)) yield [code, value];
  }
}

function readExtFromHeader(text: string): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let inHeader = false;
  let currentVar: string | null = null;
  let minX: number | null = null, minY: number | null = null;
  let maxX: number | null = null, maxY: number | null = null;

  for (const [code, value] of iterPairs(text)) {
    if (code === 0) {
      // section/entity boundary — reset currentVar
      currentVar = null;
      if (value.trim() === "ENDSEC") inHeader = false;
    } else if (code === 2 && !inHeader) {
      if (value.trim() === "HEADER") inHeader = true;
    } else if (inHeader) {
      if (code === 9) {
        currentVar = value.trim();
      } else if (currentVar === "$EXTMIN") {
        if (code === 10) minX = parseFloat(value);
        else if (code === 20) minY = parseFloat(value);
      } else if (currentVar === "$EXTMAX") {
        if (code === 10) maxX = parseFloat(value);
        else if (code === 20) maxY = parseFloat(value);
      }
    }
  }

  if (minX !== null && minY !== null && maxX !== null && maxY !== null) {
    return { minX, minY, maxX, maxY };
  }
  return null;
}

function scanEntitiesBBox(text: string): { minX: number; minY: number; maxX: number; maxY: number } | null {
  // Scan all (10, 20) coordinate pairs across the whole file.
  // Group code 10 = X, 20 = Y. Tracking sections is fragile because
  // code 2 also appears inside entities (e.g. layer/linetype names),
  // and the bounding box of all coords matches the marker extent.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let pendingX: number | null = null;
  let found = false;

  for (const [code, value] of iterPairs(text)) {
    if (code === 10) {
      pendingX = parseFloat(value);
    } else if (code === 20 && pendingX !== null) {
      const x = pendingX;
      const y = parseFloat(value);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found = true;
      }
      pendingX = null;
    } else if (code !== 20) {
      // Any non-20 code after a 10 breaks the pair (besides 20 which we consumed)
      // Keep pendingX so a subsequent 20 still works — but reset if we hit another 10.
    }
  }

  if (!found) return null;
  return { minX, minY, maxX, maxY };
}
