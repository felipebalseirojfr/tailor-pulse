import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PedidoCarteira } from "@/hooks/useCarteiraDados";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExternalLink, Package, Download, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";

interface CarteiraListaPedidosProps {
  pedidos: PedidoCarteira[];
  mesFormatado: string;
  tipoVisao: "entrega" | "faturamento";
}

export const CarteiraListaPedidos = ({
  pedidos,
  mesFormatado,
  tipoVisao,
}: CarteiraListaPedidosProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "aguardando":
        return <Badge variant="outline">Aguardando</Badge>;
      case "em_producao":
        return <Badge className="bg-blue-500 hover:bg-blue-600">Em Produção</Badge>;
      case "concluido":
        return <Badge className="bg-green-500 hover:bg-green-600">Concluído</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPrioridadeBadge = (prioridade: string | null) => {
    if (!prioridade) return null;
    switch (prioridade) {
      case "alta":
        return <Badge variant="destructive" className="text-xs">Alta</Badge>;
      case "urgente":
        return <Badge className="bg-red-600 hover:bg-red-700 text-xs">Urgente</Badge>;
      case "media":
        return <Badge variant="outline" className="text-xs">Média</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Baixa</Badge>;
    }
  };

  const formatarData = (data: string | null): string => {
    if (!data) return "—";
    try {
      if (data.length === 7) {
        return data;
      }
      return format(new Date(data), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return data;
    }
  };

  const handleExportCSV = () => {
    const headers = ["Código", "Cliente", "Status", "Entrega", "Peças", "Valor"];
    const rows = pedidos.map((p) => [
      p.codigo_pedido || p.id.slice(0, 8),
      p.cliente_nome,
      p.status_geral,
      formatarData(p.prazo_final),
      p.total_pecas,
      p.valor_total_pedido.toFixed(2),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.map((c) => `"${c}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `pedidos-${mesFormatado.replace(/ /g, "-")}.csv`;
    link.click();
  };

  const totalPecas = pedidos.reduce((acc, p) => acc + p.total_pecas, 0);
  const valorTotal = pedidos.reduce((acc, p) => acc + p.valor_total_pedido, 0);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    Pedidos de <span className="capitalize">{mesFormatado}</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Clique para {isOpen ? "ocultar" : "ver"} detalhes
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-2xl font-bold text-foreground">{pedidos.length}</p>
                      <p className="text-xs text-muted-foreground">pedidos</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{totalPecas.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">peças</p>
                    </div>
                    {valorTotal > 0 && (
                      <div>
                        <p className="text-2xl font-bold text-foreground">
                          R$ {valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-xs text-muted-foreground">valor total</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <Badge variant="secondary" className="text-base px-3 py-1 sm:hidden">
                  {pedidos.length}
                </Badge>
                
                {isOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {pedidos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum pedido encontrado para este mês
              </div>
            ) : (
              <>
                <div className="flex justify-end mb-4">
                  <Button variant="outline" size="sm" onClick={handleExportCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Prioridade</TableHead>
                        <TableHead className="text-center">
                          {tipoVisao === "entrega" ? "Entrega" : "Faturamento"}
                        </TableHead>
                        <TableHead className="text-center">Peças</TableHead>
                        <TableHead className="text-center">Valor</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pedidos.map((pedido) => (
                        <TableRow key={pedido.id}>
                          <TableCell className="font-medium">
                            {pedido.codigo_pedido || pedido.id.slice(0, 8)}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {pedido.cliente_nome}
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(pedido.status_geral)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getPrioridadeBadge(pedido.prioridade)}
                          </TableCell>
                          <TableCell className="text-center">
                            {tipoVisao === "entrega"
                              ? formatarData(pedido.prazo_final)
                              : formatarData(
                                  pedido.data_faturamento_prevista ||
                                    pedido.mes_faturamento_previsto
                                )}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {pedido.total_pecas.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center">
                            {pedido.valor_total_pedido > 0
                              ? `R$ ${pedido.valor_total_pedido.toLocaleString()}`
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Link to={`/pedidos/${pedido.id}`}>
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
