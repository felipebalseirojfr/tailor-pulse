import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Clock, AlertTriangle, ArrowUp, ArrowDown } from "lucide-react";
import { PedidoDetalhado } from "@/hooks/useDashboardData";

interface DashboardEfficiencyProps {
  taxaConclusao: number;
  tempoMedioProducao: number;
  pedidosAtrasados: number;
  pedidos: PedidoDetalhado[];
}

export const DashboardEfficiency = ({
  taxaConclusao,
  tempoMedioProducao,
  pedidosAtrasados,
  pedidos,
}: DashboardEfficiencyProps) => {
  // Calcular taxa de atraso
  const totalPedidos = pedidos.length;
  const taxaAtraso = totalPedidos > 0 ? (pedidosAtrasados / totalPedidos) * 100 : 0;

  // Calcular etapas com mais atrasos
  const etapasAtrasadas = new Map<string, number>();
  pedidos.forEach((pedido) => {
    pedido.etapas_producao?.forEach((etapa) => {
      if (etapa.status === "atrasado") {
        const count = etapasAtrasadas.get(etapa.tipo_etapa) || 0;
        etapasAtrasadas.set(etapa.tipo_etapa, count + 1);
      }
    });
  });

  const etapasLabels: Record<string, string> = {
    pilotagem: "Pilotagem",
    liberacao_corte: "Liberação de Corte",
    corte: "Corte",
    lavanderia: "Lavanderia",
    costura: "Costura",
    caseado: "Caseado",
    estamparia_bordado: "Estamparia/Bordado",
    acabamento: "Acabamento",
    entrega: "Entrega",
  };

  const topEtapasAtrasadas = Array.from(etapasAtrasadas.entries())
    .map(([tipo, count]) => ({
      nome: etapasLabels[tipo] || tipo,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold tracking-tight">Eficiência Operacional</h2>
        <p className="text-sm text-muted-foreground">Métricas de desempenho e produtividade</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Taxa de Conclusão */}
        <Card className="bg-gradient-to-br from-card to-card/80">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Taxa de Conclusão
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold">{taxaConclusao.toFixed(1)}%</div>
              <div className="flex items-center text-xs text-success">
                <ArrowUp className="h-3 w-3" />
                <span>+2.3%</span>
              </div>
            </div>
            <Progress value={taxaConclusao} className="h-1.5" />
            <p className="text-xs text-muted-foreground">
              dos pedidos finalizados
            </p>
          </CardContent>
        </Card>

        {/* Tempo Médio de Produção */}
        <Card className="bg-gradient-to-br from-card to-card/80">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Tempo Médio
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold">{tempoMedioProducao}</div>
              <span className="text-sm text-muted-foreground">dias</span>
            </div>
            <div className="space-y-1">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                  style={{ width: `${Math.min((tempoMedioProducao / 30) * 100, 100)}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              por pedido concluído
            </p>
          </CardContent>
        </Card>

        {/* Taxa de Atraso */}
        <Card className="bg-gradient-to-br from-card to-card/80">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Taxa de Atraso
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold text-destructive">{taxaAtraso.toFixed(1)}%</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <ArrowDown className="h-3 w-3" />
                <span>-1.2%</span>
              </div>
            </div>
            <Progress value={taxaAtraso} className="h-1.5" />
            <p className="text-xs text-muted-foreground">
              {pedidosAtrasados} pedidos atrasados
            </p>
          </CardContent>
        </Card>

        {/* Etapas com Mais Atrasos */}
        <Card className="bg-gradient-to-br from-card to-card/80">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Gargalos
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            {topEtapasAtrasadas.length > 0 ? (
              <div className="space-y-2">
                {topEtapasAtrasadas.map((etapa, index) => (
                  <div key={etapa.nome} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded bg-warning/20 text-warning flex items-center justify-center text-[10px] font-bold">
                        {index + 1}
                      </div>
                      <span className="text-xs font-medium truncate">{etapa.nome}</span>
                    </div>
                    <span className="text-xs font-semibold text-warning">{etapa.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Nenhum gargalo identificado
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
