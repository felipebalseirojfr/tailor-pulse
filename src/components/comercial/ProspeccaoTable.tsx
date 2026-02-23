import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ArrowUpRight } from "lucide-react";
import { useLeads, useProfiles } from "@/hooks/useComercialData";
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
  const { data: profiles = [] } = useProfiles();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterResponsavel, setFilterResponsavel] = useState<string>("all");
  const [filterOrigem, setFilterOrigem] = useState<string>("all");
  const [showNewLead, setShowNewLead] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [qualifyLead, setQualifyLead] = useState<Lead | null>(null);

  const today = useMemo(() => startOfDay(new Date()), []);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (filterStatus !== "all" && l.status_prospeccao !== filterStatus) return false;
      if (filterResponsavel !== "all" && l.responsavel_id !== filterResponsavel) return false;
      if (filterOrigem !== "all" && l.origem !== filterOrigem) return false;
      if (filterStatus === "all" && FINALIZED_PROSPECCAO_STATUSES.includes(l.status_prospeccao)) return false;
      return true;
    });
  }, [leads, filterStatus, filterResponsavel, filterOrigem]);

  const isOverdue = (dateStr: string) => {
    const d = startOfDay(new Date(dateStr + "T00:00:00"));
    return isBefore(d, today);
  };

  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Ativos</SelectItem>
              {Object.entries(STATUS_PROSPECCAO_LABELS).map(([k, v]) => (
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
          <Select value={filterOrigem} onValueChange={setFilterOrigem}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Origem" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.entries(ORIGEM_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto">
            <Button size="sm" onClick={() => setShowNewLead(true)}>
              <Plus className="h-4 w-4 mr-1" /> Novo Lead
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Marca/Empresa</TableHead>
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
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum lead encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((lead) => {
                  const overdue = isOverdue(lead.data_proxima_acao) && !FINALIZED_PROSPECCAO_STATUSES.includes(lead.status_prospeccao);
                  return (
                    <TableRow key={lead.id} className={overdue ? "bg-destructive/5" : ""}>
                      <TableCell className="font-medium">{lead.lead_nome}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {STATUS_PROSPECCAO_LABELS[lead.status_prospeccao]}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">{lead.proxima_acao}</TableCell>
                      <TableCell className={overdue ? "text-destructive font-medium" : ""}>
                        {lead.data_proxima_acao.split("-").reverse().join("/")}
                        {overdue && " ⚠️"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {lead.origem ? ORIGEM_LABELS[lead.origem] : "—"}
                      </TableCell>
                      <TableCell className="text-sm">{lead.responsavel?.nome || "—"}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditLead(lead)}>
                          Editar
                        </Button>
                        {lead.status_prospeccao !== 'qualificado' && lead.status_prospeccao !== 'descartado' && (
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => setQualifyLead(lead)}>
                            <ArrowUpRight className="h-3.5 w-3.5" />
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
        </CardContent>
      </Card>

      {showNewLead && <LeadFormDialog open={showNewLead} onClose={() => setShowNewLead(false)} />}
      {editLead && (
        <LeadFormDialog open={!!editLead} onClose={() => setEditLead(null)} lead={editLead} />
      )}
      {qualifyLead && (
        <QualifyLeadDialog open={!!qualifyLead} onClose={() => setQualifyLead(null)} lead={qualifyLead} />
      )}
    </div>
  );
}
