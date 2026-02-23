import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpsertNegociacao, useUpsertLead, useAddInteracao } from "@/hooks/useComercialData";
import { Loader2 } from "lucide-react";

interface AcaoItem {
  type: "negociacao" | "lead";
  id: string;
  nome: string;
  proxima_acao: string;
}

interface Props {
  item: AcaoItem;
  open: boolean;
  onClose: () => void;
}

export default function ConcluirAcaoDialog({ item, open, onClose }: Props) {
  const [novaAcao, setNovaAcao] = useState("");
  const [novaData, setNovaData] = useState("");
  const [notas, setNotas] = useState("");
  const upsertNeg = useUpsertNegociacao();
  const upsertLead = useUpsertLead();
  const addInteracao = useAddInteracao();

  const isPending = upsertNeg.isPending || upsertLead.isPending || addInteracao.isPending;
  const canSubmit = novaAcao.trim() && novaData;

  const handleSubmit = async () => {
    // Register completion as interaction
    const interacaoParams = {
      tipo: "acao_concluida",
      resumo: `Ação concluída: "${item.proxima_acao}"${notas ? ` — ${notas}` : ""}`,
      ...(item.type === "negociacao" ? { negociacao_id: item.id } : { lead_id: item.id }),
    };
    addInteracao.mutate(interacaoParams);

    // Update with new action
    if (item.type === "negociacao") {
      upsertNeg.mutate(
        { id: item.id, proxima_acao: novaAcao, data_proxima_acao: novaData, data_ultima_interacao: new Date().toISOString().split("T")[0] } as any,
        { onSuccess: onClose }
      );
    } else {
      upsertLead.mutate(
        { id: item.id, proxima_acao: novaAcao, data_proxima_acao: novaData } as any,
        { onSuccess: onClose }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Concluir Ação</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{item.nome}</span>
            <br />
            Ação atual: "{item.proxima_acao}"
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Notas sobre a conclusão</Label>
            <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} placeholder="O que foi feito? (opcional)" />
          </div>
          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground mb-3">Defina a próxima ação *</p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Próxima Ação *</Label>
                <Input value={novaAcao} onChange={(e) => setNovaAcao(e.target.value)} placeholder="Ex: Agendar reunião de follow-up" />
              </div>
              <div className="space-y-1.5">
                <Label>Data Próxima Ação *</Label>
                <Input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!canSubmit || isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Concluir e Definir Próxima
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
