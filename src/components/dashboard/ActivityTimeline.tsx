import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { AtividadeRecente } from "@/hooks/useDashboardData";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ActivityTimelineProps {
  atividades: AtividadeRecente[];
}

export const ActivityTimeline = ({ atividades }: ActivityTimelineProps) => {
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pendente: "aguardando",
      em_andamento: "em andamento",
      concluido: "concluído",
      pausado: "pausado",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pendente: "bg-gray-500",
      em_andamento: "bg-blue-500",
      concluido: "bg-green-500",
      pausado: "bg-orange-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const getEtapaLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      pilotagem: "Pilotagem",
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

  const formatTempo = (data: string) => {
    try {
      return formatDistanceToNow(new Date(data), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return "recentemente";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Últimas Movimentações
        </CardTitle>
      </CardHeader>
      <CardContent>
        {atividades.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>Nenhuma atividade recente.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {atividades.map((atividade, index) => (
              <div key={atividade.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-2 w-2 rounded-full ${getStatusColor(
                      atividade.status
                    )}`}
                  />
                  {index < atividades.length - 1 && (
                    <div className="w-px h-full bg-border mt-1" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <Link
                    to={`/pedidos/${atividade.pedido_id}`}
                    className="hover:underline"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {atividade.produto_modelo}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getEtapaLabel(atividade.tipo_etapa)} -{" "}
                          <Badge
                            variant="secondary"
                            className={`text-xs ${getStatusColor(
                              atividade.status
                            )} text-white`}
                          >
                            {getStatusLabel(atividade.status)}
                          </Badge>
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTempo(atividade.updated_at)}
                      </span>
                    </div>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
