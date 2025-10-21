import { useState, useEffect } from "react";
import Barcode from "react-barcode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer, Barcode as BarcodeIcon } from "lucide-react";

interface QRCodeDisplayProps {
  qrCodeRef: string;
  produtoModelo: string;
  pedidoId: string;
}

export function QRCodeDisplay({ qrCodeRef, produtoModelo, pedidoId }: QRCodeDisplayProps) {
  const [qrCodeLink, setQrCodeLink] = useState<string | null>(null);

  useEffect(() => {
    const fetchQrCodeLink = async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from('pedidos')
        .select('qr_code_link')
        .eq('id', pedidoId)
        .single();
      
      if (data?.qr_code_link) {
        setQrCodeLink(data.qr_code_link);
      }
    };
    fetchQrCodeLink();
  }, [pedidoId]);

  const handleDownload = () => {
    const container = document.getElementById('barcode-svg');
    const svg = container?.querySelector('svg') as unknown as SVGElement;
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 600;
    canvas.height = 150;

    img.onload = () => {
      ctx?.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `barcode-${qrCodeRef}.png`;
          link.click();
          URL.revokeObjectURL(url);
        }
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const container = document.getElementById('barcode-svg');
    const barcodeHtml = container?.innerHTML || '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Código de Barras - ${qrCodeRef}</title>
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
            <h1>Código de Barras de Rastreamento</h1>
            <p>${produtoModelo}</p>
            <p><strong>Referência:</strong> ${qrCodeRef}</p>
            <div class="qr-container">
              ${barcodeHtml}
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
          <BarcodeIcon className="h-5 w-5" />
          Código de Barras de Rastreamento
        </CardTitle>
        <CardDescription>
          Escaneie para atualizar o status da produção em cada etapa
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center p-6 bg-white rounded-lg border-2 border-dashed border-border">
          {qrCodeLink ? (
            <img 
              src={qrCodeLink} 
              alt="Código de Barras" 
              className="max-w-full h-auto"
            />
          ) : (
            <div id="barcode-svg">
              <Barcode
                value={qrCodeRef}
                format="CODE128"
                width={2}
                height={80}
                displayValue={true}
                renderer="svg"
              />
            </div>
          )}
        </div>
        
        <div className="text-center space-y-2">
          <p className="text-sm font-medium">Referência: {qrCodeRef}</p>
          <p className="text-xs text-muted-foreground">Use o scanner para ler este código</p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleDownload}
            variant="outline"
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Baixar
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
            <li>Cada fornecedor escaneia o código de barras uma vez</li>
            <li>O sistema avança automaticamente para a próxima etapa</li>
            <li>Múltiplos escaneamentos pelo mesmo dispositivo são bloqueados</li>
            <li>Histórico completo de rastreamento é mantido</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
