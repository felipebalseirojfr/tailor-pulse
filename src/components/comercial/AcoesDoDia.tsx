import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarCheck, AlertTriangle, Flame, Clock, CheckCircle, MessageSquarePlus, Plus, RefreshCw, ChevronDown } from "lucide-react";
import { useNegociacoes, useLeads } from "@/hooks/useComercialData";
import {
  STATUS_PIPELINE_LABELS,
  STATUS_PROSPECCAO_LABELS,
  PRIORIDADE_LABELS,
  BLOQUEADO_POR_LABELS,
  FINALIZED_PIPELINE_STATUSES,
  FINALIZED_PROSPECCAO_STATUSES,
  type Negociacao,
  type Lead,
} from "@/types/comercial";
import { format, isToday, isBefore, startOfDay, addDays } from "date-fns";
import ConcluirAcaoDialog from "./ConcluirAcaoDialog";
import RegistrarInteracaoDialog from "./RegistrarInteracaoDialog";
import NegociacaoFormDialog from "./NegociacaoFormDialog";
import { KpiSkeleton, ListSkeleton } from "./ComercialSkeleton";
import { useQueryClient } from "@tanstack/react-query";

type AcaoItem = {
  type: "negociacao" | "lead";
  id: string;
  nome: string;
  status: string;
  statusLabel: string;
  prioridade: string;
  proxima_acao: string;
  data_proxima_acao: string;
  bloqueado_por?: string | null;
  responsavel_nome?: string;
  ticket_estimado?: number | null;
  raw: Negociacao | Lead;
};

const PAGE_SIZE = 20;

