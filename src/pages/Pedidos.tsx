import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Clock, Package as PackageIcon } from "lucide-react";

interface Pedido {
  id: string;
  produto_modelo: string;
  tipo_peca: string;
  quantidade_total: number;
  progresso_percentual: number;
  prazo_final: string;
  status_geral: string;
  created_at: string;
  clientes: {
    nome: string;
  };
}

export default function Pedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filteredPedidos, setFilteredPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  useEffect(() => {
    fetchPedidos();
  }, []);

  useEffect(() => {
    filterPedidos();
  }, [pedidos, searchTerm, statusFilter]);

  const fetchPedidos = async () => {
    try {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*, clientes(nome)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPedidos(data || []);
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterPedidos = () => {
    let filtered = pedidos;

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.produto_modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.clientes?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
      );
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

  const getStatusBadge = (pedido: Pedido) => {
    const hoje = new Date().toISOString().split("T")[0];
    const atrasado = pedido.prazo_final < hoje && pedido.status_geral !== "concluido";

    if (atrasado) {
      return (
        <Badge variant="destructive">
          <Clock className="mr-1 h-3 w-3" />
          Atrasado
        </Badge>
      );
    }

    if (pedido.status_geral === "concluido") {
      return <Badge className="bg-success text-success-foreground">Concluído</Badge>;
    }

    if (pedido.status_geral === "em_producao") {
      return <Badge className="bg-warning text-warning-foreground">Em Produção</Badge>;
    }

    return <Badge variant="secondary">Aguardando</Badge>;
  };

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
          <h1 className="text-3xl font-bold tracking-tight">Pedidos</h1>
          <p className="text-muted-foreground">
            Gerencie todos os pedidos de produção
          </p>
        </div>
        <Link to="/pedidos/novo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Pedido
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por produto ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="aguardando">Aguardando</SelectItem>
                <SelectItem value="em_producao">Em Produção</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="atrasado">Atrasados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPedidos.map((pedido) => (
            <Link key={pedido.id} to={`/pedidos/${pedido.id}`}>
              <Card className="transition-all hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">
                      {pedido.produto_modelo}
                    </CardTitle>
                    {getStatusBadge(pedido)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">
                      Cliente: <span className="font-medium text-foreground">{pedido.clientes?.nome}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Tipo: <span className="font-medium text-foreground">{pedido.tipo_peca}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Quantidade: <span className="font-medium text-foreground">{pedido.quantidade_total}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Prazo: <span className="font-medium text-foreground">
                        {new Date(pedido.prazo_final).toLocaleDateString("pt-BR")}
                      </span>
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Progresso</span>
                      <span className="font-semibold">
                        {pedido.progresso_percentual}%
                      </span>
                    </div>
                    <Progress value={pedido.progresso_percentual} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
