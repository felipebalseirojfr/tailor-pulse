import { useState, useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  CalendarCheck,
  AlertTriangle,
  Flame,
  ChevronDown,
  CheckCircle,
  MessageSquarePlus,
  Eye,
  Filter,
  Plus,
} from "lucide-react";
import { useNegociacoes, useLeads, useProfiles } from "@/hooks/useComercialData";
import {
  STATUS_PIPELINE_LABELS,
  PRIORIDADE_LABELS,
  FINALIZED_PIPELINE_STATUSES,
  FINALIZED_PROSPECCAO_STATUSES,
  type Negociacao,
  type Lead,
} from "@/types/comercial";
import { isBefore, isToday, startOfDay, addDays } from "date-fns";
import ConcluirAcaoDialog from "./ConcluirAcaoDialog";
import RegistrarInteracaoDialog from "./RegistrarInteracaoDialog";
import NegociacaoDetailSheet from "./NegociacaoDetailSheet";
import NegociacaoFormDialog from "./NegociacaoFormDialog";
import { KpiSkeleton, ListSkeleton } from "./ComercialSkeleton";

type AcaoItem = {
  type: "negociacao" | "lead";
  id: string;
  nome: string;
  status: string;
  statusLabel: string;
  prioridade: string;
  proxima_acao: string;
  data_proxima_acao: string;
  ticket_estimado?: number | null;
  raw: Negociacao | Lead;
};

const PAGE_SIZE = 20;

