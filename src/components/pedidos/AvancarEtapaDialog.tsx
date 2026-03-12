import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Terceiro {
  id: string;
  nome: string;
}

interface AvancarEtapaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  etapaAtualNome: string;
  proximaEtapaNome: string;
  isConcluindo: boolean;
  loading: boolean;
  terceirosDisponiveis?: Terceiro[]; // terceiros da próxima etapa
  terceiroAtualId?: string | null;   // terceiro já definido na próxima etapa
  onConfirm: (dataInicio: Date, dataTerminoPrevista: Date, terceiroId?: string | null) => void;
}

export function AvancarEtapaDialog({
  open,
  onOpenChange,
  etapaAtualNome,
  proximaEtapaNome,
  isConcluindo,
  loading,
  terceirosDisponiveis = [],
  terceiroAtualId,
  onConfirm,
}: AvancarEtapaDialogProps) {
  const [dataInicio, setDataInicio] = useState<Date>(new Date());
  const [dataTerminoPrevista, setDataTerminoPrevista] = useState<Date | undefined>();
  const [terceiroId, setTerceiroId] = useState<string>(terceiroAtualId || "nenhum");

  const temTerceiros = terceirosDisponiveis.length > 0;

  const handleConfirm = () => {
    if (!isConcluindo && !dataTerminoPrevista) return;
    onConfirm(
      dataInicio,
      dataTerminoPrevista || new Date(),
      temTerceiros ? (terceiroId === "nenhum" ? null : terceiroId) : undefined
    );
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setDataInicio(new Date());
      setDataTerminoPrevista(undefined);
      setTerceiroId(terceiroAtualId || "nenhum");
    }
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {isConcluindo
              ? `Concluir ${etapaAtualNome}`
              : `Iniciar ${proximaEtapaNome}`}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {isConcluindo
              ? `A etapa "${etapaAtualNome}" será marcada como concluída.`
              : `Você está iniciando a etapa de ${proximaEtapaNome}. Informe o prazo previsto para essa etapa.`}
          </DialogDescription>
        </DialogHeader>

        {!isConcluindo && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Data de início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !dataInicio && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dataInicio, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataInicio}
                    onSelect={(d) => d && setDataInicio(d)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Previsão de conclusão *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !dataTerminoPrevista && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataTerminoPrevista
                      ? format(dataTerminoPrevista, "dd/MM/yyyy", { locale: ptBR })
                      : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataTerminoPrevista}
                    onSelect={setDataTerminoPrevista}
                    disabled={(date) => date < dataInicio}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Seletor de terceiro — só aparece se houver terceiros cadastrados para a próxima etapa */}
            {temTerceiros && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Terceiro responsável por {proximaEtapaNome}
                </Label>
                <Select value={terceiroId} onValueChange={setTerceiroId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar terceiro" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">Nenhum</SelectItem>
                    {terceirosDisponiveis.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || (!isConcluindo && !dataTerminoPrevista)}
          >
            {loading ? "Processando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
