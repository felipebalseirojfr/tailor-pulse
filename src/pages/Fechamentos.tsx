import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, FileText, Loader2, Receipt, CheckCircle2, ClipboardCheck, FileCheck, Truck } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Fechamento {
  id: string;
  pedido_id: string;
  lote_of: string;
  referencia_id: string | null;
  status: string;
  status_nf: string | null;
  numero_nf: string | null;
  updated_at: string;
  pedidos: {
    codigo_pedido: string;
    produto_modelo: string;
    quantidade_total: number;
    grade_tamanhos: any;
    status_geral: string;
    preco_venda: number | null;
    composicao_tecido: string | null;
    clientes: {
      nome: string;
    };
  };
  referencias: {
    codigo_referencia: string;
  } | null;
}

type TabType = "fechamento" | "emissao_nf" | "entrega";

const Fechamentos = () => {
  const navigate = useNavigate();
  const [fechamentos, setFechamentos] = useState<Fechamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("fechamento");
  const [searchPedido, setSearchPedido] = useState("");
  const [searchCliente, setSearchCliente] = useState("");
  const [searchLote, setSearchLote] = useState("");

  useEffect(() => {
    fetchFechamentos();
  }, []);

  const fetchFechamentos = async () => {
    try {
      const { data, error } = await supabase
        .from("fechamentos")
        .select(`
          *,
          pedidos!inner(codigo_pedido, produto_modelo, quantidade_total, grade_tamanhos, status_geral, preco_venda, composicao_tecido, clientes!inner(nome)),
          referencias(codigo_referencia)
        `)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setFechamentos(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar fechamentos:", error);
      toast.error("Erro ao carregar fechamentos");
    } finally {
      setLoading(false);
    }
  };

  // Determinar qual aba o fechamento pertence
  const getTabForFechamento = (f: Fechamento): TabType => {
    // Aba ENTREGA: NF já emitida
    if (f.status_nf === "emitida") {
      return "entrega";
    }
    // Aba EMISSÃO DE NF: status em_conferencia ou fechado com NF pendente
    if (f.status === "em_conferencia" || f.status === "fechado") {
      return "emissao_nf";
    }
    // Aba FECHAMENTO: status em_aberto
    return "fechamento";
  };

  // Contadores por aba
  const getTabCounts = () => {
    const counts = { fechamento: 0, emissao_nf: 0, entrega: 0 };
    fechamentos.forEach((f) => {
      const tab = getTabForFechamento(f);
      counts[tab]++;
    });
    return counts;
  };

  const tabCounts = getTabCounts();

  // Filtrar por aba ativa e busca
  const filteredFechamentos = fechamentos.filter((f) => {
    const tab = getTabForFechamento(f);
    if (tab !== activeTab) return false;
    
    const matchPedido = !searchPedido || f.pedidos.codigo_pedido.toLowerCase().includes(searchPedido.toLowerCase());
    const matchCliente = !searchCliente || f.pedidos.clientes.nome.toLowerCase().includes(searchCliente.toLowerCase());
    const matchLote = !searchLote || f.lote_of.toLowerCase().includes(searchLote.toLowerCase());
    
    return matchPedido && matchCliente && matchLote;
  });

  const getStatusConfig = (status: string, statusNf: string | null) => {
    // Para aba ENTREGA
    if (statusNf === "emitida") {
      return { 
        color: "text-blue-600", 
        bgColor: "bg-blue-100 border-blue-300", 
        label: "Pronto para Entrega",
        icon: "📦"
      };
    }
    // Para aba EMISSÃO DE NF
    if (status === "em_conferencia" || status === "fechado") {
      return { 
        color: "text-yellow-600", 
        bgColor: "bg-yellow-100 border-yellow-300", 
        label: "Aguardando NF",
        icon: "📄"
      };
    }
    // Para aba FECHAMENTO
    return { 
      color: "text-red-600", 
      bgColor: "bg-red-100 border-red-300", 
      label: "Aguardando Conferência",
      icon: "🔴"
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Fechamento de Produção</h1>
        <p className="text-muted-foreground">Gerencie o fechamento, emissão de NF e entregas</p>
      </div>

      {/* Tabs principais */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="mb-6">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger 
            value="fechamento" 
            className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-3 data-[state=active]:bg-red-100 data-[state=active]:text-red-700"
          >
            <ClipboardCheck className="h-4 w-4" />
            <span className="text-xs sm:text-sm font-medium">FECHAMENTO</span>
            {tabCounts.fechamento > 0 && (
              <Badge variant="secondary" className="ml-1 bg-red-200 text-red-700">
                {tabCounts.fechamento}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="emissao_nf" 
            className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-3 data-[state=active]:bg-yellow-100 data-[state=active]:text-yellow-700"
          >
            <Receipt className="h-4 w-4" />
            <span className="text-xs sm:text-sm font-medium">EMISSÃO DE NF</span>
            {tabCounts.emissao_nf > 0 && (
              <Badge variant="secondary" className="ml-1 bg-yellow-200 text-yellow-700">
                {tabCounts.emissao_nf}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="entrega" 
            className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-3 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
          >
            <Truck className="h-4 w-4" />
            <span className="text-xs sm:text-sm font-medium">ENTREGA</span>
            {tabCounts.entrega > 0 && (
              <Badge variant="secondary" className="ml-1 bg-blue-200 text-blue-700">
                {tabCounts.entrega}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Descrição da aba */}
        <div className="mt-4 p-4 rounded-md bg-muted/50">
          {activeTab === "fechamento" && (
            <p className="text-sm text-muted-foreground">
              <strong>Conferência de quantidades:</strong> Atualize as quantidades produzidas, anexe fotos do caderno e clique em "CONFERIDO" para avançar.
            </p>
          )}
          {activeTab === "emissao_nf" && (
            <p className="text-sm text-muted-foreground">
              <strong>Emissão de Nota Fiscal:</strong> Preencha os dados da NF (número, data, valor e link do XML) e clique em "EMITIDO" para finalizar.
            </p>
          )}
          {activeTab === "entrega" && (
            <p className="text-sm text-muted-foreground">
              <strong>Pronto para Entrega:</strong> Pedidos com NF emitida aguardando entrega ao cliente.
            </p>
          )}
        </div>

        {/* Filtros */}
        <Card className="mt-4">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por pedido..."
                  value={searchPedido}
                  onChange={(e) => setSearchPedido(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente..."
                  value={searchCliente}
                  onChange={(e) => setSearchCliente(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por lote/OF..."
                  value={searchLote}
                  onChange={(e) => setSearchLote(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conteúdo das Tabs */}
        <TabsContent value={activeTab} className="mt-4">
          {filteredFechamentos.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum item nesta fase</h3>
                <p className="text-sm text-muted-foreground text-center">
                  {activeTab === "fechamento" && "Os pedidos concluídos aparecerão aqui para conferência."}
                  {activeTab === "emissao_nf" && "Os pedidos conferidos aparecerão aqui para emissão de NF."}
                  {activeTab === "entrega" && "Os pedidos com NF emitida aparecerão aqui."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFechamentos.map((fechamento) => {
                const statusConfig = getStatusConfig(fechamento.status, fechamento.status_nf);
                const isFaturado = fechamento.pedidos.status_geral === "faturado";
                
                return (
                  <Card
                    key={fechamento.id}
                    className={`cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 ${statusConfig.bgColor}`}
                    onClick={() => navigate(`/pcp/fechamentos/${fechamento.id}`)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 flex-1">
                          <span className="text-2xl mt-0.5">{statusConfig.icon}</span>
                          <div className="flex-1">
                            <CardTitle className="text-base mb-1 flex items-center gap-2">
                              {fechamento.pedidos.produto_modelo}
                              {isFaturado && (
                                <Badge variant="default" className="bg-blue-600">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Faturado
                                </Badge>
                              )}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground font-medium">
                              {fechamento.pedidos.clientes.nome}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Lote/OF: {fechamento.lote_of}
                            </p>
                          </div>
                        </div>
                        <Badge className={`${statusConfig.color} ${statusConfig.bgColor} border text-xs`}>
                          {statusConfig.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="bg-background/50 rounded-lg p-3 space-y-2 mb-3">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Pedido:</span>
                            <span className="font-semibold">{fechamento.pedidos.codigo_pedido}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Quantidade:</span>
                            <span className="font-semibold">{fechamento.pedidos.quantidade_total} un</span>
                          </div>
                          {fechamento.numero_nf && (
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">NF:</span>
                              <span className="font-semibold">{fechamento.numero_nf}</span>
                            </div>
                          )}
                          {fechamento.pedidos.preco_venda && (
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Preço Unit.:</span>
                              <span className="font-semibold">
                                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(fechamento.pedidos.preco_venda)}
                              </span>
                            </div>
                          )}
                        </div>
                        {fechamento.referencias && (
                          <p className="text-muted-foreground">
                            <span className="font-medium">Ref:</span> {fechamento.referencias.codigo_referencia}
                          </p>
                        )}
                        <p className="text-muted-foreground">
                          <span className="font-medium">Atualizado:</span>{" "}
                          {format(new Date(fechamento.updated_at), "dd/MM/yyyy HH:mm")}
                        </p>
                      </div>
                      <Button variant="ghost" className="w-full mt-4">
                        {activeTab === "fechamento" && "Conferir"}
                        {activeTab === "emissao_nf" && "Emitir NF"}
                        {activeTab === "entrega" && "Ver Detalhes"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Fechamentos;
