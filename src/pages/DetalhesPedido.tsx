import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  Circle,
  PlayCircle,
  Trash2,
  Edit,
} from "lucide-react";
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
import { QRCodeDisplay } from "@/components/pedidos/QRCodeDisplay";
import { HistoricoEscaneamentos } from "@/components/pedidos/HistoricoEscaneamentos";
import { HistoricoAuditoria } from "@/components/pedidos/HistoricoAuditoria";
import { useUserRoles } from "@/hooks/useUserRoles";

interface Pedido {
  id: string;
  produto_modelo: string;
  tipo_peca: string;
  tecido: string;
  aviamentos: string[];
  quantidade_total: number;
  data_inicio: string;
  prazo_final: string;
  progresso_percentual: number;
  status_geral: string;
  qr_code_ref: string;
  clientes: {
    nome: string;
    contato: string;
    email: string;
  };
  profiles: {
    nome: string;
  };
}

interface Etapa {
  id: string;
  tipo_etapa: string;
  ordem: number;
  status: "pendente" | "em_andamento" | "concluido";
  data_inicio: string | null;
  data_termino: string | null;
  observacoes: string | null;
  responsavel_id: string | null;
  profiles: {
    nome: string;
  } | null;
}

interface Profile {
  id: string;
  nome: string;
}

