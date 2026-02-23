import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQualifyLead } from "@/hooks/useComercialData";
import { type Lead } from "@/types/comercial";
import { Loader2, ArrowUpRight } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  lead: Lead;
}

export default function QualifyLeadDialog({ open, onClose, lead }: Props) {
  const [proximaAcao, setProximaAcao] = useState("Agendar reunião de apresentação");
  const [dataProximaAcao, setDataProximaAcao] = useState("");
  const qualify = useQualifyLead();

  const canSubmit = proximaAcao.trim() && dataProximaAcao;

  const handleSubmit = () => {
    qualify.mutate(
      { lead, proxima_acao: proximaAcao, data_proxima_acao: dataProximaAcao },
      { onSuccess: onClose }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-primary" />
            Qualificar Lead
          </DialogTitle>
          <DialogDescription>
            O lead <span className="font-medium text-foreground">"{lead.lead_nome}"</span> será movido para o Pipeline como negociação.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Defina a primeira ação para esta negociação no pipeline:
          </p>
          <div className="space-y-1.5">
            <Label>Próxima Ação *</Label>
            <Input value={proximaAcao} onChange={(e) => setProximaAcao(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Data Próxima Ação *</Label>
            <Input type="date" value={dataProximaAcao} onChange={(e) => setDataProximaAcao(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!canSubmit || qualify.isPending}>
              {qualify.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Qualificar e Mover para Pipeline
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
