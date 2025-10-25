import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, QrCode, ChevronRight, AlertCircle, Clock } from "lucide-react";
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

  const getStatusColor = () => {
    if (pedido.status_geral === "concluido") return "bg-success/10 border-success/30";
    if (atrasado || temEtapaEmAtraso) return "bg-destructive/10 border-destructive/30";
    return "bg-warning/10 border-warning/30";
  };

  const getStatusBadge = () => {
    if (pedido.status_geral === "concluido") {
      return <Badge className="bg-success text-success-foreground">🟢 Concluído</Badge>;
    }
    if (atrasado) {
      return <Badge variant="destructive">🔴 Atrasado {Math.abs(diasRestantes)}d</Badge>;
    }
    if (diasRestantes === 0) {
      return <Badge className="bg-warning text-warning-foreground">🟡 Hoje</Badge>;
    }
    if (diasRestantes <= 3) {
      return <Badge className="bg-warning text-warning-foreground">🟡 {diasRestantes}d restantes</Badge>;
    }
    return <Badge className="bg-primary/10 text-primary border-primary/20">🔵 Em Produção</Badge>;
  };

  const etapaAtual = pedido.etapas_producao?.find((e) => e.status === "em_andamento");

  return (
    <Card 
      className={`${getStatusColor()} border-2 transition-all hover:shadow-lg ${isTV ? 'p-6' : ''} animate-fade-in`}
      onClick={onViewDetails}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className={`font-bold truncate ${isTV ? 'text-2xl' : 'text-lg'}`}>
              {pedido.produto_modelo}
            </h3>
            <p className={`text-muted-foreground truncate ${isTV ? 'text-lg' : 'text-sm'}`}>
              {pedido.clientes?.nome}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="font-mono text-xs">
                #{pedido.id.slice(0, 8)}
              </Badge>
              <span className={`text-muted-foreground ${isTV ? 'text-base' : 'text-xs'}`}>
                {pedido.tipo_peca}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {getStatusBadge()}
            {temEtapaEmAtraso && (
              <div className="flex items-center gap-1 text-destructive">
                <AlertCircle className={`${isTV ? 'h-5 w-5' : 'h-3 w-3'}`} />
                <span className={`${isTV ? 'text-sm' : 'text-xs'}`}>Etapas atrasadas</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Timeline de Etapas */}
        <TimelineEtapas 
          etapas={pedido.etapas_producao || []} 
          statusGeral={pedido.status_geral}
          isTV={isTV}
        />

        {/* Informações do rodapé */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className={`${isTV ? 'h-5 w-5' : 'h-4 w-4'}`} />
              <span className={`${isTV ? 'text-base' : 'text-sm'}`}>
                {format(new Date(pedido.prazo_final), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>
            {etapaAtual && (
              <Badge variant="outline" className={isTV ? 'text-base py-1' : ''}>
                {etapaAtual.tipo_etapa.replace(/_/g, " ")}
              </Badge>
            )}
          </div>
          
          {!isTV && (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                size="icon"
                variant="ghost"
                onClick={onViewDetails}
                title="Ver detalhes"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                onClick={onAdvanceStage}
                title="Avançar etapa"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
