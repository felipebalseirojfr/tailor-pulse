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
        estamparia: "Estamparia",
        bordado: "Bordado",
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
    <Card className="bg-card border border-border shadow-executive">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-bold text-foreground">Pedidos em Andamento</CardTitle>
        <Link to="/pedidos">
          <Button variant="outline" size="sm" className="text-xs font-semibold">
            Ver todos
            <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {pedidosEmAndamento.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center border border-border">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium mb-4">Nenhum pedido cadastrado ainda.</p>
            <Link to="/pedidos/novo">
              <Button>Criar primeiro pedido</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {pedidosEmAndamento.map((pedido) => {
              const dataLimite = new Date(pedido.prazo_final);
              const hoje = new Date();
              const atrasado =
                dataLimite < hoje && pedido.status_geral !== "concluido";

              return (
                <div
                  key={pedido.id}
                  className="group rounded-2xl border border-border bg-card p-4 transition-all duration-300 hover:shadow-executive-hover hover:border-primary/20"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      {/* Header com Título e Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-foreground text-base">
                          {pedido.produto_modelo}
                        </h3>
                        {atrasado && (
                          <Badge variant="destructive" className="text-xs font-semibold">
                            <Clock className="mr-1 h-3 w-3" />
                            Atrasado
                          </Badge>
                        )}
                        <Badge
                          className={`text-xs font-semibold text-white ${getEtapaColor(
                            pedido.etapas_producao
                          )}`}
                        >
                          {getEtapaAtual(pedido.etapas_producao)}
                        </Badge>
                      </div>

                      {/* Informações do Pedido */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground font-medium mb-0.5">Cliente</span>
                          <span className="font-semibold text-foreground">{pedido.cliente?.nome}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground font-medium mb-0.5">Prazo</span>
                          <span className={`font-semibold ${atrasado ? 'text-destructive' : 'text-foreground'}`}>
                            {new Date(pedido.prazo_final).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>

                      {/* Barra de Progresso */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Progresso</span>
                          <span className="text-sm font-bold text-foreground">{pedido.progresso_percentual}%</span>
                        </div>
                        <Progress value={pedido.progresso_percentual} className="h-2" />
                      </div>
                    </div>

                    {/* Botão Ver Detalhes */}
                    <Link to={`/pedidos/${pedido.id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      >
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                    </Link>
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
