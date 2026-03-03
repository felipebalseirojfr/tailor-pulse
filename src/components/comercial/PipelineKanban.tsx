import { useState, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, AlertTriangle, Filter } from "lucide-react";
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
import { KanbanSkeleton } from "./ComercialSkeleton";
import { supabase } from "@/integrations/supabase/client";

export default function PipelineKanban() {
  const { data: negociacoes = [], isLoading } = useNegociacoes();
  const { data: profiles = [] } = useProfiles();

  // Quick toggles (visible)
  const [somenteAtrasados, setSomenteAtrasados] = useState(false);
  const [somenteMinhas, setSomenteMinhas] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Advanced filters (in drawer)
  const [showFilters, setShowFilters] = useState(false);
  const [filterPrioridade, setFilterPrioridade] = useState<string>("all");
  const [filterResponsavel, setFilterResponsavel] = useState<string>("all");
  const [filterBloqueado, setFilterBloqueado] = useState<string>("all");
  const [filterTemperatura, setFilterTemperatura] = useState<string>("all");

  const [showNewNeg, setShowNewNeg] = useState(false);
  const [detailNeg, setDetailNeg] = useState<Negociacao | null>(null);

  const today = useMemo(() => startOfDay(new Date()), []);

  // Get current user for "somente minhas"
  useMemo(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  const filtered = useMemo(() => {
    return negociacoes.filter((n) => {
      if (filterPrioridade !== "all" && n.prioridade !== filterPrioridade) return false;
      if (filterResponsavel !== "all" && n.responsavel_id !== filterResponsavel) return false;
      if (filterBloqueado !== "all" && n.bloqueado_por !== filterBloqueado) return false;
      if (filterTemperatura !== "all" && n.temperatura !== filterTemperatura) return false;
      if (somenteMinhas && currentUserId && n.responsavel_id !== currentUserId) return false;
      if (somenteAtrasados) {
        const d = startOfDay(new Date(n.data_proxima_acao + "T00:00:00"));
        if (!isBefore(d, today) || FINALIZED_PIPELINE_STATUSES.includes(n.status_pipeline))
          return false;
      }
      return true;
    });
  }, [negociacoes, filterPrioridade, filterResponsavel, filterBloqueado, filterTemperatura, somenteAtrasados, somenteMinhas, currentUserId, today]);

  const columns = useMemo(
    () => STATUS_PIPELINE_ORDER.filter((s) => !FINALIZED_PIPELINE_STATUSES.includes(s)),
    []
  );
  const finalizedColumns: StatusPipeline[] = useMemo(() => ["fechado", "perdido"], []);

  const isOverdue = useCallback(
    (n: Negociacao) => {
      if (FINALIZED_PIPELINE_STATUSES.includes(n.status_pipeline)) return false;
      const d = startOfDay(new Date(n.data_proxima_acao + "T00:00:00"));
      return isBefore(d, today);
    },
    [today]
  );

  if (isLoading) return <KanbanSkeleton />;

  return (
    <div className="space-y-3">
      {/* Quick toggles + actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Switch id="atrasados" checked={somenteAtrasados} onCheckedChange={setSomenteAtrasados} />
          <Label htmlFor="atrasados" className="text-xs">Somente atrasados</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="minhas" checked={somenteMinhas} onCheckedChange={setSomenteMinhas} />
          <Label htmlFor="minhas" className="text-xs">Somente minhas</Label>
        </div>
        <div className="ml-auto flex gap-1.5">
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setShowFilters(true)}>
            <Filter className="h-3 w-3" /> Filtrar
          </Button>
          <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => setShowNewNeg(true)}>
            <Plus className="h-3 w-3" /> Nova
          </Button>
        </div>
      </div>

      {/* Kanban */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-2.5 min-w-max">
          {[...columns, ...finalizedColumns].map((status) => {
            const items = filtered.filter((n) => n.status_pipeline === status);
            const isFinal = FINALIZED_PIPELINE_STATUSES.includes(status);
            return (
              <div key={status} className={`flex flex-col w-[240px] shrink-0 ${isFinal ? "opacity-60" : ""}`}>
                <div className="flex items-center justify-between px-2 py-1.5 mb-1.5">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                    {STATUS_PIPELINE_LABELS[status]}
                  </h3>
                  <Badge variant="outline" className="text-[10px] h-5 min-w-[20px] justify-center">
                    {items.length}
                  </Badge>
                </div>
                <div className="space-y-1.5 min-h-[80px] p-1.5 rounded-lg bg-muted/20 border border-border/30">
                  {items.map((neg) => {
                    const overdue = isOverdue(neg);
                    return (
                      <div
                        key={neg.id}
                        className={`cursor-pointer rounded-md border bg-card p-2.5 transition-all hover:ring-1 hover:ring-primary/30 ${
                          overdue && neg.prioridade === "alta"
                            ? "border-destructive/60"
                            : overdue
                            ? "border-orange-500/40"
                            : "border-border"
                        }`}
                        onClick={() => setDetailNeg(neg)}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-medium text-sm text-foreground truncate leading-tight">
                            {neg.marca_nome}
                          </span>
                          {overdue && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {neg.prioridade === "alta" && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Alta</Badge>
                          )}
                          {neg.prioridade === "media" && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0">Média</Badge>
                          )}
                          {neg.prioridade === "baixa" && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Baixa</Badge>
                          )}
                          <span
                            className={`text-[10px] ml-auto ${
                              overdue ? "text-destructive font-medium" : "text-muted-foreground"
                            }`}
                          >
                            {neg.data_proxima_acao.split("-").reverse().join("/")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter drawer */}
      <Sheet open={showFilters} onOpenChange={setShowFilters}>
        <SheetContent className="w-[300px] sm:max-w-[300px]">
          <SheetHeader>
            <SheetTitle>Filtros Avançados</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 mt-6">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Prioridade</Label>
              <Select value={filterPrioridade} onValueChange={setFilterPrioridade}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {(Object.entries(PRIORIDADE_LABELS) as [PrioridadeComercial, string][]).map(([k, v]) => (
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
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Temperatura</Label>
              <Select value={filterTemperatura} onValueChange={setFilterTemperatura}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.entries(TEMPERATURA_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Bloqueado por</Label>
              <Select value={filterBloqueado} onValueChange={setFilterBloqueado}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(BLOQUEADO_POR_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setFilterPrioridade("all");
                setFilterResponsavel("all");
                setFilterTemperatura("all");
                setFilterBloqueado("all");
              }}
            >
              Limpar Filtros
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {showNewNeg && <NegociacaoFormDialog open={showNewNeg} onClose={() => setShowNewNeg(false)} />}
      {detailNeg && (
        <NegociacaoDetailSheet open={!!detailNeg} onClose={() => setDetailNeg(null)} negociacao={detailNeg} />
      )}
    </div>
  );
}
