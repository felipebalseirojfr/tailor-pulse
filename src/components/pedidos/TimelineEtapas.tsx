import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Etapa {
  id: string;
  tipo_etapa: string;
  status: string;
  ordem: number;
  data_inicio?: string;
  data_termino?: string;
  data_inicio_prevista?: string;
  data_termino_prevista?: string;
  observacoes?: string;
}

interface TimelineEtapasProps {
  etapas: Etapa[];
  statusGeral: string;
  isTV?: boolean;
}

export function TimelineEtapas({ etapas, statusGeral, isTV = false }: TimelineEtapasProps) {
  const etapasOrdenadas = [...etapas].sort((a, b) => a.ordem - b.ordem);

  const getEtapaStatus = (etapa: Etapa) => {
    if (statusGeral === "concluido") return "concluido";
    return etapa.status;
  };

  const isEtapaAtrasada = (etapa: Etapa) => {
    if (etapa.status === "concluido" || !etapa.data_termino_prevista) {
      return false;
    }
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const dataTerminoPrevista = new Date(etapa.data_termino_prevista);
    dataTerminoPrevista.setHours(0, 0, 0, 0);
    
    return dataTerminoPrevista < hoje;
  };

  const getEtapaColor = (status: string, atrasada: boolean) => {
    if (atrasada) return "bg-destructive ring-destructive/20";
    
    switch (status) {
      case "concluido":
        return "bg-success ring-success/20";
      case "em_andamento":
        return "bg-primary ring-primary/30 animate-pulse";
      case "pendente":
        return "bg-muted-foreground/20 ring-muted-foreground/10";
      default:
        return "bg-muted-foreground/20 ring-muted-foreground/10";
    }
  };

  const getLinhaColor = (etapa: Etapa) => {
    if (etapa.status === "concluido") return "bg-success/40";
    return "bg-muted-foreground/20";
  };

  const getEtapaLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      pilotagem: "Pilotagem",
      liberacao_corte: "Liberação",
      corte: "Corte",
      lavanderia: "Lavanderia",
      costura: "Costura",
      caseado: "Caseado",
      estamparia_bordado: "Estamparia",
      estamparia: "Estamparia",
      bordado: "Bordado",
      acabamento: "Acabamento",
      entrega: "Entrega",
    };
    return labels[tipo] || tipo;
  };

  const formatDate = (date?: string) => {
    if (!date) return "Não definida";
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  };

  const getTooltipContent = (etapa: Etapa, atrasada: boolean) => {
    const status = getEtapaStatus(etapa);
    return (
      <div className="space-y-1 text-xs">
        <p className="font-bold">{getEtapaLabel(etapa.tipo_etapa)}</p>
        <p>Status: {status === "concluido" ? "Concluída" : status === "em_andamento" ? "Em andamento" : "Pendente"}</p>
        {etapa.data_inicio_prevista && (
          <p>Início previsto: {formatDate(etapa.data_inicio_prevista)}</p>
        )}
        {etapa.data_termino_prevista && (
          <p>Fim previsto: {formatDate(etapa.data_termino_prevista)}</p>
        )}
        {etapa.data_inicio && (
          <p>Iniciada em: {formatDate(etapa.data_inicio)}</p>
        )}
        {etapa.data_termino && (
          <p>Concluída em: {formatDate(etapa.data_termino)}</p>
        )}
        {atrasada && (
          <p className="text-destructive font-bold">⚠️ ATRASADA</p>
        )}
        {etapa.observacoes && (
          <p className="text-muted-foreground italic">Obs: {etapa.observacoes}</p>
        )}
      </div>
    );
  };

  const dotSize = isTV ? "h-4 w-4" : "h-2.5 w-2.5";
  const lineWidth = isTV ? "w-12" : "w-8";
  const ringSize = isTV ? "ring-[3px]" : "ring-2";

  return (
    <TooltipProvider>
      <div className="relative flex items-center justify-start gap-0 overflow-x-auto scrollbar-hide py-1">
        {etapasOrdenadas.map((etapa, index) => {
          const atrasada = isEtapaAtrasada(etapa);
          const status = getEtapaStatus(etapa);
          const isAtual = etapa.status === "em_andamento";
          
          return (
            <div key={etapa.id} className="flex items-center flex-shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative flex flex-col items-center gap-1">
                    <div
                      className={`${dotSize} rounded-full transition-all duration-300 ${getEtapaColor(
                        status,
                        atrasada
                      )} ${
                        isAtual ? `${ringSize} ring ring-offset-1` : ""
                      } cursor-pointer shadow-sm`}
                    />
                    {isTV && (
                      <span className={`text-xs text-center whitespace-nowrap ${
                        isAtual ? "text-foreground font-medium" : "text-muted-foreground"
                      }`}>
                        {getEtapaLabel(etapa.tipo_etapa).substring(0, 9)}
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs bg-popover/95 backdrop-blur-sm">
                  {getTooltipContent(etapa, atrasada)}
                </TooltipContent>
              </Tooltip>
              
              {index < etapasOrdenadas.length - 1 && (
                <div
                  className={`h-[2px] ${lineWidth} ${getLinhaColor(etapa)} transition-all duration-300 rounded-full`}
                />
              )}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
