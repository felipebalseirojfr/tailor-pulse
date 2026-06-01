import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, Calendar as CalendarIcon } from "lucide-react";
import { parseLocalDate, toLocalISO, todayLocal, diffDays } from "@/lib/date-utils";

interface EtapaPendente {
  id: string;
  tipo_etapa: string;
  status: string;
  data_alvo: string;
  pedido_id: string;
  codigo_pedido: string | null;
  produto_modelo: string | null;
  cliente_nome: string | null;
  codigo_referencia: string | null;
}

const TIPO_LABEL: Record<string, string> = {
  corte: "Corte",
  costura: "Costura",
  acabamento: "Acabamento",
  estampa: "Estampa",
  bordado: "Bordado",
  lavanderia: "Lavanderia",
  entrega: "Entrega",
};

export function CalendarSidebar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [etapas, setEtapas] = useState<EtapaPendente[]>([]);

  useEffect(() => {
    fetchEtapas();

    const channel = supabase
      .channel("calendar-sidebar-etapas")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "etapas_producao" },
        () => fetchEtapas()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos" },
        () => fetchEtapas()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchEtapas = async () => {
    const { data, error } = await supabase
      .from("etapas_producao")
      .select(`
        id,
        tipo_etapa,
        status,
        data_termino_prevista,
        data_inicio_prevista,
        pedido_id,
        referencia_id,
        pedidos!inner ( id, codigo_pedido, produto_modelo, cliente:clientes(nome) )
      `)
      .neq("status", "concluido");

    if (error) {
      console.error("Erro ao buscar etapas:", error);
      return;
    }

    const lista: EtapaPendente[] = (data || [])
      .map((e: any) => {
        const alvo = e.data_termino_prevista || e.data_inicio_prevista;
        if (!alvo) return null;
        return {
          id: e.id,
          tipo_etapa: e.tipo_etapa,
          status: e.status,
          data_alvo: alvo,
          pedido_id: e.pedido_id,
          codigo_pedido: e.pedidos?.codigo_pedido ?? null,
          produto_modelo: e.pedidos?.produto_modelo ?? null,
          cliente_nome: e.pedidos?.cliente?.nome ?? null,
          codigo_referencia: null,
        } as EtapaPendente;
      })
      .filter(Boolean) as EtapaPendente[];

    setEtapas(lista);
  };

  const hoje = todayLocal();

  const etapasNaData = (date: Date) => {
    const iso = toLocalISO(date);
    return etapas.filter((e) => e.data_alvo === iso);
  };

  const datasComEtapa: Date[] = Array.from(new Set(etapas.map((e) => e.data_alvo)))
    .map((iso) => parseLocalDate(iso))
    .filter((d): d is Date => d !== null);

  const alertas = etapas
    .map((e) => {
      const d = parseLocalDate(e.data_alvo);
      if (!d) return null;
      return { etapa: e, dias: diffDays(hoje, d) };
    })
    .filter((x): x is { etapa: EtapaPendente; dias: number } => x !== null)
    .filter(({ dias }) => dias < 0 || dias <= 10)
    .sort((a, b) => a.dias - b.dias);

  const modifiers = { highlighted: datasComEtapa };
  const modifiersStyles = {
    highlighted: {
      backgroundColor: "hsl(var(--primary))",
      color: "hsl(var(--primary-foreground))",
      fontWeight: "bold",
    },
  };

  const etapasDataSelecionada = selectedDate ? etapasNaData(selectedDate) : [];

  const renderTitulo = (e: EtapaPendente) => {
    const ref = e.codigo_referencia;
    const op = e.codigo_pedido;
    return [ref ? `REF ${ref}` : null, op ? `OP ${op}` : null]
      .filter(Boolean)
      .join(" · ");
  };

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
                  Etapas em {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  {etapasDataSelecionada.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nada pendente nesta data
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {etapasDataSelecionada.map((e) => (
                        <div
                          key={e.id}
                          className="p-2 rounded-md border bg-background space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium truncate">
                              {renderTitulo(e) || e.produto_modelo || "—"}
                            </p>
                            <Badge variant="secondary" className="text-[10px]">
                              {TIPO_LABEL[e.tipo_etapa] || e.tipo_etapa}
                            </Badge>
                          </div>
                          {e.cliente_nome && (
                            <p className="text-xs text-muted-foreground">
                              {e.cliente_nome}
                            </p>
                          )}
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
                Pendentes (atrasadas + próx. 10 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-250px)]">
                {alertas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma etapa pendente
                  </p>
                ) : (
                  <div className="space-y-3">
                    {alertas.map(({ etapa, dias }) => {
                      const atrasado = dias < 0;
                      return (
                        <div
                          key={etapa.id}
                          className="p-3 rounded-md border bg-background space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium truncate">
                              {renderTitulo(etapa) || etapa.produto_modelo || "—"}
                            </p>
                            <Badge
                              variant={atrasado || dias <= 3 ? "destructive" : "secondary"}
                              className="text-xs whitespace-nowrap"
                            >
                              {atrasado
                                ? `${Math.abs(dias)}d atrasado`
                                : dias === 0
                                ? "Hoje"
                                : dias === 1
                                ? "Amanhã"
                                : `${dias} dias`}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="truncate">{etapa.cliente_nome || "—"}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {TIPO_LABEL[etapa.tipo_etapa] || etapa.tipo_etapa}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Prazo: {format(parseLocalDate(etapa.data_alvo)!, "dd/MM/yyyy")}
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
