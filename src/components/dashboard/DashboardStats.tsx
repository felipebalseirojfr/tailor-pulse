import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Package,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  Activity,
} from "lucide-react";
import { Link } from "react-router-dom";

interface StatCardProps {
  title: string;
  value: number;
  icon: any;
  color: string;
  filterUrl: string;
  subtitle?: string;
  showProgress?: boolean;
  progressValue?: number;
}

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  filterUrl, 
  subtitle, 
  showProgress, 
  progressValue 
}: StatCardProps) => (
  <Link to={filterUrl}>
    <Card className="cursor-pointer transition-all duration-300 hover:shadow-premium-hover hover:scale-[1.02] group bg-gradient-to-br from-card to-card/80">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`h-10 w-10 rounded-xl bg-${color}/10 flex items-center justify-center transition-all duration-300 group-hover:scale-110`}>
          <Icon className={`h-5 w-5 text-${color}`} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
        {showProgress && progressValue !== undefined && (
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Utilização</span>
              <span className="font-semibold">{progressValue.toFixed(0)}%</span>
            </div>
            <Progress value={progressValue} className="h-1.5" />
          </div>
        )}
      </CardContent>
    </Card>
  </Link>
);

interface DashboardStatsProps {
  totalPedidos: number;
  pedidosAtivos: number;
  pedidosConcluidos: number;
  pedidosAtrasados: number;
  pedidosProximosPrazo: number;
}

interface DashboardStatsExtendedProps extends DashboardStatsProps {
  capacidadeAtual: number;
  capacidadeTotal: number;
}

export const DashboardStats = ({
  totalPedidos,
  pedidosAtivos,
  pedidosConcluidos,
  pedidosAtrasados,
  pedidosProximosPrazo,
  capacidadeAtual,
  capacidadeTotal,
}: DashboardStatsExtendedProps) => {
  const percentualCapacidade = (capacidadeAtual / capacidadeTotal) * 100;

  const statCards = [
    {
      title: "Total de Pedidos",
      value: totalPedidos,
      icon: Package,
      color: "primary",
      filterUrl: "/pedidos",
      subtitle: "no sistema",
    },
    {
      title: "Em Produção",
      value: pedidosAtivos,
      icon: Activity,
      color: "primary",
      filterUrl: "/pedidos?status=em_producao",
      subtitle: "ativos agora",
    },
    {
      title: "Capacidade",
      value: Math.round(percentualCapacidade),
      icon: TrendingUp,
      color: "success",
      filterUrl: "/pedidos",
      subtitle: `${capacidadeAtual.toLocaleString()} / ${capacidadeTotal.toLocaleString()} peças`,
      showProgress: true,
      progressValue: percentualCapacidade,
    },
    {
      title: "Atrasados",
      value: pedidosAtrasados,
      icon: AlertCircle,
      color: "destructive",
      filterUrl: "/pedidos?atrasados=true",
      subtitle: "requerem atenção",
    },
    {
      title: "Próx. Prazo",
      value: pedidosProximosPrazo,
      icon: Clock,
      color: "warning",
      filterUrl: "/pedidos?proximos=true",
      subtitle: "até 3 dias",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {statCards.map((stat) => (
        <StatCard key={stat.title} {...stat} />
      ))}
    </div>
  );
};
