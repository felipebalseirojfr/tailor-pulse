import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Package,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
} from "lucide-react";

interface DashboardStats {
  totalPedidos: number;
  pedidosAtivos: number;
  pedidosConcluidos: number;
  pedidosAtrasados: number;
}

interface PedidoResumido {
  id: string;
  produto_modelo: string;
  progresso_percentual: number;
  prazo_final: string;
  status_geral: string;
  cliente: {
    nome: string;
  };
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPedidos: 0,
    pedidosAtivos: 0,
    pedidosConcluidos: 0,
    pedidosAtrasados: 0,
  });
  const [pedidosRecentes, setPedidosRecentes] = useState<PedidoResumido[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Buscar estatísticas
      const { data: pedidos, error } = await supabase
        .from("pedidos")
        .select("*, clientes(nome)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const hoje = new Date().toISOString().split("T")[0];
      const atrasados = pedidos?.filter(
        (p: any) => p.prazo_final < hoje && p.status_geral !== "concluido"
      ).length || 0;

      setStats({
        totalPedidos: pedidos?.length || 0,
        pedidosAtivos:
          pedidos?.filter((p: any) => p.status_geral === "em_producao")
            .length || 0,
        pedidosConcluidos:
          pedidos?.filter((p: any) => p.status_geral === "concluido").length ||
          0,
        pedidosAtrasados: atrasados,
      });

      // Pegar os 5 pedidos mais recentes
      const recentes = pedidos?.slice(0, 5).map((p: any) => ({
        id: p.id,
        produto_modelo: p.produto_modelo,
        progresso_percentual: p.progresso_percentual,
        prazo_final: p.prazo_final,
        status_geral: p.status_geral,
        cliente: {
          nome: p.clientes?.nome || "Cliente não identificado",
        },
      }));

      setPedidosRecentes(recentes || []);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const statCards = [
    {
      title: "Total de Pedidos",
      value: stats.totalPedidos,
      icon: Package,
      color: "text-primary",
    },
    {
      title: "Em Produção",
      value: stats.pedidosAtivos,
      icon: TrendingUp,
      color: "text-warning",
    },
    {
      title: "Concluídos",
      value: stats.pedidosConcluidos,
      icon: CheckCircle2,
      color: "text-success",
    },
    {
      title: "Atrasados",
      value: stats.pedidosAtrasados,
      icon: AlertCircle,
      color: "text-destructive",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral da produção
          </p>
        </div>
        <Link to="/pedidos/novo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Pedido
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pedidos Recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Pedidos Recentes</span>
            <Link to="/pedidos">
              <Button variant="ghost" size="sm">
                Ver todos
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pedidosRecentes.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Package className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>Nenhum pedido cadastrado ainda.</p>
              <Link to="/pedidos/novo">
                <Button className="mt-4">Criar primeiro pedido</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {pedidosRecentes.map((pedido) => {
                const dataLimite = new Date(pedido.prazo_final);
                const hoje = new Date();
                const atrasado =
                  dataLimite < hoje && pedido.status_geral !== "concluido";

                return (
                  <Link
                    key={pedido.id}
                    to={`/pedidos/${pedido.id}`}
                    className="block"
                  >
                    <div className="rounded-lg border border-border p-4 transition-colors hover:bg-accent">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">
                              {pedido.produto_modelo}
                            </h3>
                            {atrasado && (
                              <Badge variant="destructive">
                                <Clock className="mr-1 h-3 w-3" />
                                Atrasado
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Cliente: {pedido.cliente.nome}
                          </p>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Progresso</span>
                              <span>{pedido.progresso_percentual}%</span>
                            </div>
                            <Progress value={pedido.progresso_percentual} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
