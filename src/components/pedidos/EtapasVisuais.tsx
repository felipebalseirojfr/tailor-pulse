interface EtapasVisuaisProps {
  etapas: Array<{
    tipo_etapa: string;
    status: string;
    ordem: number;
  }>;
  statusGeral: string;
}

export function EtapasVisuais({ etapas, statusGeral }: EtapasVisuaisProps) {
  const etapasOrdenadas = [...etapas].sort((a, b) => a.ordem - b.ordem);
  
  const getEtapaStatus = (etapa: typeof etapasOrdenadas[0]) => {
    if (statusGeral === "concluido") return "concluido";
    return etapa.status;
  };

  const getEtapaColor = (status: string) => {
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
      {etapasOrdenadas.map((etapa, index) => (
        <div key={etapa.tipo_etapa} className="flex items-center">
          <div
            className={`h-2 w-2 rounded-full transition-all ${getEtapaColor(
              getEtapaStatus(etapa)
            )} ${
              etapa.status === "em_andamento" ? "ring-2 ring-primary ring-offset-2" : ""
            }`}
            title={etapa.tipo_etapa.replace(/_/g, " ")}
          />
          {index < etapasOrdenadas.length - 1 && (
            <div
              className={`h-0.5 w-3 ${
                etapa.status === "concluido" ? "bg-success" : "bg-muted"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
