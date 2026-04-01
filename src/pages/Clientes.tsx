import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users as UsersIcon, Mail, Phone, User, Pencil, Trash2, UsersRound } from "lucide-react";
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

const ETAPAS_NOMES: Record<string, string> = {
  pilotagem: "Pilotagem",
  compra_de_insumos: "Compra de Insumos",
  lacre_piloto: "Lacre Piloto",
  liberacao_corte: "Liberação de Corte",
  corte: "Corte",
  lavanderia: "Lavanderia",
  costura: "Costura",
  caseado: "Caseado",
  estamparia_bordado: "Estamparia/Bordado",
  estamparia: "Estamparia",
  bordado: "Bordado",
  personalizacao: "Personalização",
  acabamento: "Acabamento",
  entrega: "Entrega",
};

interface Cliente {
  id: string;
  nome: string;
  contato: string | null;
  email: string | null;
  telefone: string | null;
}

interface Terceiro {
  id: string;
  nome: string;
  tipo_etapa: string;
  ativo: boolean;
}

export default function Clientes() {
  // ── Clientes ──
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesComPedidos, setClientesComPedidos] = useState<Set<string>>(new Set());
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [dialogClienteOpen, setDialogClienteOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [deleteClienteOpen, setDeleteClienteOpen] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null);
  const [formCliente, setFormCliente] = useState({ nome: "", contato: "", email: "", telefone: "" });

  // ── Terceiros ──
  const [terceiros, setTerceiros] = useState<Terceiro[]>([]);
  const [loadingTerceiros, setLoadingTerceiros] = useState(true);
  const [formTerceiroOpen, setFormTerceiroOpen] = useState(false);
  const [editingTerceiro, setEditingTerceiro] = useState<Terceiro | null>(null);
  const [deleteTerceiroOpen, setDeleteTerceiroOpen] = useState(false);
  const [terceiroToDelete, setTerceiroToDelete] = useState<Terceiro | null>(null);
  const [nomeTerceiro, setNomeTerceiro] = useState("");
  const [tipoEtapa, setTipoEtapa] = useState("");
  const [salvandoTerceiro, setSalvandoTerceiro] = useState(false);
  const [filtroEtapa, setFiltroEtapa] = useState("todos");

  const { toast } = useToast();

  useEffect(() => {
    fetchClientes();
    fetchTerceiros();

    const clientesChannel = supabase
      .channel('clientes-changes-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, (payload) => {
        if (payload.eventType !== 'DELETE') fetchClientes();
      })
      .subscribe();

    return () => { supabase.removeChannel(clientesChannel); };
  }, []);

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase.from("clientes").select("*").order("nome");
      if (error) throw error;
      setClientes(data || []);
      const { data: pedidos } = await supabase.from("pedidos").select("cliente_id, status_geral").neq("status_geral", "concluido");
      setClientesComPedidos(new Set(pedidos?.map(p => p.cliente_id) || []));
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
    } finally {
      setLoadingClientes(false);
    }
  };

  const fetchTerceiros = async () => {
    try {
      const { data, error } = await (supabase.from("terceiros") as any).select("*").order("tipo_etapa").order("nome");
      if (error) throw error;
      setTerceiros((data || []) as Terceiro[]);
    } catch (error) {
      console.error("Erro ao buscar terceiros:", error);
    } finally {
      setLoadingTerceiros(false);
    }
  };

  const handleSubmitCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCliente) {
        const { error } = await supabase.from("clientes").update(formCliente).eq("id", editingCliente.id);
        if (error) throw error;
        toast({ title: "Cliente atualizado!" });
      } else {
        const { error } = await supabase.from("clientes").insert([formCliente]);
        if (error) throw error;
        toast({ title: "Cliente cadastrado!" });
      }
      setDialogClienteOpen(false);
      setEditingCliente(null);
      setFormCliente({ nome: "", contato: "", email: "", telefone: "" });
      fetchClientes();
    } catch (error: any) {
      toast({ title: "Erro ao salvar cliente", description: error.message, variant: "destructive" });
    }
  };

  const handleEditCliente = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setFormCliente({ nome: cliente.nome, contato: cliente.contato || "", email: cliente.email || "", telefone: cliente.telefone || "" });
    setDialogClienteOpen(true);
  };

  const handleDeleteClienteClick = async (cliente: Cliente) => {
    const { data: pedidos, error } = await supabase.from("pedidos").select("id").eq("cliente_id", cliente.id);
    if (error) return;
    if (pedidos && pedidos.length > 0) {
      toast({ title: "Não é possível excluir", description: `Este cliente possui ${pedidos.length} pedido(s). Exclua os pedidos primeiro.`, variant: "destructive" });
      return;
    }
    setClienteToDelete(cliente);
    setDeleteClienteOpen(true);
  };

  const handleDeleteClienteConfirm = async () => {
    if (!clienteToDelete) return;
    try {
      const { error } = await supabase.from("clientes").delete().eq("id", clienteToDelete.id);
      if (error) throw error;
      setClientes(prev => prev.filter(c => c.id !== clienteToDelete.id));
      toast({ title: "Cliente excluído!" });
      setDeleteClienteOpen(false);
      setClienteToDelete(null);
    } catch (error: any) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    }
  };

  const abrirNovoTerceiro = () => {
    setEditingTerceiro(null);
    setNomeTerceiro("");
    setTipoEtapa("");
    setFormTerceiroOpen(true);
  };

  const abrirEditarTerceiro = (terceiro: Terceiro) => {
    setEditingTerceiro(terceiro);
    setNomeTerceiro(terceiro.nome);
    setTipoEtapa(terceiro.tipo_etapa);
    setFormTerceiroOpen(true);
  };

  const salvarTerceiro = async () => {
    if (!nomeTerceiro.trim() || !tipoEtapa) {
      toast({ title: "Preencha o nome e a etapa.", variant: "destructive" });
      return;
    }
    setSalvandoTerceiro(true);
    try {
      if (editingTerceiro) {
        const { error } = await (supabase.from("terceiros") as any).update({ nome: nomeTerceiro.trim(), tipo_etapa: tipoEtapa }).eq("id", editingTerceiro.id);
        if (error) throw error;
        toast({ title: "Terceiro atualizado!" });
      } else {
        const { error } = await (supabase.from("terceiros") as any).insert({ nome: nomeTerceiro.trim(), tipo_etapa: tipoEtapa });
        if (error) throw error;
        toast({ title: "Terceiro cadastrado!" });
      }
      setFormTerceiroOpen(false);
      fetchTerceiros();
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setSalvandoTerceiro(false);
    }
  };

  const deletarTerceiro = async () => {
    if (!terceiroToDelete) return;
    try {
      const { error } = await supabase.from("terceiros").delete().eq("id", terceiroToDelete.id);
      if (error) throw error;
      toast({ title: "Terceiro removido." });
      fetchTerceiros();
    } catch (error: any) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    } finally {
      setDeleteTerceiroOpen(false);
      setTerceiroToDelete(null);
    }
  };

  const toggleAtivoTerceiro = async (terceiro: Terceiro) => {
    const { error } = await supabase.from("terceiros").update({ ativo: !terceiro.ativo }).eq("id", terceiro.id);
    if (!error) fetchTerceiros();
  };

  const etapasComTerceiros = [...new Set(terceiros.map((t) => t.tipo_etapa))];
  const terceirosFiltrados = filtroEtapa === "todos" ? terceiros : terceiros.filter((t) => t.tipo_etapa === filtroEtapa);

  const ClienteCard = ({ cliente }: { cliente: Cliente }) => (
    <Card className={clientesComPedidos.has(cliente.id) ? "border-primary/30" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{cliente.nome}</CardTitle>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditCliente(cliente)}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteClienteClick(cliente)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {cliente.contato && <div className="flex items-center gap-2 text-sm"><User className="h-4 w-4 text-muted-foreground" /><span>{cliente.contato}</span></div>}
        {cliente.email && <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /><span className="truncate">{cliente.email}</span></div>}
        {cliente.telefone && <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /><span>{cliente.telefone}</span></div>}
        {!cliente.contato && !cliente.email && !cliente.telefone && <p className="text-sm text-muted-foreground">Sem informações de contato</p>}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cadastros</h1>
        <p className="text-muted-foreground">Gerencie clientes e fornecedores externos</p>
      </div>

      <Tabs defaultValue="clientes">
        <TabsList className="mb-4">
          <TabsTrigger value="clientes" className="gap-2">
            <UsersIcon className="h-4 w-4" />
            Clientes ({clientes.length})
          </TabsTrigger>
          <TabsTrigger value="terceiros" className="gap-2">
            <UsersRound className="h-4 w-4" />
            Terceiros ({terceiros.length})
          </TabsTrigger>
        </TabsList>

        {/* ABA CLIENTES */}
        <TabsContent value="clientes">
          <div className="space-y-6">
            <div className="flex justify-end">
              <Dialog open={dialogClienteOpen} onOpenChange={(open) => { setDialogClienteOpen(open); if (!open) { setEditingCliente(null); setFormCliente({ nome: "", contato: "", email: "", telefone: "" }); } }}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-2 h-4 w-4" />Novo Cliente</Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleSubmitCliente}>
                    <DialogHeader>
                      <DialogTitle>{editingCliente ? "Editar Cliente" : "Cadastrar Cliente"}</DialogTitle>
                      <DialogDescription>{editingCliente ? "Atualize as informações do cliente" : "Adicione um novo cliente à sua lista"}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="nome">Nome da Marca *</Label>
                        <Input id="nome" value={formCliente.nome} onChange={(e) => setFormCliente({ ...formCliente, nome: e.target.value })} placeholder="Ex: Marca Premium" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contato">Pessoa de Contato</Label>
                        <Input id="contato" value={formCliente.contato} onChange={(e) => setFormCliente({ ...formCliente, contato: e.target.value })} placeholder="Ex: João Silva" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={formCliente.email} onChange={(e) => setFormCliente({ ...formCliente, email: e.target.value })} placeholder="contato@marca.com" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="telefone">Telefone</Label>
                        <Input id="telefone" value={formCliente.telefone} onChange={(e) => setFormCliente({ ...formCliente, telefone: e.target.value })} placeholder="(11) 99999-9999" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setDialogClienteOpen(false)}>Cancelar</Button>
                      <Button type="submit">{editingCliente ? "Salvar" : "Cadastrar"}</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {loadingClientes ? (
              <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
            ) : clientes.length === 0 ? (
              <Card><CardContent className="py-16 text-center"><UsersIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" /><h3 className="mb-2 text-lg font-semibold">Nenhum cliente cadastrado</h3><Button onClick={() => setDialogClienteOpen(true)}><Plus className="mr-2 h-4 w-4" />Adicionar Cliente</Button></CardContent></Card>
            ) : (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-semibold mb-4">Com Pedidos Ativos</h2>
                  {clientes.filter(c => clientesComPedidos.has(c.id)).length === 0 ? (
                    <Card><CardContent className="py-8 text-center"><p className="text-muted-foreground">Nenhum cliente com pedidos ativos</p></CardContent></Card>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {clientes.filter(c => clientesComPedidos.has(c.id)).map(c => <ClienteCard key={c.id} cliente={c} />)}
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-4">Sem Pedido Ativo</h2>
                  {clientes.filter(c => !clientesComPedidos.has(c.id)).length === 0 ? (
                    <Card><CardContent className="py-8 text-center"><p className="text-muted-foreground">Todos os clientes têm pedidos ativos</p></CardContent></Card>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {clientes.filter(c => !clientesComPedidos.has(c.id)).map(c => <ClienteCard key={c.id} cliente={c} />)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ABA TERCEIROS */}
        <TabsContent value="terceiros">
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-2 flex-wrap">
                <Button variant={filtroEtapa === "todos" ? "default" : "outline"} size="sm" onClick={() => setFiltroEtapa("todos")}>
                  Todos ({terceiros.length})
                </Button>
                {etapasComTerceiros.map((etapa) => (
                  <Button key={etapa} variant={filtroEtapa === etapa ? "default" : "outline"} size="sm" onClick={() => setFiltroEtapa(etapa)}>
                    {ETAPAS_NOMES[etapa] || etapa} ({terceiros.filter(t => t.tipo_etapa === etapa).length})
                  </Button>
                ))}
              </div>
              <Button onClick={abrirNovoTerceiro} className="gap-2 shrink-0">
                <Plus className="h-4 w-4" />Novo Terceiro
              </Button>
            </div>

            {loadingTerceiros ? (
              <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
            ) : terceirosFiltrados.length === 0 ? (
              <Card><CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground"><UsersRound className="h-12 w-12 mb-3 opacity-20" /><p className="font-medium">Nenhum terceiro cadastrado</p><p className="text-sm">Clique em "Novo Terceiro" para começar</p></CardContent></Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {terceirosFiltrados.map((terceiro) => (
                  <Card key={terceiro.id} className={`transition-opacity ${!terceiro.ativo ? "opacity-50" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold truncate">{terceiro.nome}</p>
                            {!terceiro.ativo && <Badge variant="secondary" className="text-xs shrink-0">Inativo</Badge>}
                          </div>
                          <Badge variant="outline" className="text-xs">{ETAPAS_NOMES[terceiro.tipo_etapa] || terceiro.tipo_etapa}</Badge>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => abrirEditarTerceiro(terceiro)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => { setTerceiroToDelete(terceiro); setDeleteTerceiroOpen(true); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="w-full mt-2 text-xs h-7" onClick={() => toggleAtivoTerceiro(terceiro)}>
                        {terceiro.ativo ? "Desativar" : "Ativar"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal terceiro */}
      <AlertDialog open={formTerceiroOpen} onOpenChange={setFormTerceiroOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{editingTerceiro ? "Editar Terceiro" : "Novo Terceiro"}</AlertDialogTitle>
            <AlertDialogDescription>Preencha o nome e a etapa que este fornecedor atende.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome *</label>
              <Input placeholder="Ex: Costureira Maria" value={nomeTerceiro} onChange={(e) => setNomeTerceiro(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Etapa *</label>
              <Select value={tipoEtapa} onValueChange={setTipoEtapa}>
                <SelectTrigger><SelectValue placeholder="Selecione a etapa" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ETAPAS_NOMES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={salvarTerceiro} disabled={salvandoTerceiro}>
              {salvandoTerceiro ? "Salvando..." : editingTerceiro ? "Salvar" : "Cadastrar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmar exclusão terceiro */}
      <AlertDialog open={deleteTerceiroOpen} onOpenChange={setDeleteTerceiroOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover terceiro?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deletarTerceiro} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmar exclusão cliente */}
      <AlertDialog open={deleteClienteOpen} onOpenChange={setDeleteClienteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir <strong>{clienteToDelete?.nome}</strong>? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClienteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
