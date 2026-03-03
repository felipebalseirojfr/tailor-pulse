import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ArrowUpRight } from "lucide-react";
import { useLeads } from "@/hooks/useComercialData";
import {
  STATUS_PROSPECCAO_LABELS,
  ORIGEM_LABELS,
  FINALIZED_PROSPECCAO_STATUSES,
  type Lead,
} from "@/types/comercial";
import { isBefore, startOfDay } from "date-fns";
import LeadFormDialog from "./LeadFormDialog";
import QualifyLeadDialog from "./QualifyLeadDialog";
import { TableSkeleton } from "./ComercialSkeleton";

export default function ProspeccaoTable() {
  const { data: leads = [], isLoading } = useLeads();
  const [showNewLead, setShowNewLead] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [qualifyLead, setQualifyLead] = useState<Lead | null>(null);

  const today = useMemo(() => startOfDay(new Date()), []);

  const filtered = useMemo(() => {
    return leads.filter((l) => !FINALIZED_PROSPECCAO_STATUSES.includes(l.status_prospeccao));
  }, [leads]);

  const isOverdue = (dateStr: string) => {
    const d = startOfDay(new Date(dateStr + "T00:00:00"));
    return isBefore(d, today);
  };

  if (isLoading) return <TableSkeleton />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} leads ativos</p>
        <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => setShowNewLead(true)}>
          <Plus className="h-3 w-3" /> Novo Lead
        </Button>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Marca</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Próxima Ação</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum lead encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((lead) => {
                const overdue = isOverdue(lead.data_proxima_acao);
                return (
                  <TableRow key={lead.id} className={overdue ? "bg-destructive/5" : ""}>
                    <TableCell className="font-medium text-sm">{lead.lead_nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {STATUS_PROSPECCAO_LABELS[lead.status_prospeccao]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate text-xs">{lead.proxima_acao}</TableCell>
                    <TableCell className={`text-xs ${overdue ? "text-destructive font-medium" : ""}`}>
                      {lead.data_proxima_acao.split("-").reverse().join("/")}
                    </TableCell>
                    <TableCell className="text-xs">
                      {lead.origem ? ORIGEM_LABELS[lead.origem] : "—"}
                    </TableCell>
                    <TableCell className="text-xs">{lead.responsavel?.nome || "—"}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditLead(lead)}>
                        Editar
                      </Button>
                      {lead.status_prospeccao !== "qualificado" && lead.status_prospeccao !== "descartado" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-xs"
                          onClick={() => setQualifyLead(lead)}
                        >
                          <ArrowUpRight className="h-3 w-3" />
                          Qualificar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {showNewLead && <LeadFormDialog open={showNewLead} onClose={() => setShowNewLead(false)} />}
      {editLead && <LeadFormDialog open={!!editLead} onClose={() => setEditLead(null)} lead={editLead} />}
      {qualifyLead && <QualifyLeadDialog open={!!qualifyLead} onClose={() => setQualifyLead(null)} lead={qualifyLead} />}
    </div>
  );
}
