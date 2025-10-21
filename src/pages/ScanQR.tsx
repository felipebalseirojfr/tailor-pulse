import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, QrCode, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function ScanQR() {
  const { qrRef } = useParams<{ qrRef: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fornecedorNome, setFornecedorNome] = useState("");
  const [result, setResult] = useState<any>(null);

  // Gerar fingerprint do dispositivo
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
      toast.error("QR Code inválido");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const deviceFingerprint = getDeviceFingerprint();
      
      const { data, error } = await supabase.functions.invoke('processar-qr-scan', {
        body: {
          qr_ref: qrRef,
          device_fingerprint: deviceFingerprint,
          fornecedor_nome: fornecedorNome || 'Não informado',
          user_agent: navigator.userAgent,
          ip_address: 'client' // IP seria capturado no servidor idealmente
        }
      });

      if (error) throw error;

      setResult(data);

      if (data.success) {
        toast.success(data.message);
      } else if (data.already_scanned) {
        toast.warning(data.message);
      } else if (data.completed) {
        toast.info(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      console.error('Erro ao processar escaneamento:', error);
      toast.error('Erro ao processar escaneamento');
      setResult({
        success: false,
        message: error.message || 'Erro desconhecido'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (qrRef) {
      // Auto-scan após 1 segundo se o fornecedor não informar o nome
      const timer = setTimeout(() => {
        if (!result && !loading) {
          handleScan();
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [qrRef]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-6 w-6" />
            Escaneamento de Produção
          </CardTitle>
          <CardDescription>
            {qrRef ? `Referência: ${qrRef}` : 'QR Code não encontrado'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!result ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="fornecedor">Nome do Fornecedor (Opcional)</Label>
                <Input
                  id="fornecedor"
                  placeholder="Digite seu nome ou empresa"
                  value={fornecedorNome}
                  onChange={(e) => setFornecedorNome(e.target.value)}
                  disabled={loading}
                />
              </div>

              <Button
                onClick={handleScan}
                disabled={loading || !qrRef}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <QrCode className="mr-2 h-5 w-5" />
                    Confirmar Etapa
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className={`flex items-start gap-3 p-4 rounded-lg ${
                result.success 
                  ? 'bg-success/10 border border-success/20' 
                  : result.already_scanned || result.completed
                  ? 'bg-warning/10 border border-warning/20'
                  : 'bg-destructive/10 border border-destructive/20'
              }`}>
                {result.success ? (
                  <CheckCircle2 className="h-6 w-6 text-success mt-0.5" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-warning mt-0.5" />
                )}
                <div className="flex-1 space-y-2">
                  <p className="font-medium">{result.message}</p>
                  {result.produto && (
                    <p className="text-sm text-muted-foreground">
                      Produto: {result.produto}
                    </p>
                  )}
                  {result.etapa_concluida && (
                    <p className="text-sm text-muted-foreground">
                      Etapa concluída: {result.etapa_concluida.replace(/_/g, ' ')}
                    </p>
                  )}
                  {result.proxima_etapa && (
                    <p className="text-sm text-muted-foreground">
                      Próxima etapa: {result.proxima_etapa.replace(/_/g, ' ')}
                    </p>
                  )}
                  {result.etapa_anterior && (
                    <p className="text-sm text-muted-foreground">
                      Você já escaneou na etapa: {result.etapa_anterior.replace(/_/g, ' ')}
                    </p>
                  )}
                </div>
              </div>

              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao início
              </Button>

              {result.success && !result.pedido_completo && (
                <p className="text-xs text-center text-muted-foreground">
                  O QR Code continua válido para os próximos fornecedores
                </p>
              )}
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1 mt-4 p-3 bg-muted/50 rounded-md">
            <p className="font-semibold">ℹ️ Informações:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Cada dispositivo pode escanear apenas uma vez</li>
              <li>A etapa é atualizada automaticamente</li>
              <li>O histórico completo é registrado</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