const ETAPAS_NOMES: Record<string, string> = {
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

export default function DetalhesPedido() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasAnyRole } = useUserRoles();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [responsaveis, setResponsaveis] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const podeEditar = hasAnyRole(['admin', 'commercial']);

  useEffect(() => {
    fetchPedidoDetails();
    fetchResponsaveis();

    // Configurar listener de mudanças em tempo real
    const etapasChannel = supabase
      .channel('etapas-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'etapas_producao',
          filter: `pedido_id=eq.${id}`
        },
        (payload) => {
          console.log('Mudança detectada nas etapas:', payload);
          fetchPedidoDetails();
        }
      )
      .subscribe();

    const pedidosChannel = supabase
      .channel('pedidos-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pedidos',
          filter: `id=eq.${id}`
        },
        (payload) => {
          console.log('Mudança detectada no pedido:', payload);
          fetchPedidoDetails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(etapasChannel);
      supabase.removeChannel(pedidosChannel);
    };
  }, [id]);

  const fetchPedidoDetails = async () => {
    try {
      const { data: pedidoData, error: pedidoError } = await supabase
        .from("pedidos")
        .select("*, clientes(*), profiles(nome)")
        .eq("id", id)
        .single();

      if (pedidoError) throw pedidoError;

      const { data: etapasData, error: etapasError } = await supabase
        .from("etapas_producao")
        .select("*, profiles(nome)")
        .eq("pedido_id", id)
        .order("ordem");

      if (etapasError) throw etapasError;

      setPedido(pedidoData);
      setEtapas(etapasData);
    } catch (error) {
      console.error("Erro ao buscar pedido:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os detalhes do pedido.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchResponsaveis = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, nome")
      .order("nome");

    if (data) {
      setResponsaveis(data);
    }
  };

  const atualizarEtapa = async (
    etapaId: string,
    campo: string,
    valor: any
  ) => {
    try {
      const updates: any = { [campo]: valor };

      if (campo === "status") {
        if (valor === "em_andamento" && !etapas.find((e) => e.id === etapaId)?.data_inicio) {
          updates.data_inicio = new Date().toISOString();
        } else if (valor === "concluido") {
          updates.data_termino = new Date().toISOString();
        }
      }

      const { error } = await supabase
        .from("etapas_producao")
        .update(updates)
        .eq("id", etapaId);

      if (error) throw error;

      toast({
        title: "Etapa atualizada",
        description: "As alterações foram salvas com sucesso.",
      });

      fetchPedidoDetails();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const avancarEtapa = async (etapaId: string) => {
    try {
      const etapaAtual = etapas.find((e) => e.id === etapaId);
      if (!etapaAtual) return;

      console.log('🔄 Avançando etapa:', { etapaId, etapaAtual });

      // Marcar etapa atual como concluída
      const { error } = await supabase
        .from("etapas_producao")
        .update({
          status: "concluido",
          data_termino: new Date().toISOString(),
        })
        .eq("id", etapaId);

      if (error) {
        console.error('❌ Erro ao atualizar etapa:', error);
        throw error;
      }

      // Liberar próxima etapa (se existir)
      const proximaEtapa = etapas.find((e) => e.ordem === etapaAtual.ordem + 1);
      if (proximaEtapa && proximaEtapa.status === "pendente") {
        const { error: proximaError } = await supabase
          .from("etapas_producao")
          .update({
            status: "em_andamento",
            data_inicio: new Date().toISOString(),
          })
          .eq("id", proximaEtapa.id);
        
        if (proximaError) {
          console.error('❌ Erro ao liberar próxima etapa:', proximaError);
          throw proximaError;
        }
      }

      console.log('✅ Etapa avançada com sucesso!');
      toast({
        title: "Etapa avançada",
        description: "Etapa concluída e próxima etapa liberada automaticamente.",
      });

      fetchPedidoDetails();
    } catch (error: any) {
      console.error('❌ Erro ao avançar etapa:', error);
      toast({
        title: "Erro ao avançar",
        description: error.message || "Erro desconhecido ao avançar etapa",
        variant: "destructive",
      });
    }
  };

  const handleDeletePedido = async () => {
    if (!pedido) return;

    try {
      // Primeiro, excluir todas as etapas de produção deste pedido
      const { error: etapasError } = await supabase
        .from("etapas_producao")
        .delete()
        .eq("pedido_id", pedido.id);

      if (etapasError) throw etapasError;

      // Depois, excluir o pedido
      const { error: pedidoError } = await supabase
        .from("pedidos")
        .delete()
        .eq("id", pedido.id);

      if (pedidoError) throw pedidoError;

      toast({
        title: "Pedido excluído!",
        description: "O pedido foi removido do controle de produção.",
      });

      // Navegar de volta para a lista de pedidos
      navigate("/pedidos");
    } catch (error: any) {
      console.error("Erro ao excluir pedido:", error);
      toast({
        title: "Erro ao excluir pedido",
        description: error.message || "Ocorreu um erro ao tentar excluir o pedido.",
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

  if (!pedido) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Pedido não encontrado.</p>
      </div>
    );
  }

  const hoje = new Date().toISOString().split("T")[0];
  const atrasado = pedido.prazo_final < hoje && pedido.status_geral !== "concluido";

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "concluido":
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "em_andamento":
        return <PlayCircle className="h-5 w-5 text-warning" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "concluido":
        return <Badge className="bg-success text-success-foreground">Concluído</Badge>;
      case "em_andamento":
        return <Badge className="bg-warning text-warning-foreground">Em Andamento</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {pedido.produto_modelo}
            </h1>
            <p className="text-muted-foreground">
              Cliente: {pedido.clientes?.nome}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {atrasado && (
              <Badge variant="destructive" className="text-base">
                <Clock className="mr-2 h-4 w-4" />
                Atrasado
              </Badge>
            )}
            {podeEditar && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/pedidos/${id}/editar`)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Editar Produção
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir Pedido
            </Button>
          </div>
        </div>
      </div>

      {/* Informações do Pedido */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Tipo de Peça
                    </p>
                    <p className="text-base">{pedido.tipo_peca}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Tecido
                    </p>
                    <p className="text-base">{pedido.tecido || "Não especificado"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Aviamentos
                    </p>
                    <p className="text-base">
                      {pedido.aviamentos || "Não especificado"}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Quantidade Total
                    </p>
                    <p className="text-base">{pedido.quantidade_total} unidades</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Data de Início
                    </p>
                    <p className="text-base">
                      {new Date(pedido.data_inicio).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Prazo Final
                    </p>
                    <p className="text-base">
                      {new Date(pedido.prazo_final).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Responsável Comercial
                    </p>
                    <p className="text-base">{pedido.profiles?.nome}</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Progresso Geral</span>
                  <span className="text-2xl font-bold">{pedido.progresso_percentual}%</span>
                </div>
                <Progress value={pedido.progresso_percentual} className="h-3" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* QR Code */}
        <div className="lg:col-span-1 space-y-6">
          {pedido.qr_code_ref && (
            <>
              <QRCodeDisplay
                qrCodeRef={pedido.qr_code_ref}
                produtoModelo={pedido.produto_modelo}
                pedidoId={pedido.id}
              />
              <HistoricoEscaneamentos pedidoId={pedido.id} />
            </>
          )}
          <HistoricoAuditoria pedidoId={pedido.id} />
        </div>
      </div>

      {/* Etapas de Produção */}
      <Card>
        <CardHeader>
          <CardTitle>Etapas de Produção</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {etapas.map((etapa, index) => (
              <div key={etapa.id} className="relative">
                {index !== etapas.length - 1 && (
                  <div
                    className={`absolute left-[10px] top-10 h-full w-0.5 ${
                      etapa.status === "concluido"
                        ? "bg-success"
                        : "bg-muted"
                    }`}
                  />
                )}
                <div className="flex gap-4">
                  <div className="relative flex-shrink-0">
                    {getStatusIcon(etapa.status)}
                  </div>
                  <div className="flex-1 space-y-4 rounded-lg border border-border p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold">
                          {ETAPAS_NOMES[etapa.tipo_etapa]}
                        </h3>
                        {etapa.data_inicio && (
                          <p className="text-sm text-muted-foreground">
                            Início:{" "}
                            {new Date(etapa.data_inicio).toLocaleString("pt-BR")}
                          </p>
                        )}
                        {etapa.data_termino && (
                          <p className="text-sm text-muted-foreground">
                            Término:{" "}
                            {new Date(etapa.data_termino).toLocaleString("pt-BR")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(etapa.status)}
                        {etapa.status !== "concluido" && (
                          <Button
                            size="sm"
                            onClick={() => avancarEtapa(etapa.id)}
                            className="whitespace-nowrap"
                          >
                            Avançar Etapa
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Status</label>
                        <Select
                          value={etapa.status}
                          onValueChange={(value) =>
                            atualizarEtapa(etapa.id, "status", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendente">Pendente</SelectItem>
                            <SelectItem value="em_andamento">
                              Em Andamento
                            </SelectItem>
                            <SelectItem value="concluido">Concluído</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Responsável</label>
                        <Select
                          value={etapa.responsavel_id || ""}
                          onValueChange={(value) =>
                            atualizarEtapa(etapa.id, "responsavel_id", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar responsável" />
                          </SelectTrigger>
                          <SelectContent>
                            {responsaveis.map((resp) => (
                              <SelectItem key={resp.id} value={resp.id}>
                                {resp.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Observações</label>
                      <Textarea
                        value={etapa.observacoes || ""}
                        onChange={(e) =>
                          atualizarEtapa(etapa.id, "observacoes", e.target.value)
                        }
                        placeholder="Adicione observações sobre esta etapa..."
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o pedido{" "}
              <strong>{pedido.produto_modelo}</strong>? Esta ação não pode ser desfeita
              e todas as etapas de produção associadas serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePedido}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Pedido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
