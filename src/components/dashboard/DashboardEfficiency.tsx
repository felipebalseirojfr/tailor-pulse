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
    compra_de_insumos: "Compra de Insumos",
    liberacao_corte: "Liberação de Corte",
    corte: "Corte",
    lavanderia: "Lavanderia",
    costura: "Costura",
    caseado: "Caseado",
    estamparia_bordado: "Estamparia/Bordado",
    estamparia: "Estamparia",
    bordado: "Bordado",
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
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">📈 Eficiência Operacional</h2>
        <p className="text-sm text-muted-foreground">Métricas de desempenho e produtividade</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Taxa de Conclusão */}
        <Card className="bg-card border border-border shadow-executive hover:shadow-executive-hover transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Taxa de Conclusão
            </CardTitle>
            <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center border border-success/20">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-3">
              <div className="text-3xl font-bold text-foreground">{taxaConclusao.toFixed(1)}%</div>
              <div className="flex items-center text-xs font-semibold text-success bg-success/10 px-2 py-1 rounded-lg">
                <ArrowUp className="h-3 w-3 mr-0.5" />
                <span>2.3%</span>
              </div>
            </div>
            <Progress value={taxaConclusao} className="h-2" />
            <p className="text-xs text-muted-foreground font-medium">
              dos pedidos finalizados
            </p>
          </CardContent>
        </Card>

        {/* Tempo Médio de Produção */}
        <Card className="bg-card border border-border shadow-executive hover:shadow-executive-hover transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Tempo Médio
            </CardTitle>
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Clock className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold text-foreground">{tempoMedioProducao}</div>
              <span className="text-sm font-medium text-muted-foreground">dias</span>
            </div>
            <div className="space-y-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((tempoMedioProducao / 30) * 100, 100)}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              por pedido concluído
            </p>
          </CardContent>
        </Card>

        {/* Taxa de Atraso */}
        <Card className="bg-card border border-destructive/20 shadow-executive hover:shadow-executive-hover transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Taxa de Atraso
            </CardTitle>
            <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center border border-destructive/20">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-3">
              <div className="text-3xl font-bold text-destructive">{taxaAtraso.toFixed(1)}%</div>
              <div className="flex items-center text-xs font-semibold text-success bg-success/10 px-2 py-1 rounded-lg">
                <ArrowDown className="h-3 w-3 mr-0.5" />
                <span>1.2%</span>
              </div>
            </div>
            <Progress value={taxaAtraso} className="h-2" />
            <p className="text-xs text-muted-foreground font-medium">
              {pedidosAtrasados} pedidos atrasados
            </p>
          </CardContent>
        </Card>

        {/* Etapas com Mais Atrasos */}
        <Card className="bg-card border border-warning/20 shadow-executive hover:shadow-executive-hover transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Gargalos
            </CardTitle>
            <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center border border-warning/20">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            {topEtapasAtrasadas.length > 0 ? (
              <div className="space-y-3">
                {topEtapasAtrasadas.map((etapa, index) => (
                  <div key={etapa.nome} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-lg bg-warning/20 text-warning flex items-center justify-center text-xs font-bold border border-warning/30">
                        #{index + 1}
                      </div>
                      <span className="text-sm font-semibold truncate text-foreground">{etapa.nome}</span>
                    </div>
                    <span className="text-sm font-bold text-warning">{etapa.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground font-medium">
                  ✓ Nenhum gargalo identificado
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
