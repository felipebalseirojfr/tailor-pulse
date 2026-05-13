export const downloadFichaCortePDF = async (element: HTMLElement, codigoPedido: string) => {
  try {
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    // Aguardar todas as imagens carregarem
    const imgs = Array.from(element.querySelectorAll("img"));
    await Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalHeight !== 0) return resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
      )
    );

    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      allowTaint: true,
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const ratio = canvas.width / canvas.height;
    let w = pageW;
    let h = w / ratio;
    if (h > pageH) {
      h = pageH;
      w = h * ratio;
    }
    const x = (pageW - w) / 2;
    const y = (pageH - h) / 2;
    pdf.addImage(imgData, "PNG", x, y, w, h);
    pdf.save(`FichaCorte_${codigoPedido}.pdf`);
  } catch (err) {
    console.error("Erro ao gerar PDF da Ficha de Corte:", err);
    throw err;
  }
};
