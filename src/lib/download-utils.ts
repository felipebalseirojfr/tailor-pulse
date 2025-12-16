// Utility functions for downloading QR Code and Checklist

export const downloadQRCode = (qrCodeImage: string, codigoPedido: string) => {
  const link = document.createElement('a');
  link.href = qrCodeImage;
  link.download = `QRCode_${codigoPedido}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export interface ChecklistData {
  codigo_pedido: string;
  produto_modelo: string;
  tipo_peca: string;
  quantidade_total: number;
  aviamentos: string[];
  tipos_personalizacao: string[];
}

export const downloadChecklist = async (pedidoData: ChecklistData) => {
  const html2canvas = (await import('html2canvas')).default;
  const { createRoot } = await import('react-dom/client');
  const { ChecklistProducao } = await import('@/components/pedidos/ChecklistProducao');
  const React = await import('react');
  
  // Criar container temporário
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.background = 'white';
  container.style.width = '600px';
  document.body.appendChild(container);
  
  // Renderizar o checklist
  const root = createRoot(container);
  root.render(
    React.createElement(ChecklistProducao, {
      pedido: {
        codigo_pedido: pedidoData.codigo_pedido,
        produto_modelo: pedidoData.produto_modelo,
        tipo_peca: pedidoData.tipo_peca,
        quantidade_total: pedidoData.quantidade_total,
        aviamentos: pedidoData.aviamentos,
        tipos_personalizacao: pedidoData.tipos_personalizacao,
      }
    })
  );
  
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Converter para imagem
  const canvas = await html2canvas(container, { 
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
  });
  
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `Checklist_${pedidoData.codigo_pedido || 'pedido'}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Limpar
  root.unmount();
  document.body.removeChild(container);
};
