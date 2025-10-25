import { useEffect, useState, useMemo } from "react";
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
import { Plus, Search, Package as PackageIcon, ChevronRight, Filter, X, AlertCircle, Clock, QrCode, Eye } from "lucide-react";
import { PedidosSummaryCards } from "@/components/pedidos/PedidosSummaryCards";
import { PedidoDetailsSheet } from "@/components/pedidos/PedidoDetailsSheet";
import { EtapasVisuais } from "@/components/pedidos/EtapasVisuais";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [etapaFilter, setEtapaFilter] = useState("todas");
  const [clienteFilter, setClienteFilter] = useState("todos");
  const [apenasAtrasados, setApenasAtrasados] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("controle");
  const [showFilters, setShowFilters] = useState(false);

  const handlePedidoDeleted = (pedidoId: string) => {
    setPedidos(prev => prev.filter(p => p.id !== pedidoId));
  };

  // Debounce para busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchPedidos();

    // Configurar listener de mudanças em tempo real para pedidos
    const pedidosChannel = supabase
      .channel('pedidos-list-changes')
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
            fetchPedidos();
          }
        }
      )
      .subscribe();

    // Listener para etapas (afeta progresso dos pedidos)
    const etapasChannel = supabase
      .channel('etapas-list-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'etapas_producao'
        },
        (payload) => {
          console.log('Mudança detectada nas etapas:', payload);
          fetchPedidos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(pedidosChannel);
      supabase.removeChannel(etapasChannel);
    };
  }, []);

  const fetchPedidos = async () => {
    try {
      const { data, error } = await supabase
        .from("pedidos")
        .select(`
          *,
          clientes(nome),
          profiles(nome),
          etapas_producao(id, tipo_etapa, status, ordem, data_inicio, data_termino, data_inicio_prevista, data_termino_prevista, observacoes)
        `)
        .order("prazo_final", { ascending: true });

      if (error) throw error;

      setPedidos(data || []);
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
      toast.error("Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  };

  // Filtragem com useMemo
  const filteredPedidos = useMemo(() => {
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

    // Filtro por busca geral (com debounce)
    if (debouncedSearch) {
      filtered = filtered.filter((p) => {
        const term = debouncedSearch.toLowerCase();
        return (
          p.produto_modelo.toLowerCase().includes(term) ||
          p.clientes?.nome?.toLowerCase().includes(term) ||
          p.tipo_peca?.toLowerCase().includes(term) ||
          p.tecido?.toLowerCase().includes(term) ||
          p.id.toLowerCase().includes(term)
        );
      });
    }

    // Filtro por cliente
    if (clienteFilter !== "todos") {
      filtered = filtered.filter((p) => p.clientes?.nome === clienteFilter);
    }

    // Filtro por etapa
    if (etapaFilter !== "todas") {
      filtered = filtered.filter((p) => {
        const etapaAtual = p.etapas_producao?.find((e) => e.status === "em_andamento");
        return etapaAtual?.tipo_etapa === etapaFilter;
      });
    }

    // Filtro por status
    if (statusFilter !== "todos") {
      if (statusFilter === "atrasado") {
        const hoje = new Date().toISOString().split("T")[0];
        filtered = filtered.filter(
          (p) => p.prazo_final < hoje && p.status_geral !== "concluido"
        );
      } else if (statusFilter === "proximo_prazo") {
        const hoje = new Date();
        filtered = filtered.filter((p) => {
          if (p.status_geral === "concluido") return false;
          const diasRestantes = differenceInDays(new Date(p.prazo_final), hoje);
          return diasRestantes >= 0 && diasRestantes <= 3;
        });
      } else {
        filtered = filtered.filter((p) => p.status_geral === statusFilter);
      }
    }

    // Filtro apenas atrasados
    if (apenasAtrasados) {
      const hoje = new Date().toISOString().split("T")[0];
      filtered = filtered.filter(
        (p) => p.prazo_final < hoje && p.status_geral !== "concluido"
      );
    }

    return filtered;
  }, [pedidos, debouncedSearch, statusFilter, etapaFilter, clienteFilter, apenasAtrasados, activeTab]);

  const getSituacaoBadge = (pedido: Pedido) => {
    const hoje = new Date();
    const prazo = new Date(pedido.prazo_final);
    const diasRestantes = differenceInDays(prazo, hoje);
    const atrasado = diasRestantes < 0 && pedido.status_geral !== "concluido";

    if (atrasado) {
      const diasAtraso = Math.abs(diasRestantes);
      return (
        <Badge variant="destructive" className="gap-1">
          🔴 {diasAtraso > 1 ? `+${diasAtraso} dias` : "Hoje"}
        </Badge>
      );
    }

    if (pedido.status_geral === "concluido") {
      return <Badge className="bg-green-500 hover:bg-green-600 gap-1">🟢 Concluído</Badge>;
    }

    if (diasRestantes >= 0 && diasRestantes <= 3) {
      return (
        <Badge className="bg-yellow-500 hover:bg-yellow-600 gap-1">
          🟡 {diasRestantes === 0 ? "Hoje" : `${diasRestantes} dia${diasRestantes > 1 ? "s" : ""}`}
        </Badge>
      );
    }

    return <Badge className="bg-blue-500 hover:bg-blue-600 gap-1">🟢 {diasRestantes} dias</Badge>;
  };

  const getEtapaBadgeColor = (tipo: string) => {
    const colors: Record<string, string> = {
      pilotagem: "bg-purple-500 hover:bg-purple-600",
      liberacao_corte: "bg-blue-500 hover:bg-blue-600",
      corte: "bg-cyan-500 hover:bg-cyan-600",
      lavanderia: "bg-teal-500 hover:bg-teal-600",
      costura: "bg-green-500 hover:bg-green-600",
      caseado: "bg-lime-500 hover:bg-lime-600",
      estamparia_bordado: "bg-orange-500 hover:bg-orange-600",
      acabamento: "bg-amber-500 hover:bg-amber-600",
      entrega: "bg-emerald-500 hover:bg-emerald-600",
    };
    return colors[tipo] || "bg-gray-500 hover:bg-gray-600";
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

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("todos");
    setEtapaFilter("todas");
    setClienteFilter("todos");
    setApenasAtrasados(false);
  };

  const hasActiveFilters = 
    searchTerm || 
    statusFilter !== "todos" || 
    etapaFilter !== "todas" || 
    clienteFilter !== "todos" || 
    apenasAtrasados;

  // Obter lista de etapas únicas
  const etapasDisponiveis = useMemo(() => {
    const etapasSet = new Set<string>();
    pedidos.forEach((pedido) => {
      pedido.etapas_producao?.forEach((etapa) => {
        etapasSet.add(etapa.tipo_etapa);
      });
    });
    return Array.from(etapasSet);
  }, [pedidos]);

  // Obter lista de clientes únicos
  const clientesDisponiveis = useMemo(() => {
    return Array.from(new Set(pedidos.map((p) => p.clientes?.nome).filter(Boolean)));
  }, [pedidos]);

  const getSummaryData = () => {
    const hoje = new Date().toISOString().split("T")[0];
    return {
      total: pedidos.length,
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Controle de Produção – Visão Geral
          </h1>
          <p className="text-muted-foreground">
            Acompanhe e atualize todos os pedidos em produção
          </p>
        </div>
        <Link to="/pedidos/novo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Pedido
          </Button>
        </Link>
      </div>

      {/* Cards de Resumo */}
      <PedidosSummaryCards
        total={summaryData.total}
        emProducao={summaryData.emProducao}
        concluidos={summaryData.concluidos}
        atrasados={summaryData.atrasados}
        onFilterClick={setStatusFilter}
        activeFilter={statusFilter}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="controle">Controle de Produção</TabsTrigger>
          <TabsTrigger value="concluidos">Pedidos Concluídos</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6">
          {/* Barra de busca e filtros */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Barra de busca */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar pedido por número, cliente, modelo ou tecido..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === "Escape" && setSearchTerm("")}
                    className="pl-10 pr-10"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                      onClick={() => setSearchTerm("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Filtros rápidos */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    Filtros
                  </Button>

                  {showFilters && (
                    <>
                      {/* Status */}
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px] h-9">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                          <SelectItem value="em_producao">Em produção</SelectItem>
                          <SelectItem value="atrasado">Atrasados</SelectItem>
                          <SelectItem value="proximo_prazo">Próximo do prazo</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Etapa */}
                      <Select value={etapaFilter} onValueChange={setEtapaFilter}>
                        <SelectTrigger className="w-[180px] h-9">
                          <SelectValue placeholder="Etapa" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todas">Todas as etapas</SelectItem>
                          {etapasDisponiveis.map((etapa) => (
                            <SelectItem key={etapa} value={etapa}>
                              {getEtapaLabel(etapa)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Cliente */}
                      <Select value={clienteFilter} onValueChange={setClienteFilter}>
                        <SelectTrigger className="w-[180px] h-9">
                          <SelectValue placeholder="Cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos os clientes</SelectItem>
                          {clientesDisponiveis.map((cliente) => (
                            <SelectItem key={cliente} value={cliente}>
                              {cliente}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}

                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetFilters}
                      className="text-muted-foreground"
                    >
                      Limpar filtros
                    </Button>
                  )}
                </div>

                {/* Contador */}
                <p className="text-sm text-muted-foreground">
                  Exibindo {filteredPedidos.length} de {activeTab === "controle" ? pedidos.filter(p => p.status_geral !== "concluido").length : pedidos.filter(p => p.status_geral === "concluido").length} pedidos
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Pedidos */}
          {filteredPedidos.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                {searchTerm || hasActiveFilters ? (
                  <>
                    <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="mb-2 text-lg font-semibold">
                      Nenhum pedido encontrado
                    </h3>
                    <p className="mb-4 text-muted-foreground">
                      Tente ajustar os filtros ou buscar por outro termo
                    </p>
                    <Button variant="outline" onClick={resetFilters}>
                      Limpar filtros
                    </Button>
                  </>
                ) : (
                  <>
                    <PackageIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="mb-2 text-lg font-semibold">
                      Nenhum pedido cadastrado
                    </h3>
                    <p className="mb-4 text-muted-foreground">
                      Comece criando seu primeiro pedido de produção
                    </p>
                    <Link to="/pedidos/novo">
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Criar Pedido
                      </Button>
                    </Link>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card/60 backdrop-blur-sm border-muted">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº Pedido</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Etapa Atual</TableHead>
                      <TableHead>Data Prevista</TableHead>
                      <TableHead>Status / SLA</TableHead>
                      {activeTab === "controle" && (
                        <>
                          <TableHead className="w-[300px]">Progresso</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPedidos.map((pedido) => {
                      const etapaAtual = pedido.etapas_producao?.find((e) => e.status === "em_andamento");
                      const temAtraso = temEtapaEmAtraso(pedido);
                      
                      return (
                        <TableRow
                          key={pedido.id}
                          className={`hover:bg-muted/50 cursor-pointer ${temAtraso ? "bg-destructive/5" : ""}`}
                          onClick={() => handleRowClick(pedido)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex flex-col gap-1">
                              <Badge variant="outline" className="font-mono text-xs w-fit">
                                #{pedido.id.slice(0, 8)}
                              </Badge>
                              {temAtraso && (
                                <div className="flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3 text-destructive" />
                                  <span className="text-xs text-destructive">
                                    {getEtapasAtrasadas(pedido).length} etapa(s) atrasada(s)
                                  </span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {pedido.clientes?.nome}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">{pedido.produto_modelo}</span>
                              <span className="text-xs text-muted-foreground">{pedido.tipo_peca}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {etapaAtual ? (
                              <Badge className={getEtapaBadgeColor(etapaAtual.tipo_etapa)}>
                                {getEtapaLabel(etapaAtual.tipo_etapa)}
                              </Badge>
                            ) : pedido.status_geral === "concluido" ? (
                              <Badge className="bg-green-500 hover:bg-green-600">
                                Concluído
                              </Badge>
                            ) : (
                              <Badge variant="outline">Aguardando início</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {format(new Date(pedido.prazo_final), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getSituacaoBadge(pedido)}
                          </TableCell>
                          {activeTab === "controle" && (
                            <>
                              <TableCell>
                                <div className="space-y-2">
                                  <Progress value={pedido.progresso_percentual} className="h-2" />
                                  <span className="text-xs text-muted-foreground">
                                    {pedido.progresso_percentual}% completo
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRowClick(pedido);
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="default"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const etapas = pedido.etapas_producao?.sort((a: any, b: any) => a.ordem - b.ordem);
                                      const etapaAtual = etapas?.find(
                                        (et: any) => et.status === "em_andamento"
                                      );
                                      
                                      if (etapaAtual) {
                                        const proximaEtapa = etapas?.find((et: any) => et.ordem === etapaAtual.ordem + 1);
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
                                </div>
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      );
                    })}
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
