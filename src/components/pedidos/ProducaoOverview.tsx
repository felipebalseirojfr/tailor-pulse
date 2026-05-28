import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangle, Clock, Timer, PauseCircle, Flame, Layers, Calendar,
  CheckCircle2, Package, Plus, ArrowRight,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { parseLocalDate, todayLocal, diffDays } from "@/lib/date-utils";

interface PedidoLike {
  id: string;
  produto_modelo: string;
  quantidade_total: number;
  prazo_final: string;
  status_geral: string;
  created_at?: string;
  updated_at?: string;
  clientes?: { nome: string } | null;
  etapas_producao?: Array<{
    tipo_etapa: string;
    status: string;
    ordem: number;
    updated_at?: string;
  }>;
}

interface Props {
  pedidos: PedidoLike[];
  onPedidoClick?: (pedido: PedidoLike) => void;
}

const ETAPAS = [
  { key: "corte", label: "Corte" },
  { key: "estamparia", label: "Estamparia" },
  { key: "bordado", label: "Bordado" },
  { key: "costura", label: "Costura" },
  { key: "acabamento", label: "Finalização" },
  { key: "lavanderia", label: "Lavanderia" },
  { key: "caseado", label: "Caseado" },
] as const;

function ultimaMovimentacao(p: PedidoLike): Date | null {
  const datas = (p.etapas_producao || [])
    .map((e) => (e.updated_at ? new Date(e.updated_at) : null))
    .filter((d): d is Date => !!d);
  if (p.updated_at) datas.push(new Date(p.updated_at));
  if (!datas.length) return null;
  return new Date(Math.max(...datas.map((d) => d.getTime())));
}

