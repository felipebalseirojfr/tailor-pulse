import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Plus, TrendingUp, Monitor, X, AlertTriangle, Clock, Package,
  CheckCircle2, Timer, Calendar, Layers, ArrowRight, Flame, PauseCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useDashboardData, PedidoDetalhado } from "@/hooks/useDashboardData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { parseLocalDate, todayLocal, diffDays } from "@/lib/date-utils";

const ETAPAS_PRODUCAO = [
  { key: "corte", label: "Corte" },
  { key: "estamparia", label: "Estamparia" },
  { key: "bordado", label: "Bordado" },
  { key: "costura", label: "Costura" },
  { key: "acabamento", label: "Finalização" },
  { key: "lavanderia", label: "Lavanderia" },
  { key: "caseado", label: "Caseado" },
] as const;

function isAtrasado(p: PedidoDetalhado, hoje: Date) {
  if (p.status_geral === "concluido") return false;
  const prazo = parseLocalDate(p.prazo_final);
  return !!prazo && prazo < hoje;
}

function ultimaMovimentacao(p: PedidoDetalhado): Date | null {
  const datas = (p.etapas_producao || [])
    .map((e) => (e.updated_at ? new Date(e.updated_at) : null))
    .filter((d): d is Date => !!d);
  if (p.updated_at) datas.push(new Date(p.updated_at));
  if (!datas.length) return null;
  return new Date(Math.max(...datas.map((d) => d.getTime())));
}

function etapaAtual(p: PedidoDetalhado): string | null {
  const emAndamento = p.etapas_producao?.find((e) => e.status === "em_andamento");
  return emAndamento?.tipo_etapa ?? null;
}

