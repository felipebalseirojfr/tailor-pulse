import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useNegociacoes, useProfiles } from "@/hooks/useComercialData";
import {
  STATUS_PIPELINE_LABELS,
  STATUS_PIPELINE_ORDER,
  PRIORIDADE_LABELS,
  FINALIZED_PIPELINE_STATUSES,
  type Negociacao,
} from "@/types/comercial";
import { isBefore, startOfDay } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(199,89%,48%)", "hsl(280,65%,60%)", "hsl(158,64%,52%)", "hsl(38,92%,50%)", "hsl(0,84%,60%)", "hsl(210,40%,50%)", "hsl(150,50%,50%)", "hsl(30,80%,60%)"];

export default function RelatoriosView() {
  const { data: negociacoes = [], isLoading } = useNegociacoes();
  const { data: profiles = [] } = useProfiles();
  const [filterResponsavel, setFilterResponsavel] = useState<string>("all");

  const today = startOfDay(new Date());

  const filtered = useMemo(() => {
    if (filterResponsavel === "all") return negociacoes;
    return negociacoes.filter((n) => n.responsavel_id === filterResponsavel);
  }, [negociacoes, filterResponsavel]);

  // Count by pipeline stage
  const byStage = useMemo(() => {
    return STATUS_PIPELINE_ORDER.map((s) => ({
      name: STATUS_PIPELINE_LABELS[s],
      count: filtered.filter((n) => n.status_pipeline === s).length,
    }));
  }, [filtered]);

  // Count by priority
  const byPriority = useMemo(() => {
    return (["alta", "media", "baixa"] as const).map((p) => ({
      name: PRIORIDADE_LABELS[p],
      value: filtered.filter((n) => n.prioridade === p).length,
    }));
  }, [filtered]);

  // Overdue by responsavel
  const overdueByResp = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((n) => {
      if (FINALIZED_PIPELINE_STATUSES.includes(n.status_pipeline)) return;
      const d = startOfDay(new Date(n.data_proxima_acao + "T00:00:00"));
      if (isBefore(d, today)) {
        const name = n.responsavel?.nome || "Sem responsável";
        map[name] = (map[name] || 0) + 1;
      }
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [filtered, today]);

  // Top 10 by ticket
  const top10 = useMemo(() => {
    return [...filtered]
      .filter((n) => n.ticket_estimado_mes && n.ticket_estimado_mes > 0)
      .sort((a, b) => (Number(b.ticket_estimado_mes) || 0) - (Number(a.ticket_estimado_mes) || 0))
      .slice(0, 10);
  }, [filtered]);

  // Fechados vs Perdidos
  const fechados = filtered.filter((n) => n.status_pipeline === "fechado").length;
  const perdidos = filtered.filter((n) => n.status_pipeline === "perdido").length;
  const taxaConversao = fechados + perdidos > 0 ? Math.round((fechados / (fechados + perdidos)) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter */}
      <Card className="hover:scale-100">
        <CardContent className="p-4 flex items-center gap-3">
          <Select value={filterResponsavel} onValueChange={setFilterResponsavel}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Responsável" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os responsáveis</SelectItem>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:scale-100">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-foreground">{filtered.length}</p>
            <p className="text-xs text-muted-foreground">Total Negociações</p>
          </CardContent>
        </Card>
        <Card className="hover:scale-100">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-success">{fechados}</p>
            <p className="text-xs text-muted-foreground">Fechados</p>
          </CardContent>
        </Card>
        <Card className="hover:scale-100">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-destructive">{perdidos}</p>
            <p className="text-xs text-muted-foreground">Perdidos</p>
          </CardContent>
        </Card>
        <Card className="hover:scale-100">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{taxaConversao}%</p>
            <p className="text-xs text-muted-foreground">Taxa de Conversão</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="hover:scale-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Por Etapa do Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byStage} layout="vertical">
                <XAxis type="number" stroke="hsl(210,20%,60%)" fontSize={12} />
                <YAxis type="category" dataKey="name" width={120} stroke="hsl(210,20%,60%)" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(210,35%,12%)", border: "1px solid hsl(210,25%,18%)", color: "hsl(210,40%,98%)" }} />
                <Bar dataKey="count" fill="hsl(199,89%,48%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="hover:scale-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Por Prioridade</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={byPriority} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                  {byPriority.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(210,35%,12%)", border: "1px solid hsl(210,25%,18%)", color: "hsl(210,40%,98%)" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Overdue by responsavel */}
      {overdueByResp.length > 0 && (
        <Card className="hover:scale-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Atrasados por Responsável</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={overdueByResp}>
                <XAxis dataKey="name" stroke="hsl(210,20%,60%)" fontSize={12} />
                <YAxis stroke="hsl(210,20%,60%)" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(210,35%,12%)", border: "1px solid hsl(210,25%,18%)", color: "hsl(210,40%,98%)" }} />
                <Bar dataKey="count" fill="hsl(0,84%,60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top 10 */}
      <Card className="hover:scale-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top 10 Negociações por Ticket Estimado</CardTitle>
        </CardHeader>
        <CardContent>
          {top10.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Nenhuma negociação com ticket estimado.</p>
          ) : (
            <div className="space-y-2">
              {top10.map((n, i) => (
                <div key={n.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-muted-foreground w-6 text-right">{i + 1}.</span>
                    <div>
                      <span className="font-medium text-sm text-foreground">{n.marca_nome}</span>
                      <p className="text-xs text-muted-foreground">{STATUS_PIPELINE_LABELS[n.status_pipeline]}</p>
                    </div>
                  </div>
                  <span className="font-semibold text-sm text-primary">
                    R$ {Number(n.ticket_estimado_mes).toLocaleString("pt-BR")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
