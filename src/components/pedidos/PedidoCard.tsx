import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Clock, AlertCircle, AlertTriangle } from "lucide-react";
import { TimelineEtapas } from "./TimelineEtapas";
import { differenceInDays, format } from "date-fns";
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

interface PedidoCardProps {
  pedido: {
    id: string;
    produto_modelo: string;
    tipo_peca: string;
    quantidade_total: number;
    progresso_percentual: number;
    prazo_final: string;
    data_inicio: string;
    status_geral: string;
    prioridade: string;
    clientes: {
      nome: string;
    };
    etapas_producao: Etapa[];
  };
  onViewDetails: () => void;
  onAdvanceStage: () => void;
  isTV?: boolean;
}

export function PedidoCard({ pedido, onViewDetails, onAdvanceStage, isTV = false }: PedidoCardProps) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const prazoFinal = new Date(pedido.prazo_final);
  const diasRestantes = differenceInDays(prazoFinal, hoje);
  const atrasado = diasRestantes < 0 && pedido.status_geral !== "concluido";

  const temEtapaEmAtraso = pedido.etapas_producao?.some((etapa) => {
    if (etapa.status === "concluido" || !etapa.data_termino_prevista) return false;
    const dataTerminoPrevista = new Date(etapa.data_termino_prevista);
    dataTerminoPrevista.setHours(0, 0, 0, 0);
    return dataTerminoPrevista < hoje;
  }) || false;

  // Etapa em risco = prazo da etapa em 1 ou 2 dias
  const temEtapaEmRisco = !temEtapaEmAtraso && (pedido.etapas_producao?.some((etapa) => {
    if (etapa.status === "concluido" || !etapa.data_termino_prevista) return false;
    const dataTerminoPrevista = new Date(etapa.data_termino_prevista);
    dataTerminoPrevista.setHours(0, 0, 0, 0);
    const diasParaEtapa = differenceInDays(dataTerminoPrevista, hoje);
    return diasParaEtapa >= 0 && diasParaEtapa <= 2;
  }) || false);

  const getBorderColor = () => {
    if (pedido.status_geral === "concluido") return "border-l-success";
    if (atrasado || temEtapaEmAtraso) return "border-l-destructive";
    if (temEtapaEmRisco) return "border-l-warning";
    return "border-l-primary";
  };

  const getStatusConfig = () => {
    if (pedido.status_geral === "aguardando_inicio") {
      return {
        label: "Aguardando Início",
        color: "bg-muted/50 text-muted-foreground border-muted",
        dot: "bg-muted-foreground"
      };
    }
    if (pedido.status_geral === "concluido") {
      return {
        label: "Concluído",
        color: "bg-success/10 text-success border-success/20",
        dot: "bg-success"
      };
    }
    if (atrasado) {
      return {
        label: `Atrasado ${Math.abs(diasRestantes)}d`,
        color: "bg-destructive/10 text-destructive border-destructive/20",
        dot: "bg-destructive"
      };
    }
    if (diasRestantes === 0) {
      return {
        label: "Entrega Hoje",
        color: "bg-warning/10 text-warning border-warning/20",
        dot: "bg-warning"
      };
    }
    if (diasRestantes <= 3) {
      return {
        label: `${diasRestantes}d restantes`,
        color: "bg-warning/10 text-warning border-warning/20",
        dot: "bg-warning"
      };
    }
    return {
      label: "Em Produção",
      color: "bg-primary/10 text-primary border-primary/20",
      dot: "bg-primary"
    };
  };

  const etapaAtual = pedido.etapas_producao?.find((e) => e.status === "em_andamento");
  const statusConfig = getStatusConfig();

  const getEtapaLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      pilotagem: "Pilotagem",
      compra_de_insumos: "Compra de Insumos",
      liberacao_corte: "Liberação de Corte",
      corte: "Corte",
      lavanderia: "Lavanderia",
      costura: "Costura",
      caseado: "Caseado",
      estamparia_bordado: "Estamparia/Bordado",
      estamparia: "Estamparia",
      bordado: "Bordado",
      acabamento: "Acabamento",
      entrega: "Entrega",
    };
    return labels[tipo] || tipo;
  };

  return (
    <Card
      className={`bg-card border-l-4 ${getBorderColor()} transition-all duration-200 ease-out hover:shadow-xl hover:scale-[1.03] cursor-pointer animate-fade-in rounded-xl`}
      onClick={onViewDetails}
    >
      <CardHeader className={`${isTV ? 'pb-2 px-4 pt-4' : 'pb-4 px-5 pt-5'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-0.5">
            <h3 className={`font-bold text-foreground leading-tight ${isTV ? 'text-lg' : 'text-base'}`}>
              {pedido.produto_modelo}
            </h3>
            <p className={`text-muted-foreground font-medium ${isTV ? 'text-sm' : 'text-sm'}`}>
              {pedido.clientes?.nome}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-mono text-muted-foreground ${isTV ? 'text-xs' : 'text-xs'}`}>
                #{pedido.id.slice(0, 8)}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className={`text-muted-foreground ${isTV ? 'text-xs' : 'text-xs'}`}>
                {pedido.tipo_peca}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <Badge className={`${statusConfig.color} border ${isTV ? 'text-xs px-2 py-0.5' : 'text-xs'}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${statusConfig.dot} mr-1.5`} />
              {statusConfig.label}
            </Badge>

            {/* Badge de etapa atrasada */}
            {temEtapaEmAtraso && !atrasado && (
              <div className="flex items-center gap-1 text-destructive">
                <AlertCircle className="h-3 w-3" />
                <span className={`font-medium ${isTV ? 'text-xs' : 'text-xs'}`}>
                  Etapa atrasada
                </span>
              </div>
            )}

            {/* Badge de etapa em risco */}
            {temEtapaEmRisco && (
              <div className="flex items-center gap-1 text-warning">
                <AlertTriangle className="h-3 w-3" />
                <span className={`font-medium ${isTV ? 'text-xs' : 'text-xs'}`}>
                  Etapa em risco
                </span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className={`${isTV ? 'space-y-3 px-4 pb-4' : 'space-y-4 px-5 pb-5'}`}>
        <div className={`${isTV ? 'py-1' : 'py-2'}`}>
          <TimelineEtapas
            etapas={pedido.etapas_producao || []}
            statusGeral={pedido.status_geral}
            isTV={isTV}
          />
        </div>

        <div className={`${isTV ? 'pt-3' : 'pt-4'} border-t border-border/50`}>
          <div className="flex items-start justify-between gap-3">
            <div className={`flex flex-col ${isTV ? 'gap-2' : 'gap-2.5'} flex-1 min-w-0`}>
              <div className="flex items-center gap-2">
                <div className={`flex items-center justify-center ${isTV ? 'w-4 h-4' : 'w-5 h-5'} rounded-full bg-muted/50`}>
                  <Clock className={`${isTV ? 'h-2.5 w-2.5' : 'h-3 w-3'} text-muted-foreground`} />
                </div>
                <div className="flex flex-col">
                  <span className={`text-muted-foreground ${isTV ? 'text-[10px]' : 'text-[10px]'} uppercase tracking-wide font-medium`}>
                    Previsto:
                  </span>
                  <span className={`text-foreground font-semibold ${isTV ? 'text-sm' : 'text-sm'}`}>
                    {format(new Date(pedido.prazo_final), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
              </div>

              {etapaAtual && (
                <div className="flex items-center gap-2">
                  <div className={`flex items-center justify-center ${isTV ? 'w-4 h-4' : 'w-5 h-5'} rounded-full bg-primary/10`}>
                    <div className={`${isTV ? 'w-1.5 h-1.5' : 'w-2 h-2'} rounded-full bg-primary animate-pulse`} />
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-muted-foreground ${isTV ? 'text-[10px]' : 'text-[10px]'} uppercase tracking-wide font-medium`}>
                      Etapa:
                    </span>
                    <span className={`text-foreground font-semibold ${isTV ? 'text-sm' : 'text-sm'} truncate`}>
                      {getEtapaLabel(etapaAtual.tipo_etapa)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {!isTV && (
              <Button
                size="icon"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails();
                }}
                title="Ver detalhes"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
