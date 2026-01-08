import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Layers, DollarSign, Gauge, TrendingUp, Settings } from "lucide-react";
import { OcupacaoMensal } from "@/hooks/useCarteiraDados";

interface CarteiraResumoMesProps {
  mes: string;
  mesFormatado: string;
  ocupacao: OcupacaoMensal | undefined;
  usarPonderado: boolean;
  onEditCapacidade: () => void;
}

export const CarteiraResumoMes = ({
  mes,
  mesFormatado,
  ocupacao,
  usarPonderado,
  onEditCapacidade,
}: CarteiraResumoMesProps) => {
  if (!ocupacao) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Selecione um mês para ver o resumo
        </CardContent>
      </Card>
    );
  }

  const getNivelColor = (nivel: OcupacaoMensal["nivel"]) => {
    switch (nivel) {
      case "verde":
        return "text-green-600 dark:text-green-400";
      case "amarelo":
        return "text-yellow-600 dark:text-yellow-400";
      case "laranja":
        return "text-orange-600 dark:text-orange-400";
      case "vermelho":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-muted-foreground";
    }
  };

  const getNivelBg = (nivel: OcupacaoMensal["nivel"]) => {
    switch (nivel) {
      case "verde":
        return "bg-green-100 dark:bg-green-900/30";
      case "amarelo":
        return "bg-yellow-100 dark:bg-yellow-900/30";
      case "laranja":
        return "bg-orange-100 dark:bg-orange-900/30";
      case "vermelho":
        return "bg-red-100 dark:bg-red-900/30";
      default:
        return "bg-muted";
    }
  };

  const pecas = usarPonderado ? ocupacao.totalPecasPonderadas : ocupacao.totalPecas;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold capitalize">{mesFormatado}</h3>
          <Button variant="outline" size="sm" onClick={onEditCapacidade}>
            <Settings className="h-4 w-4 mr-2" />
            Editar Capacidade
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Pedidos */}
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Pedidos</span>
            </div>
            <p className="text-2xl font-bold">{ocupacao.totalPedidos}</p>
          </div>

          {/* Peças */}
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {usarPonderado ? "Peças Pond." : "Peças"}
              </span>
            </div>
            <p className="text-2xl font-bold">{Math.round(pecas).toLocaleString()}</p>
          </div>

          {/* Receita */}
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Receita Prevista</span>
            </div>
            <p className="text-2xl font-bold">
              {ocupacao.receitaPrevista > 0
                ? `R$ ${(ocupacao.receitaPrevista / 1000).toFixed(0)}K`
                : "—"}
            </p>
          </div>

          {/* Ocupação */}
          <div className={`p-4 rounded-lg ${getNivelBg(ocupacao.nivel)}`}>
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Ocupação</span>
            </div>
            <p className={`text-2xl font-bold ${getNivelColor(ocupacao.nivel)}`}>
              {ocupacao.ocupacao !== null ? `${ocupacao.ocupacao.toFixed(0)}%` : "N/A"}
            </p>
          </div>

          {/* Disponível */}
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Disponível</span>
            </div>
            <p className={`text-2xl font-bold ${ocupacao.disponivel !== null && ocupacao.disponivel < 0 ? "text-red-600" : ""}`}>
              {ocupacao.disponivel !== null
                ? ocupacao.disponivel.toLocaleString()
                : "N/A"}
            </p>
            {ocupacao.capacidade && (
              <p className="text-xs text-muted-foreground mt-1">
                de {ocupacao.capacidade.toLocaleString()} peças
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
