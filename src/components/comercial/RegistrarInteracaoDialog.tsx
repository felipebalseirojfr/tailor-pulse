import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddInteracao } from "@/hooks/useComercialData";
import { Loader2 } from "lucide-react";

interface AcaoItem {
  type: "negociacao" | "lead";
  id: string;
  nome: string;
}

interface Props {
  item: AcaoItem;
  open: boolean;
  onClose: () => void;
}

const TIPOS_INTERACAO = [
  { value: "nota", label: "Nota" },
  { value: "ligacao", label: "Ligação" },
  { value: "email", label: "E-mail" },
  { value: "reuniao", label: "Reunião" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "outro", label: "Outro" },
];

export default function RegistrarInteracaoDialog({ item, open, onClose }: Props) {
  const [tipo, setTipo] = useState("nota");
  const [resumo, setResumo] = useState("");
  const addInteracao = useAddInteracao();

  const canSubmit = resumo.trim();

  const handleSubmit = () => {
    addInteracao.mutate(
      {
        tipo,
        resumo: resumo.trim(),
        ...(item.type === "negociacao" ? { negociacao_id: item.id } : { lead_id: item.id }),
      },
      {
        onSuccess: () => {
          setResumo("");
          setTipo("nota");
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Interação — {item.nome}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS_INTERACAO.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Resumo *</Label>
            <Textarea value={resumo} onChange={(e) => setResumo(e.target.value)} rows={4} placeholder="Descreva o que aconteceu..." />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!canSubmit || addInteracao.isPending}>
              {addInteracao.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Registrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
