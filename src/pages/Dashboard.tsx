import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, Monitor, X, AlertTriangle, Clock, Package, CheckCircle, Timer, Target, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useDashboardData } from "@/hooks/useDashboardData";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { DashboardEfficiency } from "@/components/dashboard/DashboardEfficiency";
import { DashboardPerformance } from "@/components/dashboard/DashboardPerformance";
import { DashboardAlerts } from "@/components/dashboard/DashboardAlerts";
import { RecentOrders } from "@/components/dashboard/RecentOrders";
import { Card, CardContent } from "@/components/ui/card";

export default function Dashboard() {
  const { stats, pedidos, atividades, loading, refetch } = useDashboardData();
  const [modoTV, setModoTV] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Relógio em tempo real para o modo TV
  useEffect(() => {
    if (!modoTV) return;
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [modoTV]);

  // Auto-refresh a cada 30 segundos no modo TV
  useEffect(() => {
    if (!modoTV) return;
    const refreshTimer = setInterval(() => refetch(), 30000);
    return () => clearInterval(refreshTimer);
  }, [modoTV, refetch]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Calcular alertas
  const pedidosAtrasados = pedidos.filter(p => {
    const prazoFinal = new Date(p.prazo_final);
    return prazoFinal < new Date() && p.status_geral !== 'concluido';
  });

  const pedidosEmRisco = pedidos.filter(p => {
    const prazoFinal = new Date(p.prazo_final);
    const tresDiasAtras = new Date();
    tresDiasAtras.setDate(tresDiasAtras.getDate() + 3);
    return prazoFinal <= tresDiasAtras && prazoFinal >= new Date() && p.status_geral !== 'concluido';
  });

  const pedidosMultiplasEtapas = pedidos.filter(p => {
    const etapasAtrasadas = p.etapas_producao?.filter(e => e.status === 'atrasado')?.length || 0;
    return etapasAtrasadas >= 2;
  });

  // Modo TV
  if (modoTV) {
    return (
      <div className="fixed inset-0 z-50 bg-background overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">JFR Confecções</h1>
              <p className="text-muted-foreground text-sm">Painel Executivo de Produção</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-5 w-5" />
              <span className="text-3xl font-mono font-bold text-foreground">
                {currentTime.toLocaleTimeString('pt-BR')}
              </span>
            </div>
            <Button
              variant="outline"
              onClick={() => setModoTV(false)}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Sair do Modo TV
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6 h-[calc(100vh-80px)] overflow-hidden">
          {/* Métricas Principais */}
          <div className="grid grid-cols-5 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-2">
                  <Package className="h-8 w-8 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground uppercase tracking-wide">Total Pedidos</p>
                <p className="text-5xl font-bold text-foreground mt-1">{stats.totalPedidos}</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-2">
                  <Timer className="h-8 w-8 text-blue-500" />
                </div>
                <p className="text-sm text-muted-foreground uppercase tracking-wide">Em Produção</p>
                <p className="text-5xl font-bold text-blue-500 mt-1">{stats.pedidosAtivos}</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-2">
                  <Target className="h-8 w-8 text-yellow-500" />
                </div>
                <p className="text-sm text-muted-foreground uppercase tracking-wide">Capacidade</p>
                <p className="text-5xl font-bold text-yellow-500 mt-1">
                  {stats.capacidadeTotal > 0 ? Math.round((stats.capacidadeAtual / stats.capacidadeTotal) * 100) : 0}%
                </p>
              </CardContent>
            </Card>

            <Card className={`border-border ${stats.pedidosAtrasados > 0 ? 'bg-destructive/10 animate-pulse' : 'bg-card'}`}>
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-2">
                  <AlertTriangle className={`h-8 w-8 ${stats.pedidosAtrasados > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                </div>
                <p className="text-sm text-muted-foreground uppercase tracking-wide">Atrasados</p>
                <p className={`text-5xl font-bold mt-1 ${stats.pedidosAtrasados > 0 ? 'text-destructive' : 'text-foreground'}`}>
                  {stats.pedidosAtrasados}
                </p>
              </CardContent>
            </Card>

            <Card className={`border-border ${stats.pedidosProximosPrazo > 0 ? 'bg-yellow-500/10' : 'bg-card'}`}>
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-2">
                  <Clock className={`h-8 w-8 ${stats.pedidosProximosPrazo > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                </div>
                <p className="text-sm text-muted-foreground uppercase tracking-wide">Próx. Prazo</p>
                <p className={`text-5xl font-bold mt-1 ${stats.pedidosProximosPrazo > 0 ? 'text-yellow-500' : 'text-foreground'}`}>
                  {stats.pedidosProximosPrazo}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Métricas de Eficiência */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground uppercase tracking-wide">Taxa de Conclusão</p>
                    <p className="text-4xl font-bold text-green-500 mt-2">{stats.taxaConclusao.toFixed(1)}%</p>
                  </div>
                  <CheckCircle className="h-12 w-12 text-green-500/30" />
                </div>
                <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${stats.taxaConclusao}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground uppercase tracking-wide">Tempo Médio</p>
                    <p className="text-4xl font-bold text-foreground mt-2">{stats.tempoMedioProducao} dias</p>
                  </div>
                  <Timer className="h-12 w-12 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground uppercase tracking-wide">Taxa de Atraso</p>
                    <p className={`text-4xl font-bold mt-2 ${
                      stats.totalPedidos > 0 && (stats.pedidosAtrasados / stats.totalPedidos) * 100 > 10 
                        ? 'text-destructive' 
                        : 'text-foreground'
                    }`}>
                      {stats.totalPedidos > 0 
                        ? ((stats.pedidosAtrasados / stats.totalPedidos) * 100).toFixed(1) 
                        : 0}%
                    </p>
                  </div>
                  <TrendingDown className="h-12 w-12 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alertas */}
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-8 justify-center">
                <div className={`flex items-center gap-3 px-6 py-3 rounded-lg ${pedidosAtrasados.length > 0 ? 'bg-destructive/10' : 'bg-muted/50'}`}>
                  <AlertTriangle className={`h-6 w-6 ${pedidosAtrasados.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                  <span className="text-lg font-medium text-foreground">
                    <span className={`font-bold ${pedidosAtrasados.length > 0 ? 'text-destructive' : ''}`}>{pedidosAtrasados.length}</span> Atrasados
                  </span>
                </div>

                <div className={`flex items-center gap-3 px-6 py-3 rounded-lg ${pedidosEmRisco.length > 0 ? 'bg-yellow-500/10' : 'bg-muted/50'}`}>
                  <Clock className={`h-6 w-6 ${pedidosEmRisco.length > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                  <span className="text-lg font-medium text-foreground">
                    <span className={`font-bold ${pedidosEmRisco.length > 0 ? 'text-yellow-500' : ''}`}>{pedidosEmRisco.length}</span> Em Risco
                  </span>
                </div>

                <div className={`flex items-center gap-3 px-6 py-3 rounded-lg ${pedidosMultiplasEtapas.length > 0 ? 'bg-destructive/10' : 'bg-muted/50'}`}>
                  <AlertTriangle className={`h-6 w-6 ${pedidosMultiplasEtapas.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                  <span className="text-lg font-medium text-foreground">
                    <span className={`font-bold ${pedidosMultiplasEtapas.length > 0 ? 'text-destructive' : ''}`}>{pedidosMultiplasEtapas.length}</span> Múltiplas Etapas
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
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
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setModoTV(true)}
              className="gap-2"
            >
              <Monitor className="h-5 w-5" />
              Modo TV
            </Button>
            <Link to="/pedidos/novo">
              <Button size="lg" className="shadow-executive hover:shadow-executive-hover">
                <Plus className="mr-2 h-5 w-5" />
                Novo Pedido
              </Button>
            </Link>
          </div>
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