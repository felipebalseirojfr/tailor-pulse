import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Package as PackageIcon, ChevronRight, Filter, ChevronDown, AlertCircle, Maximize2, X } from "lucide-react";
import { PedidosSummaryCards } from "@/components/pedidos/PedidosSummaryCards";
import { EtapasSummaryCards } from "@/components/pedidos/EtapasSummaryCards";
import { PedidoDetailsSheet } from "@/components/pedidos/PedidoDetailsSheet";
import { EtapasVisuais } from "@/components/pedidos/EtapasVisuais";
import { FiltroAvancado } from "@/components/pedidos/FiltroAvancado";
import { PedidoCard } from "@/components/pedidos/PedidoCard";
import { ClienteProducaoCard } from "@/components/pedidos/ClienteProducaoCard";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Pedido {
  id: string;
  produto_modelo: string;
  tipo_peca: string;
  quantidade_total: number;
  progresso_percentual: number;
  prazo_final: string;
  data_inicio: string;
  status_geral: string;
  prioridade: string;
  created_at: string;
  updated_at: string;
  tecido?: string;
  aviamentos?: string[];
  clientes: {
    nome: string;
  };
  profiles: {
    nome: string;
  };
  etapas_producao: Array<{
    id: string;
    tipo_etapa: string;
    status: string;
    ordem: number;
    data_inicio?: string;
    data_termino?: string;
    data_inicio_prevista?: string;
    data_termino_prevista?: string;
    observacoes?: string;
  }>;
}

