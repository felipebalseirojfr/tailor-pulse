import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, TrendingUp, Award, TrendingDown } from "lucide-react";
import { PedidoDetalhado } from "@/hooks/useDashboardData";

interface DashboardPerformanceProps {
  pedidos: PedidoDetalhado[];
}

export const DashboardPerformance = ({ pedidos }: DashboardPerformanceProps) => {
  // Calcular dados de clientes
  const clientesMap = new Map<string, { total: number; atrasados: number }>();
  
  pedidos.forEach((pedido) => {
    const nomeCliente = pedido.cliente?.nome || "Sem cliente";
    const dados = clientesMap.get(nomeCliente) || { total: 0, atrasados: 0 };
    dados.total += 1;
    
    const hoje = new Date();
    if (new Date(pedido.prazo_final) < hoje && pedido.status_geral !== "concluido") {
      dados.atrasados += 1;
    }
    
    clientesMap.set(nomeCliente, dados);
  });

  const clientesComPerformance = Array.from(clientesMap.entries())
    .map(([nome, dados]) => ({
      nome,
      total: dados.total,
      atrasados: dados.atrasados,
      taxaAtraso: dados.total > 0 ? (dados.atrasados / dados.total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const top5Clientes = clientesComPerformance.slice(0, 5);
  const melhorCliente = clientesComPerformance.find((c) => c.taxaAtraso === 0) || clientesComPerformance[0];
  const piorCliente = [...clientesComPerformance].sort((a, b) => b.taxaAtraso - a.taxaAtraso)[0];

  // Calcular produtos mais produzidos
  const produtosMap = new Map<string, number>();
  pedidos.forEach((pedido) => {
    const count = produtosMap.get(pedido.produto_modelo) || 0;
    produtosMap.set(pedido.produto_modelo, count + 1);
  });

  const top5Produtos = Array.from(produtosMap.entries())
    .map(([nome, count]) => ({ nome, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const maxProdutos = Math.max(...top5Produtos.map((p) => p.count), 1);

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold tracking-tight">Desempenho de Clientes e Produtos</h2>
        <p className="text-sm text-muted-foreground">Análise de volume e eficiência por cliente</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Top 5 Clientes por Volume */}
        <Card className="lg:col-span-2 bg-gradient-to-br from-card to-card/80">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Top 5 Clientes por Volume
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {top5Clientes.map((cliente, index) => (
              <div key={cliente.nome} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium truncate max-w-[180px]">
                      {cliente.nome}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{cliente.total}</span>
                    {cliente.atrasados > 0 && (
                      <span className="text-xs text-destructive font-medium">
                        ({cliente.atrasados} ⚠)
                      </span>
                    )}
                  </div>
                </div>
                <Progress 
                  value={(cliente.total / top5Clientes[0].total) * 100} 
                  className="h-1" 
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Melhor Cliente */}
        <Card className="bg-gradient-to-br from-success/5 to-card/80 border-success/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Melhor Performance
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-success/20 flex items-center justify-center">
              <Award className="h-4 w-4 text-success" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-base font-bold truncate" title={melhorCliente?.nome}>
              {melhorCliente?.nome || "N/A"}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="text-xs text-muted-foreground mb-1">Taxa de Atraso</div>
                <div className="text-lg font-bold text-success">
                  {melhorCliente?.taxaAtraso.toFixed(0)}%
                </div>
              </div>
              <TrendingUp className="h-8 w-8 text-success/50" />
            </div>
            <p className="text-xs text-muted-foreground">
              {melhorCliente?.total} pedidos
            </p>
          </CardContent>
        </Card>

        {/* Pior Cliente */}
        <Card className="bg-gradient-to-br from-destructive/5 to-card/80 border-destructive/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Requer Atenção
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-destructive/20 flex items-center justify-center">
              <TrendingDown className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-base font-bold truncate" title={piorCliente?.nome}>
              {piorCliente?.nome || "N/A"}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="text-xs text-muted-foreground mb-1">Taxa de Atraso</div>
                <div className="text-lg font-bold text-destructive">
                  {piorCliente?.taxaAtraso.toFixed(0)}%
                </div>
              </div>
              <TrendingDown className="h-8 w-8 text-destructive/50" />
            </div>
            <p className="text-xs text-muted-foreground">
              {piorCliente?.atrasados} de {piorCliente?.total} atrasados
            </p>
          </CardContent>
        </Card>

        {/* Top 5 Produtos */}
        <Card className="lg:col-span-4 bg-gradient-to-br from-card to-card/80">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-secondary" />
              Produtos Mais Produzidos (Mês Atual)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              {top5Produtos.map((produto, index) => (
                <div key={produto.nome} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      #{index + 1}
                    </span>
                    <span className="text-sm font-bold">{produto.count}</span>
                  </div>
                  <div className="h-24 bg-muted rounded-lg overflow-hidden relative">
                    <div 
                      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-secondary to-primary transition-all duration-500"
                      style={{ height: `${(produto.count / maxProdutos) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs font-medium truncate text-center" title={produto.nome}>
                    {produto.nome}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
