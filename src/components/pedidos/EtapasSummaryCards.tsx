import { Card, CardContent } from "@/components/ui/card";
import { 
  Lightbulb, 
  FileCheck, 
  Scissors, 
  Droplets, 
  Shirt, 
  Circle, 
  Palette, 
  CheckSquare, 
  Truck,
  LayoutGrid
} from "lucide-react";

interface Etapa {
  id: string;
  tipo_etapa: string;
  status: string;
  ordem: number;
}

interface Pedido {
  id: string;
  etapas_producao: Etapa[];
}

interface EtapasSummaryCardsProps {
  pedidos: Pedido[];
  onEtapaClick: (etapa: string | null) => void;
  activeEtapa: string | null;
}

const ETAPAS_CONFIG = [
  { key: "pilotagem", label: "Pilotagem", icon: Lightbulb, color: "text-amber-500", bgColor: "bg-amber-500/10" },
  { key: "liberacao_corte", label: "Liberação", icon: FileCheck, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  { key: "corte", label: "Corte", icon: Scissors, color: "text-red-500", bgColor: "bg-red-500/10" },
  { key: "lavanderia", label: "Lavanderia", icon: Droplets, color: "text-cyan-500", bgColor: "bg-cyan-500/10" },
  { key: "costura", label: "Costura", icon: Shirt, color: "text-green-500", bgColor: "bg-green-500/10" },
  { key: "caseado", label: "Caseado", icon: Circle, color: "text-purple-500", bgColor: "bg-purple-500/10" },
  { key: "estamparia_bordado", label: "Estamparia/Bordado", icon: Palette, color: "text-pink-500", bgColor: "bg-pink-500/10" },
  { key: "estamparia", label: "Estamparia", icon: Palette, color: "text-pink-500", bgColor: "bg-pink-500/10" },
  { key: "bordado", label: "Bordado", icon: Palette, color: "text-orange-500", bgColor: "bg-orange-500/10" },
  { key: "acabamento", label: "Acabamento", icon: CheckSquare, color: "text-orange-500", bgColor: "bg-orange-500/10" },
  { key: "entrega", label: "Entrega", icon: Truck, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
];

export function EtapasSummaryCards({ pedidos, onEtapaClick, activeEtapa }: EtapasSummaryCardsProps) {
  // Função para obter a etapa atual de um pedido (em_andamento)
  const getEtapaAtual = (pedido: Pedido): string | null => {
    const etapaAtiva = pedido.etapas_producao?.find(
      (e) => e.status === "em_andamento"
    );
    return etapaAtiva?.tipo_etapa || null;
  };

  // Calcular contagem por etapa
  const contagemPorEtapa = ETAPAS_CONFIG.map((etapa) => ({
    ...etapa,
    count: pedidos.filter((p) => getEtapaAtual(p) === etapa.key).length,
  }));

  // Total de pedidos ativos (com alguma etapa em andamento)
  const totalAtivos = pedidos.filter((p) => getEtapaAtual(p) !== null).length;

  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-5 lg:grid-cols-5 mb-6">
      {/* Cards de cada etapa - primeira linha */}
      {contagemPorEtapa.slice(0, 5).map((etapa) => {
        const Icon = etapa.icon;
        const isActive = activeEtapa === etapa.key;
        
        return (
          <Card
            key={etapa.key}
            className={`cursor-pointer transition-all duration-200 ease-out hover:scale-[1.05] hover:shadow-lg ${
              isActive 
                ? "ring-2 ring-primary shadow-lg scale-[1.02]" 
                : ""
            } ${etapa.bgColor} border-transparent`}
            onClick={() => onEtapaClick(isActive ? null : etapa.key)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {etapa.label}
                  </p>
                  <p className={`text-3xl font-bold mt-1 ${etapa.color}`}>
                    {etapa.count}
                  </p>
                </div>
                <Icon className={`h-8 w-8 ${etapa.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Cards de cada etapa - segunda linha */}
      {contagemPorEtapa.slice(5).map((etapa) => {
        const Icon = etapa.icon;
        const isActive = activeEtapa === etapa.key;
        
        return (
          <Card
            key={etapa.key}
            className={`cursor-pointer transition-all duration-200 ease-out hover:scale-[1.05] hover:shadow-lg ${
              isActive 
                ? "ring-2 ring-primary shadow-lg scale-[1.02]" 
                : ""
            } ${etapa.bgColor} border-transparent`}
            onClick={() => onEtapaClick(isActive ? null : etapa.key)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {etapa.label}
                  </p>
                  <p className={`text-3xl font-bold mt-1 ${etapa.color}`}>
                    {etapa.count}
                  </p>
                </div>
                <Icon className={`h-8 w-8 ${etapa.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Card "Todos" */}
      <Card
        className={`cursor-pointer transition-all duration-200 ease-out hover:scale-[1.05] hover:shadow-lg ${
          activeEtapa === null 
            ? "ring-2 ring-primary shadow-lg scale-[1.02]" 
            : ""
        } bg-muted/50 border-transparent`}
        onClick={() => onEtapaClick(null)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Todos
              </p>
              <p className="text-3xl font-bold mt-1 text-foreground">
                {totalAtivos}
              </p>
            </div>
            <LayoutGrid className="h-8 w-8 text-muted-foreground opacity-80" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
