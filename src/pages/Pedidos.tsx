import { useEffect, useState } from "react";
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
import { Plus, Search, Package as PackageIcon, ChevronRight } from "lucide-react";
import { PedidosSummaryCards } from "@/components/pedidos/PedidosSummaryCards";
import { PedidoDetailsSheet } from "@/components/pedidos/PedidoDetailsSheet";
import { EtapasVisuais } from "@/components/pedidos/EtapasVisuais";
import { FiltroAvancado } from "@/components/pedidos/FiltroAvancado";
import { toast } from "sonner";
import { format } from "date-fns";
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

  useEffect(() => {
    fetchPedidos();
  }, []);

  useEffect(() => {
    filterPedidos();
  }, [pedidos, searchTerm, statusFilter, marcaFilter, referenciaFilter, opFilter, activeTab]);

  const fetchPedidos = async () => {
    try {
      const { data, error } = await supabase
        .from("pedidos")
        .select(`
          *,
          clientes(nome),
          profiles(nome),
          etapas_producao(id, tipo_etapa, status, ordem, data_inicio, data_termino, observacoes)
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

  const filterPedidos = () => {
    let filtered = pedidos;

    // Filtrar por aba ativa
    if (activeTab === "controle") {
      filtered = filtered.filter((p) => p.status_geral !== "concluido");
    } else {
      filtered = filtered.filter((p) => p.status_geral === "concluido");
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
      lacre_piloto: "Lacre de Piloto",
      liberacao_corte: "Liberação de Corte",
      corte: "Corte",
      estampa: "Estampa",
      bordado: "Bordado",
      lavado: "Lavado",
      costura: "Costura",
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
          {/* Filtros */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex flex-col gap-4 md:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar em todos os campos..."
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
                        <SelectItem value="em_producao">Em Produção</SelectItem>
                        <SelectItem value="atrasado">Atrasados</SelectItem>
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
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Pedidos */}
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
            {pedidos.length === 0 && (
              <Link to="/pedidos/novo">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Pedido
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
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
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={(e) => {
                              e.stopPropagation();
                              const etapas = pedido.etapas_producao?.sort((a: any, b: any) => a.ordem - b.ordem);
                              const etapaAtual = etapas?.find(
                                (et: any) => et.status === "em_andamento"
                              );
                              
                              if (etapaAtual) {
                                // Se há etapa em andamento, avançar para a próxima
                                const proximaEtapa = etapas?.find((et: any) => et.ordem === etapaAtual.ordem + 1);
                                handleAtualizarEtapa(
                                  pedido.id,
                                  proximaEtapa ? proximaEtapa.tipo_etapa : "concluido"
                                );
                              } else {
                                // Se não há etapa em andamento (aguardando início), iniciar a primeira etapa
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
      />
    </div>
  );
}
