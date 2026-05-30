import { supabase } from "@/integrations/supabase/client";
import { parseLocalDate } from "@/lib/date-utils";

const ORDEM_TAMANHOS = ["1","2","4","6","8","10","12","14","PP","P","M","G","GG","XGG","XGG1","XGG2","XGG3"];
const sortTamanhos = (sizes: string[]) =>
  [...sizes].sort((a, b) => {
    const ia = ORDEM_TAMANHOS.indexOf(a);
    const ib = ORDEM_TAMANHOS.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

const fmtBR = (d: string | null | undefined) =>
  d ? parseLocalDate(d.slice(0, 10))!.toLocaleDateString("pt-BR") : "";

function sanitize(s: string) {
  return s.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

export async function gerarFichaCortePDF(pedidoId: string) {
  const { data: p, error } = await supabase
    .from("pedidos")
    .select(
      "id, codigo_pedido, codigo_produto_cliente, produto_modelo, tipo_peca, tecido, cor_tecido, data_inicio, prazo_final, grade_tamanhos, quantidade_total, cliente:clientes(nome)"
    )
    .eq("id", pedidoId)
    .single();
  if (error || !p) throw error || new Error("Pedido não encontrado");

  const { data: refs } = await supabase
    .from("referencias")
    .select("codigo_referencia")
    .eq("pedido_id", pedidoId);
  const codigos = (refs || []).map((r: any) => r.codigo_referencia).filter(Boolean);
  if (codigos.length === 0) {
    const fallback = (p as any).codigo_produto_cliente || (p as any).tipo_peca;
    if (fallback) codigos.push(fallback);
  }
  const referencias = codigos.join(", ");

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
    ["Nº OP:", p.codigo_pedido || "—"],
    ["Referência:", referencias || "—"],
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

  // Bloco direito (foto) — sem buscar imagem aqui para o download não travar.
  pdf.rect(rightX, blockTop, rightW, blockH);
  pdf.setFillColor(230, 230, 230);
  pdf.rect(rightX + 1, blockTop + 1, rightW - 2, blockH - 2, "F");
  pdf.setFontSize(9);
  pdf.setTextColor(100);
  pdf.text("Foto não cadastrada", rightX + rightW / 2, blockTop + blockH / 2, { align: "center" });
  pdf.setTextColor(0);
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
  const headers = ["Tamanho", "Grade Esperada", "Grade Cortada", "Diferença", "Observação"];
  const colWidths = [22, 32, 32, 26, pageW - margin * 2 - (22 + 32 + 32 + 26)];
  const headerH = 7;
  const tRowH = 8;

  // Header
  pdf.setFillColor(240, 240, 240);
  pdf.rect(margin, y, pageW - margin * 2, headerH, "F");
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
    const values = [t, String(qtd), "", "", ""];
    for (let i = 0; i < values.length; i++) {
      pdf.rect(cx, y, colWidths[i], tRowH);
      pdf.text(values[i], cx + (i < 4 ? colWidths[i] / 2 : 2), y + 5.5, {
        align: i < 4 ? "center" : "left",
      });
      cx += colWidths[i];
    }
    y += tRowH;
  }
  // Total
  pdf.setFillColor(248, 248, 248);
  pdf.rect(margin, y, pageW - margin * 2, tRowH, "F");
  pdf.setFont("helvetica", "bold");
  cx = margin;
  const totals = ["TOTAL", String(totalEsperado || p.quantidade_total || 0), "", "", ""];
  for (let i = 0; i < totals.length; i++) {
    pdf.rect(cx, y, colWidths[i], tRowH);
    pdf.text(totals[i], cx + (i < 4 ? colWidths[i] / 2 : 2), y + 5.5, {
      align: i < 4 ? "center" : "left",
    });
    cx += colWidths[i];
  }
  y += tRowH + 5;
  pdf.setFont("helvetica", "normal");

  // Observações gerais
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("Observações:", margin, y);
  y += 2;
  const obsH = 28;
  pdf.rect(margin, y, pageW - margin * 2, obsH);
  y += obsH + 8;

  // Rodapé / assinatura
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  const sigY = Math.max(y, pageH - margin - 8);
  pdf.text("Responsável pelo Corte: ______________________________", margin, sigY);
  pdf.text("Data: ___/___/_____", pageW - margin, sigY, { align: "right" });

  const filename = `ficha-corte-${sanitize(p.codigo_pedido || "OP")}-${sanitize(p.produto_modelo || "peca")}.pdf`;
  pdf.save(filename);
}
