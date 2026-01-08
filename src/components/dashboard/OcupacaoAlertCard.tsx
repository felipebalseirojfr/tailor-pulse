import { Gauge, Settings, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { CapacidadeConfigModal } from "./CapacidadeConfigModal";
import { OcupacaoMensal } from "@/hooks/useCapacidadeOcupacao";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OcupacaoAlertCardProps {
  ocupacoes: OcupacaoMensal[];
  alertas: OcupacaoMensal[];
  loading: boolean;
  onRefresh: () => void;
}

export const OcupacaoAlertCard = ({
  ocupacoes = [],
  alertas = [],
  loading,
  onRefresh,
}: OcupacaoAlertCardProps) => {
  const [modalOpen, setModalOpen] = useState(false);

  const formatarMes = (mes: string): string => {
    if (!mes) return "";
    try {
      const data = parse(mes, "yyyy-MM", new Date());
      return format(data, "MMM/yyyy", { locale: ptBR });
    } catch {
      return mes;
    }
  };

  const getNivelStyles = (nivel: OcupacaoMensal["nivel"] | undefined) => {
    switch (nivel) {
      case "verde":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "amarelo":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "laranja":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "vermelho":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  // Filtrar apenas ocupações válidas
  const ocupacoesValidas = ocupacoes.filter((o) => o && o.mes);
  const alertasValidos = alertas.filter((a) => a && a.mes && a.nivel);
  const mesesSemCapacidade = ocupacoesValidas.filter((o) => o.capacidade === null);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={alertasValidos.length > 0 ? "border-orange-200 dark:border-orange-800" : ""}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Gauge className="h-5 w-5 text-primary" />
              Ocupação Produtiva
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(true)}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {alertasValidos.length === 0 && mesesSemCapacidade.length === 0 ? (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm">Capacidade sob controle</span>
            </div>
          ) : (
            <>
              {alertasValidos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-1 text-orange-600 dark:text-orange-400">
                    <AlertTriangle className="h-4 w-4" />
                    Meses com ocupação alta
                  </p>
                  <div className="space-y-2">
                    {alertasValidos.slice(0, 4).map((alerta) => (
                      <div
                        key={alerta.mes}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <Badge className={getNivelStyles(alerta.nivel)}>
                            {formatarMes(alerta.mes)}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {alerta.demanda?.toLocaleString() || 0} / {alerta.capacidade?.toLocaleString() || 0} peças
                          </span>
                        </div>
                        <span
                          className={`text-sm font-semibold ${
                            alerta.nivel === "vermelho"
                              ? "text-red-600 dark:text-red-400"
                              : alerta.nivel === "laranja"
                              ? "text-orange-600 dark:text-orange-400"
                              : "text-yellow-600 dark:text-yellow-400"
                          }`}
                        >
                          {alerta.ocupacao?.toFixed(0) || 0}%
                        </span>
                      </div>
                    ))}
                    {alertasValidos.length > 4 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{alertasValidos.length - 4} meses com alerta
                      </p>
                    )}
                  </div>
                </div>
              )}

              {mesesSemCapacidade.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">
                    {mesesSemCapacidade.length} {mesesSemCapacidade.length === 1 ? "mês" : "meses"} sem
                    capacidade configurada
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-primary"
                    onClick={() => setModalOpen(true)}
                  >
                    Configurar capacidade →
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <CapacidadeConfigModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSave={onRefresh}
        ocupacoes={ocupacoesValidas}
      />
    </>
  );
};
