import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Clock, AlertCircle } from "lucide-react";
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
  const prazoFinal = new Date(pedido.prazo_final);
  const diasRestantes = differenceInDays(prazoFinal, hoje);
  const atrasado = diasRestantes < 0 && pedido.status_geral !== "concluido";
  
  const temEtapaEmAtraso = pedido.etapas_producao?.some((etapa) => {
    if (etapa.status === "concluido" || !etapa.data_termino_prevista) return false;
    const dataTerminoPrevista = new Date(etapa.data_termino_prevista);
    dataTerminoPrevista.setHours(0, 0, 0, 0);
    const hojeCopy = new Date();
    hojeCopy.setHours(0, 0, 0, 0);
    return dataTerminoPrevista < hojeCopy;
  }) || false;

  const getBorderColor = () => {
    if (pedido.status_geral === "concluido") return "border-l-success";
    if (atrasado || temEtapaEmAtraso) return "border-l-destructive";
    return "border-l-primary";
  };

  const getStatusConfig = () => {
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
      liberacao_corte: "Liberação de Corte",
      corte: "Corte",
      lavanderia: "Lavanderia",
      costura: "Costura",
      caseado: "Caseado",
      estamparia_bordado: "Estamparia/Bordado",
      acabamento: "Acabamento",
      entrega: "Entrega",
    };
    return labels[tipo] || tipo;
  };

  return (
    <Card 
      className={`bg-card border-l-4 ${getBorderColor()} transition-all hover:shadow-xl hover:scale-[1.02] cursor-pointer animate-fade-in ${isTV ? 'rounded-2xl' : 'rounded-xl'}`}
      onClick={onViewDetails}
    >
      <CardHeader className={`pb-4 ${isTV ? 'px-6 pt-6' : 'px-5 pt-5'}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-1">
            <h3 className={`font-bold text-foreground leading-tight ${isTV ? 'text-2xl' : 'text-base'}`}>
              {pedido.produto_modelo}
            </h3>
            <p className={`text-muted-foreground font-medium ${isTV ? 'text-lg' : 'text-sm'}`}>
              {pedido.clientes?.nome}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-mono text-muted-foreground ${isTV ? 'text-sm' : 'text-xs'}`}>
                #{pedido.id.slice(0, 8)}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className={`text-muted-foreground ${isTV ? 'text-sm' : 'text-xs'}`}>
                {pedido.tipo_peca}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <Badge className={`${statusConfig.color} border ${isTV ? 'text-sm px-3 py-1' : 'text-xs'}`}>
              <span className={`inline-block w-2 h-2 rounded-full ${statusConfig.dot} mr-2`} />
              {statusConfig.label}
            </Badge>
            {temEtapaEmAtraso && (
              <div className="flex items-center gap-1 text-destructive">
                <AlertCircle className={`${isTV ? 'h-4 w-4' : 'h-3 w-3'}`} />
                <span className={`font-medium ${isTV ? 'text-sm' : 'text-xs'}`}>
                  Etapas atrasadas
                </span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className={`space-y-4 ${isTV ? 'px-6 pb-6' : 'px-5 pb-5'}`}>
        {/* Timeline de Etapas */}
        <div className="py-2">
          <TimelineEtapas 
            etapas={pedido.etapas_producao || []} 
            statusGeral={pedido.status_geral}
            isTV={isTV}
          />
        </div>

        {/* Rodapé com informações essenciais */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className={`${isTV ? 'h-5 w-5' : 'h-4 w-4'}`} />
              <span className={`font-medium ${isTV ? 'text-base' : 'text-sm'}`}>
                Previsto: {format(new Date(pedido.prazo_final), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>
            {etapaAtual && (
              <>
                <span className="text-muted-foreground/50">|</span>
                <span className={`font-medium ${isTV ? 'text-base' : 'text-sm'}`}>
                  Etapa: <span className="text-foreground">{getEtapaLabel(etapaAtual.tipo_etapa)}</span>
                </span>
              </>
            )}
          </div>
          
          {!isTV && (
            <Button
              size="icon"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
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
      </CardContent>
    </Card>
  );
}
