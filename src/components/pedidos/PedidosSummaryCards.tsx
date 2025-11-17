import { Card, CardContent } from "@/components/ui/card";
import { Package, Clock, CheckCircle2, AlertCircle, PlayCircle } from "lucide-react";

interface SummaryCardsProps {
  total: number;
  aguardandoInicio: number;
  emProducao: number;
  concluidos: number;
  atrasados: number;
  onFilterClick: (filter: string) => void;
  activeFilter: string;
}

export function PedidosSummaryCards({
  total,
  aguardandoInicio,
  emProducao,
  concluidos,
  atrasados,
  onFilterClick,
  activeFilter,
}: SummaryCardsProps) {
  const cards = [
    {
      title: "Total de Pedidos",
      value: total,
      icon: Package,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
      filter: "todos",
    },
    {
      title: "Aguardando Início",
      value: aguardandoInicio,
      icon: PlayCircle,
      color: "text-muted-foreground",
      bgColor: "bg-muted/50",
      filter: "aguardando_inicio",
    },
    {
      title: "Em Produção",
      value: emProducao,
      icon: Clock,
      color: "text-info",
      bgColor: "bg-info/10",
      filter: "em_producao",
    },
    {
      title: "Concluídos",
      value: concluidos,
      icon: CheckCircle2,
      color: "text-success",
      bgColor: "bg-success/10",
      filter: "concluido",
    },
    {
      title: "Atrasados",
      value: atrasados,
      icon: AlertCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      filter: "atrasado",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeFilter === card.filter;
        
        return (
          <Card
            key={card.filter}
            className={`cursor-pointer transition-all hover:shadow-md ${
              isActive ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => onFilterClick(card.filter)}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </p>
                  <p className="text-3xl font-bold mt-2">{card.value}</p>
                </div>
                <div className={`${card.bgColor} p-3 rounded-lg`}>
                  <Icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
