import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { PedidoDetalhado } from "@/hooks/useDashboardData";

interface DashboardChartsProps {
  pedidos: PedidoDetalhado[];
}

export const DashboardCharts = ({ pedidos }: DashboardChartsProps) => {
  // Dados para gráfico de status
  const statusData = [
    {
      name: "Em Produção",
      value: pedidos.filter((p) => p.status_geral === "em_producao").length,
      fill: "#3b82f6",
    },
    {
      name: "Concluídos",
      value: pedidos.filter((p) => p.status_geral === "concluido").length,
      fill: "#22c55e",
    },
    {
      name: "Aguardando",
      value: pedidos.filter((p) => p.status_geral === "aguardando").length,
      fill: "#94a3b8",
    },
  ];

  // Dados para gráfico de etapas
  const etapasMap = new Map<string, number>();
  pedidos.forEach((pedido) => {
    pedido.etapas_producao?.forEach((etapa) => {
      if (etapa.status === "em_andamento" || etapa.status === "pendente") {
        const count = etapasMap.get(etapa.tipo_etapa) || 0;
        etapasMap.set(etapa.tipo_etapa, count + 1);
      }
    });
  });

  const etapasLabels: Record<string, string> = {
    lacre_piloto: "Lacre Piloto",
    liberacao_corte: "Liberação Corte",
    corte: "Corte",
    personalizacao: "Personalização",
    costura: "Costura",
    acabamento: "Acabamento",
    entrega: "Entrega",
  };

  const etapasData = Array.from(etapasMap.entries()).map(([tipo, count]) => ({
    name: etapasLabels[tipo] || tipo,
    value: count,
  }));

  // Dados para gráfico de clientes
  const clientesMap = new Map<string, number>();
  pedidos.forEach((pedido) => {
    const cliente = pedido.cliente?.nome || "Sem cliente";
    const count = clientesMap.get(cliente) || 0;
    clientesMap.set(cliente, count + 1);
  });

  const clientesData = Array.from(clientesMap.entries())
    .map(([nome, count]) => ({
      name: nome,
      value: count,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const chartConfig = {
    value: {
      label: "Quantidade",
    },
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status dos Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={60}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Produção por Etapa</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={etapasData}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top 5 Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clientesData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  width={80}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};
