import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer, QrCode, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface QRCodeDisplayProps {
  qrCodeRef: string;
  produtoModelo: string;
  pedidoId: string;
  codigoPedido?: string;
}

export function QRCodeDisplay({ qrCodeRef, produtoModelo, pedidoId, codigoPedido }: QRCodeDisplayProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  
  // URL pública para atualização automática via QR Code
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const qrUrl = `${supabaseUrl}/functions/v1/qr-update-etapa?ref=${qrCodeRef}`;

  console.log('🔗 QR Code URL para atualização automática:', qrUrl);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // Obter o SVG do QR Code
      const svgElement = document.getElementById('qr-code-svg');
      if (!svgElement) {
        toast.error('Erro ao gerar imagem do QR Code');
        setIsDownloading(false);
        return;
      }

      // Converter SVG para imagem PNG primeiro
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      
      // Criar imagem a partir do SVG
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = svgUrl;
      });

      // Criar canvas para o QR Code
      const qrCanvas = document.createElement('canvas');
      qrCanvas.width = img.width;
      qrCanvas.height = img.height;
      const qrCtx = qrCanvas.getContext('2d');
      if (!qrCtx) {
        toast.error('Erro ao processar QR Code');
        setIsDownloading(false);
        return;
      }
      qrCtx.drawImage(img, 0, 0);
      URL.revokeObjectURL(svgUrl);

      // Criar canvas final com layout completo
      const finalCanvas = document.createElement('canvas');
      const width = 400;
      const height = 480;
      finalCanvas.width = width * 2; // Scale 2x for quality
      finalCanvas.height = height * 2;
      const ctx = finalCanvas.getContext('2d');
      if (!ctx) {
        toast.error('Erro ao criar imagem');
        setIsDownloading(false);
        return;
      }

      // Escalar para qualidade
      ctx.scale(2, 2);

      // Fundo branco
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Título
      ctx.fillStyle = '#1a1a1a';
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('QR Code de Rastreamento', width / 2, 40);

      // Produto/Modelo
      ctx.fillStyle = '#333333';
      ctx.font = '600 16px system-ui, -apple-system, sans-serif';
      ctx.fillText(produtoModelo, width / 2, 68);

      // OP
      ctx.fillStyle = '#666666';
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.fillText(`OP: ${codigoPedido || qrCodeRef}`, width / 2, 92);

      // Borda do QR Code
      const qrSize = 200;
      const qrX = (width - qrSize - 32) / 2;
      const qrY = 110;
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(qrX, qrY, qrSize + 32, qrSize + 32, 12);
      ctx.stroke();

      // QR Code
      ctx.drawImage(qrCanvas, qrX + 16, qrY + 16, qrSize, qrSize);

      // Referência
      ctx.fillStyle = '#888888';
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.fillText(`Referência: ${qrCodeRef}`, width / 2, qrY + qrSize + 60);

      // Instrução
      ctx.fillStyle = '#aaaaaa';
      ctx.font = '10px system-ui, -apple-system, sans-serif';
      ctx.fillText('Escaneie para atualizar o status da produção', width / 2, qrY + qrSize + 80);

      // Download
      const link = document.createElement('a');
      link.href = finalCanvas.toDataURL('image/png');
      link.download = `QRCode_${codigoPedido || qrCodeRef}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('QR Code baixado com sucesso!');
    } catch (error) {
      console.error('Erro ao baixar QR Code:', error);
      toast.error('Erro ao baixar QR Code');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${qrCodeRef}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: system-ui, -apple-system, sans-serif;
            }
            .container {
              text-align: center;
              padding: 2rem;
            }
            h1 {
              font-size: 1.5rem;
              font-weight: bold;
              margin-bottom: 0.5rem;
            }
            p {
              color: #666;
              margin-bottom: 2rem;
            }
            .qr-container {
              display: inline-block;
              padding: 1rem;
              background: white;
              border: 2px solid #e5e7eb;
              border-radius: 8px;
            }
            @media print {
              @page {
                margin: 2cm;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>QR Code de Rastreamento</h1>
            <p>${produtoModelo}</p>
            <p><strong>Referência:</strong> ${qrCodeRef}</p>
            <div class="qr-container">
              ${document.getElementById('qr-code-svg')?.outerHTML}
            </div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          QR Code de Rastreamento
        </CardTitle>
        <CardDescription>
          Escaneie para atualizar o status da produção em cada etapa
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center p-6 bg-white rounded-lg border-2 border-dashed border-border">
          <QRCodeSVG
            id="qr-code-svg"
            value={qrUrl}
            size={200}
            level="H"
            includeMargin={true}
          />
        </div>
        
        <div className="text-center space-y-2">
          <p className="text-sm font-medium">Referência: {qrCodeRef}</p>
          <p className="text-xs text-muted-foreground break-all">{qrUrl}</p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleDownload}
            variant="outline"
            className="flex-1"
            disabled={isDownloading}
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isDownloading ? 'Baixando...' : 'Baixar'}
          </Button>
          <Button
            onClick={handlePrint}
            variant="outline"
            className="flex-1"
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>

        <div className="text-xs text-muted-foreground space-y-1 mt-4 p-3 bg-muted/50 rounded-md">
          <p className="font-semibold">Como funciona:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Escanear o QR Code atualiza a etapa automaticamente</li>
            <li>Nenhuma página é aberta - o processo é invisível</li>
            <li>A etapa atual é concluída e a próxima é iniciada</li>
            <li>Histórico completo de rastreamento é mantido</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
