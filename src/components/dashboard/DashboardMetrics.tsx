import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, TrendingUp, Target, AlertTriangle } from "lucide-react";

interface DashboardMetricsProps {
  capacidadeAtual: number;
  capacidadeTotal: number;
  taxaConclusao: number;
  tempoMedioProducao: number;
  pedidosAtrasados: number;
}

export const DashboardMetrics = ({
  capacidadeAtual,
  capacidadeTotal,
  taxaConclusao,
  tempoMedioProducao,
  pedidosAtrasados,
}: DashboardMetricsProps) => {
  const percentualCapacidade = (capacidadeAtual / capacidadeTotal) * 100;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Capacidade Produtiva
          </CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-xs text-muted-foreground">
            Capacidade mensal: {capacidadeTotal.toLocaleString()} peças
          </div>
          <div className="text-2xl font-bold">
            {capacidadeAtual.toLocaleString()} peças
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span>Utilização</span>
              <span className="font-medium">{percentualCapacidade.toFixed(1)}%</span>
            </div>
            <Progress value={percentualCapacidade} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Taxa de Conclusão
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{taxaConclusao.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground mt-1">
            dos pedidos concluídos
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Tempo Médio de Produção
          </CardTitle>
          <Clock className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{tempoMedioProducao} dias</div>
          <p className="text-xs text-muted-foreground mt-1">
            por pedido concluído
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taxa de Atraso</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-500">
            {pedidosAtrasados}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            pedidos atrasados
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
