import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, Calendar as CalendarIcon } from "lucide-react";

interface Pedido {
  id: string;
  produto_modelo: string;
  prazo_final: string;
  cliente_id: string;
  clientes?: {
    nome: string;
  };
}

export function CalendarSidebar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidosData, setPedidosData] = useState<Date[]>([]);
  const [alertas, setAlertas] = useState<Pedido[]>([]);

  useEffect(() => {
    fetchPedidos();

    const channel = supabase
      .channel('calendar-pedidos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pedidos'
        },
        () => fetchPedidos()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPedidos = async () => {
    const { data, error } = await supabase
      .from("pedidos")
      .select(`
        id,
        produto_modelo,
        prazo_final,
        cliente_id,
        clientes (
          nome
        )
      `)
      .order("prazo_final", { ascending: true });

    if (error) {
      console.error("Erro ao buscar pedidos:", error);
      return;
    }

    setPedidos(data || []);

    // Extract unique dates for calendar highlighting
    const dates = data?.map(p => parseISO(p.prazo_final)) || [];
    setPedidosData(dates);

    // Filter alerts (10 days or less until delivery)
    const hoje = new Date();
    const pedidosAlerta = data?.filter(p => {
      const diasRestantes = differenceInDays(parseISO(p.prazo_final), hoje);
      return diasRestantes >= 0 && diasRestantes <= 10;
    }) || [];
    setAlertas(pedidosAlerta);
  };

  const getPedidosNaData = (date: Date) => {
    return pedidos.filter(p => {
      const prazoFinal = parseISO(p.prazo_final);
      return format(prazoFinal, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
    });
  };

  const getDiasRestantes = (prazoFinal: string) => {
    const hoje = new Date();
    const diasRestantes = differenceInDays(parseISO(prazoFinal), hoje);
    return diasRestantes;
  };

  const modifiers = {
    highlighted: pedidosData
  };

  const modifiersStyles = {
    highlighted: {
      backgroundColor: 'hsl(var(--primary))',
      color: 'hsl(var(--primary-foreground))',
      fontWeight: 'bold'
    }
  };

  const pedidosDataSelecionada = selectedDate ? getPedidosNaData(selectedDate) : [];

  return (
    <aside className="w-80 border-l border-border bg-card overflow-y-auto">
      <Tabs defaultValue="calendar" className="h-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="calendar">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Calendário
          </TabsTrigger>
          <TabsTrigger value="alerts" className="relative">
            <Bell className="h-4 w-4 mr-2" />
            Alertas
            {alertas.length > 0 && (
              <Badge 
                variant="destructive" 
                className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {alertas.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="p-4 space-y-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={ptBR}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            className="rounded-md border pointer-events-auto"
          />

          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Entregas em {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  {pedidosDataSelecionada.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma entrega nesta data
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {pedidosDataSelecionada.map((pedido) => (
                        <div
                          key={pedido.id}
                          className="p-2 rounded-md border bg-background"
                        >
                          <p className="text-sm font-medium">
                            {pedido.produto_modelo}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Cliente: {pedido.clientes?.nome || "N/A"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="p-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Entregas próximas (10 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-250px)]">
                {alertas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma entrega nos próximos 10 dias
                  </p>
                ) : (
                  <div className="space-y-3">
                    {alertas.map((pedido) => {
                      const diasRestantes = getDiasRestantes(pedido.prazo_final);
                      return (
                        <div
                          key={pedido.id}
                          className="p-3 rounded-md border bg-background space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">
                              {pedido.produto_modelo}
                            </p>
                            <Badge
                              variant={diasRestantes <= 3 ? "destructive" : "secondary"}
                              className="text-xs"
                            >
                              {diasRestantes === 0
                                ? "Hoje"
                                : diasRestantes === 1
                                ? "Amanhã"
                                : `${diasRestantes} dias`}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Cliente: {pedido.clientes?.nome || "N/A"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Prazo: {format(parseISO(pedido.prazo_final), "dd/MM/yyyy")}
                          </p>
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
    </aside>
  );
}
