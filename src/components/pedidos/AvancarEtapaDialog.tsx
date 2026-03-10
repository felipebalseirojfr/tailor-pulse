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
import { Label } from "@/components/ui/label";

interface AvancarEtapaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  etapaAtualNome: string;
  proximaEtapaNome: string;
  isConcluindo: boolean; // true when concluding last stage (no next stage)
  loading: boolean;
  onConfirm: (dataInicio: Date, dataTerminoPrevista: Date) => void;
}

export function AvancarEtapaDialog({
  open,
  onOpenChange,
  etapaAtualNome,
  proximaEtapaNome,
  isConcluindo,
  loading,
  onConfirm,
}: AvancarEtapaDialogProps) {
  const [dataInicio, setDataInicio] = useState<Date>(new Date());
  const [dataTerminoPrevista, setDataTerminoPrevista] = useState<Date | undefined>();

  const handleConfirm = () => {
    if (!dataTerminoPrevista) return;
    onConfirm(dataInicio, dataTerminoPrevista);
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setDataInicio(new Date());
      setDataTerminoPrevista(undefined);
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
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataInicio && "text-muted-foreground"
                    )}
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
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataTerminoPrevista && "text-muted-foreground"
                    )}
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