export default function Dashboard() {
  const { stats, pedidos, loading, refetch } = useDashboardData();
  const [modoTV, setModoTV] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [etapaSelecionada, setEtapaSelecionada] = useState<string | null>(null);

  useEffect(() => {
    if (!modoTV) return;
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const refreshTimer = setInterval(() => refetch(), 30000);
    return () => { clearInterval(timer); clearInterval(refreshTimer); };
  }, [modoTV, refetch]);

  const hoje = todayLocal();

  const alertas = useMemo(() => {
    const tresDias = new Date(hoje); tresDias.setDate(hoje.getDate() + 3);

    const atrasados = pedidos.filter((p) => isAtrasado(p, hoje));

    const entregaProxima = pedidos.filter((p) => {
      if (p.status_geral === "concluido") return false;
      const prazo = parseLocalDate(p.prazo_final);
      return prazo && prazo >= hoje && prazo <= tresDias;
    });

    const paradosEstamparia = pedidos.filter((p) => {
      if (p.status_geral === "concluido") return false;
      const etapa = p.etapas_producao?.find(
        (e) => e.status === "em_andamento" && (e.tipo_etapa === "estamparia" || e.tipo_etapa === "bordado"),
      );
      if (!etapa) return false;
      const ref = etapa.updated_at ? new Date(etapa.updated_at) : null;
      return ref ? diffDays(ref, hoje) > 3 : false;
    });

    const semMovimentacao = pedidos.filter((p) => {
      if (p.status_geral === "concluido") return false;
      const ultima = ultimaMovimentacao(p);
      return ultima ? diffDays(ultima, hoje) > 2 : false;
    });

    return { atrasados, entregaProxima, paradosEstamparia, semMovimentacao };
  }, [pedidos, hoje]);

  const producaoPorEtapa = useMemo(() => {
    const counts = new Map<string, PedidoDetalhado[]>();
    ETAPAS_PRODUCAO.forEach((e) => counts.set(e.key, []));
    pedidos.forEach((p) => {
      if (p.status_geral === "concluido") return;
      const atual = etapaAtual(p);
      if (atual && counts.has(atual)) counts.get(atual)!.push(p);
    });
    return counts;
  }, [pedidos]);

  const volumetriaMes = useMemo(() => {
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const concluidosMes = pedidos.filter((p) => {
      if (p.status_geral !== "concluido" || !p.updated_at) return false;
      return new Date(p.updated_at) >= inicioMes;
    });
    const novosMes = pedidos.filter((p) => p.created_at && new Date(p.created_at) >= inicioMes);
    const pecas = concluidosMes.reduce((acc, p) => acc + (p.quantidade_total || 0), 0);
    return {
      entregues: concluidosMes.length,
      pecas,
      novos: novosMes.length,
      concluidos: concluidosMes.length,
    };
  }, [pedidos, hoje]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // ===== Modo TV =====
  if (modoTV) {
    return (
      <div className="fixed inset-0 z-50 bg-background overflow-auto">
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
                {currentTime.toLocaleTimeString("pt-BR")}
              </span>
            </div>
            <Button variant="outline" onClick={() => setModoTV(false)} className="gap-2">
              <X className="h-4 w-4" /> Sair do Modo TV
            </Button>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <AlertasGrid alertas={alertas} large />
          <EtapasGrid counts={producaoPorEtapa} onClick={() => {}} large />
          <VolumetriaGrid v={volumetriaMes} large />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container min-h-screen pb-8">
      <div className="space-y-8 max-w-[1600px] mx-auto px-6">
        {/* Header */}
        <div className="flex items-start justify-between pt-8 pb-2">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3 text-foreground">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              Painel de Produção
            </h1>
            <p className="text-muted-foreground text-base ml-[52px]">
              Foco em alertas, etapas e volumetria do mês
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="lg" onClick={() => setModoTV(true)} className="gap-2">
              <Monitor className="h-5 w-5" /> Modo TV
            </Button>
            <Link to="/pedidos/novo">
              <Button size="lg" className="shadow-executive hover:shadow-executive-hover">
                <Plus className="mr-2 h-5 w-5" /> Novo Pedido
              </Button>
            </Link>
          </div>
        </div>

        {/* BLOCO 1 — Alertas Críticos */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Flame className="h-6 w-6 text-destructive" />
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Alertas Críticos</h2>
          </div>
          <AlertasGrid alertas={alertas} />
        </section>

        {/* BLOCO 2 — Produção por Etapa */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Produção por Etapa</h2>
            <span className="text-sm text-muted-foreground ml-2">clique para ver pedidos</span>
          </div>
          <EtapasGrid counts={producaoPorEtapa} onClick={setEtapaSelecionada} />
        </section>

        {/* BLOCO 3 — Volumetria do Mês */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-success" />
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Volumetria do Mês</h2>
          </div>
          <VolumetriaGrid v={volumetriaMes} />
        </section>
      </div>

      {/* Dialog de pedidos por etapa */}
      <Dialog open={!!etapaSelecionada} onOpenChange={(o) => !o && setEtapaSelecionada(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Pedidos em {ETAPAS_PRODUCAO.find((e) => e.key === etapaSelecionada)?.label}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2 pr-3">
              {etapaSelecionada && producaoPorEtapa.get(etapaSelecionada)?.length === 0 && (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Nenhum pedido nesta etapa.
                </p>
              )}
              {etapaSelecionada &&
                producaoPorEtapa.get(etapaSelecionada)?.map((p) => (
                  <Link
                    key={p.id}
                    to="/pedidos"
                    className="flex items-center justify-between p-3 rounded-md border border-border hover:bg-accent transition-all"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{p.produto_modelo}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.cliente.nome} · {p.quantidade_total} pçs · prazo{" "}
                        {parseLocalDate(p.prazo_final)?.toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ Subcomponents ============

interface AlertasGridProps {
  alertas: {
    atrasados: PedidoDetalhado[];
    entregaProxima: PedidoDetalhado[];
    paradosEstamparia: PedidoDetalhado[];
    semMovimentacao: PedidoDetalhado[];
  };
  large?: boolean;
}

function AlertaCard({
  icon: Icon, label, count, tone, items, large,
}: {
  icon: typeof AlertTriangle;
  label: string;
  count: number;
  tone: "destructive" | "warning";
  items: PedidoDetalhado[];
  large?: boolean;
}) {
  const isDanger = tone === "destructive";
  const borderColor = isDanger ? "border-destructive/50" : "border-warning/50";
  const bgColor = count > 0 ? (isDanger ? "bg-destructive/10" : "bg-warning/10") : "bg-card";
  const textColor = isDanger ? "text-destructive" : "text-warning";

  return (
    <Card className={`${bgColor} ${borderColor} border-2 ${count > 0 && isDanger ? "animate-pulse" : ""}`}>
      <CardContent className={large ? "p-6" : "p-5"}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
            isDanger ? "bg-destructive/20" : "bg-warning/20"
          }`}>
            <Icon className={`h-5 w-5 ${textColor}`} />
          </div>
          <span className={`text-4xl font-bold ${count > 0 ? textColor : "text-muted-foreground"}`}>
            {count}
          </span>
        </div>
        <p className="text-sm font-semibold text-foreground mb-2">{label}</p>
        {items.length > 0 && (
          <div className="space-y-1 mt-3 border-t border-border/50 pt-2">
            {items.slice(0, 3).map((p) => (
              <p key={p.id} className="text-xs text-muted-foreground truncate">
                · {p.cliente.nome} — {p.produto_modelo}
              </p>
            ))}
            {items.length > 3 && (
              <p className="text-xs font-medium text-foreground">
                +{items.length - 3} outros
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AlertasGrid({ alertas, large }: AlertasGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <AlertaCard
        icon={AlertTriangle}
        label="Prazo vencido"
        count={alertas.atrasados.length}
        tone="destructive"
        items={alertas.atrasados}
        large={large}
      />
      <AlertaCard
        icon={Clock}
        label="Entrega em 3 dias"
        count={alertas.entregaProxima.length}
        tone="warning"
        items={alertas.entregaProxima}
        large={large}
      />
      <AlertaCard
        icon={PauseCircle}
        label="Parados em estamparia/bordado >3d"
        count={alertas.paradosEstamparia.length}
        tone="destructive"
        items={alertas.paradosEstamparia}
        large={large}
      />
      <AlertaCard
        icon={Timer}
        label="Sem movimentação >2d"
        count={alertas.semMovimentacao.length}
        tone="warning"
        items={alertas.semMovimentacao}
        large={large}
      />
    </div>
  );
}

function EtapasGrid({
  counts, onClick, large,
}: {
  counts: Map<string, PedidoDetalhado[]>;
  onClick: (etapa: string) => void;
  large?: boolean;
}) {
  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
      {ETAPAS_PRODUCAO.map((e) => {
        const list = counts.get(e.key) || [];
        return (
          <button
            key={e.key}
            onClick={() => onClick(e.key)}
            className="text-left"
            disabled={large}
          >
            <Card className={`h-full transition-all ${large ? "" : "hover:border-primary"}`}>
              <CardContent className={large ? "p-5" : "p-4"}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  {e.label}
                </p>
                <p className={`font-bold text-foreground ${large ? "text-5xl" : "text-3xl"}`}>
                  {list.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {list.length === 1 ? "pedido" : "pedidos"}
                </p>
              </CardContent>
            </Card>
          </button>
        );
      })}
    </div>
  );
}

function VolumetriaGrid({
  v, large,
}: {
  v: { entregues: number; pecas: number; novos: number; concluidos: number };
  large?: boolean;
}) {
  const cards = [
    { label: "Pedidos entregues no mês", value: v.entregues, icon: CheckCircle2, color: "text-success" },
    { label: "Peças produzidas no mês", value: v.pecas.toLocaleString("pt-BR"), icon: Package, color: "text-primary" },
    { label: "Novos no mês", value: v.novos, icon: Plus, color: "text-info" },
    { label: "Concluídos no mês", value: v.concluidos, icon: CheckCircle2, color: "text-success" },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className={large ? "p-6" : "p-5"}>
            <div className="flex items-center justify-between mb-3">
              <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center`}>
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </div>
            </div>
            <p className={`font-bold text-foreground ${large ? "text-5xl" : "text-3xl"}`}>{c.value}</p>
            <p className="text-sm text-muted-foreground mt-2">{c.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
