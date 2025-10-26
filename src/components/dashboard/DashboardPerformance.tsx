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
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">👔 Desempenho de Clientes e Produtos</h2>
        <p className="text-sm text-muted-foreground">Análise de volume e eficiência por cliente</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Top 5 Clientes por Volume */}
        <Card className="lg:col-span-2 bg-card border border-border shadow-executive hover:shadow-executive-hover transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                <Users className="h-4 w-4 text-primary" />
              </div>
              Top 5 Clientes por Volume
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {top5Clientes.map((cliente, index) => (
              <div key={cliente.nome} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center text-sm font-bold border border-primary/30">
                      #{index + 1}
                    </div>
                    <span className="text-sm font-semibold truncate max-w-[180px] text-foreground">
                      {cliente.nome}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-foreground">{cliente.total}</span>
                    {cliente.atrasados > 0 && (
                      <span className="text-xs text-destructive font-semibold bg-destructive/10 px-2 py-0.5 rounded-lg">
                        {cliente.atrasados} ⚠
                      </span>
                    )}
                  </div>
                </div>
                <Progress 
                  value={(cliente.total / top5Clientes[0].total) * 100} 
                  className="h-2" 
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Melhor Cliente */}
        <Card className="bg-card border border-success/30 shadow-executive hover:shadow-executive-hover transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Melhor Performance
            </CardTitle>
            <div className="h-10 w-10 rounded-xl bg-success/15 flex items-center justify-center border border-success/30">
              <Award className="h-5 w-5 text-success" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-lg font-bold truncate text-foreground" title={melhorCliente?.nome}>
              {melhorCliente?.nome || "N/A"}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="text-xs font-medium text-muted-foreground mb-1">Taxa de Atraso</div>
                <div className="text-2xl font-bold text-success">
                  {melhorCliente?.taxaAtraso.toFixed(0)}%
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              {melhorCliente?.total} pedidos
            </p>
          </CardContent>
        </Card>

        {/* Pior Cliente */}
        <Card className="bg-card border border-destructive/30 shadow-executive hover:shadow-executive-hover transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Requer Atenção
            </CardTitle>
            <div className="h-10 w-10 rounded-xl bg-destructive/15 flex items-center justify-center border border-destructive/30">
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-lg font-bold truncate text-foreground" title={piorCliente?.nome}>
              {piorCliente?.nome || "N/A"}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="text-xs font-medium text-muted-foreground mb-1">Taxa de Atraso</div>
                <div className="text-2xl font-bold text-destructive">
                  {piorCliente?.taxaAtraso.toFixed(0)}%
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-destructive" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              {piorCliente?.atrasados} de {piorCliente?.total} atrasados
            </p>
          </CardContent>
        </Card>

        {/* Top 5 Produtos */}
        <Card className="lg:col-span-4 bg-card border border-border shadow-executive hover:shadow-executive-hover transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <div className="h-8 w-8 rounded-lg bg-secondary/10 flex items-center justify-center border border-secondary/20">
                <TrendingUp className="h-4 w-4 text-secondary" />
              </div>
              Produtos Mais Produzidos (Mês Atual)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-6">
              {top5Produtos.map((produto, index) => (
                <div key={produto.nome} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded-lg">
                      #{index + 1}
                    </span>
                    <span className="text-lg font-bold text-foreground">{produto.count}</span>
                  </div>
                  <div className="h-32 bg-muted/50 rounded-2xl overflow-hidden relative border border-border">
                    <div 
                      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-secondary to-primary transition-all duration-700 shadow-glow-blue"
                      style={{ height: `${(produto.count / maxProdutos) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs font-semibold truncate text-center text-foreground" title={produto.nome}>
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
