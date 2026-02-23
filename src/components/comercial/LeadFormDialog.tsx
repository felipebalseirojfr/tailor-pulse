import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpsertLead, useProfiles } from "@/hooks/useComercialData";
import {
  STATUS_PROSPECCAO_LABELS,
  SEGMENTO_LABELS,
  ORIGEM_LABELS,
  FINALIZED_PROSPECCAO_STATUSES,
  type Lead,
  type StatusProspeccao,
} from "@/types/comercial";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  lead?: Lead | null;
}

export default function LeadFormDialog({ open, onClose, lead }: Props) {
  const { data: profiles = [] } = useProfiles();
  const upsert = useUpsertLead();

  const [form, setForm] = useState({
    lead_nome: "",
    status_prospeccao: "identificado" as StatusProspeccao,
    proxima_acao: "",
    data_proxima_acao: "",
    responsavel_id: "",
    segmento: "",
    origem: "",
    volume_estimado: "",
    ticket_estimado: "",
    observacoes: "",
    contato_nome: "",
    contato_whatsapp: "",
    contato_email: "",
    contato_instagram: "",
    cidade: "",
    estado: "",
  });

  useEffect(() => {
    if (lead) {
      setForm({
        lead_nome: lead.lead_nome,
        status_prospeccao: lead.status_prospeccao,
        proxima_acao: lead.proxima_acao,
        data_proxima_acao: lead.data_proxima_acao,
        responsavel_id: lead.responsavel_id,
        segmento: lead.segmento || "",
        origem: lead.origem || "",
        volume_estimado: lead.volume_estimado?.toString() || "",
        ticket_estimado: lead.ticket_estimado?.toString() || "",
        observacoes: lead.observacoes || "",
        contato_nome: lead.contato_nome || "",
        contato_whatsapp: lead.contato_whatsapp || "",
        contato_email: lead.contato_email || "",
        contato_instagram: lead.contato_instagram || "",
        cidade: lead.cidade || "",
        estado: lead.estado || "",
      });
    } else {
      setForm({
        lead_nome: "",
        status_prospeccao: "identificado",
        proxima_acao: "",
        data_proxima_acao: "",
        responsavel_id: profiles[0]?.id || "",
        segmento: "",
        origem: "",
        volume_estimado: "",
        ticket_estimado: "",
        observacoes: "",
        contato_nome: "",
        contato_whatsapp: "",
        contato_email: "",
        contato_instagram: "",
        cidade: "",
        estado: "",
      });
    }
  }, [lead, open, profiles]);

  const isFinal = FINALIZED_PROSPECCAO_STATUSES.includes(form.status_prospeccao);
  const canSubmit =
    form.lead_nome.trim() &&
    form.responsavel_id &&
    (isFinal || (form.proxima_acao.trim() && form.data_proxima_acao));

  const handleSubmit = () => {
    upsert.mutate(
      {
        ...(lead ? { id: lead.id } : {}),
        lead_nome: form.lead_nome,
        status_prospeccao: form.status_prospeccao,
        proxima_acao: isFinal ? (form.proxima_acao || "—") : form.proxima_acao,
        data_proxima_acao: isFinal ? (form.data_proxima_acao || new Date().toISOString().split("T")[0]) : form.data_proxima_acao,
        responsavel_id: form.responsavel_id,
        segmento: form.segmento || null,
        origem: form.origem || null,
        volume_estimado: form.volume_estimado ? parseInt(form.volume_estimado) : null,
        ticket_estimado: form.ticket_estimado ? parseFloat(form.ticket_estimado) : null,
        observacoes: form.observacoes || null,
        contato_nome: form.contato_nome || null,
        contato_whatsapp: form.contato_whatsapp || null,
        contato_email: form.contato_email || null,
        contato_instagram: form.contato_instagram || null,
        cidade: form.cidade || null,
        estado: form.estado || null,
      } as any,
      { onSuccess: onClose }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? "Editar Lead" : "Novo Lead"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Marca/Empresa *</Label>
              <Input value={form.lead_nome} onChange={(e) => setForm({ ...form, lead_nome: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Responsável *</Label>
              <Select value={form.responsavel_id} onValueChange={(v) => setForm({ ...form, responsavel_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status_prospeccao} onValueChange={(v) => setForm({ ...form, status_prospeccao: v as StatusProspeccao })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_PROSPECCAO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Segmento</Label>
              <Select value={form.segmento} onValueChange={(v) => setForm({ ...form, segmento: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SEGMENTO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Origem</Label>
              <Select value={form.origem} onValueChange={(v) => setForm({ ...form, origem: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ORIGEM_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isFinal && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Próxima Ação *</Label>
                <Input value={form.proxima_acao} onChange={(e) => setForm({ ...form, proxima_acao: e.target.value })} placeholder="Ex: Enviar apresentação institucional" />
              </div>
              <div className="space-y-1.5">
                <Label>Data Próxima Ação *</Label>
                <Input type="date" value={form.data_proxima_acao} onChange={(e) => setForm({ ...form, data_proxima_acao: e.target.value })} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Volume Estimado</Label>
              <Input type="number" value={form.volume_estimado} onChange={(e) => setForm({ ...form, volume_estimado: e.target.value })} placeholder="Peças" />
            </div>
            <div className="space-y-1.5">
              <Label>Ticket Estimado (R$)</Label>
              <Input type="number" step="0.01" value={form.ticket_estimado} onChange={(e) => setForm({ ...form, ticket_estimado: e.target.value })} />
            </div>
          </div>

          <p className="text-sm font-medium text-muted-foreground pt-1">Contato</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nome do Contato</Label>
              <Input value={form.contato_nome} onChange={(e) => setForm({ ...form, contato_nome: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp</Label>
              <Input value={form.contato_whatsapp} onChange={(e) => setForm({ ...form, contato_whatsapp: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" value={form.contato_email} onChange={(e) => setForm({ ...form, contato_email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Instagram</Label>
              <Input value={form.contato_instagram} onChange={(e) => setForm({ ...form, contato_instagram: e.target.value })} placeholder="@perfil" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Input value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} placeholder="Ex: SP" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={3} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!canSubmit || upsert.isPending}>
              {upsert.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {lead ? "Salvar" : "Criar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
