import { useEffect, useState, useMemo } from "react";
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
import { Plus, Users as UsersIcon, Mail, Phone, User, Pencil, Trash2, Search, X, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null);
  const { toast } = useToast();

  // Estados de busca e filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    comPedidos: "todos", // todos, com, sem
  });

  const [formData, setFormData] = useState({
    nome: "",
    contato: "",
    email: "",
    telefone: "",
  });

  // Debounce para busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchClientes();

    // Configurar listener de mudanças em tempo real
    const clientesChannel = supabase
      .channel('clientes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clientes'
        },
        (payload) => {
          console.log('Mudança detectada em clientes:', payload);
          // Não buscar novamente em DELETEs, pois já tratamos otimisticamente
          if (payload.eventType !== 'DELETE') {
            fetchClientes();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(clientesChannel);
    };
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
      if (editingCliente) {
        // Atualizar cliente existente
        const { error } = await supabase
          .from("clientes")
          .update(formData)
          .eq("id", editingCliente.id);

        if (error) throw error;

        toast({
          title: "Cliente atualizado!",
          description: "As informações foram salvas com sucesso.",
        });
      } else {
        // Criar novo cliente
        const { error } = await supabase.from("clientes").insert([formData]);

        if (error) throw error;

        toast({
          title: "Cliente cadastrado!",
          description: "O cliente foi adicionado com sucesso.",
        });
      }

      setDialogOpen(false);
      setEditingCliente(null);
      setFormData({ nome: "", contato: "", email: "", telefone: "" });
      fetchClientes();
    } catch (error: any) {
      toast({
        title: editingCliente ? "Erro ao atualizar cliente" : "Erro ao cadastrar cliente",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setFormData({
      nome: cliente.nome,
      contato: cliente.contato || "",
      email: cliente.email || "",
      telefone: cliente.telefone || "",
    });
    setDialogOpen(true);
  };

  const handleDeleteClick = async (cliente: Cliente) => {
    // Verificar se o cliente tem pedidos
    const { data: pedidos, error } = await supabase
      .from("pedidos")
      .select("id")
      .eq("cliente_id", cliente.id);

    if (error) {
      console.error("Erro ao verificar pedidos:", error);
      toast({
        title: "Erro",
        description: "Não foi possível verificar os pedidos do cliente.",
        variant: "destructive",
      });
      return;
    }

    if (pedidos && pedidos.length > 0) {
      toast({
        title: "Não é possível excluir",
        description: `Este cliente possui ${pedidos.length} pedido(s) cadastrado(s). Exclua os pedidos primeiro.`,
        variant: "destructive",
      });
      return;
    }

    // Se não tem pedidos, abrir dialog de confirmação
    setClienteToDelete(cliente);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!clienteToDelete) return;

    try {
      const { error } = await supabase
        .from("clientes")
        .delete()
        .eq("id", clienteToDelete.id);

      if (error) {
        console.error("Erro ao deletar cliente:", error);
        throw error;
      }

      // Remover da lista imediatamente (atualização otimista)
      setClientes(prev => prev.filter(c => c.id !== clienteToDelete.id));

      toast({
        title: "Cliente excluído!",
        description: "O cliente foi removido com sucesso.",
      });

      setDeleteDialogOpen(false);
      setClienteToDelete(null);
      
      // O listener real-time vai atualizar automaticamente (para outros casos)
    } catch (error: any) {
      console.error("Erro completo:", error);
      toast({
        title: "Erro ao excluir cliente",
        description: error.message || "Ocorreu um erro ao tentar excluir o cliente.",
        variant: "destructive",
      });
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingCliente(null);
      setFormData({ nome: "", contato: "", email: "", telefone: "" });
    }
  };

  // Lógica de busca e filtros
  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setSearchQuery("");
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setFilters({ comPedidos: "todos" });
  };

  // Contar pedidos ativos por cliente
  const pedidosCount = useMemo(() => {
    const countMap = new Map<string, number>();
    clientes.forEach(cliente => {
      countMap.set(cliente.id, clientesComPedidos.has(cliente.id) ? 1 : 0);
    });
    return countMap;
  }, [clientes, clientesComPedidos]);

  // Filtragem com useMemo
  const clientesFiltrados = useMemo(() => {
    return clientes.filter(cliente => {
      // Busca
      const searchLower = debouncedSearch.toLowerCase();
      const matchesSearch = 
        cliente.nome.toLowerCase().includes(searchLower) ||
        cliente.email?.toLowerCase().includes(searchLower) ||
        cliente.telefone?.includes(debouncedSearch) ||
        cliente.contato?.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // Filtro de pedidos
      if (filters.comPedidos === "com" && !clientesComPedidos.has(cliente.id)) return false;
      if (filters.comPedidos === "sem" && clientesComPedidos.has(cliente.id)) return false;

      return true;
    });
  }, [clientes, debouncedSearch, filters, clientesComPedidos]);

  const clientesFiltradosComPedidos = clientesFiltrados.filter(c => clientesComPedidos.has(c.id));
  const clientesFiltradosSemPedidos = clientesFiltrados.filter(c => !clientesComPedidos.has(c.id));

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
        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingCliente ? "Editar Cliente" : "Cadastrar Cliente"}
                </DialogTitle>
                <DialogDescription>
                  {editingCliente
                    ? "Atualize as informações do cliente"
                    : "Adicione um novo cliente à sua lista"}
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
                  onClick={() => handleDialogClose(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingCliente ? "Salvar" : "Cadastrar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Barra de busca e filtros */}
      {clientes.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Barra de busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar cliente por nome, e-mail, telefone ou contato..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Filtros */}
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
                    <Button
                      variant={filters.comPedidos === "todos" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilters({ ...filters, comPedidos: "todos" })}
                    >
                      Todos
                    </Button>
                    <Button
                      variant={filters.comPedidos === "com" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilters({ ...filters, comPedidos: "com" })}
                    >
                      Com Pedidos
                    </Button>
                    <Button
                      variant={filters.comPedidos === "sem" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilters({ ...filters, comPedidos: "sem" })}
                    >
                      Sem Pedidos
                    </Button>
                  </>
                )}

                {(searchQuery || filters.comPedidos !== "todos") && (
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
                Exibindo {clientesFiltrados.length} de {clientes.length} clientes
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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
      ) : clientesFiltrados.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">
              Nenhum cliente encontrado
            </h3>
            <p className="mb-4 text-muted-foreground">
              Tente ajustar os filtros ou buscar por outro termo
            </p>
            <Button variant="outline" onClick={resetFilters}>
              Limpar filtros
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Clientes com Pedidos Ativos */}
          {(filters.comPedidos === "todos" || filters.comPedidos === "com") && clientesFiltradosComPedidos.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">
                Clientes com Pedidos Ativos
                <Badge variant="secondary" className="ml-2">
                  {clientesFiltradosComPedidos.length}
                </Badge>
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {clientesFiltradosComPedidos.map((cliente) => (
                  <Card key={cliente.id} className="border-primary/30">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{cliente.nome}</CardTitle>
                          <Badge variant="default" className="mt-1 bg-green-500 hover:bg-green-600">
                            🟢 Pedidos ativos
                          </Badge>
                        </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(cliente)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteClick(cliente)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                      </div>
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
            </div>
          )}

          {/* Clientes sem Pedido */}
          {(filters.comPedidos === "todos" || filters.comPedidos === "sem") && clientesFiltradosSemPedidos.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">
                Clientes sem Pedido
                <Badge variant="outline" className="ml-2">
                  {clientesFiltradosSemPedidos.length}
                </Badge>
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {clientesFiltradosSemPedidos.map((cliente) => (
                  <Card key={cliente.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{cliente.nome}</CardTitle>
                          <Badge variant="outline" className="mt-1">
                            ⚪ Sem pedidos
                          </Badge>
                        </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(cliente)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteClick(cliente)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                      </div>
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
            </div>
          )}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente{" "}
              <strong>{clienteToDelete?.nome}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
