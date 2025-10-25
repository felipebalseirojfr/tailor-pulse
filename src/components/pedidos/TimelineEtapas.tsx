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
    if (atrasada) return "bg-destructive border-destructive";
    
    switch (status) {
      case "concluido":
        return "bg-success border-success";
      case "em_andamento":
        return "bg-primary border-primary animate-pulse";
      case "pendente":
        return "bg-muted border-muted-foreground/30";
      default:
        return "bg-muted border-muted-foreground/30";
    }
  };

  const getLinhaColor = (etapa: Etapa) => {
    if (etapa.status === "concluido") return "bg-success";
    return "bg-muted";
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

  const dotSize = isTV ? "h-5 w-5" : "h-3 w-3";
  const lineWidth = isTV ? "w-8" : "w-6";
  const ringSize = isTV ? "ring-4" : "ring-2";

  return (
    <TooltipProvider>
      <div className="flex items-center justify-start gap-0 overflow-x-auto pb-2">
        {etapasOrdenadas.map((etapa, index) => {
          const atrasada = isEtapaAtrasada(etapa);
          const status = getEtapaStatus(etapa);
          
          return (
            <div key={etapa.id} className="flex items-center flex-shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative flex flex-col items-center">
                    <div
                      className={`${dotSize} rounded-full border-2 transition-all ${getEtapaColor(
                        status,
                        atrasada
                      )} ${
                        etapa.status === "em_andamento" ? `${ringSize} ring-primary ring-offset-2` : ""
                      } ${
                        atrasada && etapa.status !== "concluido" ? `${ringSize} ring-destructive ring-offset-2` : ""
                      } cursor-pointer`}
                    />
                    {isTV && (
                      <span className="text-xs mt-1 text-center whitespace-nowrap">
                        {getEtapaLabel(etapa.tipo_etapa).substring(0, 8)}
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  {getTooltipContent(etapa, atrasada)}
                </TooltipContent>
              </Tooltip>
              
              {index < etapasOrdenadas.length - 1 && (
                <div
                  className={`h-0.5 ${lineWidth} ${getLinhaColor(etapa)} transition-all`}
                />
              )}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