export function ProducaoOverview({ pedidos, onPedidoClick }: Props) {
  const [etapaSelecionada, setEtapaSelecionada] = useState<string | null>(null);
  const [alertaSelecionado, setAlertaSelecionado] = useState<{ titulo: string; items: PedidoLike[] } | null>(null);
  const hoje = todayLocal();

  const alertas = useMemo(() => {
    const tresDias = new Date(hoje); tresDias.setDate(hoje.getDate() + 3);

    const atrasados = pedidos.filter((p) => {
      if (p.status_geral === "concluido") return false;
      const prazo = parseLocalDate(p.prazo_final);
      return !!prazo && prazo < hoje;
    });

    const entregaProxima = pedidos.filter((p) => {
      if (p.status_geral === "concluido") return false;
      const prazo = parseLocalDate(p.prazo_final);
      return prazo && prazo >= hoje && prazo <= tresDias;
    });

    const ETAPA_LABELS: Record<string, string> = {
      pilotagem: "pilotagem", compra_de_insumos: "compra de insumos",
      liberacao_corte: "liberação de corte", corte: "corte",
      lavanderia: "lavanderia", costura: "costura", caseado: "caseado",
      estamparia: "estamparia", bordado: "bordado", acabamento: "acabamento",
      aplicacao_travete: "aplicação de travete", entrega: "entrega",
    };

    const aguardandoEtapa = pedidos.filter((p) => {
      if (p.status_geral === "concluido") return false;
      const temEmAndamento = p.etapas_producao?.some((e) => e.status === "em_andamento");
      if (temEmAndamento) return false;
      return p.etapas_producao?.some((e) => e.status === "pendente");
    }).map((p) => {
      const proxima = [...(p.etapas_producao || [])]
        .filter((e) => e.status === "pendente")
        .sort((a, b) => a.ordem - b.ordem)[0];
      return { ...p, _aguardandoLabel: proxima ? `Aguardando ${ETAPA_LABELS[proxima.tipo_etapa] || proxima.tipo_etapa}` : "Aguardando próxima etapa" };
    });

    const semMovimentacao = pedidos.filter((p) => {
      if (p.status_geral === "concluido") return false;
      const ultima = ultimaMovimentacao(p);
      return ultima ? diffDays(ultima, hoje) > 2 : false;
    });

    return { atrasados, entregaProxima, aguardandoEtapa, semMovimentacao };
  }, [pedidos, hoje]);

  const producaoPorEtapa = useMemo(() => {
    const counts = new Map<string, PedidoLike[]>();
    ETAPAS.forEach((e) => counts.set(e.key, []));
    pedidos.forEach((p) => {
      if (p.status_geral === "concluido") return;
      const atual = p.etapas_producao?.find((e) => e.status === "em_andamento")?.tipo_etapa;
      if (atual && counts.has(atual)) counts.get(atual)!.push(p);
    });
    return counts;
  }, [pedidos]);

  const volumetria = useMemo(() => {
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const concluidosMes = pedidos.filter((p) => {
      if (p.status_geral !== "concluido" || !p.updated_at) return false;
      return new Date(p.updated_at) >= inicioMes;
    });
    const novosMes = pedidos.filter((p) => p.created_at && new Date(p.created_at) >= inicioMes);
    const pecas = concluidosMes.reduce((acc, p) => acc + (p.quantidade_total || 0), 0);
    return { entregues: concluidosMes.length, pecas, novos: novosMes.length, concluidos: concluidosMes.length };
  }, [pedidos, hoje]);

  const handleClickPedido = (p: PedidoLike) => {
    setEtapaSelecionada(null);
    setAlertaSelecionado(null);
    onPedidoClick?.(p);
  };

  return (
    <div className="space-y-6">
      {/* Bloco 1 — Volumetria do Mês */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-success" />
          <h2 className="text-xl font-bold tracking-tight text-foreground">Volumetria do Mês</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <VolumetriaCard icon={CheckCircle2} color="text-success" label="Pedidos entregues no mês" value={volumetria.entregues} />
          <VolumetriaCard icon={Package} color="text-primary" label="Peças produzidas no mês" value={volumetria.pecas.toLocaleString("pt-BR")} />
          <VolumetriaCard icon={Plus} color="text-info" label="Novos no mês" value={volumetria.novos} />
          <VolumetriaCard icon={CheckCircle2} color="text-success" label="Concluídos no mês" value={volumetria.concluidos} />
        </div>
      </section>

      {/* Bloco 2 — Produção por Etapa */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold tracking-tight text-foreground">Produção por Etapa</h2>
          <span className="text-xs text-muted-foreground ml-2">clique para ver pedidos</span>
        </div>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
          {ETAPAS.map((e) => {
            const list = producaoPorEtapa.get(e.key) || [];
            return (
              <button
                key={e.key}
                onClick={() => setEtapaSelecionada(e.key)}
                className="text-left"
              >
                <Card className="h-full hover:border-primary transition-all">
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      {e.label}
                    </p>
                    <p className="text-3xl font-bold text-foreground">{list.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {list.length === 1 ? "pedido" : "pedidos"}
                    </p>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      </section>

      {/* Bloco 3 — Alertas Críticos */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-destructive" />
          <h2 className="text-xl font-bold tracking-tight text-foreground">Alertas Críticos</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <AlertaCard
            icon={AlertTriangle}
            label="Prazo vencido"
            count={alertas.atrasados.length}
            tone="destructive"
            items={alertas.atrasados}
            onClick={() => setAlertaSelecionado({ titulo: "Pedidos com prazo vencido", items: alertas.atrasados })}
          />
          <AlertaCard
            icon={Clock}
            label="Entrega em 3 dias"
            count={alertas.entregaProxima.length}
            tone="warning"
            items={alertas.entregaProxima}
            onClick={() => setAlertaSelecionado({ titulo: "Entrega nos próximos 3 dias", items: alertas.entregaProxima })}
          />
          <AlertaCard
            icon={PauseCircle}
            label="Aguardando próxima etapa"
            count={alertas.aguardandoEtapa.length}
            tone="warning"
            items={alertas.aguardandoEtapa}
            onClick={() => setAlertaSelecionado({ titulo: "Pedidos aguardando próxima etapa", items: alertas.aguardandoEtapa })}
          />
          <AlertaCard
            icon={Timer}
            label="Sem movimentação >2d"
            count={alertas.semMovimentacao.length}
            tone="warning"
            items={alertas.semMovimentacao}
            onClick={() => setAlertaSelecionado({ titulo: "Sem movimentação há mais de 2 dias", items: alertas.semMovimentacao })}
          />
        </div>
      </section>

      {/* Dialog: pedidos por etapa */}
      <Dialog open={!!etapaSelecionada} onOpenChange={(o) => !o && setEtapaSelecionada(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Pedidos em {ETAPAS.find((e) => e.key === etapaSelecionada)?.label}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <ListaPedidos
              items={etapaSelecionada ? (producaoPorEtapa.get(etapaSelecionada) || []) : []}
              onClick={handleClickPedido}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Dialog: pedidos do alerta */}
      <Dialog open={!!alertaSelecionado} onOpenChange={(o) => !o && setAlertaSelecionado(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{alertaSelecionado?.titulo}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <ListaPedidos items={alertaSelecionado?.items || []} onClick={handleClickPedido} />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AlertaCard({
  icon: Icon, label, count, tone, items, onClick,
}: {
  icon: typeof AlertTriangle;
  label: string;
  count: number;
  tone: "destructive" | "warning";
  items: PedidoLike[];
  onClick: () => void;
}) {
  const isDanger = tone === "destructive";
  const borderColor = isDanger ? "border-destructive/50" : "border-warning/50";
  const bgColor = count > 0 ? (isDanger ? "bg-destructive/10" : "bg-warning/10") : "bg-card";
  const textColor = isDanger ? "text-destructive" : "text-warning";

  return (
    <button onClick={onClick} disabled={count === 0} className="text-left disabled:cursor-default">
      <Card className={`${bgColor} ${borderColor} border-2 h-full ${count > 0 && isDanger ? "animate-pulse [animation-duration:3.5s]" : ""}`}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${isDanger ? "bg-destructive/20" : "bg-warning/20"}`}>
              <Icon className={`h-5 w-5 ${textColor}`} />
            </div>
            <span className={`text-4xl font-bold ${count > 0 ? textColor : "text-muted-foreground"}`}>{count}</span>
          </div>
          <p className="text-sm font-semibold text-foreground mb-2">{label}</p>
          {items.length > 0 && (
            <div className="space-y-1 mt-3 border-t border-border/50 pt-2">
              {items.slice(0, 3).map((p) => (
                <p key={p.id} className="text-xs text-muted-foreground truncate">
                  · {p.clientes?.nome || "—"} — {p.produto_modelo}
                </p>
              ))}
              {items.length > 3 && (
                <p className="text-xs font-medium text-foreground">+{items.length - 3} outros</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </button>
  );
}

function VolumetriaCard({
  icon: Icon, color, label, value,
}: {
  icon: typeof CheckCircle2;
  color: string;
  label: string;
  value: number | string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
        <p className="text-3xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground mt-2">{label}</p>
      </CardContent>
    </Card>
  );
}

function ListaPedidos({ items, onClick }: { items: PedidoLike[]; onClick: (p: PedidoLike) => void }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Nenhum pedido.</p>;
  }
  return (
    <div className="space-y-2 pr-3">
      {items.map((p) => (
        <button
          key={p.id}
          onClick={() => onClick(p)}
          className="w-full flex items-center justify-between p-3 rounded-md border border-border hover:bg-accent transition-all text-left"
        >
          <div>
            <p className="font-semibold text-foreground">{p.produto_modelo}</p>
            <p className="text-xs text-muted-foreground">
              {p.clientes?.nome || "—"} · {p.quantidade_total} pçs · prazo{" "}
              {parseLocalDate(p.prazo_final)?.toLocaleDateString("pt-BR")}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </button>
      ))}
    </div>
  );
}
