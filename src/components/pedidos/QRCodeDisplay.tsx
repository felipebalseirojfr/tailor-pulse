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
      const html2canvas = (await import('html2canvas')).default;
      
      // Criar container temporário com layout completo
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.background = 'white';
      container.style.width = '400px';
      container.style.padding = '32px';
      container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      document.body.appendChild(container);

      // Obter o SVG do QR Code
      const svgElement = document.getElementById('qr-code-svg');
      if (!svgElement) {
        toast.error('Erro ao gerar imagem do QR Code');
        setIsDownloading(false);
        return;
      }

      // Criar o layout com QR Code + Informações
      container.innerHTML = `
        <div style="text-align: center;">
          <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 8px 0; color: #1a1a1a;">
            QR Code de Rastreamento
          </h1>
          <p style="font-size: 18px; color: #333; margin: 0 0 4px 0; font-weight: 600;">
            ${produtoModelo}
          </p>
          <p style="font-size: 14px; color: #666; margin: 0 0 24px 0;">
            OP: <strong style="color: #1a1a1a;">${codigoPedido || qrCodeRef}</strong>
          </p>
          <div style="display: inline-block; padding: 16px; background: white; border: 2px solid #e5e7eb; border-radius: 12px; margin-bottom: 16px;">
            ${svgElement.outerHTML}
          </div>
          <p style="font-size: 12px; color: #888; margin: 16px 0 0 0;">
            Referência: ${qrCodeRef}
          </p>
          <p style="font-size: 10px; color: #aaa; margin: 8px 0 0 0;">
            Escaneie para atualizar o status da produção
          </p>
        </div>
      `;

      // Aguardar renderização
      await new Promise(resolve => setTimeout(resolve, 100));

      // Converter para imagem
      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });

      // Download
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `QRCode_${codigoPedido || qrCodeRef}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Limpar
      document.body.removeChild(container);
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
