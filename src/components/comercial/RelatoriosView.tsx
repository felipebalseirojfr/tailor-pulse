import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNegociacoes } from "@/hooks/useComercialData";
import {
  STATUS_PIPELINE_LABELS,
  STATUS_PIPELINE_ORDER,
  FINALIZED_PIPELINE_STATUSES,
} from "@/types/comercial";
import { isBefore, startOfDay, startOfMonth, endOfMonth } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { KpiSkeleton, ChartSkeleton } from "./ComercialSkeleton";

export default function RelatoriosView() {
  const { data: negociacoes = [], isLoading } = useNegociacoes();

  const today = useMemo(() => startOfDay(new Date()), []);
  const monthStart = useMemo(() => startOfMonth(today), [today]);
  const monthEnd = useMemo(() => endOfMonth(today), [today]);

  // 4 KPIs
  const kpis = useMemo(() => {
    const total = negociacoes.length;
    const ativas = negociacoes.filter((n) => !FINALIZED_PIPELINE_STATUSES.includes(n.status_pipeline)).length;
    const atrasadas = negociacoes.filter((n) => {
      if (FINALIZED_PIPELINE_STATUSES.includes(n.status_pipeline)) return false;
      const d = startOfDay(new Date(n.data_proxima_acao + "T00:00:00"));
      return isBefore(d, today);
    }).length;
    const fechadasMes = negociacoes.filter((n) => {
      if (n.status_pipeline !== "fechado") return false;
      const d = new Date(n.updated_at);
      return d >= monthStart && d <= monthEnd;
    }).length;
    return { total, ativas, atrasadas, fechadasMes };
  }, [negociacoes, today, monthStart, monthEnd]);

  // Chart by stage
  const byStage = useMemo(() => {
    return STATUS_PIPELINE_ORDER.map((s) => ({
      name: STATUS_PIPELINE_LABELS[s],
      total: negociacoes.filter((n) => n.status_pipeline === s).length,
    }));
  }, [negociacoes]);

  // Top 10 by ticket
  const top10 = useMemo(() => {
    return [...negociacoes]
      .filter((n) => n.ticket_estimado_mes && n.ticket_estimado_mes > 0)
      .sort((a, b) => (Number(b.ticket_estimado_mes) || 0) - (Number(a.ticket_estimado_mes) || 0))
      .slice(0, 10);
  }, [negociacoes]);

  return (
    <div className="space-y-5">
      {/* 4 KPIs */}
      {isLoading ? (
        <KpiSkeleton />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total", value: kpis.total, color: "text-foreground" },
            { label: "Ativas", value: kpis.ativas, color: "text-primary" },
            { label: "Atrasadas", value: kpis.atrasadas, color: "text-destructive" },
            { label: "Fechadas (mês)", value: kpis.fechadasMes, color: "text-emerald-400" },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-lg border border-border bg-card p-4 text-center">
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {isLoading ? (
        <ChartSkeleton />
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Por Etapa</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byStage} layout="vertical">
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis type="category" dataKey="name" width={120} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top 10 */}
      {!isLoading && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Top 10 por Ticket Estimado
          </h2>
          {top10.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">Nenhuma negociação com ticket estimado.</p>
          ) : (
            <div className="space-y-1">
              {top10.map((n, i) => (
                <div key={n.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono text-muted-foreground w-5 text-right">{i + 1}.</span>
                    <div>
                      <span className="text-sm font-medium text-foreground">{n.marca_nome}</span>
                      <p className="text-[11px] text-muted-foreground">{STATUS_PIPELINE_LABELS[n.status_pipeline]}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    R$ {Number(n.ticket_estimado_mes).toLocaleString("pt-BR")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
