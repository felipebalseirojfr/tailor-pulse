import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, ArrowRight, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { PedidoDetalhado } from "@/hooks/useDashboardData";

interface RecentOrdersProps {
  pedidos: PedidoDetalhado[];
}

export const RecentOrders = ({ pedidos }: RecentOrdersProps) => {
  const pedidosEmAndamento = pedidos
    .filter((p) => p.status_geral !== "concluido")
    .slice(0, 5);

  const getEtapaAtual = (etapas: any[]) => {
    if (!etapas || etapas.length === 0) return "Sem etapa";
    const etapaAtual = [...etapas]
      .sort((a, b) => a.ordem - b.ordem)
      .find((e) => e.status === "em_andamento");
    
    if (etapaAtual) {
      const labels: Record<string, string> = {
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
      return labels[etapaAtual.tipo_etapa] || etapaAtual.tipo_etapa;
    }
    return "Aguardando início";
  };

  const getEtapaColor = (etapas: any[]) => {
    if (!etapas || etapas.length === 0) return "bg-gray-500";
    const etapaAtual = [...etapas]
      .sort((a, b) => a.ordem - b.ordem)
      .find((e) => e.status === "em_andamento");
    
    if (!etapaAtual) return "bg-gray-500";
    
    const colors: Record<string, string> = {
      pilotagem: "bg-purple-500",
      liberacao_corte: "bg-indigo-500",
      corte: "bg-blue-500",
      lavanderia: "bg-cyan-500",
      costura: "bg-teal-500",
      caseado: "bg-green-500",
      estamparia_bordado: "bg-orange-500",
      acabamento: "bg-amber-500",
      entrega: "bg-red-500",
    };
    return colors[etapaAtual.tipo_etapa] || "bg-blue-500";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Pedidos em Andamento</span>
          <Link to="/pedidos">
            <Button variant="ghost" size="sm">
              Ver todos
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pedidosEmAndamento.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Package className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>Nenhum pedido cadastrado ainda.</p>
            <Link to="/pedidos/novo">
              <Button className="mt-4">Criar primeiro pedido</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {pedidosEmAndamento.map((pedido) => {
              const dataLimite = new Date(pedido.prazo_final);
              const hoje = new Date();
              const atrasado =
                dataLimite < hoje && pedido.status_geral !== "concluido";

              return (
                <div
                  key={pedido.id}
                  className="rounded-lg border border-border p-4 transition-colors hover:bg-accent"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">
                          {pedido.produto_modelo}
                        </h3>
                        {atrasado && (
                          <Badge variant="destructive" className="text-xs">
                            <Clock className="mr-1 h-3 w-3" />
                            Atrasado
                          </Badge>
                        )}
                        <Badge
                          className={`text-xs text-white ${getEtapaColor(
                            pedido.etapas_producao
                          )}`}
                        >
                          {getEtapaAtual(pedido.etapas_producao)}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div>Cliente: {pedido.cliente?.nome}</div>
                        <div>
                          Prazo:{" "}
                          {new Date(pedido.prazo_final).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Progresso</span>
                          <span>{pedido.progresso_percentual}%</span>
                        </div>
                        <Progress value={pedido.progresso_percentual} />
                      </div>
                      <Link to={`/pedidos/${pedido.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                        >
                          Ver Detalhes
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
