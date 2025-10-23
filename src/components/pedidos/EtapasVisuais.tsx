interface EtapasVisuaisProps {
  etapas: Array<{
    tipo_etapa: string;
    status: string;
    ordem: number;
    data_termino_prevista?: string;
  }>;
  statusGeral: string;
}

export function EtapasVisuais({ etapas, statusGeral }: EtapasVisuaisProps) {
  const etapasOrdenadas = [...etapas].sort((a, b) => a.ordem - b.ordem);
  
  const getEtapaStatus = (etapa: typeof etapasOrdenadas[0]) => {
    if (statusGeral === "concluido") return "concluido";
    return etapa.status;
  };

  const isEtapaAtrasada = (etapa: typeof etapasOrdenadas[0]) => {
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
    if (atrasada) return "bg-destructive";
    
    switch (status) {
      case "concluido":
        return "bg-success";
      case "em_andamento":
        return "bg-primary";
      case "pendente":
        return "bg-muted";
      default:
        return "bg-muted";
    }
  };

  return (
    <div className="flex items-center gap-1">
      {etapasOrdenadas.map((etapa, index) => {
        const atrasada = isEtapaAtrasada(etapa);
        const status = getEtapaStatus(etapa);
        
        return (
          <div key={etapa.tipo_etapa} className="flex items-center">
            <div
              className={`h-2 w-2 rounded-full transition-all ${getEtapaColor(
                status,
                atrasada
              )} ${
                etapa.status === "em_andamento" ? "ring-2 ring-primary ring-offset-2" : ""
              } ${
                atrasada && etapa.status !== "em_andamento" ? "ring-2 ring-destructive ring-offset-2" : ""
              }`}
              title={`${etapa.tipo_etapa.replace(/_/g, " ")}${atrasada ? " (ATRASADA)" : ""}`}
            />
            {index < etapasOrdenadas.length - 1 && (
              <div
                className={`h-0.5 w-3 ${
                  etapa.status === "concluido" ? "bg-success" : "bg-muted"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