export default function Pedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filteredPedidos, setFilteredPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [marcaFilter, setMarcaFilter] = useState("");
  const [referenciaFilter, setReferenciaFilter] = useState("");
  const [opFilter, setOpFilter] = useState("");
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("controle");
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [modoTV, setModoTV] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [tvStatusFilter, setTvStatusFilter] = useState("em_producao");
  const [tvSearchTerm, setTvSearchTerm] = useState("");
  const [tvReferenciaFilter, setTvReferenciaFilter] = useState("");
  const [tvOpFilter, setTvOpFilter] = useState("");
  const [tvEtapaFilter, setTvEtapaFilter] = useState<string | null>(null);

  // Refs para controle de debounce e channels
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);
  const isMountedRef = useRef(true);

  const handlePedidoDeleted = (pedidoId: string) => {
    setPedidos(prev => prev.filter(p => p.id !== pedidoId));
    setFilteredPedidos(prev => prev.filter(p => p.id !== pedidoId));
  };

  // Função de fetch com debounce para evitar múltiplas chamadas
  const debouncedFetch = useCallback(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    fetchTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        fetchPedidos();
      }
    }, 300);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchPedidos();

    // Limpar channels anteriores
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];

    // Configurar listener de mudanças em tempo real para pedidos
    const pedidosChannel = supabase
      .channel('pedidos-list-changes-page')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pedidos'
        },
        (payload) => {
          console.log('Mudança detectada na lista de pedidos:', payload);
          // Não buscar novamente em DELETEs, pois já tratamos otimisticamente
          if (payload.eventType !== 'DELETE') {
            debouncedFetch();
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('Erro no channel de pedidos:', err);
        }
      });

    // Listener para etapas (afeta progresso dos pedidos)
    const etapasChannel = supabase
      .channel('etapas-list-changes-page')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'etapas_producao'
        },
        (payload) => {
          console.log('Mudança detectada nas etapas:', payload);
          debouncedFetch();
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('Erro no channel de etapas:', err);
        }
      });

    channelsRef.current = [pedidosChannel, etapasChannel];

    return () => {
      isMountedRef.current = false;
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [debouncedFetch]);

  useEffect(() => {
    filterPedidos();
  }, [pedidos, searchTerm, statusFilter, marcaFilter, referenciaFilter, opFilter, activeTab]);

  const fetchPedidos = async () => {
    if (!isMountedRef.current) return;
    
    try {
      const { data, error } = await supabase
        .from("pedidos")
        .select(`
          *,
          clientes(nome),
          profiles(nome),
          etapas_producao(id, tipo_etapa, status, ordem, data_inicio, data_termino, data_inicio_prevista, data_termino_prevista, observacoes)
        `);

      if (error) throw error;
      if (!isMountedRef.current) return;

      // Ordenar alfabeticamente por modelo do produto
      const sortedData = (data || []).sort((a, b) => {
        const modeloA = a.produto_modelo || '';
        const modeloB = b.produto_modelo || '';
        return modeloA.localeCompare(modeloB, 'pt-BR', { sensitivity: 'base' });
      });

      setPedidos(sortedData);
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
      if (isMountedRef.current) {
        toast.error("Erro ao carregar pedidos");
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const filterPedidos = () => {
    let filtered = pedidos;

    // Filtrar por aba ativa
    if (activeTab === "controle") {
      filtered = filtered.filter((p) => p.status_geral !== "concluido");
    } else {
      // Na aba de concluídos, mostrar apenas os últimos 20 dias
      const vintesDiasAtras = new Date();
      vintesDiasAtras.setDate(vintesDiasAtras.getDate() - 20);
      
      filtered = filtered.filter((p) => {
        if (p.status_geral !== "concluido") return false;
        
        const dataAtualizacao = new Date(p.updated_at);
        return dataAtualizacao >= vintesDiasAtras;
      });
    }

    // Filtro por busca geral
    if (searchTerm) {
      filtered = filtered.filter((p) => {
        const term = searchTerm.toLowerCase();
        return (
          p.produto_modelo.toLowerCase().includes(term) ||
          p.clientes?.nome?.toLowerCase().includes(term) ||
          p.tipo_peca?.toLowerCase().includes(term) ||
          p.id.toLowerCase().includes(term)
        );
      });
    }

    // Filtro por marca
    if (marcaFilter) {
      filtered = filtered.filter((p) => p.clientes?.nome === marcaFilter);
    }

    // Filtro por referência
    if (referenciaFilter) {
      filtered = filtered.filter((p) => p.tipo_peca === referenciaFilter);
    }

    // Filtro por OP
    if (opFilter) {
      filtered = filtered.filter((p) => p.id.slice(0, 8) === opFilter.slice(0, 8));
    }

    // Filtro por status
    if (statusFilter !== "todos") {
      if (statusFilter === "atrasado") {
        const hoje = new Date().toISOString().split("T")[0];
        filtered = filtered.filter(
          (p) => p.prazo_final < hoje && p.status_geral !== "concluido"
        );
      } else {
        filtered = filtered.filter((p) => p.status_geral === statusFilter);
      }
    }

    setFilteredPedidos(filtered);
  };

  const getSituacaoBadge = (pedido: Pedido) => {
    if (pedido.status_geral === "aguardando_inicio") {
      return <Badge variant="secondary">Aguardando Início</Badge>;
    }

    const hoje = new Date().toISOString().split("T")[0];
    const atrasado = pedido.prazo_final < hoje && pedido.status_geral !== "concluido";

    if (atrasado) {
      return <Badge variant="destructive">Atrasado</Badge>;
    }

    if (pedido.status_geral === "concluido") {
      return <Badge className="bg-success text-success-foreground">Concluído</Badge>;
    }

    // Calcular dias até o prazo
    const diasRestantes = Math.ceil(
      (new Date(pedido.prazo_final).getTime() - new Date(hoje).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (diasRestantes <= 3) {
      return <Badge className="bg-warning text-warning-foreground">Próximo do prazo</Badge>;
    }

    return <Badge className="bg-info text-info-foreground">No prazo</Badge>;
  };

  const getEtapaLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      pilotagem: "Pilotagem",
      liberacao_corte: "Liberação de Corte",
      corte: "Corte",
      lavanderia: "Lavanderia",
      costura: "Costura",
      caseado: "Caseado",
      estamparia_bordado: "Estamparia/Bordado",
      estamparia: "Estamparia",
      bordado: "Bordado",
      acabamento: "Acabamento",
      entrega: "Entrega",
    };
    return labels[tipo] || tipo;
  };

  const getEtapaAtual = (pedido: Pedido) => {
    if (pedido.status_geral === "concluido") {
      return "Concluído";
    }

    const etapaEmAndamento = pedido.etapas_producao?.find(
      (e) => e.status === "em_andamento"
    );

    if (etapaEmAndamento) {
      return getEtapaLabel(etapaEmAndamento.tipo_etapa);
    }

    return "Aguardando início";
  };

  const temEtapaEmAtraso = (pedido: Pedido) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    return pedido.etapas_producao?.some((etapa) => {
      if (etapa.status === "concluido" || !etapa.data_termino_prevista) {
        return false;
      }
      
      const dataTerminoPrevista = new Date(etapa.data_termino_prevista);
      dataTerminoPrevista.setHours(0, 0, 0, 0);
      
      return dataTerminoPrevista < hoje;
    }) || false;
  };

  const getEtapasAtrasadas = (pedido: Pedido) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    return pedido.etapas_producao?.filter((etapa) => {
      if (etapa.status === "concluido" || !etapa.data_termino_prevista) {
        return false;
      }
      
      const dataTerminoPrevista = new Date(etapa.data_termino_prevista);
      dataTerminoPrevista.setHours(0, 0, 0, 0);
      
      return dataTerminoPrevista < hoje;
    }) || [];
  };

  const handleAtualizarEtapa = async (pedidoId: string, novaEtapa: string) => {
    try {
      const pedido = pedidos.find((p) => p.id === pedidoId);
      if (!pedido) return;

      const etapas = pedido.etapas_producao.sort((a, b) => a.ordem - b.ordem);
      const etapaAtual = etapas.find((e) => e.status === "em_andamento");

      // Se estiver marcando como concluído
      if (novaEtapa === "concluido") {
        await supabase
          .from("pedidos")
          .update({
            status_geral: "concluido",
            progresso_percentual: 100,
          })
          .eq("id", pedidoId);

        // Marcar todas as etapas como concluídas
        await supabase
          .from("etapas_producao")
          .update({
            status: "concluido",
            data_termino: new Date().toISOString(),
          })
          .eq("pedido_id", pedidoId)
          .neq("status", "concluido");

        toast.success("Pedido marcado como concluído!");
        fetchPedidos();
        return;
      }

      // Encontrar a etapa alvo
      const etapaAlvo = etapas.find((e) => e.tipo_etapa === novaEtapa);
      if (!etapaAlvo) return;

      // Marcar etapa atual como concluída se existir
      if (etapaAtual) {
        await supabase
          .from("etapas_producao")
          .update({
            status: "concluido",
            data_termino: new Date().toISOString(),
          })
          .eq("id", etapaAtual.id);
      }

      // Marcar nova etapa como em andamento
      await supabase
        .from("etapas_producao")
        .update({
          status: "em_andamento",
          data_inicio: new Date().toISOString(),
        })
        .eq("id", etapaAlvo.id);

      // Atualizar status do pedido
      await supabase
        .from("pedidos")
        .update({
          status_geral: "em_producao",
        })
        .eq("id", pedidoId);

      toast.success("Etapa atualizada com sucesso!");
      fetchPedidos();
    } catch (error) {
      console.error("Erro ao atualizar etapa:", error);
      toast.error("Erro ao atualizar etapa");
    }
  };

  const handleRowClick = (pedido: Pedido) => {
    setSelectedPedido(pedido);
    setSheetOpen(true);
  };

  const getSummaryData = () => {
    const hoje = new Date().toISOString().split("T")[0];
    return {
      total: pedidos.length,
      aguardandoInicio: pedidos.filter((p) => p.status_geral === "aguardando_inicio").length,
      emProducao: pedidos.filter((p) => p.status_geral === "em_producao").length,
      concluidos: pedidos.filter((p) => p.status_geral === "concluido").length,
      atrasados: pedidos.filter(
        (p) => p.prazo_final < hoje && p.status_geral !== "concluido"
      ).length,
    };
  };

  const summaryData = getSummaryData();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className={`${modoTV ? 'fixed inset-0 z-50 bg-background overflow-auto' : 'space-y-6'}`}>
      {!modoTV ? (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Controle de Produção – Visão Geral
            </h1>
            <p className="text-muted-foreground">
              Acompanhe e atualize todos os pedidos em produção
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setModoTV(true)}
            >
              <Maximize2 className="mr-2 h-4 w-4" />
              Modo TV
            </Button>
            <Link to="/pedidos/novo">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Pedido
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-bold tracking-tight">
              JFR Confecções - Controle de Produção
            </h1>
            <div className="text-2xl text-muted-foreground">
              {format(new Date(), "HH:mm", { locale: ptBR })}
            </div>
          </div>
          <Button
            variant="outline"
            size="lg"
            onClick={() => setModoTV(false)}
          >
            <X className="mr-2 h-5 w-5" />
            Sair do Modo TV
          </Button>
        </div>
      )}

      {/* Cards de Resumo */}
      <div className={modoTV ? 'px-6' : ''}>
        <PedidosSummaryCards
          total={summaryData.total}
          aguardandoInicio={summaryData.aguardandoInicio}
          emProducao={summaryData.emProducao}
          concluidos={summaryData.concluidos}
          atrasados={summaryData.atrasados}
          onFilterClick={setStatusFilter}
          activeFilter={statusFilter}
        />
        
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className={`space-y-6 ${modoTV ? 'px-6' : ''}`}>
        {!modoTV && (
          <div className="flex items-center justify-between">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="controle">Controle de Produção</TabsTrigger>
              <TabsTrigger value="concluidos">Pedidos Concluídos</TabsTrigger>
            </TabsList>
            {activeTab === "controle" && (
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "cards" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("cards")}
                >
                  Cards
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                >
                  Tabela
                </Button>
              </div>
            )}
          </div>
        )}

        <TabsContent value={activeTab} className="space-y-6">
          {/* Filtros */}
          {!modoTV && (
            <Card>
              <CardContent className="pt-6">
                <Collapsible open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
                  <div className="flex items-center justify-between mb-4">
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        <div className="flex items-center gap-2">
                          <Filter className="h-4 w-4" />
                          <span>Filtros</span>
                        </div>
                        <ChevronDown className={`h-4 w-4 transition-transform ${filtrosAbertos ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  
                  <CollapsibleContent className="space-y-4">
                    <div className="flex flex-col gap-4 md:flex-row">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Buscar cliente, produto, referência ou OP..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      {activeTab === "controle" && (
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="w-full md:w-[200px]">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos os status</SelectItem>
                            <SelectItem value="aguardando_inicio">Aguardando Início</SelectItem>
                            <SelectItem value="em_producao">Em Produção</SelectItem>
                            <SelectItem value="atrasado">Atrasados</SelectItem>
                            <SelectItem value="concluido">Concluídos</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <FiltroAvancado
                        tipo="marca"
                        opcoes={Array.from(new Set(pedidos.map((p) => p.clientes?.nome).filter(Boolean)))}
                        valor={marcaFilter}
                        onChange={setMarcaFilter}
                        placeholder="Filtrar por marca"
                      />
                      <FiltroAvancado
                        tipo="referencia"
                        opcoes={Array.from(new Set(pedidos.map((p) => p.tipo_peca).filter(Boolean)))}
                        valor={referenciaFilter}
                        onChange={setReferenciaFilter}
                        placeholder="Filtrar por referência"
                      />
                      <FiltroAvancado
                        tipo="op"
                        opcoes={Array.from(new Set(pedidos.map((p) => `#${p.id.slice(0, 8)}`)))}
                        valor={opFilter}
                        onChange={setOpFilter}
                        placeholder="Filtrar por #OP"
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          )}
          
          {/* Contador de Resultados */}
          {filteredPedidos.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Exibindo {filteredPedidos.length} de {pedidos.length} pedidos
            </div>
          )}

          {/* Lista de Pedidos */}
          {filteredPedidos.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <PackageIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">
                  {pedidos.length === 0
                    ? "Nenhum pedido cadastrado"
                    : "Nenhum pedido encontrado"}
                </h3>
                <p className="mb-4 text-muted-foreground">
                  {pedidos.length === 0
                    ? "Comece criando seu primeiro pedido de produção"
                    : "Tente ajustar os filtros de busca"}
                </p>
                {pedidos.length === 0 && !modoTV && (
                  <Link to="/pedidos/novo">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Criar Pedido
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : viewMode === "cards" && activeTab === "controle" && !modoTV ? (
            /* Vista de Cards por Cliente */
            (() => {
              // Agrupar produções por cliente
              const producoesPorCliente = filteredPedidos.reduce((acc, pedido) => {
                const cliente = pedido.clientes?.nome || "Cliente não identificado";
                if (!acc[cliente]) {
                  acc[cliente] = [];
                }
                acc[cliente].push(pedido);
                return acc;
              }, {} as Record<string, typeof filteredPedidos>);

              return (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(producoesPorCliente).map(([cliente, producoes]) => (
                    <ClienteProducaoCard
                      key={cliente}
                      cliente={cliente}
                      producoes={producoes}
                      onViewProducao={(producao) => handleRowClick(producao)}
                    />
                  ))}
                </div>
              );
            })()
          ) : modoTV && activeTab === "controle" ? (
            /* Vista de Cards individual para Modo TV */
            (() => {
              const hoje = new Date().toISOString().split("T")[0];
              // IMPORTANTE: Usar todos os pedidos não concluídos como base (não filteredPedidos)
              const pedidosEmProducao = pedidos.filter((p) => p.status_geral !== "concluido");
              let tvFiltered = [...pedidosEmProducao];
              
              // Aplicar filtro por busca de nome
              if (tvSearchTerm) {
                tvFiltered = tvFiltered.filter((p) =>
                  p.produto_modelo.toLowerCase().includes(tvSearchTerm.toLowerCase())
                );
              }
              
              // Aplicar filtro por referência
              if (tvReferenciaFilter) {
                tvFiltered = tvFiltered.filter((p) => p.tipo_peca === tvReferenciaFilter);
              }
              
              // Aplicar filtro por OP
              if (tvOpFilter) {
                tvFiltered = tvFiltered.filter((p) =>
                  p.id.toLowerCase().includes(tvOpFilter.toLowerCase())
                );
              }
              
              // Aplicar filtro de status do modo TV
              if (tvStatusFilter === "em_producao") {
                tvFiltered = tvFiltered.filter((p) => p.status_geral === "em_producao");
              } else if (tvStatusFilter === "aguardando_inicio") {
                tvFiltered = tvFiltered.filter((p) => p.status_geral === "aguardando_inicio");
              } else if (tvStatusFilter === "atrasado") {
                tvFiltered = tvFiltered.filter(
                  (p) => p.prazo_final < hoje && p.status_geral !== "concluido"
                );
              }
              
              // Aplicar filtro por etapa de produção
              if (tvEtapaFilter) {
                tvFiltered = tvFiltered.filter((p) => {
                  const etapaAtiva = p.etapas_producao?.find(
                    (e) => e.status === "em_andamento"
                  );
                  return etapaAtiva?.tipo_etapa === tvEtapaFilter;
                });
              }
              
              // Ordenar alfabeticamente por modelo
              tvFiltered = tvFiltered.sort((a, b) => 
                (a.produto_modelo || '').localeCompare(b.produto_modelo || '', 'pt-BR', { sensitivity: 'base' })
              );

              const totalBeforeFilter = pedidosEmProducao.length;
              const hasActiveFilters = tvSearchTerm || tvReferenciaFilter || tvOpFilter || tvStatusFilter !== "todos" || tvEtapaFilter;
              
              // Obter referências únicas para o select (de todos os pedidos em produção)
              const referenciasUnicas = Array.from(new Set(pedidosEmProducao.map((p) => p.tipo_peca).filter(Boolean)));

              return (
                <>
                  {/* Widgets de Etapas de Produção */}
                  <EtapasSummaryCards
                    pedidos={pedidosEmProducao}
                    onEtapaClick={setTvEtapaFilter}
                    activeEtapa={tvEtapaFilter}
                  />

                  {/* Barra de Filtros do Modo TV */}
                  <Card className="mb-6 bg-card/80 backdrop-blur-sm border-muted">
                    <CardContent className="py-4">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Filter className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium text-muted-foreground">Filtros:</span>
                        </div>
                        
                        {/* Busca por nome */}
                        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Buscar por nome..."
                            value={tvSearchTerm}
                            onChange={(e) => setTvSearchTerm(e.target.value)}
                            className="pl-9 h-10"
                          />
                        </div>
                        
                        {/* Filtro por referência */}
                        <Select value={tvReferenciaFilter} onValueChange={setTvReferenciaFilter}>
                          <SelectTrigger className="w-[180px] h-10">
                            <SelectValue placeholder="Referência" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todas">Todas Referências</SelectItem>
                            {referenciasUnicas.map((ref) => (
                              <SelectItem key={ref} value={ref}>
                                {ref}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        {/* Busca por OP */}
                        <div className="relative min-w-[150px] max-w-[180px]">
                          <Input
                            placeholder="Buscar OP..."
                            value={tvOpFilter}
                            onChange={(e) => setTvOpFilter(e.target.value)}
                            className="h-10"
                          />
                        </div>
                        
                        {/* Filtro por status */}
                        <Select value={tvStatusFilter} onValueChange={setTvStatusFilter}>
                          <SelectTrigger className="w-[180px] h-10">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos Status</SelectItem>
                            <SelectItem value="em_producao">Em Produção</SelectItem>
                            <SelectItem value="aguardando_inicio">Aguardando Início</SelectItem>
                            <SelectItem value="atrasado">Atrasados</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {/* Botão limpar filtros */}
                        {hasActiveFilters && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setTvSearchTerm("");
                              setTvReferenciaFilter("");
                              setTvOpFilter("");
                              setTvStatusFilter("todos");
                              setTvEtapaFilter(null);
                            }}
                            className="h-10"
                          >
                            <X className="mr-1 h-4 w-4" />
                            Limpar
                          </Button>
                        )}
                        
                        {/* Contador */}
                        <div className="ml-auto text-sm text-muted-foreground">
                          Exibindo <span className="font-semibold text-foreground">{tvFiltered.length}</span> de {totalBeforeFilter} produções
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Grid de Cards */}
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                    {tvFiltered.map((pedido) => (
                      <PedidoCard
                        key={pedido.id}
                        pedido={pedido}
                        onViewDetails={() => handleRowClick(pedido)}
                        onAdvanceStage={() => {
                          const etapas = pedido.etapas_producao?.sort((a, b) => a.ordem - b.ordem);
                          const etapaAtual = etapas?.find((et) => et.status === "em_andamento");
                          
                          if (etapaAtual) {
                            const proximaEtapa = etapas?.find((et) => et.ordem === etapaAtual.ordem + 1);
                            handleAtualizarEtapa(
                              pedido.id,
                              proximaEtapa ? proximaEtapa.tipo_etapa : "concluido"
                            );
                          } else {
                            const primeiraEtapa = etapas?.[0];
                            if (primeiraEtapa) {
                              handleAtualizarEtapa(pedido.id, primeiraEtapa.tipo_etapa);
                            }
                          }
                        }}
                        isTV={modoTV}
                      />
                    ))}
                  </div>
                </>
              );
            })()
          ) : (
            /* Vista de Tabela */
            <Card className="bg-card/60 backdrop-blur-sm border-muted">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Marca/Cliente</TableHead>
                      <TableHead>Referência</TableHead>
                      <TableHead className="w-[120px]">#OP</TableHead>
                      {activeTab === "controle" && (
                        <>
                          <TableHead className="w-[300px]">Etapas de Produção</TableHead>
                          <TableHead>Etapa Atual</TableHead>
                          <TableHead className="w-[100px]">Ação</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPedidos.map((pedido) => (
                      <TableRow
                        key={pedido.id}
                        className="hover:bg-muted/50"
                      >
                        <TableCell onClick={() => handleRowClick(pedido)} className="cursor-pointer font-medium">
                          {pedido.produto_modelo}
                          {temEtapaEmAtraso(pedido) && (
                            <div className="flex items-center gap-1 mt-1">
                              <AlertCircle className="h-3 w-3 text-destructive" />
                              <span className="text-xs text-destructive">
                                {getEtapasAtrasadas(pedido).length} etapa(s) atrasada(s)
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell onClick={() => handleRowClick(pedido)} className="cursor-pointer font-medium">
                          {pedido.clientes?.nome}
                        </TableCell>
                        <TableCell onClick={() => handleRowClick(pedido)} className="cursor-pointer text-muted-foreground">
                          {pedido.tipo_peca}
                        </TableCell>
                        <TableCell onClick={() => handleRowClick(pedido)} className="cursor-pointer">
                          <Badge variant="outline" className="font-mono text-xs">
                            #{pedido.id.slice(0, 8)}
                          </Badge>
                        </TableCell>
                        {activeTab === "controle" && (
                          <>
                            <TableCell onClick={() => handleRowClick(pedido)} className="cursor-pointer">
                              <EtapasVisuais
                                etapas={pedido.etapas_producao || []}
                                statusGeral={pedido.status_geral}
                              />
                            </TableCell>
                            <TableCell onClick={() => handleRowClick(pedido)} className="cursor-pointer">
                              <Badge variant="outline">{getEtapaAtual(pedido)}</Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const etapas = pedido.etapas_producao?.sort((a, b) => a.ordem - b.ordem);
                                  const etapaAtual = etapas?.find((et) => et.status === "em_andamento");
                                  
                                  if (etapaAtual) {
                                    const proximaEtapa = etapas?.find((et) => et.ordem === etapaAtual.ordem + 1);
                                    handleAtualizarEtapa(
                                      pedido.id,
                                      proximaEtapa ? proximaEtapa.tipo_etapa : "concluido"
                                    );
                                  } else {
                                    const primeiraEtapa = etapas?.[0];
                                    if (primeiraEtapa) {
                                      handleAtualizarEtapa(pedido.id, primeiraEtapa.tipo_etapa);
                                    }
                                  }
                                }}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de Detalhes */}
        <PedidoDetailsSheet
          pedido={selectedPedido}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          onUpdate={fetchPedidos}
          onDelete={handlePedidoDeleted}
        />
    </div>
  );
}
