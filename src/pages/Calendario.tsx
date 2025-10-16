import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Package } from "lucide-react";
import { format, isSameDay, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Pedido {
  id: string;
  produto_modelo: string;
  prazo_final: string;
  cliente_id: string;
  clientes: {
    nome: string;
  };
}

export default function Calendario() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [highlightedDates, setHighlightedDates] = useState<Date[]>([]);

  useEffect(() => {
    fetchPedidos();
  }, []);

  const fetchPedidos = async () => {
    const { data, error } = await supabase
      .from("pedidos")
      .select(`
        id,
        produto_modelo,
        prazo_final,
        cliente_id,
        clientes (nome)
      `)
      .order("prazo_final", { ascending: true });

    if (!error && data) {
      setPedidos(data as Pedido[]);
      const dates = data.map(p => new Date(p.prazo_final));
      setHighlightedDates(dates);
    }
  };

  const pedidosDoDia = pedidos.filter(pedido => 
    selectedDate && isSameDay(new Date(pedido.prazo_final), selectedDate)
  );

  const alertas = pedidos.filter(pedido => {
    const diasRestantes = differenceInDays(new Date(pedido.prazo_final), new Date());
    return diasRestantes <= 10 && diasRestantes >= 0;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calendário</h1>
        <p className="text-muted-foreground">
          Visualize os prazos de entrega e alertas importantes
        </p>
      </div>

      <Tabs defaultValue="calendario" className="w-full">
        <TabsList>
          <TabsTrigger value="calendario">Calendário</TabsTrigger>
          <TabsTrigger value="alertas" className="relative">
            Alertas
            {alertas.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {alertas.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendario" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Selecione uma Data</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={ptBR}
                  className="rounded-md border"
                  modifiers={{
                    highlighted: highlightedDates,
                  }}
                  modifiersStyles={{
                    highlighted: {
                      backgroundColor: "hsl(var(--primary))",
                      color: "hsl(var(--primary-foreground))",
                      fontWeight: "bold",
                    },
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  Entregas do Dia {selectedDate && format(selectedDate, "dd/MM/yyyy")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[350px] pr-4">
                  {pedidosDoDia.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                      <Package className="h-12 w-12 mb-2 opacity-20" />
                      <p>Nenhuma entrega prevista para este dia</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pedidosDoDia.map((pedido) => (
                        <div
                          key={pedido.id}
                          className="p-3 border rounded-lg hover:bg-accent transition-colors"
                        >
                          <div className="font-medium">{pedido.produto_modelo}</div>
                          <div className="text-sm text-muted-foreground">
                            Cliente: {pedido.clientes.nome}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alertas">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Pedidos Próximos do Prazo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                {alertas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mb-2 opacity-20" />
                    <p>Nenhum alerta no momento</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {alertas.map((pedido) => {
                      const diasRestantes = differenceInDays(
                        new Date(pedido.prazo_final),
                        new Date()
                      );
                      return (
                        <div
                          key={pedido.id}
                          className="p-4 border rounded-lg bg-destructive/10 border-destructive/20"
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="font-medium">{pedido.produto_modelo}</div>
                              <div className="text-sm text-muted-foreground">
                                Cliente: {pedido.clientes.nome}
                              </div>
                              <div className="text-sm">
                                Prazo: {format(new Date(pedido.prazo_final), "dd/MM/yyyy", { locale: ptBR })}
                              </div>
                            </div>
                            <Badge variant="destructive">
                              {diasRestantes === 0
                                ? "Hoje"
                                : diasRestantes === 1
                                ? "1 dia"
                                : `${diasRestantes} dias`}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
