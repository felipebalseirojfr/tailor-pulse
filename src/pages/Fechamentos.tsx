import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Fechamento {
  id: string;
  pedido_id: string;
  lote_of: string;
  referencia_id: string | null;
  status: string;
  updated_at: string;
  pedidos: {
    codigo_pedido: string;
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

  useEffect(() => {
    fetchFechamentos();
  }, []);

  const fetchFechamentos = async () => {
    try {
      const { data, error } = await supabase
        .from("fechamentos")
        .select(`
          *,
          pedidos!inner(codigo_pedido),
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      em_aberto: { variant: "secondary", label: "Em Aberto" },
      em_conferencia: { variant: "default", label: "Em Conferência" },
      fechado: { variant: "outline", label: "Fechado" }
    };
    return variants[status] || variants.em_aberto;
  };

  const filteredFechamentos = fechamentos.filter((f) => {
    const matchPedido = !searchPedido || f.pedidos.codigo_pedido.toLowerCase().includes(searchPedido.toLowerCase());
    const matchLote = !searchLote || f.lote_of.toLowerCase().includes(searchLote.toLowerCase());
    const matchStatus = !searchStatus || f.status === searchStatus;
    return matchPedido && matchLote && matchStatus;
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
        <h1 className="text-3xl font-bold mb-2">Fechamento/Emissão NF</h1>
        <p className="text-muted-foreground">Gerencie os fechamentos de produção e conferências</p>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
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
              <option value="">Todos os status</option>
              <option value="em_aberto">Em Aberto</option>
              <option value="em_conferencia">Em Conferência</option>
              <option value="fechado">Fechado</option>
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
            const statusInfo = getStatusBadge(fechamento.status);
            return (
              <Card
                key={fechamento.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/pcp/fechamentos/${fechamento.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base mb-1">
                        {fechamento.pedidos.codigo_pedido}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Lote/OF: {fechamento.lote_of}
                      </p>
                    </div>
                    <Badge variant={statusInfo.variant}>
                      {statusInfo.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
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
