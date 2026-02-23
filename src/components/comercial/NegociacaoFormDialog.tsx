import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpsertNegociacao, useProfiles } from "@/hooks/useComercialData";
import {
  STATUS_PIPELINE_LABELS,
  STATUS_PIPELINE_ORDER,
  PRIORIDADE_LABELS,
  SEGMENTO_LABELS,
  ORIGEM_LABELS,
  TEMPERATURA_LABELS,
  BLOQUEADO_POR_LABELS,
  FINALIZED_PIPELINE_STATUSES,
  type Negociacao,
  type StatusPipeline,
  type PrioridadeComercial,
} from "@/types/comercial";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  negociacao?: Negociacao | null;
}

export default function NegociacaoFormDialog({ open, onClose, negociacao }: Props) {
  const { data: profiles = [] } = useProfiles();
  const upsert = useUpsertNegociacao();

  const [form, setForm] = useState({
    marca_nome: "",
    status_pipeline: "lead_qualificado" as StatusPipeline,
    prioridade: "media" as PrioridadeComercial,
    proxima_acao: "",
    data_proxima_acao: "",
    responsavel_id: "",
    segmento: "",
    origem: "",
    volume_estimado_mes: "",
    ticket_estimado_mes: "",
    temperatura: "",
    bloqueado_por: "",
    previsao_fechamento: "",
    observacoes: "",
  });

  useEffect(() => {
    if (!open) return;
    if (negociacao) {
      setForm({
        marca_nome: negociacao.marca_nome,
        status_pipeline: negociacao.status_pipeline,
        prioridade: negociacao.prioridade,
        proxima_acao: negociacao.proxima_acao,
        data_proxima_acao: negociacao.data_proxima_acao,
        responsavel_id: negociacao.responsavel_id,
        segmento: negociacao.segmento || "",
        origem: negociacao.origem || "",
        volume_estimado_mes: negociacao.volume_estimado_mes?.toString() || "",
        ticket_estimado_mes: negociacao.ticket_estimado_mes?.toString() || "",
        temperatura: negociacao.temperatura || "",
        bloqueado_por: negociacao.bloqueado_por || "",
        previsao_fechamento: negociacao.previsao_fechamento || "",
        observacoes: negociacao.observacoes || "",
      });
    } else {
      setForm({
        marca_nome: "",
        status_pipeline: "lead_qualificado",
        prioridade: "media",
        proxima_acao: "",
        data_proxima_acao: "",
        responsavel_id: profiles[0]?.id || "",
        segmento: "",
        origem: "",
        volume_estimado_mes: "",
        ticket_estimado_mes: "",
        temperatura: "",
        bloqueado_por: "",
        previsao_fechamento: "",
        observacoes: "",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [negociacao, open]);

  const isFinal = FINALIZED_PIPELINE_STATUSES.includes(form.status_pipeline);

  const canSubmit =
    form.marca_nome.trim() &&
    form.responsavel_id &&
    (isFinal || (form.proxima_acao.trim() && form.data_proxima_acao));

  const handleSubmit = () => {
    // Auto-suggest for specific statuses
    let proxAcao = form.proxima_acao;
    let dataProxAcao = form.data_proxima_acao;

    if (!negociacao || negociacao.status_pipeline !== form.status_pipeline) {
      if (form.status_pipeline === "piloto_enviada" && !proxAcao) {
        proxAcao = "Cobrar retorno do cliente sobre piloto";
        const d = new Date();
        d.setDate(d.getDate() + 3);
        dataProxAcao = d.toISOString().split("T")[0];
      }
      if (form.status_pipeline === "proposta_comercial" && !proxAcao) {
        proxAcao = "Follow-up de proposta";
        const d = new Date();
        d.setDate(d.getDate() + 2);
        dataProxAcao = d.toISOString().split("T")[0];
      }
    }

    upsert.mutate(
      {
        ...(negociacao ? { id: negociacao.id } : {}),
        marca_nome: form.marca_nome,
        status_pipeline: form.status_pipeline,
        prioridade: form.prioridade,
        proxima_acao: isFinal ? (proxAcao || "—") : proxAcao,
        data_proxima_acao: isFinal ? (dataProxAcao || new Date().toISOString().split("T")[0]) : dataProxAcao,
        responsavel_id: form.responsavel_id,
        segmento: form.segmento || null,
        origem: form.origem || null,
        volume_estimado_mes: form.volume_estimado_mes ? parseInt(form.volume_estimado_mes) : null,
        ticket_estimado_mes: form.ticket_estimado_mes ? parseFloat(form.ticket_estimado_mes) : null,
        temperatura: form.temperatura || null,
        bloqueado_por: form.bloqueado_por || null,
        previsao_fechamento: form.previsao_fechamento || null,
        observacoes: form.observacoes || null,
      } as any,
      { onSuccess: onClose }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{negociacao ? "Editar Negociação" : "Nova Negociação"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Marca/Empresa *</Label>
              <Input value={form.marca_nome} onChange={(e) => setForm({ ...form, marca_nome: e.target.value })} />
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
              <Label>Status Pipeline</Label>
              <Select value={form.status_pipeline} onValueChange={(v) => setForm({ ...form, status_pipeline: v as StatusPipeline })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_PIPELINE_ORDER.map((s) => <SelectItem key={s} value={s}>{STATUS_PIPELINE_LABELS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={form.prioridade} onValueChange={(v) => setForm({ ...form, prioridade: v as PrioridadeComercial })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORIDADE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Temperatura</Label>
              <Select value={form.temperatura} onValueChange={(v) => setForm({ ...form, temperatura: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TEMPERATURA_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isFinal && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Próxima Ação *</Label>
                <Input value={form.proxima_acao} onChange={(e) => setForm({ ...form, proxima_acao: e.target.value })} placeholder="Ex: Enviar proposta comercial" />
              </div>
              <div className="space-y-1.5">
                <Label>Data Próxima Ação *</Label>
                <Input type="date" value={form.data_proxima_acao} onChange={(e) => setForm({ ...form, data_proxima_acao: e.target.value })} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
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
            <div className="space-y-1.5">
              <Label>Bloqueado Por</Label>
              <Select value={form.bloqueado_por} onValueChange={(v) => setForm({ ...form, bloqueado_por: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(BLOQUEADO_POR_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Volume Estimado/Mês</Label>
              <Input type="number" value={form.volume_estimado_mes} onChange={(e) => setForm({ ...form, volume_estimado_mes: e.target.value })} placeholder="Peças" />
            </div>
            <div className="space-y-1.5">
              <Label>Ticket Estimado/Mês (R$)</Label>
              <Input type="number" step="0.01" value={form.ticket_estimado_mes} onChange={(e) => setForm({ ...form, ticket_estimado_mes: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Previsão Fechamento</Label>
              <Input type="date" value={form.previsao_fechamento} onChange={(e) => setForm({ ...form, previsao_fechamento: e.target.value })} />
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
              {negociacao ? "Salvar" : "Criar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
