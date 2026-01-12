import { useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle } from "lucide-react";

const ScanResultado = () => {
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status");
  const msg = searchParams.get("msg");

  const sucesso = status === "sucesso";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
        {sucesso ? (
          <>
            <CheckCircle className="w-20 h-20 text-success mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Obrigado!</h1>
            <p className="text-muted-foreground">Etapa atualizada com sucesso.</p>
          </>
        ) : (
          <>
            <XCircle className="w-20 h-20 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Erro</h1>
            <p className="text-muted-foreground">{msg || "Ocorreu um erro ao processar o QR Code."}</p>
          </>
        )}
        <p className="text-sm text-muted-foreground mt-6">Você pode fechar esta página.</p>
      </div>
    </div>
  );
};

export default ScanResultado;
