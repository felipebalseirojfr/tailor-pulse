import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users as UsersIcon, Mail, Phone, User } from "lucide-react";

interface Cliente {
  id: string;
  nome: string;
  contato: string | null;
  email: string | null;
  telefone: string | null;
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesComPedidos, setClientesComPedidos] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    nome: "",
    contato: "",
    email: "",
    telefone: "",
  });

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      const { data: clientesData, error: clientesError } = await supabase
        .from("clientes")
        .select("*")
        .order("nome");

      if (clientesError) throw clientesError;
      setClientes(clientesData || []);

      // Buscar clientes com pedidos ativos
      const { data: pedidosData, error: pedidosError } = await supabase
        .from("pedidos")
        .select("cliente_id, status_geral")
        .neq("status_geral", "concluido");

      if (pedidosError) throw pedidosError;

      const clientesAtivos = new Set(pedidosData?.map(p => p.cliente_id) || []);
      setClientesComPedidos(clientesAtivos);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase.from("clientes").insert([formData]);

      if (error) throw error;

      toast({
        title: "Cliente cadastrado!",
        description: "O cliente foi adicionado com sucesso.",
      });

      setDialogOpen(false);
      setFormData({ nome: "", contato: "", email: "", telefone: "" });
      fetchClientes();
    } catch (error: any) {
      toast({
        title: "Erro ao cadastrar cliente",
        description: error.message,
        variant: "destructive",
      });
    }
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
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie os clientes (marcas) da confecção
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Cadastrar Cliente</DialogTitle>
                <DialogDescription>
                  Adicione um novo cliente à sua lista
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Marca *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) =>
                      setFormData({ ...formData, nome: e.target.value })
                    }
                    placeholder="Ex: Marca Premium"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contato">Pessoa de Contato</Label>
                  <Input
                    id="contato"
                    value={formData.contato}
                    onChange={(e) =>
                      setFormData({ ...formData, contato: e.target.value })
                    }
                    placeholder="Ex: João Silva"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="contato@marca.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) =>
                      setFormData({ ...formData, telefone: e.target.value })
                    }
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">Cadastrar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {clientes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <UsersIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">
              Nenhum cliente cadastrado
            </h3>
            <p className="mb-4 text-muted-foreground">
              Comece adicionando seu primeiro cliente
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Cliente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Clientes com Pedidos Ativos */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">Clientes com Pedidos Ativos</h2>
            {clientes.filter(c => clientesComPedidos.has(c.id)).length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">Nenhum cliente com pedidos ativos</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {clientes
                  .filter(c => clientesComPedidos.has(c.id))
                  .map((cliente) => (
                    <Card key={cliente.id} className="border-primary/30">
                      <CardHeader>
                        <CardTitle className="text-lg">{cliente.nome}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {cliente.contato && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{cliente.contato}</span>
                          </div>
                        )}
                        {cliente.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">{cliente.email}</span>
                          </div>
                        )}
                        {cliente.telefone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{cliente.telefone}</span>
                          </div>
                        )}
                        {!cliente.contato && !cliente.email && !cliente.telefone && (
                          <p className="text-sm text-muted-foreground">
                            Sem informações de contato
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </div>

          {/* Clientes sem Pedido */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">Clientes sem Pedido</h2>
            {clientes.filter(c => !clientesComPedidos.has(c.id)).length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">Todos os clientes têm pedidos ativos</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {clientes
                  .filter(c => !clientesComPedidos.has(c.id))
                  .map((cliente) => (
                    <Card key={cliente.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">{cliente.nome}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {cliente.contato && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{cliente.contato}</span>
                          </div>
                        )}
                        {cliente.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">{cliente.email}</span>
                          </div>
                        )}
                        {cliente.telefone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{cliente.telefone}</span>
                          </div>
                        )}
                        {!cliente.contato && !cliente.email && !cliente.telefone && (
                          <p className="text-sm text-muted-foreground">
                            Sem informações de contato
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
