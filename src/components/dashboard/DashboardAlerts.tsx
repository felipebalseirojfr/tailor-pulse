import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, CheckCircle } from "lucide-react";
import { PedidoDetalhado } from "@/hooks/useDashboardData";
import { Link } from "react-router-dom";

interface DashboardAlertsProps {
  pedidos: PedidoDetalhado[];
}

export const DashboardAlerts = ({ pedidos }: DashboardAlertsProps) => {
  const hoje = new Date();

  // Pedidos em risco de atraso (próximos 3 dias)
  const tresDiasDepois = new Date();
  tresDiasDepois.setDate(hoje.getDate() + 3);

  const pedidosEmRisco = pedidos.filter((p) => {
    const prazo = new Date(p.prazo_final);
    return (
      prazo >= hoje &&
      prazo <= tresDiasDepois &&
      p.status_geral !== "concluido"
    );
  });

  // Pedidos com 2+ etapas atrasadas
  const pedidosComEtapasAtrasadas = pedidos.filter((p) => {
    const etapasAtrasadas = p.etapas_producao?.filter(
      (e) => e.status === "atrasado"
    ).length || 0;
    return etapasAtrasadas >= 2;
  });

  // Pedidos atrasados
  const pedidosAtrasados = pedidos.filter(
    (p) => new Date(p.prazo_final) < hoje && p.status_geral !== "concluido"
  );

  const temAlertas = pedidosEmRisco.length > 0 || pedidosComEtapasAtrasadas.length > 0 || pedidosAtrasados.length > 0;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">⚠️ Alertas e Riscos</h2>
        <p className="text-sm text-muted-foreground">Monitoramento de pedidos críticos</p>
      </div>

      {!temAlertas ? (
        <Card className="bg-card border border-success/30 shadow-executive">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <div className="h-16 w-16 rounded-2xl bg-success/15 flex items-center justify-center border border-success/30 animate-pulse">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <div>
                <h3 className="font-bold text-xl text-foreground">✓ Nenhum risco no momento</h3>
                <p className="text-sm text-muted-foreground mt-2 font-medium">
                  Todos os pedidos estão em dia ou com folga de prazo
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {/* Pedidos Atrasados */}
          {pedidosAtrasados.length > 0 && (
            <Card className="bg-card border border-destructive/30 shadow-executive hover:shadow-executive-hover transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <div className="h-8 w-8 rounded-lg bg-destructive/15 flex items-center justify-center border border-destructive/30">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  </div>
                  Pedidos Atrasados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-3xl font-bold text-destructive mb-4">
                  {pedidosAtrasados.length}
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {pedidosAtrasados.slice(0, 5).map((pedido) => (
                    <Link key={pedido.id} to={`/pedidos/${pedido.id}`}>
                      <div className="flex items-start justify-between p-2 rounded-lg bg-destructive/5 hover:bg-destructive/10 transition-colors cursor-pointer">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">
                            {pedido.produto_modelo}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {pedido.cliente?.nome}
                          </p>
                        </div>
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          ⚠
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
                {pedidosAtrasados.length > 5 && (
                  <Link to="/pedidos?atrasados=true">
                    <p className="text-xs text-primary hover:underline cursor-pointer mt-2">
                      Ver todos ({pedidosAtrasados.length})
                    </p>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          {/* Pedidos em Risco */}
          {pedidosEmRisco.length > 0 && (
            <Card className="bg-card border border-warning/30 shadow-executive hover:shadow-executive-hover transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <div className="h-8 w-8 rounded-lg bg-warning/15 flex items-center justify-center border border-warning/30">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  </div>
                  Em Risco de Atraso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-3xl font-bold text-warning mb-4">
                  {pedidosEmRisco.length}
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {pedidosEmRisco.slice(0, 5).map((pedido) => {
                    const diasRestantes = Math.ceil(
                      (new Date(pedido.prazo_final).getTime() - hoje.getTime()) /
                        (1000 * 60 * 60 * 24)
                    );
                    return (
                      <Link key={pedido.id} to={`/pedidos/${pedido.id}`}>
                        <div className="flex items-start justify-between p-2 rounded-lg bg-warning/5 hover:bg-warning/10 transition-colors cursor-pointer">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">
                              {pedido.produto_modelo}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {diasRestantes} dia{diasRestantes !== 1 ? "s" : ""} restante{diasRestantes !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-warning text-warning">
                            ⏱
                          </Badge>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                {pedidosEmRisco.length > 5 && (
                  <Link to="/pedidos?proximos=true">
                    <p className="text-xs text-primary hover:underline cursor-pointer mt-2">
                      Ver todos ({pedidosEmRisco.length})
                    </p>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          {/* Pedidos com Múltiplas Etapas Atrasadas */}
          {pedidosComEtapasAtrasadas.length > 0 && (
            <Card className="bg-card border border-destructive/30 shadow-executive hover:shadow-executive-hover transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <div className="h-8 w-8 rounded-lg bg-destructive/15 flex items-center justify-center border border-destructive/30">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  </div>
                  Múltiplas Etapas Atrasadas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-3xl font-bold text-destructive mb-4">
                  {pedidosComEtapasAtrasadas.length}
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {pedidosComEtapasAtrasadas.slice(0, 5).map((pedido) => {
                    const etapasAtrasadas = pedido.etapas_producao?.filter(
                      (e) => e.status === "atrasado"
                    ).length || 0;
                    return (
                      <Link key={pedido.id} to={`/pedidos/${pedido.id}`}>
                        <div className="flex items-start justify-between p-2 rounded-lg bg-destructive/5 hover:bg-destructive/10 transition-colors cursor-pointer">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">
                              {pedido.produto_modelo}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {etapasAtrasadas} etapa{etapasAtrasadas !== 1 ? "s" : ""} atrasada{etapasAtrasadas !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            ⚠⚠
                          </Badge>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                {pedidosComEtapasAtrasadas.length > 5 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    +{pedidosComEtapasAtrasadas.length - 5} pedidos críticos
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
