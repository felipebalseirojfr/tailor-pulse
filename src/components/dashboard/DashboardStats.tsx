import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Link } from "react-router-dom";

interface StatCardProps {
  title: string;
  value: number;
  icon: any;
  color: string;
  filterUrl: string;
}

const StatCard = ({ title, value, icon: Icon, color, filterUrl }: StatCardProps) => (
  <Link to={filterUrl}>
    <Card className="cursor-pointer transition-all hover:shadow-lg hover:scale-105">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
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

export const DashboardStats = ({
  totalPedidos,
  pedidosAtivos,
  pedidosConcluidos,
  pedidosAtrasados,
  pedidosProximosPrazo,
}: DashboardStatsProps) => {
  const statCards = [
    {
      title: "Total de Pedidos",
      value: totalPedidos,
      icon: Package,
      color: "text-muted-foreground",
      filterUrl: "/pedidos",
    },
    {
      title: "Em Produção",
      value: pedidosAtivos,
      icon: TrendingUp,
      color: "text-blue-500",
      filterUrl: "/pedidos?status=em_producao",
    },
    {
      title: "Concluídos",
      value: pedidosConcluidos,
      icon: CheckCircle2,
      color: "text-green-500",
      filterUrl: "/pedidos?status=concluido",
    },
    {
      title: "Atrasados",
      value: pedidosAtrasados,
      icon: AlertCircle,
      color: "text-red-500",
      filterUrl: "/pedidos?atrasados=true",
    },
    {
      title: "Próximos do Prazo",
      value: pedidosProximosPrazo,
      icon: Clock,
      color: "text-orange-500",
      filterUrl: "/pedidos?proximos=true",
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
