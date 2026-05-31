import { supabase } from "@/integrations/supabase/client";
import { parseLocalDate } from "@/lib/date-utils";
import { jsPDF } from "jspdf";

const ORDEM_TAMANHOS = ["1","2","4","6","8","10","12","14","PP","P","M","G","GG","XGG","XGG1","XGG2","XGG3"];
const sortTamanhos = (sizes: string[]) =>
  [...sizes].sort((a, b) => {
    const ia = ORDEM_TAMANHOS.indexOf(a);
    const ib = ORDEM_TAMANHOS.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

const fmtBR = (d: string | null | undefined) =>
  d ? parseLocalDate(d.slice(0, 10))!.toLocaleDateString("pt-BR") : "";

const isFilled = (value: unknown) => {
  const text = String(value ?? "").trim();
  return Boolean(text && text !== "-" && text !== "—");
};

function sanitize(s: string) {
  return s.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function ensurePdfFilename(filename: string) {
  const cleaned = filename.trim() || "ficha-corte.pdf";
  return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
}

export function criarNomeFichaCortePDF(codigoPedido?: string | null, produtoModelo?: string | null) {
  return ensurePdfFilename(`ficha-corte-${sanitize(codigoPedido || "OP")}-${sanitize(produtoModelo || "peca")}`);
}

export function baixarUrlFichaCorte(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = ensurePdfFilename(filename);
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => link.remove(), 0);
}

export interface FichaCortePDFDados {
  codigo_pedido?: string | null;
  codigo_produto_cliente?: string | null;
  produto_modelo?: string | null;
  tipo_peca?: string | null;
  tecido?: string | null;
  cor_tecido?: string | null;
  data_inicio?: string | null;
  prazo_final?: string | null;
  quantidade_total?: number | null;
  grade_tamanhos?: Record<string, number> | null;
  cliente?: { nome?: string | null } | null;
  referencias_codigos?: string[];
  observacoes_etapas?: string[];
}

export function criarBlobFichaCortePDF(dados: FichaCortePDFDados) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 12;
  let y = margin;

  const codigos = dados.referencias_codigos?.filter(isFilled) || [];
  const fallback = isFilled(dados.tipo_peca) ? dados.tipo_peca : dados.codigo_produto_cliente;
  const referencias = (codigos.length ? codigos : fallback ? [String(fallback)] : []).join(", ");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text("JFR Confecções", margin, y + 5);
  pdf.setFontSize(16);
  pdf.text("FICHA DE CORTE", pageW / 2, y + 5, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(new Date().toLocaleDateString("pt-BR"), pageW - margin, y + 5, { align: "right" });
  y += 9;
  pdf.setLineWidth(0.4);
  pdf.line(margin, y, pageW - margin, y);
  y += 4;

  const blockTop = y;
  const leftW = (pageW - margin * 2) * 0.58;
  const rightX = margin + leftW + 4;
  const rightW = pageW - margin - rightX;
  const blockH = 70;

  pdf.setLineWidth(0.2);
  pdf.rect(margin, blockTop, leftW, blockH);
  const rows: Array<[string, string]> = [
    ["Referência:", referencias || "—"],
    ["Nº OP:", dados.codigo_pedido || "—"],
    ["Nome da Peça:", dados.produto_modelo || "—"],
    ["Cliente:", dados.cliente?.nome || "—"],
    ["Cor do Tecido:", dados.cor_tecido || "—"],
    ["Tecido:", dados.tecido || "—"],
  ];
  pdf.setFontSize(9);
  let ry = blockTop + 6;
  const rowH = (blockH - 4) / rows.length;
  for (const [k, v] of rows) {
    pdf.setFont("helvetica", "bold");
    pdf.text(k, margin + 3, ry);
    pdf.setFont("helvetica", "normal");
    pdf.text(pdf.splitTextToSize(v, leftW - 35), margin + 32, ry);
    ry += rowH;
  }

  pdf.rect(rightX, blockTop, rightW, blockH);
  pdf.setFillColor(230, 230, 230);
  pdf.rect(rightX + 1, blockTop + 1, rightW - 2, blockH - 2, "F");
  pdf.setFontSize(9);
  pdf.setTextColor(100);
  pdf.text("Foto no pedido", rightX + rightW / 2, blockTop + blockH / 2, { align: "center" });
  pdf.setTextColor(0);
  y = blockTop + blockH + 4;

  const dateH = 12;
  pdf.rect(margin, y, pageW - margin * 2, dateH);
  const colW = (pageW - margin * 2) / 3;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.text("Data de Início:", margin + 3, y + 5);
  pdf.text("Prazo de Entrega:", margin + colW + 3, y + 5);
  pdf.text("Conclusão do Corte:", margin + colW * 2 + 3, y + 5);
  pdf.setFont("helvetica", "normal");
  pdf.text(fmtBR(dados.data_inicio), margin + 3, y + 10);
  pdf.text(fmtBR(dados.prazo_final), margin + colW + 3, y + 10);
  y += dateH + 4;

  const grade = (dados.grade_tamanhos || {}) as Record<string, number>;
  const tamanhos = sortTamanhos(Object.keys(grade).filter((k) => Number(grade[k]) > 0));
  const innerW = pageW - margin * 2;
  const colWidths = [innerW * 0.22, innerW * 0.28, innerW * 0.28, innerW * 0.22];
  const headers = ["Tamanho", "Grade Esperada", "Grade Cortada", "Diferença"];
  const headerH = 7;
  const tRowH = 8;
  pdf.setFillColor(240, 240, 240);
  pdf.rect(margin, y, innerW, headerH, "F");
  pdf.setFont("helvetica", "bold");
  let cx = margin;
  for (let i = 0; i < headers.length; i++) {
    pdf.rect(cx, y, colWidths[i], headerH);
    pdf.text(headers[i], cx + colWidths[i] / 2, y + 5, { align: "center" });
    cx += colWidths[i];
  }
  y += headerH;
  pdf.setFont("helvetica", "normal");

  let totalEsperado = 0;
  for (const t of tamanhos) {
    const qtd = Number(grade[t] || 0);
    totalEsperado += qtd;
    cx = margin;
    const values = [t, String(qtd), "", ""];
    for (let i = 0; i < values.length; i++) {
      const width = colWidths[i];
      const value = values[i];
      pdf.rect(cx, y, width, tRowH);
      pdf.text(value, cx + width / 2, y + 5.5, { align: "center" });
      cx += width;
    }
    y += tRowH;
  }

  pdf.setFillColor(248, 248, 248);
  pdf.rect(margin, y, innerW, tRowH, "F");
  pdf.setFont("helvetica", "bold");
  cx = margin;
  const totals = ["TOTAL", String(totalEsperado || dados.quantidade_total || 0), "", ""];
  for (let i = 0; i < totals.length; i++) {
    pdf.rect(cx, y, colWidths[i], tRowH);
    pdf.text(totals[i], cx + colWidths[i] / 2, y + 5.5, { align: "center" });
    cx += colWidths[i];
  }
  y += tRowH + 5;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("Observações:", margin, y);
  y += 2;
  const obsLines = dados.observacoes_etapas?.length
    ? pdf.splitTextToSize(dados.observacoes_etapas.join("\n"), innerW - 4)
    : [];
  const obsH = Math.max(28, obsLines.length * 4 + 6);
  pdf.rect(margin, y, innerW, obsH);
  if (obsLines.length) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.text(obsLines, margin + 2, y + 5);
  }
  y += obsH + 8;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  const sigY = Math.max(y, pageH - margin - 8);
  pdf.text("Responsável pelo Corte: ______________________________", margin, sigY);
  pdf.text("Data: ___/___/_____", pageW - margin, sigY, { align: "right" });

  const filename = criarNomeFichaCortePDF(dados.codigo_pedido, dados.produto_modelo);
  return { blob: pdf.output("blob") as Blob, filename };
}

async function escolherLocalParaSalvar(suggestedFilename: string) {
  const picker = (window as any).showSaveFilePicker;
  if (typeof picker !== "function") return { handle: null, cancelled: false };

  try {
    const handle = await picker.call(window, {
      suggestedName: ensurePdfFilename(suggestedFilename),
      types: [
        {
          description: "Arquivo PDF",
          accept: { "application/pdf": [".pdf"] },
        },
      ],
      excludeAcceptAllOption: false,
    });
    return { handle, cancelled: false };
  } catch (error: any) {
    if (error?.name === "AbortError") return { handle: null, cancelled: true };
    return { handle: null, cancelled: false };
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function openPdfPreview(pdf: any, filename: string, targetWindow?: Window | null) {
  const blob = pdf.output("blob");
  const win = targetWindow || window.open("", "_blank");

  if (!win) {
    throw new Error("O navegador bloqueou a abertura da ficha. Libere pop-ups para visualizar e imprimir.");
  }

  // Create the blob URL using the target window's URL so it's same-origin with the wrapper document.
  const winURL: typeof URL = (win as any).URL || URL;
  const pdfUrl = winURL.createObjectURL(blob);

  const safeFilename = escapeHtml(filename);
  win.document.open();
  win.document.write(`<!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${safeFilename}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; font-family: Arial, sans-serif; background: #f3f4f6; color: #111827; }
          .toolbar { height: 56px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; background: #ffffff; border-bottom: 1px solid #d1d5db; }
          .title { min-width: 0; font-size: 14px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .actions { display: flex; gap: 8px; flex-shrink: 0; }
          button, a { border: 1px solid #9ca3af; border-radius: 6px; background: #ffffff; color: #111827; padding: 8px 12px; font-size: 13px; font-weight: 700; text-decoration: none; cursor: pointer; display: inline-flex; align-items: center; }
          button.primary { border-color: #0284c7; background: #0284c7; color: #ffffff; }
          embed, iframe { width: 100vw; height: calc(100vh - 56px); border: 0; display: block; background: #ffffff; }
          @media print { .toolbar { display: none; } embed, iframe { height: 100vh; } }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <div class="title">${safeFilename}</div>
          <div class="actions">
            <a href="${pdfUrl}" download="${safeFilename}">Baixar</a>
            <button class="primary" onclick="window.print()">Imprimir</button>
          </div>
        </div>
        <embed id="ficha" src="${pdfUrl}" type="application/pdf" />
      </body>
    </html>`);
  win.document.close();
  win.addEventListener("beforeunload", () => {
    try { winURL.revokeObjectURL(pdfUrl); } catch {}
  }, { once: true });
}

async function loadImageForPdf(url: string, timeoutMs = 2500): Promise<{ dataUrl: string; format: "PNG" | "JPEG" } | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: "force-cache" });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) return null;

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    return { dataUrl, format: blob.type.includes("png") ? "PNG" : "JPEG" };
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function montarFichaCortePDF(pedidoId: string) {
  const { data: p, error } = await supabase
    .from("pedidos")
    .select(
      "id, codigo_pedido, codigo_produto_cliente, produto_modelo, tipo_peca, tecido, cor_tecido, foto_modelo_url, data_inicio, prazo_final, grade_tamanhos, quantidade_total, cliente:clientes(nome)"
    )
    .eq("id", pedidoId)
    .single();
  if (error || !p) throw error || new Error("Pedido não encontrado");

  const { data: refs } = await supabase
    .from("referencias")
    .select("codigo_referencia")
    .eq("pedido_id", pedidoId);
  const codigos = (refs || []).map((r: any) => r.codigo_referencia).filter(isFilled);
  if (codigos.length === 0) {
    const fallback = isFilled((p as any).tipo_peca) ? (p as any).tipo_peca : (p as any).codigo_produto_cliente;
    if (fallback) codigos.push(fallback);
  }
  const referencias = codigos.join(", ");

  const ETAPA_LABELS: Record<string, string> = {
    pilotagem: "Pilotagem",
    compra_de_insumos: "Compra de Insumos",
    liberacao_corte: "Liberação de Corte",
    corte: "Corte",
    lavanderia: "Lavanderia",
    costura: "Costura",
    caseado: "Caseado",
    estamparia: "Estamparia",
    bordado: "Bordado",
    acabamento: "Acabamento",
    aplicacao_travete: "Aplicação de Travete",
    entrega: "Entrega",
  };
  const { data: etapasData } = await supabase
    .from("etapas_producao")
    .select("tipo_etapa, observacoes, ordem")
    .eq("pedido_id", pedidoId)
    .order("ordem");
  const observacoesEtapas = (etapasData || [])
    .filter((e: any) => isFilled(e.observacoes))
    .map((e: any) => `• ${ETAPA_LABELS[e.tipo_etapa] || e.tipo_etapa}: ${String(e.observacoes).trim()}`);


  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 12;
  let y = margin;

  // Cabeçalho
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text("JFR Confecções", margin, y + 5);
  pdf.setFontSize(16);
  pdf.text("FICHA DE CORTE", pageW / 2, y + 5, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(new Date().toLocaleDateString("pt-BR"), pageW - margin, y + 5, { align: "right" });
  y += 9;
  pdf.setLineWidth(0.4);
  pdf.line(margin, y, pageW - margin, y);
  y += 4;

  // Blocos lado a lado
  const blockTop = y;
  const leftW = (pageW - margin * 2) * 0.58;
  const rightX = margin + leftW + 4;
  const rightW = pageW - margin - rightX;
  const blockH = 70;

  // Bloco esquerdo (info)
  pdf.setLineWidth(0.2);
  pdf.rect(margin, blockTop, leftW, blockH);
  const rows: Array<[string, string]> = [
    ["Referência:", referencias || "—"],
    ["Nº OP:", p.codigo_pedido || "—"],
    ["Nome da Peça:", p.produto_modelo || "—"],
    ["Cliente:", (p.cliente as any)?.nome || "—"],
    ["Cor do Tecido:", p.cor_tecido || "—"],
    ["Tecido:", p.tecido || "—"],
  ];
  pdf.setFontSize(9);
  let ry = blockTop + 6;
  const rowH = (blockH - 4) / rows.length;
  for (const [k, v] of rows) {
    pdf.setFont("helvetica", "bold");
    pdf.text(k, margin + 3, ry);
    pdf.setFont("helvetica", "normal");
    const text = pdf.splitTextToSize(v, leftW - 35);
    pdf.text(text, margin + 32, ry);
    ry += rowH;
  }

  // Bloco direito (foto)
  pdf.rect(rightX, blockTop, rightW, blockH);
  const image = isFilled((p as any).foto_modelo_url) ? await loadImageForPdf((p as any).foto_modelo_url) : null;
  if (image) {
    pdf.addImage(image.dataUrl, image.format, rightX + 2, blockTop + 2, rightW - 4, blockH - 4, undefined, "FAST");
  } else {
    pdf.setFillColor(230, 230, 230);
    pdf.rect(rightX + 1, blockTop + 1, rightW - 2, blockH - 2, "F");
    pdf.setFontSize(9);
    pdf.setTextColor(100);
    pdf.text("Foto não cadastrada", rightX + rightW / 2, blockTop + blockH / 2, { align: "center" });
    pdf.setTextColor(0);
  }
  y = blockTop + blockH + 4;

  // Bloco de datas
  const dateH = 12;
  pdf.rect(margin, y, pageW - margin * 2, dateH);
  const colW = (pageW - margin * 2) / 3;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.text("Data de Início:", margin + 3, y + 5);
  pdf.text("Prazo de Entrega:", margin + colW + 3, y + 5);
  pdf.text("Conclusão do Corte:", margin + colW * 2 + 3, y + 5);
  pdf.setFont("helvetica", "normal");
  pdf.text(fmtBR(p.data_inicio), margin + 3, y + 10);
  pdf.text(fmtBR(p.prazo_final), margin + colW + 3, y + 10);
  pdf.text("", margin + colW * 2 + 3, y + 10);
  y += dateH + 4;

  // Tabela de grade
  const grade = (p.grade_tamanhos || {}) as Record<string, number>;
  const tamanhos = sortTamanhos(Object.keys(grade).filter((k) => Number(grade[k]) > 0));
  const headers = ["Tamanho", "Grade Esperada", "Grade Cortada", "Diferença"];
  const innerW = pageW - margin * 2;
  const colWidths = [innerW * 0.22, innerW * 0.28, innerW * 0.28, innerW * 0.22];
  const headerH = 7;
  const tRowH = 8;

  // Header
  pdf.setFillColor(240, 240, 240);
  pdf.rect(margin, y, innerW, headerH, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  let cx = margin;
  for (let i = 0; i < headers.length; i++) {
    pdf.rect(cx, y, colWidths[i], headerH);
    pdf.text(headers[i], cx + colWidths[i] / 2, y + 5, { align: "center" });
    cx += colWidths[i];
  }
  y += headerH;
  pdf.setFont("helvetica", "normal");

  let totalEsperado = 0;
  for (const t of tamanhos) {
    const qtd = Number(grade[t] || 0);
    totalEsperado += qtd;
    cx = margin;
    const values = [t, String(qtd), "", ""];
    for (let i = 0; i < values.length; i++) {
      pdf.rect(cx, y, colWidths[i], tRowH);
      pdf.text(values[i], cx + colWidths[i] / 2, y + 5.5, { align: "center" });
      cx += colWidths[i];
    }
    y += tRowH;
  }
  // Total
  pdf.setFillColor(248, 248, 248);
  pdf.rect(margin, y, innerW, tRowH, "F");
  pdf.setFont("helvetica", "bold");
  cx = margin;
  const totals = ["TOTAL", String(totalEsperado || p.quantidade_total || 0), "", ""];
  for (let i = 0; i < totals.length; i++) {
    pdf.rect(cx, y, colWidths[i], tRowH);
    pdf.text(totals[i], cx + colWidths[i] / 2, y + 5.5, { align: "center" });
    cx += colWidths[i];
  }
  y += tRowH + 5;
  pdf.setFont("helvetica", "normal");

  // Observações gerais
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("Observações:", margin, y);
  y += 2;
  const innerObsW = pageW - margin * 2;
  const obsLines = observacoesEtapas.length
    ? pdf.splitTextToSize(observacoesEtapas.join("\n"), innerObsW - 4)
    : [];
  const obsH = Math.max(28, obsLines.length * 4 + 6);
  pdf.rect(margin, y, innerObsW, obsH);
  if (obsLines.length) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.text(obsLines, margin + 2, y + 5);
  }
  y += obsH + 8;


  // Rodapé / assinatura
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  const sigY = Math.max(y, pageH - margin - 8);
  pdf.text("Responsável pelo Corte: ______________________________", margin, sigY);
  pdf.text("Data: ___/___/_____", pageW - margin, sigY, { align: "right" });

  const filename = `ficha-corte-${sanitize(p.codigo_pedido || "OP")}-${sanitize(p.produto_modelo || "peca")}.pdf`;
  return { pdf, filename };
}

export async function gerarFichaCortePDF(pedidoId: string) {
  const { pdf, filename } = await montarFichaCortePDF(pedidoId);
  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);
  baixarUrlFichaCorte(url, filename);
  window.setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000);
  return { status: "download_started" as const, filename, url };
}

export async function salvarFichaCortePDF(pedidoId: string, suggestedFilename = "ficha-corte.pdf") {
  const saveTarget = await escolherLocalParaSalvar(suggestedFilename);
  if (saveTarget.cancelled) return { status: "cancelled" as const };

  const { pdf, filename } = await montarFichaCortePDF(pedidoId);
  const blob = pdf.output("blob");

  if (saveTarget.handle) {
    const writable = await saveTarget.handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return { status: "saved" as const, filename: saveTarget.handle.name || filename };
  }

  const url = URL.createObjectURL(blob);
  baixarUrlFichaCorte(url, filename);
  window.setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000);
  return { status: "download_started" as const, filename, url };
}

export async function abrirFichaCortePDF(pedidoId: string, targetWindow?: Window | null) {
  const { pdf, filename } = await montarFichaCortePDF(pedidoId);
  openPdfPreview(pdf, filename, targetWindow);
}
