import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useDashboardData } from "@/hooks/useDashboardData";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { RecentOrders } from "@/components/dashboard/RecentOrders";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";

export default function Dashboard() {
  const { stats, pedidos, atividades, loading } = useDashboardData();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Visão Geral da Produção
          </h1>
          <p className="text-muted-foreground">
            Painel de controle central da produção
          </p>
        </div>
        <Link to="/pedidos/novo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Pedido
          </Button>
        </Link>
      </div>

      {/* Indicadores Principais */}
      <DashboardStats
        totalPedidos={stats.totalPedidos}
        pedidosAtivos={stats.pedidosAtivos}
        pedidosConcluidos={stats.pedidosConcluidos}
        pedidosAtrasados={stats.pedidosAtrasados}
        pedidosProximosPrazo={stats.pedidosProximosPrazo}
      />

      {/* Métricas Operacionais */}
      <DashboardMetrics
        capacidadeAtual={stats.capacidadeAtual}
        capacidadeTotal={stats.capacidadeTotal}
        taxaConclusao={stats.taxaConclusao}
        tempoMedioProducao={stats.tempoMedioProducao}
        pedidosAtrasados={stats.pedidosAtrasados}
      />

      {/* Gráficos */}
      <DashboardCharts pedidos={pedidos} />

      {/* Pedidos Recentes e Timeline */}
      <div className="grid gap-6 md:grid-cols-2">
        <RecentOrders pedidos={pedidos} />
        <ActivityTimeline atividades={atividades} />
      </div>
    </div>
  );
}
