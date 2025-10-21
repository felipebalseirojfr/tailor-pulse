import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function ScanQR() {
  const { qrRef } = useParams();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);

  const getDeviceFingerprint = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('fingerprint', 2, 2);
    }
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.colorDepth,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');

    return btoa(fingerprint).substring(0, 64);
  };

  const handleScan = async () => {
    if (!qrRef) {
      setResult({ success: false, message: "QR Code inválido" });
      setLoading(false);
      return;
    }

    try {
      const deviceFingerprint = getDeviceFingerprint();
      const userAgent = navigator.userAgent;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/processar-qr-scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          qr_ref: qrRef,
          device_fingerprint: deviceFingerprint,
          fornecedor_nome: 'Fornecedor',
          user_agent: userAgent
        })
      });

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      console.error('Erro ao processar QR scan:', error);
      const errorMessage = error.message || "Erro ao processar o escaneamento";
      setResult({ success: false, message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // Auto-scan ao carregar a página
  useEffect(() => {
    handleScan();
  }, []);

  // Auto-fechar após 3 segundos quando processado
  useEffect(() => {
    if (!loading && result) {
      const timer = setTimeout(() => {
        // Tentar fechar a aba/janela
        window.close();
        // Se não conseguir fechar (não foi aberta via script), mostrar mensagem
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
        <CardHeader className="text-center">
          {loading ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p className="text-lg font-medium">Processando escaneamento...</p>
            </div>
          ) : result?.success ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="rounded-full bg-success/10 p-4">
                <CheckCircle2 className="h-16 w-16 text-success" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Obrigado pelo serviço!</h2>
                <p className="text-muted-foreground">Etapa registrada com sucesso</p>
                {result?.canClose && (
                  <p className="text-sm text-muted-foreground mt-4">Você pode fechar esta página</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className={`rounded-full p-4 ${
                result?.message?.includes('já foi escaneado') || result?.already_scanned 
                  ? 'bg-warning/10' 
                  : 'bg-destructive/10'
              }`}>
                <XCircle className={`h-16 w-16 ${
                  result?.message?.includes('já foi escaneado') || result?.already_scanned
                    ? 'text-warning' 
                    : 'text-destructive'
                }`} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">
                  {result?.message?.includes('já foi escaneado') || result?.already_scanned
                    ? 'Já Escaneado' 
                    : 'Erro'}
                </h2>
                <p className="text-muted-foreground">{result?.message}</p>
                {result?.canClose && (
                  <p className="text-sm text-muted-foreground mt-4">Você pode fechar esta página</p>
                )}
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {!loading && result && (
            <div className="space-y-3">
              {result.produto && (
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Produto</p>
                  <p className="font-medium">{result.produto}</p>
                </div>
              )}
              {result.etapa_concluida && (
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Etapa concluída</p>
                  <p className="font-medium">{result.etapa_concluida.replace(/_/g, ' ')}</p>
                </div>
              )}
              {result.proxima_etapa && (
                <div className="text-center p-3 bg-primary/5 rounded-lg">
                  <p className="text-sm text-muted-foreground">Próxima etapa</p>
                  <p className="font-medium">{result.proxima_etapa.replace(/_/g, ' ')}</p>
                </div>
              )}
              {result.pedido_completo && (
                <div className="text-center p-3 bg-success/10 rounded-lg">
                  <p className="font-medium text-success">✓ Pedido Completo!</p>
                </div>
              )}
              {result.etapa_anterior && (
                <div className="text-center p-3 bg-warning/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Escaneado anteriormente na etapa</p>
                  <p className="font-medium">{result.etapa_anterior.replace(/_/g, ' ')}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
