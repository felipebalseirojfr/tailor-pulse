import { Button } from "@/components/ui/button";
import { Plus, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useDashboardData } from "@/hooks/useDashboardData";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { DashboardEfficiency } from "@/components/dashboard/DashboardEfficiency";
import { DashboardPerformance } from "@/components/dashboard/DashboardPerformance";
import { DashboardAlerts } from "@/components/dashboard/DashboardAlerts";
import { RecentOrders } from "@/components/dashboard/RecentOrders";

export default function Dashboard() {
  const { stats, pedidos, atividades, loading } = useDashboardData();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="dashboard-container min-h-screen pb-8">
      <div className="space-y-6 max-w-[1600px] mx-auto px-6">
        {/* Header Executivo */}
        <div className="flex items-start justify-between pt-8 pb-2">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3 text-foreground">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              Painel Executivo de Produção
            </h1>
            <p className="text-muted-foreground text-base ml-[52px]">
              Monitoramento estratégico em tempo real • JFR Confecções
            </p>
          </div>
          <Link to="/pedidos/novo">
            <Button size="lg" className="shadow-executive hover:shadow-executive-hover">
              <Plus className="mr-2 h-5 w-5" />
              Novo Pedido
            </Button>
          </Link>
        </div>

        {/* Bloco 1: Visão Geral - Indicadores Críticos */}
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">📊 Visão Geral</h2>
            <p className="text-sm text-muted-foreground">Indicadores principais da operação</p>
          </div>
        <DashboardStats
          totalPedidos={stats.totalPedidos}
          pedidosAtivos={stats.pedidosAtivos}
          pedidosConcluidos={stats.pedidosConcluidos}
          pedidosAtrasados={stats.pedidosAtrasados}
          pedidosProximosPrazo={stats.pedidosProximosPrazo}
          capacidadeAtual={stats.capacidadeAtual}
          capacidadeTotal={stats.capacidadeTotal}
          />
        </section>

        {/* Bloco 2: Eficiência Operacional */}
        <section className="space-y-4">
        <DashboardEfficiency
          taxaConclusao={stats.taxaConclusao}
          tempoMedioProducao={stats.tempoMedioProducao}
          pedidosAtrasados={stats.pedidosAtrasados}
          pedidos={pedidos}
          />
        </section>

        {/* Bloco 3: Desempenho de Clientes e Produtos */}
        <section className="space-y-4">
          <DashboardPerformance pedidos={pedidos} />
        </section>

        {/* Bloco 4: Alertas e Riscos */}
        <section className="space-y-4">
          <DashboardAlerts pedidos={pedidos} />
        </section>

        {/* Pedidos em Andamento */}
        <section className="space-y-4 pb-8">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">🔄 Pedidos em Andamento</h2>
            <p className="text-sm text-muted-foreground">Últimos pedidos em produção</p>
          </div>
          <RecentOrders pedidos={pedidos} />
        </section>
      </div>
    </div>
  );
}
