import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OcupacaoMensal } from "@/hooks/useCarteiraDados";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart3 } from "lucide-react";

interface CarteiraTabelaMensalProps {
  ocupacoes: OcupacaoMensal[];
  mesSelecionado: string;
  onMesSelect: (mes: string) => void;
  usarPonderado: boolean;
}

export const CarteiraTabelaMensal = ({
  ocupacoes,
  mesSelecionado,
  onMesSelect,
  usarPonderado,
}: CarteiraTabelaMensalProps) => {
  const formatarMes = (mes: string): string => {
    try {
      const data = parse(mes, "yyyy-MM", new Date());
      return format(data, "MMM/yy", { locale: ptBR });
    } catch {
      return mes;
    }
  };

  const getSemaforoStyles = (nivel?: OcupacaoMensal["nivel"]) => {
    switch (nivel) {
      case "verde":
        return "bg-green-500";
      case "amarelo":
        return "bg-yellow-500";
      case "laranja":
        return "bg-orange-500";
      case "vermelho":
        return "bg-red-500";
      default:
        return "bg-gray-400";
    }
  };

  const getNivelLabel = (nivel?: OcupacaoMensal["nivel"]) => {
    switch (nivel) {
      case "verde":
        return "OK";
      case "amarelo":
        return "Atenção";
      case "laranja":
        return "Risco";
      case "vermelho":
        return "Crítico";
      default:
        return "N/A";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Visão Macro por Mês
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Mês</TableHead>
                <TableHead className="text-center">Pedidos</TableHead>
                <TableHead className="text-center">{usarPonderado ? "Peças Pond." : "Peças"}</TableHead>
                <TableHead className="text-center">Receita</TableHead>
                <TableHead className="text-center">Capacidade</TableHead>
                <TableHead className="text-center">Disponível</TableHead>
                <TableHead className="text-center">Ocupação</TableHead>
                <TableHead className="text-center w-[80px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(ocupacoes ?? []).filter(Boolean).map((o) => {
                const isSelected = o.mes === mesSelecionado;
                const pecas = usarPonderado ? o.totalPecasPonderadas : o.totalPecas;
                const nivel = o.nivel;

                return (
                  <TableRow
                    key={o.mes}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-primary/10 hover:bg-primary/15"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => onMesSelect(o.mes)}
                  >
                    <TableCell className="font-medium">
                      <span className={isSelected ? "text-primary font-semibold" : ""}>
                        {formatarMes(o.mes)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{o.totalPedidos}</TableCell>
                    <TableCell className="text-center">
                      {Math.round(pecas).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {o.receitaPrevista > 0
                        ? `R$ ${(o.receitaPrevista / 1000).toFixed(0)}K`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {o.capacidade?.toLocaleString() || (
                        <span className="text-muted-foreground text-xs">Não config.</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {o.disponivel !== null ? (
                        <span className={o.disponivel < 0 ? "text-red-600 font-medium" : ""}>
                          {o.disponivel.toLocaleString()}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {o.ocupacao !== null ? (
                        <span
                          className={`font-medium ${
                            nivel === "vermelho"
                              ? "text-red-600"
                              : nivel === "laranja"
                              ? "text-orange-600"
                              : nivel === "amarelo"
                              ? "text-yellow-600"
                              : "text-green-600"
                          }`}
                        >
                          {o.ocupacao.toFixed(0)}%
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div
                          className={`h-3 w-3 rounded-full ${getSemaforoStyles(nivel)}`}
                          title={getNivelLabel(nivel)}
                        />
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {getNivelLabel(nivel)}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
