import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, AlertTriangle, ChevronRight, Eye } from "lucide-react";
import { useNegociacoes, useProfiles } from "@/hooks/useComercialData";
import {
  STATUS_PIPELINE_LABELS,
  STATUS_PIPELINE_ORDER,
  PRIORIDADE_LABELS,
  TEMPERATURA_LABELS,
  BLOQUEADO_POR_LABELS,
  FINALIZED_PIPELINE_STATUSES,
  type Negociacao,
  type StatusPipeline,
  type PrioridadeComercial,
} from "@/types/comercial";
import { isBefore, startOfDay } from "date-fns";
import NegociacaoFormDialog from "./NegociacaoFormDialog";
import NegociacaoDetailSheet from "./NegociacaoDetailSheet";

export default function PipelineKanban() {
  const { data: negociacoes = [], isLoading } = useNegociacoes();
  const { data: profiles = [] } = useProfiles();
  const [filterPrioridade, setFilterPrioridade] = useState<string>("all");
  const [filterResponsavel, setFilterResponsavel] = useState<string>("all");
  const [filterBloqueado, setFilterBloqueado] = useState<string>("all");
  const [filterTemperatura, setFilterTemperatura] = useState<string>("all");
  const [somenteAtrasados, setSomenteAtrasados] = useState(false);
  const [showNewNeg, setShowNewNeg] = useState(false);
  const [editNeg, setEditNeg] = useState<Negociacao | null>(null);
  const [detailNeg, setDetailNeg] = useState<Negociacao | null>(null);

  const today = startOfDay(new Date());

  const filtered = useMemo(() => {
    return negociacoes.filter((n) => {
      if (filterPrioridade !== "all" && n.prioridade !== filterPrioridade) return false;
      if (filterResponsavel !== "all" && n.responsavel_id !== filterResponsavel) return false;
      if (filterBloqueado !== "all" && n.bloqueado_por !== filterBloqueado) return false;
      if (filterTemperatura !== "all" && n.temperatura !== filterTemperatura) return false;
      if (somenteAtrasados) {
        const d = startOfDay(new Date(n.data_proxima_acao + "T00:00:00"));
        if (!isBefore(d, today) || FINALIZED_PIPELINE_STATUSES.includes(n.status_pipeline)) return false;
      }
      return true;
    });
  }, [negociacoes, filterPrioridade, filterResponsavel, filterBloqueado, filterTemperatura, somenteAtrasados, today]);

  const columns = STATUS_PIPELINE_ORDER.filter((s) => !FINALIZED_PIPELINE_STATUSES.includes(s));
  const finalizedColumns: StatusPipeline[] = ['fechado', 'perdido'];

  const isOverdue = (n: Negociacao) => {
    if (FINALIZED_PIPELINE_STATUSES.includes(n.status_pipeline)) return false;
    const d = startOfDay(new Date(n.data_proxima_acao + "T00:00:00"));
    return isBefore(d, today);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="hover:scale-100">
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <Select value={filterPrioridade} onValueChange={setFilterPrioridade}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Prioridade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {(Object.entries(PRIORIDADE_LABELS) as [PrioridadeComercial, string][]).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterResponsavel} onValueChange={setFilterResponsavel}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Responsável" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTemperatura} onValueChange={setFilterTemperatura}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Temperatura" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.entries(TEMPERATURA_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterBloqueado} onValueChange={setFilterBloqueado}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Bloqueado por" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(BLOQUEADO_POR_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch id="atrasados" checked={somenteAtrasados} onCheckedChange={setSomenteAtrasados} />
            <Label htmlFor="atrasados" className="text-sm">Somente atrasados</Label>
          </div>
          <div className="ml-auto">
            <Button size="sm" onClick={() => setShowNewNeg(true)}>
              <Plus className="h-4 w-4 mr-1" /> Nova Negociação
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max">
          {[...columns, ...finalizedColumns].map((status) => {
            const items = filtered.filter((n) => n.status_pipeline === status);
            const isFinal = FINALIZED_PIPELINE_STATUSES.includes(status);
            return (
              <div key={status} className={`flex flex-col w-[280px] shrink-0 ${isFinal ? 'opacity-70' : ''}`}>
                <div className="flex items-center justify-between px-2 py-2 mb-2">
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {STATUS_PIPELINE_LABELS[status]}
                  </h3>
                  <Badge variant="outline" className="text-xs">{items.length}</Badge>
                </div>
                <div className="space-y-2 min-h-[100px] p-2 rounded-lg bg-muted/30 border border-border/50">
                  {items.map((neg) => {
                    const overdue = isOverdue(neg);
                    return (
                      <Card
                        key={neg.id}
                        className={`hover:scale-100 cursor-pointer transition-all ${
                          overdue && neg.prioridade === 'alta'
                            ? 'border-destructive ring-1 ring-destructive/50'
                            : overdue
                            ? 'border-warning/50'
                            : ''
                        }`}
                        onClick={() => setDetailNeg(neg)}
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-medium text-sm text-foreground truncate">{neg.marca_nome}</span>
                            {overdue && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {neg.prioridade === 'alta' && <Badge variant="destructive" className="text-xs">Alta</Badge>}
                            {neg.prioridade === 'media' && <Badge variant="default" className="text-xs">Média</Badge>}
                            {neg.prioridade === 'baixa' && <Badge variant="secondary" className="text-xs">Baixa</Badge>}
                            {neg.temperatura && (
                              <Badge variant="outline" className="text-xs">
                                {TEMPERATURA_LABELS[neg.temperatura]}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {neg.proxima_acao}
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className={overdue ? "text-destructive" : ""}>
                              📅 {neg.data_proxima_acao.split("-").reverse().join("/")}
                            </span>
                            {neg.ticket_estimado_mes && (
                              <span>R$ {Number(neg.ticket_estimado_mes).toLocaleString("pt-BR")}</span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showNewNeg && <NegociacaoFormDialog open={showNewNeg} onClose={() => setShowNewNeg(false)} />}
      {editNeg && (
        <NegociacaoFormDialog open={!!editNeg} onClose={() => setEditNeg(null)} negociacao={editNeg} />
      )}
      {detailNeg && (
        <NegociacaoDetailSheet open={!!detailNeg} onClose={() => setDetailNeg(null)} negociacao={detailNeg} />
      )}
    </div>
  );
}
