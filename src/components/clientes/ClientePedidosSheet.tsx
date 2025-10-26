import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Package, Calendar, TrendingUp, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Pedido {
  id: string;
  codigo_pedido: string;
  data_inicio: string;
  prazo_final: string;
  status_geral: string;
  quantidade_total_referencias: number;
  valor_total_pedido: number;
  observacoes_pedido: string | null;
}

interface ClientePedidosSheetProps {
  clienteId: string | null;
  clienteNome: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColors = {
  aguardando: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  em_producao: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  concluido: "bg-green-500/10 text-green-600 border-green-500/20",
};

const statusLabels = {
  aguardando: "Aguardando",
  em_producao: "Em Produção",
  concluido: "Concluído",
};

export default function ClientePedidosSheet({
  clienteId,
  clienteNome,
  open,
  onOpenChange,
}: ClientePedidosSheetProps) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (open && clienteId) {
      fetchPedidos();
    }
  }, [open, clienteId]);

  const fetchPedidos = async () => {
    if (!clienteId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .eq("cliente_id", clienteId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPedidos(data || []);
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
      toast.error("Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalhes = (pedidoId: string) => {
    navigate(`/pedidos/${pedidoId}`);
    onOpenChange(false);
  };

  const totalValor = pedidos.reduce((acc, p) => acc + (p.valor_total_pedido || 0), 0);
  const totalReferencias = pedidos.reduce((acc, p) => acc + (p.quantidade_total_referencias || 0), 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl">{clienteNome}</SheetTitle>
          <SheetDescription>Todos os pedidos deste cliente</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Resumo */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Total Pedidos</div>
              <div className="text-2xl font-bold">{pedidos.length}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Referências</div>
              <div className="text-2xl font-bold">{totalReferencias}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Valor Total</div>
              <div className="text-2xl font-bold">R$ {totalValor.toFixed(2)}</div>
            </Card>
          </div>

          <Separator />

          {/* Lista de Pedidos */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando pedidos...
              </div>
            ) : pedidos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum pedido encontrado para este cliente
              </div>
            ) : (
              pedidos.map((pedido) => (
                <Card key={pedido.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{pedido.codigo_pedido}</h4>
                        <p className="text-sm text-muted-foreground">
                          {pedido.quantidade_total_referencias} referências
                        </p>
                      </div>
                    </div>
                    <Badge
                      className={
                        statusColors[pedido.status_geral as keyof typeof statusColors] ||
                        statusColors.aguardando
                      }
                    >
                      {statusLabels[pedido.status_geral as keyof typeof statusLabels] ||
                        "Aguardando"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-muted-foreground">Início</div>
                        <div className="font-medium">
                          {new Date(pedido.data_inicio).toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-muted-foreground">Entrega</div>
                        <div className="font-medium">
                          {new Date(pedido.prazo_final).toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">
                        R$ {pedido.valor_total_pedido?.toFixed(2) || "0.00"}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVerDetalhes(pedido.id)}
                    >
                      Ver Detalhes
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
