import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarCheck, AlertTriangle, Flame, Clock, CheckCircle, MessageSquarePlus, Plus } from "lucide-react";
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
import { ptBR } from "date-fns/locale";
import ConcluirAcaoDialog from "./ConcluirAcaoDialog";
import RegistrarInteracaoDialog from "./RegistrarInteracaoDialog";
import NegociacaoFormDialog from "./NegociacaoFormDialog";

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

export default function AcoesDoDia() {
  const { data: negociacoes = [], isLoading: loadingNeg } = useNegociacoes();
  const { data: leads = [], isLoading: loadingLeads } = useLeads();
  const [concluirItem, setConcluirItem] = useState<AcaoItem | null>(null);
  const [interacaoItem, setInteracaoItem] = useState<AcaoItem | null>(null);
  const [showNewNeg, setShowNewNeg] = useState(false);

  const today = startOfDay(new Date());
  const in7Days = addDays(today, 7);

  const allItems = useMemo((): AcaoItem[] => {
    const negItems: AcaoItem[] = negociacoes
      .filter((n) => !FINALIZED_PIPELINE_STATUSES.includes(n.status_pipeline))
      .map((n) => ({
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

    const leadItems: AcaoItem[] = leads
      .filter((l) => !FINALIZED_PROSPECCAO_STATUSES.includes(l.status_prospeccao))
      .map((l) => ({
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

    return [...negItems, ...leadItems];
  }, [negociacoes, leads]);

  // Counters
  const acoesHoje = allItems.filter((i) => {
    const d = startOfDay(new Date(i.data_proxima_acao + "T00:00:00"));
    return isToday(d);
  }).length;

  const atrasadas = allItems.filter((i) => {
    const d = startOfDay(new Date(i.data_proxima_acao + "T00:00:00"));
    return isBefore(d, today);
  }).length;

  const altaPrioridade = allItems.filter((i) => {
    const d = startOfDay(new Date(i.data_proxima_acao + "T00:00:00"));
    return i.prioridade === "alta" && (isBefore(d, in7Days) || isToday(d));
  }).length;

  const aguardandoCliente = negociacoes.filter(
    (n) => n.bloqueado_por === "aguardando_cliente" && !FINALIZED_PIPELINE_STATUSES.includes(n.status_pipeline)
  ).length;

  // Filter: show items with data_proxima_acao <= today
  const actionableItems = useMemo(() => {
    return allItems
      .filter((i) => {
        const d = startOfDay(new Date(i.data_proxima_acao + "T00:00:00"));
        return isBefore(d, addDays(today, 1)); // <= today
      })
      .sort((a, b) => {
        const prioOrder = { alta: 0, media: 1, baixa: 2 };
        const pa = prioOrder[a.prioridade as keyof typeof prioOrder] ?? 1;
        const pb = prioOrder[b.prioridade as keyof typeof prioOrder] ?? 1;
        if (pa !== pb) return pa - pb;
        if (a.data_proxima_acao !== b.data_proxima_acao) return a.data_proxima_acao.localeCompare(b.data_proxima_acao);
        return (b.ticket_estimado || 0) - (a.ticket_estimado || 0);
      });
  }, [allItems, today]);

  const isLoading = loadingNeg || loadingLeads;

  const getPrioridadeBadge = (p: string) => {
    if (p === "alta") return <Badge variant="destructive" className="text-xs">Alta</Badge>;
    if (p === "media") return <Badge variant="default" className="text-xs">Média</Badge>;
    return <Badge variant="secondary" className="text-xs">Baixa</Badge>;
  };

  const isOverdue = (dateStr: string) => {
    const d = startOfDay(new Date(dateStr + "T00:00:00"));
    return isBefore(d, today);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:scale-100">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <CalendarCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{acoesHoje}</p>
              <p className="text-xs text-muted-foreground">Ações Hoje</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:scale-100">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/20">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{atrasadas}</p>
              <p className="text-xs text-muted-foreground">Atrasadas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:scale-100">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/20">
              <Flame className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{altaPrioridade}</p>
              <p className="text-xs text-muted-foreground">Alta Prioridade</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:scale-100">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary/20">
              <Clock className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{aguardandoCliente}</p>
              <p className="text-xs text-muted-foreground">Aguardando Cliente</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action List */}
      <Card className="hover:scale-100">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">Ações Pendentes</CardTitle>
          <Button size="sm" onClick={() => setShowNewNeg(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nova Negociação
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : actionableItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma ação pendente para hoje. 🎉</p>
          ) : (
            <div className="space-y-2">
              {actionableItems.map((item) => (
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
                      <Badge variant="outline" className="text-xs">
                        {item.type === "negociacao" ? "Pipeline" : "Lead"}
                      </Badge>
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
                      {item.ticket_estimado ? (
                        <span>💰 R$ {Number(item.ticket_estimado).toLocaleString("pt-BR")}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => setInteracaoItem(item)}
                    >
                      <MessageSquarePlus className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Interação</span>
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1"
                      onClick={() => setConcluirItem(item)}
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Concluir</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {concluirItem && (
        <ConcluirAcaoDialog
          item={concluirItem}
          open={!!concluirItem}
          onClose={() => setConcluirItem(null)}
        />
      )}

      {interacaoItem && (
        <RegistrarInteracaoDialog
          item={interacaoItem}
          open={!!interacaoItem}
          onClose={() => setInteracaoItem(null)}
        />
      )}

      {showNewNeg && <NegociacaoFormDialog open={showNewNeg} onClose={() => setShowNewNeg(false)} />}
    </div>
  );
}
