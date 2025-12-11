import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, FileText, Loader2, Receipt, CheckCircle2 } from "lucide-react";
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

const Fechamentos = () => {
  const navigate = useNavigate();
  const [fechamentos, setFechamentos] = useState<Fechamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchPedido, setSearchPedido] = useState("");
  const [searchLote, setSearchLote] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [searchStatusNf, setSearchStatusNf] = useState("");
  const [searchCliente, setSearchCliente] = useState("");

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

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; bgColor: string; label: string; icon: string }> = {
      em_aberto: { 
        color: "text-red-600", 
        bgColor: "bg-red-100 border-red-300", 
        label: "Em Aberto",
        icon: "🔴"
      },
      em_conferencia: { 
        color: "text-yellow-600", 
        bgColor: "bg-yellow-100 border-yellow-300", 
        label: "Em Conferência",
        icon: "🟡"
      },
      fechado: { 
        color: "text-green-600", 
        bgColor: "bg-green-100 border-green-300", 
        label: "Fechado",
        icon: "🟢"
      }
    };
    return configs[status] || configs.em_aberto;
  };

  const getStatusNfConfig = (statusNf: string | null) => {
    if (statusNf === "emitida") {
      return { label: "NF Emitida", color: "text-green-600", bgColor: "bg-green-100" };
    }
    return { label: "NF Pendente", color: "text-orange-600", bgColor: "bg-orange-100" };
  };

  const filteredFechamentos = fechamentos.filter((f) => {
    const matchPedido = !searchPedido || f.pedidos.codigo_pedido.toLowerCase().includes(searchPedido.toLowerCase());
    const matchLote = !searchLote || f.lote_of.toLowerCase().includes(searchLote.toLowerCase());
    const matchStatus = !searchStatus || f.status === searchStatus;
    const matchStatusNf = !searchStatusNf || (f.status_nf || "pendente") === searchStatusNf;
    const matchCliente = !searchCliente || f.pedidos.clientes.nome.toLowerCase().includes(searchCliente.toLowerCase());
    return matchPedido && matchLote && matchStatus && matchStatusNf && matchCliente;
  });

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
        <h1 className="text-3xl font-bold mb-2">Fechamento / Emissão NF</h1>
        <p className="text-muted-foreground">Gerencie os fechamentos de produção e notas fiscais</p>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              value={searchStatus}
              onChange={(e) => setSearchStatus(e.target.value)}
            >
              <option value="">Status Fechamento</option>
              <option value="em_aberto">Em Aberto</option>
              <option value="em_conferencia">Em Conferência</option>
              <option value="fechado">Fechado</option>
            </select>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              value={searchStatusNf}
              onChange={(e) => setSearchStatusNf(e.target.value)}
            >
              <option value="">Status NF</option>
              <option value="pendente">NF Pendente</option>
              <option value="emitida">NF Emitida</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Fechamentos */}
      {filteredFechamentos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum fechamento encontrado</h3>
            <p className="text-sm text-muted-foreground text-center">
              Os fechamentos serão criados automaticamente quando os pedidos forem concluídos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFechamentos.map((fechamento) => {
            const statusConfig = getStatusConfig(fechamento.status);
            const statusNfConfig = getStatusNfConfig(fechamento.status_nf);
            const isFaturado = fechamento.pedidos.status_geral === "faturado";
            
            return (
              <Card
                key={fechamento.id}
                className={`cursor-pointer hover:shadow-lg transition-all duration-300 border-2 ${statusConfig.bgColor}`}
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
                    <div className="flex flex-col gap-1">
                      <Badge className={`${statusConfig.color} ${statusConfig.bgColor} border`}>
                        {statusConfig.label}
                      </Badge>
                      <Badge className={`${statusNfConfig.color} ${statusNfConfig.bgColor} border text-xs`}>
                        <Receipt className="h-3 w-3 mr-1" />
                        {statusNfConfig.label}
                      </Badge>
                    </div>
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
                    Ver Detalhes
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Fechamentos;