export default function AcoesDoDia() {
  const { data: negociacoes = [], isLoading: loadingNeg } = useNegociacoes();
  const { data: leads = [], isLoading: loadingLeads } = useLeads();
  const [concluirItem, setConcluirItem] = useState<AcaoItem | null>(null);
  const [interacaoItem, setInteracaoItem] = useState<AcaoItem | null>(null);
  const [showNewNeg, setShowNewNeg] = useState(false);
  const [negLimit, setNegLimit] = useState(PAGE_SIZE);
  const [leadLimit, setLeadLimit] = useState(PAGE_SIZE);
  const queryClient = useQueryClient();

  const today = useMemo(() => startOfDay(new Date()), []);

  // === KPIs computed from cached data ===
  const kpis = useMemo(() => {
    const activeNegs = negociacoes.filter(n => !FINALIZED_PIPELINE_STATUSES.includes(n.status_pipeline));
    const activeLeads = leads.filter(l => !FINALIZED_PROSPECCAO_STATUSES.includes(l.status_prospeccao));

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

    const altaPrioridade = activeNegs.filter(n => n.prioridade === "alta").length;
    const aguardandoCliente = activeNegs.filter(n => n.bloqueado_por === "aguardando_cliente").length;

    return { acoesHoje, atrasadas, altaPrioridade, aguardandoCliente };
  }, [negociacoes, leads, today]);

  // === Negociações list (sorted by date, paginated) ===
  const negItems = useMemo((): AcaoItem[] => {
    return negociacoes
      .filter(n => {
        if (FINALIZED_PIPELINE_STATUSES.includes(n.status_pipeline)) return false;
        const d = startOfDay(new Date(n.data_proxima_acao + "T00:00:00"));
        return isBefore(d, addDays(today, 1));
      })
      .map(n => ({
        type: "negociacao" as const,
        id: n.id,
        nome: n.marca_nome,
        status: n.status_pipeline,
        statusLabel: STATUS_PIPELINE_LABELS[n.status_pipeline],
        prioridade: n.prioridade,
        proxima_acao: n.proxima_acao,
        data_proxima_acao: n.data_proxima_acao,
        bloqueado_por: n.bloqueado_por,
        responsavel_nome: n.responsavel?.nome,
        ticket_estimado: n.ticket_estimado_mes,
        raw: n,
      }));
  }, [negociacoes, today]);

  // === Leads list (sorted by date, paginated) ===
  const leadItems = useMemo((): AcaoItem[] => {
    return leads
      .filter(l => {
        if (FINALIZED_PROSPECCAO_STATUSES.includes(l.status_prospeccao)) return false;
        const d = startOfDay(new Date(l.data_proxima_acao + "T00:00:00"));
        return isBefore(d, addDays(today, 1));
      })
      .map(l => ({
        type: "lead" as const,
        id: l.id,
        nome: l.lead_nome,
        status: l.status_prospeccao,
        statusLabel: STATUS_PROSPECCAO_LABELS[l.status_prospeccao],
        prioridade: "media",
        proxima_acao: l.proxima_acao,
        data_proxima_acao: l.data_proxima_acao,
        bloqueado_por: null,
        responsavel_nome: l.responsavel?.nome,
        ticket_estimado: l.ticket_estimado,
        raw: l,
      }));
  }, [leads, today]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["negociacoes"] });
    queryClient.invalidateQueries({ queryKey: ["leads"] });
  }, [queryClient]);

  const isOverdue = useCallback((dateStr: string) => {
    const d = startOfDay(new Date(dateStr + "T00:00:00"));
    return isBefore(d, today);
  }, [today]);

  const getPrioridadeBadge = (p: string) => {
    if (p === "alta") return <Badge variant="destructive" className="text-xs">Alta</Badge>;
    if (p === "media") return <Badge variant="default" className="text-xs">Média</Badge>;
    return <Badge variant="secondary" className="text-xs">Baixa</Badge>;
  };

  const isLoading = loadingNeg || loadingLeads;

  const renderItem = (item: AcaoItem) => (
    <div
      key={`${item.type}-${item.id}`}
      className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border transition-colors ${
        isOverdue(item.data_proxima_acao)
          ? "border-destructive/50 bg-destructive/5"
          : "border-border bg-card"
      }`}
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-foreground truncate">{item.nome}</span>
          {getPrioridadeBadge(item.prioridade)}
          {item.bloqueado_por && (
            <Badge variant="secondary" className="text-xs">
              {BLOQUEADO_POR_LABELS[item.bloqueado_por as keyof typeof BLOQUEADO_POR_LABELS] || item.bloqueado_por}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{item.statusLabel}</p>
        <p className="text-sm text-foreground">
          <span className="text-muted-foreground">Próxima ação:</span> {item.proxima_acao}
        </p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className={isOverdue(item.data_proxima_acao) ? "text-destructive font-medium" : ""}>
            📅 {format(new Date(item.data_proxima_acao + "T00:00:00"), "dd/MM/yyyy")}
            {isOverdue(item.data_proxima_acao) && " (atrasado)"}
          </span>
          {item.responsavel_nome && <span>👤 {item.responsavel_nome}</span>}
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button size="sm" variant="outline" className="gap-1" onClick={() => setInteracaoItem(item)}>
          <MessageSquarePlus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Interação</span>
        </Button>
        <Button size="sm" className="gap-1" onClick={() => setConcluirItem(item)}>
          <CheckCircle className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Concluir</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* KPIs */}
      {isLoading ? (
        <KpiSkeleton />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <CalendarCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{kpis.acoesHoje}</p>
                <p className="text-xs text-muted-foreground">Ações Hoje</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/20">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{kpis.atrasadas}</p>
                <p className="text-xs text-muted-foreground">Atrasadas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/20">
                <Flame className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{kpis.altaPrioridade}</p>
                <p className="text-xs text-muted-foreground">Alta Prioridade</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/20">
                <Clock className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{kpis.aguardandoCliente}</p>
                <p className="text-xs text-muted-foreground">Aguardando Cliente</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
          </Button>
          <Button size="sm" onClick={() => setShowNewNeg(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nova Negociação
          </Button>
        </div>
      </div>

      {/* Negociações list */}
      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Ações – Negociações ({negItems.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {negItems.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">Nenhuma ação de negociação pendente. 🎉</p>
            ) : (
              <div className="space-y-2">
                {negItems.slice(0, negLimit).map(renderItem)}
                {negItems.length > negLimit && (
                  <div className="flex justify-center pt-2">
                    <Button variant="outline" size="sm" onClick={() => setNegLimit(l => l + PAGE_SIZE)}>
                      <ChevronDown className="h-4 w-4 mr-1" /> Carregar mais ({negItems.length - negLimit} restantes)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Leads list */}
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Ações – Prospecção ({leadItems.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {leadItems.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">Nenhuma ação de prospecção pendente. 🎉</p>
            ) : (
              <div className="space-y-2">
                {leadItems.slice(0, leadLimit).map(renderItem)}
                {leadItems.length > leadLimit && (
                  <div className="flex justify-center pt-2">
                    <Button variant="outline" size="sm" onClick={() => setLeadLimit(l => l + PAGE_SIZE)}>
                      <ChevronDown className="h-4 w-4 mr-1" /> Carregar mais ({leadItems.length - leadLimit} restantes)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {concluirItem && (
        <ConcluirAcaoDialog item={concluirItem} open={!!concluirItem} onClose={() => setConcluirItem(null)} />
      )}
      {interacaoItem && (
        <RegistrarInteracaoDialog item={interacaoItem} open={!!interacaoItem} onClose={() => setInteracaoItem(null)} />
      )}
      {showNewNeg && <NegociacaoFormDialog open={showNewNeg} onClose={() => setShowNewNeg(false)} />}
    </div>
  );
}