export default function HojeView() {
  const { data: negociacoes = [], isLoading: loadingNeg } = useNegociacoes();
  const { data: leads = [], isLoading: loadingLeads } = useLeads();
  const { data: profiles = [] } = useProfiles();
  const [concluirItem, setConcluirItem] = useState<AcaoItem | null>(null);
  const [interacaoItem, setInteracaoItem] = useState<AcaoItem | null>(null);
  const [detailNeg, setDetailNeg] = useState<Negociacao | null>(null);
  const [showNewNeg, setShowNewNeg] = useState(false);
  const [filaLimit, setFilaLimit] = useState(PAGE_SIZE);
  const [showFilters, setShowFilters] = useState(false);
  const [filterResponsavel, setFilterResponsavel] = useState<string>("all");
  const [filterPrioridade, setFilterPrioridade] = useState<string>("all");
  const [somenteAtrasados, setSomenteAtrasados] = useState(false);

  const today = useMemo(() => startOfDay(new Date()), []);
  const isLoading = loadingNeg || loadingLeads;

  const isOverdue = useCallback(
    (dateStr: string) => {
      const d = startOfDay(new Date(dateStr + "T00:00:00"));
      return isBefore(d, today);
    },
    [today]
  );

  // KPIs
  const kpis = useMemo(() => {
    const activeNegs = negociacoes.filter(
      (n) => !FINALIZED_PIPELINE_STATUSES.includes(n.status_pipeline)
    );
    const activeLeads = leads.filter(
      (l) => !FINALIZED_PROSPECCAO_STATUSES.includes(l.status_prospeccao)
    );
    let acoesHoje = 0;
    let atrasadas = 0;
    for (const n of activeNegs) {
      const d = startOfDay(new Date(n.data_proxima_acao + "T00:00:00"));
      if (isToday(d)) acoesHoje++;
      if (isBefore(d, today)) atrasadas++;
    }
    for (const l of activeLeads) {
      const d = startOfDay(new Date(l.data_proxima_acao + "T00:00:00"));
      if (isToday(d)) acoesHoje++;
      if (isBefore(d, today)) atrasadas++;
    }
    const altaPrioridade = activeNegs.filter((n) => n.prioridade === "alta").length;
    return { acoesHoje, atrasadas, altaPrioridade };
  }, [negociacoes, leads, today]);

  // Prioridades: top 5 most important
  const prioridades = useMemo(() => {
    const activeNegs = negociacoes.filter(
      (n) => !FINALIZED_PIPELINE_STATUSES.includes(n.status_pipeline)
    );
    return activeNegs
      .sort((a, b) => {
        const prioOrder = { alta: 0, media: 1, baixa: 2 };
        if (prioOrder[a.prioridade] !== prioOrder[b.prioridade])
          return prioOrder[a.prioridade] - prioOrder[b.prioridade];
        const aOverdue = isOverdue(a.data_proxima_acao) ? 0 : 1;
        const bOverdue = isOverdue(b.data_proxima_acao) ? 0 : 1;
        if (aOverdue !== bOverdue) return aOverdue - bOverdue;
        return (Number(b.ticket_estimado_mes) || 0) - (Number(a.ticket_estimado_mes) || 0);
      })
      .slice(0, 5);
  }, [negociacoes, isOverdue]);

  // Minha Fila: all active with data_proxima_acao <= today, with filters
  const filaItems = useMemo((): AcaoItem[] => {
    const allActive: AcaoItem[] = [];

    for (const n of negociacoes) {
      if (FINALIZED_PIPELINE_STATUSES.includes(n.status_pipeline)) continue;
      const d = startOfDay(new Date(n.data_proxima_acao + "T00:00:00"));
      if (!isBefore(d, addDays(today, 1))) continue;
      allActive.push({
        type: "negociacao",
        id: n.id,
        nome: n.marca_nome,
        status: n.status_pipeline,
        statusLabel: STATUS_PIPELINE_LABELS[n.status_pipeline],
        prioridade: n.prioridade,
        proxima_acao: n.proxima_acao,
        data_proxima_acao: n.data_proxima_acao,
        ticket_estimado: n.ticket_estimado_mes,
        raw: n,
      });
    }

    return allActive
      .filter((item) => {
        if (filterPrioridade !== "all" && item.prioridade !== filterPrioridade) return false;
        if (filterResponsavel !== "all") {
          const neg = item.raw as Negociacao;
          if (neg.responsavel_id !== filterResponsavel) return false;
        }
        if (somenteAtrasados && !isOverdue(item.data_proxima_acao)) return false;
        return true;
      })
      .sort((a, b) => {
        const aDate = new Date(a.data_proxima_acao).getTime();
        const bDate = new Date(b.data_proxima_acao).getTime();
        return aDate - bDate;
      });
  }, [negociacoes, today, filterPrioridade, filterResponsavel, somenteAtrasados, isOverdue]);

  const getPrioridadeBadge = (p: string) => {
    if (p === "alta") return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Alta</Badge>;
    if (p === "media") return <Badge variant="default" className="text-[10px] px-1.5 py-0">Média</Badge>;
    return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Baixa</Badge>;
  };

  return (
    <div className="space-y-5">
      {/* 3 KPIs */}
      {isLoading ? (
        <KpiSkeleton />
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card p-3">
            <CalendarCheck className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-xl font-bold text-foreground leading-none">{kpis.acoesHoje}</p>
              <p className="text-[11px] text-muted-foreground">Ações Hoje</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card p-3">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <div>
              <p className="text-xl font-bold text-foreground leading-none">{kpis.atrasadas}</p>
              <p className="text-[11px] text-muted-foreground">Atrasadas</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card p-3">
            <Flame className="h-4 w-4 text-warning shrink-0" />
            <div>
              <p className="text-xl font-bold text-foreground leading-none">{kpis.altaPrioridade}</p>
              <p className="text-[11px] text-muted-foreground">Alta Prioridade</p>
            </div>
          </div>
        </div>
      )}

      {/* Prioridades */}
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : prioridades.length > 0 ? (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Prioridades
          </h2>
          <div className="space-y-1.5">
            {prioridades.map((neg) => {
              const overdue = isOverdue(neg.data_proxima_acao);
              return (
                <div
                  key={neg.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                    overdue ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"
                  }`}
                >
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {neg.marca_nome}
                    </span>
                    {getPrioridadeBadge(neg.prioridade)}
                    <span
                      className={`text-xs ml-auto shrink-0 ${
                        overdue ? "text-destructive font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {neg.data_proxima_acao.split("-").reverse().join("/")}
                      {overdue && " ⚠"}
                    </span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setDetailNeg(neg)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() =>
                        setConcluirItem({
                          type: "negociacao",
                          id: neg.id,
                          nome: neg.marca_nome,
                          status: neg.status_pipeline,
                          statusLabel: STATUS_PIPELINE_LABELS[neg.status_pipeline],
                          prioridade: neg.prioridade,
                          proxima_acao: neg.proxima_acao,
                          data_proxima_acao: neg.data_proxima_acao,
                          raw: neg,
                        })
                      }
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Minha Fila */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Minha Fila
          </h2>
          <div className="flex gap-1.5">
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setShowFilters(true)}>
              <Filter className="h-3 w-3" /> Filtrar
            </Button>
            <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => setShowNewNeg(true)}>
              <Plus className="h-3 w-3" /> Nova
            </Button>
          </div>
        </div>

        {isLoading ? (
          <ListSkeleton rows={5} />
        ) : filaItems.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">
            Nenhuma ação pendente. 🎉
          </div>
        ) : (
          <div className="space-y-1">
            {filaItems.slice(0, filaLimit).map((item) => {
              const overdue = isOverdue(item.data_proxima_acao);
              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                    overdue ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{item.nome}</span>
                      {getPrioridadeBadge(item.prioridade)}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-muted-foreground">{item.statusLabel}</span>
                      <span
                        className={`text-[11px] ${
                          overdue ? "text-destructive font-medium" : "text-muted-foreground"
                        }`}
                      >
                        📅 {item.data_proxima_acao.split("-").reverse().join("/")}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        if (item.type === "negociacao") setDetailNeg(item.raw as Negociacao);
                      }}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setInteracaoItem(item)}
                    >
                      <MessageSquarePlus className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setConcluirItem(item)}
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {filaItems.length > filaLimit && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => setFilaLimit((l) => l + PAGE_SIZE)}
                >
                  <ChevronDown className="h-3.5 w-3.5 mr-1" />
                  Mais ({filaItems.length - filaLimit})
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter drawer */}
      <Sheet open={showFilters} onOpenChange={setShowFilters}>
        <SheetContent className="w-[300px] sm:max-w-[300px]">
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 mt-6">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Prioridade</Label>
              <Select value={filterPrioridade} onValueChange={setFilterPrioridade}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.entries(PRIORIDADE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Responsável</Label>
              <Select value={filterResponsavel} onValueChange={setFilterResponsavel}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={somenteAtrasados} onCheckedChange={setSomenteAtrasados} />
              <Label className="text-sm">Somente atrasados</Label>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setFilterPrioridade("all");
                setFilterResponsavel("all");
                setSomenteAtrasados(false);
              }}
            >
              Limpar Filtros
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialogs */}
      {concluirItem && (
        <ConcluirAcaoDialog item={concluirItem} open={!!concluirItem} onClose={() => setConcluirItem(null)} />
      )}
      {interacaoItem && (
        <RegistrarInteracaoDialog item={interacaoItem} open={!!interacaoItem} onClose={() => setInteracaoItem(null)} />
      )}
      {detailNeg && (
        <NegociacaoDetailSheet open={!!detailNeg} onClose={() => setDetailNeg(null)} negociacao={detailNeg} />
      )}
      {showNewNeg && <NegociacaoFormDialog open={showNewNeg} onClose={() => setShowNewNeg(false)} />}
    </div>
  );
}
