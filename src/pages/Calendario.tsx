import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Clock, AlertTriangle } from "lucide-react";
import { format, isSameDay, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DayContentProps } from "react-day-picker";

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

  const getDaysRemaining = (prazoFinal: string) => {
    return differenceInDays(new Date(prazoFinal), new Date());
  };

  // Categorize orders by urgency
  const urgente = pedidos.filter(pedido => {
    const days = getDaysRemaining(pedido.prazo_final);
    return days >= 0 && days <= 3;
  });

  const atencao = pedidos.filter(pedido => {
    const days = getDaysRemaining(pedido.prazo_final);
    return days >= 4 && days <= 7;
  });

  const normal = pedidos.filter(pedido => {
    const days = getDaysRemaining(pedido.prazo_final);
    return days >= 8 && days <= 10;
  });

  // Custom day content to show red dots
  const DayContent = (props: DayContentProps) => {
    const hasDelivery = highlightedDates.some(d => isSameDay(d, props.date));
    return (
      <div className="relative flex flex-col items-center justify-center w-full h-full">
        <span>{format(props.date, 'd')}</span>
        {hasDelivery && (
          <div className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-destructive" />
        )}
      </div>
    );
  };

  const UrgencyCard = ({ 
    title, 
    icon: Icon, 
    pedidos, 
    variant 
  }: { 
    title: string; 
    icon: any; 
    pedidos: Pedido[]; 
    variant: "default" | "destructive" | "secondary" 
  }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5" />
          {title}
          <Badge variant={variant} className="ml-auto">
            {pedidos.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px] pr-4">
          {pedidos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Icon className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm">Nenhum pedido nesta categoria</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pedidos.map((pedido) => {
                const diasRestantes = getDaysRemaining(pedido.prazo_final);
                return (
                  <div
                    key={pedido.id}
                    className="p-3 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{pedido.produto_modelo}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {pedido.clientes.nome}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(new Date(pedido.prazo_final), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </div>
                      <Badge variant={variant} className="shrink-0">
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
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calendário</h1>
        <p className="text-muted-foreground">
          Visualize os prazos de entrega e urgências
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Calendar Card */}
        <Card className="lg:row-span-2">
          <CardHeader>
            <CardTitle>Calendário de Entregas</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={ptBR}
              className="rounded-md border"
              components={{
                DayContent
              }}
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
              classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-base font-medium",
                nav: "space-x-1 flex items-center",
                nav_button: "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100",
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell: "text-muted-foreground rounded-md w-12 font-normal text-[0.8rem]",
                row: "flex w-full mt-2",
                cell: "h-12 w-12 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                day: "h-12 w-12 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md",
                day_range_end: "day-range-end",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day_today: "bg-accent text-accent-foreground",
                day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                day_disabled: "text-muted-foreground opacity-50",
                day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                day_hidden: "invisible",
              }}
            />
          </CardContent>
        </Card>

        {/* Urgency Dashboard Cards */}
        <div className="space-y-6">
          <UrgencyCard 
            title="Urgente (0-3 dias)"
            icon={AlertCircle}
            pedidos={urgente}
            variant="destructive"
          />
          
          <UrgencyCard 
            title="Atenção (4-7 dias)"
            icon={AlertTriangle}
            pedidos={atencao}
            variant="secondary"
          />
          
          <UrgencyCard 
            title="Normal (8-10 dias)"
            icon={Clock}
            pedidos={normal}
            variant="default"
          />
        </div>
      </div>
    </div>
  );
}
