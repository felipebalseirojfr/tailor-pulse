import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, Camera } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";

export default function ScanBarcode() {
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [result, setResult] = useState<any>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const getDeviceFingerprint = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('fingerprint', 2, 2);
    }
    return `${navigator.userAgent}-${screen.width}x${screen.height}-${canvas.toDataURL()}`;
  };

  const handleScan = async (decodedText: string) => {
    if (loading) return;
    
    setLoading(true);
    setScanning(false);

    // Parar o scanner
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error("Erro ao parar scanner:", err);
      }
    }

    try {
      const deviceFingerprint = getDeviceFingerprint();
      const userAgent = navigator.userAgent;

      const { data, error } = await supabase.functions.invoke('processar-qr-scan', {
        body: {
          qrRef: decodedText,
          deviceFingerprint,
          userAgent,
        },
      });

      if (error) throw error;

      setResult({
        success: data.success,
        message: data.message,
        produto: data.produto,
        etapa_concluida: data.etapa_concluida,
        proxima_etapa: data.proxima_etapa,
        pedido_completo: data.pedido_completo,
        etapa_anterior: data.etapa_anterior,
      });
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || "Erro ao processar escaneamento",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
          },
          (decodedText) => {
            handleScan(decodedText);
          },
          undefined
        );
      } catch (err) {
        console.error("Erro ao iniciar scanner:", err);
        setResult({
          success: false,
          message: "Erro ao acessar a câmera. Verifique as permissões.",
        });
        setScanning(false);
      }
    };

    initScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  // Auto-fechar após 3 segundos quando processado
  useEffect(() => {
    if (!loading && result) {
      const timer = setTimeout(() => {
        window.close();
        setTimeout(() => {
          if (!window.closed) {
            setResult((prev: any) => ({
              ...prev,
              canClose: true
            }));
          }
        }, 100);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [loading, result]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-center">Scanner de Código de Barras</CardTitle>
          <CardDescription className="text-center">
            {scanning ? "Posicione o código de barras na câmera" : "Processando..."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {scanning && !result && (
            <div className="space-y-4">
              <div id="reader" className="w-full rounded-lg overflow-hidden"></div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Camera className="h-4 w-4" />
                <span>Aponte a câmera para o código de barras</span>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Processando escaneamento...</p>
            </div>
          )}

          {!loading && result?.success && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-4 py-4">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
                <div className="space-y-2 text-center">
                  <h2 className="text-2xl font-bold">Obrigado pelo serviço!</h2>
                  <p className="text-muted-foreground">Etapa registrada com sucesso</p>
                  {result?.canClose && (
                    <p className="text-sm text-muted-foreground mt-4">Você pode fechar esta página</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {!loading && result && !result.success && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-4 py-4">
                <XCircle className="h-16 w-16 text-red-500" />
                <div className="space-y-2 text-center">
                  <h2 className="text-2xl font-bold">
                    {result?.message?.includes('Já escaneado') 
                      ? 'Já Escaneado' 
                      : 'Erro'}
                  </h2>
                  <p className="text-muted-foreground">{result?.message}</p>
                  {result?.canClose && (
                    <p className="text-sm text-muted-foreground mt-4">Você pode fechar esta página</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {!loading && result && (
            <div className="space-y-2 text-sm">
              {result.produto && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Produto:</span>
                  <span className="font-medium">{result.produto}</span>
                </div>
              )}
              {result.etapa_concluida && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Etapa Concluída:</span>
                  <span className="font-medium text-green-600">{result.etapa_concluida}</span>
                </div>
              )}
              {result.proxima_etapa && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Próxima Etapa:</span>
                  <span className="font-medium">{result.proxima_etapa}</span>
                </div>
              )}
              {result.etapa_anterior && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Etapa Anterior:</span>
                  <span className="font-medium">{result.etapa_anterior}</span>
                </div>
              )}
              {result.pedido_completo && (
                <div className="text-center py-2 px-4 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 rounded-md font-medium">
                  🎉 Pedido Completo!
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
