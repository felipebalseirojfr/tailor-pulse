import { useEffect, useState, useRef } from "react";
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
  Download,
  FileText,
  Image as ImageIcon,
  Settings2,
  File,
  Printer,
  Scissors,
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
import { ChecklistProducao } from "@/components/pedidos/ChecklistProducao";
import { FichaCorte } from "@/components/pedidos/FichaCorte";

interface Pedido {
  id: string;
  codigo_pedido?: string;
  produto_modelo: string;
  tipo_peca: string;
  tecido: string;
  aviamentos: string[];
  tipos_personalizacao?: string[];
  quantidade_total: number;
  data_inicio: string;
  prazo_final: string;
  progresso_percentual: number;
  status_geral: string;
  qr_code_ref: string;
  grade_tamanhos?: Record<string, number>;
  observacoes_pedido?: string;
  arquivos: Array<{
    nome: string;
    tipo: string;
    tamanho: number;
    caminho: string;
  }> | null;
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
  const [showChecklist, setShowChecklist] = useState(false);
  const [showFichaCorte, setShowFichaCorte] = useState(false);
  const checklistRef = useRef<HTMLDivElement>(null);
  const fichaCorteRef = useRef<HTMLDivElement>(null);

  const podeEditar = hasAnyRole(['admin', 'commercial']);

  // Função para desfazer alterações usando o histórico de auditoria
  const handleUndo = async (logId: string, dadosAntes: any) => {
    if (!id || !pedido) return;

    try {
      // Capturar estado atual para o novo registro de auditoria
      const estadoAtualPedido = { ...pedido };
      const estadoAtualEtapas = [...etapas];

      // Obter dados do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profileData } = await supabase
        .from("profiles")
        .select("nome")
        .eq("id", user?.id)
        .maybeSingle();

      const usuarioNome = profileData?.nome || user?.email || "Usuário desconhecido";

      // Restaurar dados do pedido (se houver)
      if (dadosAntes.pedido) {
        const pedidoUpdate: any = {};
        const camposPermitidos = [
          'quantidade_total', 'observacoes_pedido', 'preco_venda', 
          'composicao_tecido', 'tecido', 'aviamentos', 'produto_modelo',
          'tipo_peca', 'data_inicio', 'prazo_final', 'grade_tamanhos',
          'tipos_personalizacao', 'prioridade'
        ];

        for (const campo of camposPermitidos) {
          if (dadosAntes.pedido[campo] !== undefined) {
            pedidoUpdate[campo] = dadosAntes.pedido[campo];
          }
        }

        if (Object.keys(pedidoUpdate).length > 0) {
          const { error: pedidoError } = await supabase
            .from("pedidos")
            .update(pedidoUpdate)
            .eq("id", id);

          if (pedidoError) throw pedidoError;
        }
      }

      // Restaurar etapas (se houver)
      if (dadosAntes.etapas && Array.isArray(dadosAntes.etapas)) {
        for (const etapaAntes of dadosAntes.etapas) {
          if (etapaAntes.id) {
            const { error: etapaError } = await supabase
              .from("etapas_producao")
              .update({
                status: etapaAntes.status,
                data_inicio: etapaAntes.data_inicio,
                data_termino: etapaAntes.data_termino,
                data_inicio_prevista: etapaAntes.data_inicio_prevista,
                data_termino_prevista: etapaAntes.data_termino_prevista,
                observacoes: etapaAntes.observacoes,
                responsavel_id: etapaAntes.responsavel_id,
              })
              .eq("id", etapaAntes.id);

            if (etapaError) {
              console.error("Erro ao restaurar etapa:", etapaError);
            }
          }
        }
      }

      // Criar registro de auditoria da reversão
      const { error: auditoriaError } = await supabase
        .from("pedidos_auditoria")
        .insert({
          pedido_id: id,
          usuario_id: user?.id,
          usuario_nome: usuarioNome,
          acao: "Reversão manual",
          campos_alterados: ["reversão_completa"],
          dados_antes: {
            pedido: estadoAtualPedido,
            etapas: estadoAtualEtapas.map(e => ({
              id: e.id,
              tipo_etapa: e.tipo_etapa,
              status: e.status,
              data_inicio: e.data_inicio,
              data_termino: e.data_termino,
              observacoes: e.observacoes,
              responsavel_id: e.responsavel_id,
            }))
          },
          dados_depois: dadosAntes,
        });

      if (auditoriaError) {
        console.error("Erro ao registrar auditoria:", auditoriaError);
      }

      toast({
        title: "Alteração desfeita",
        description: "O pedido foi restaurado para o estado anterior.",
      });

      // Recarregar dados
      fetchPedidoDetails();
    } catch (error: any) {
      console.error("Erro ao desfazer alteração:", error);
      toast({
        title: "Erro ao desfazer",
        description: error.message || "Não foi possível desfazer a alteração.",
        variant: "destructive",
      });
      throw error;
    }
  };

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

      setPedido({
        ...pedidoData,
        arquivos: pedidoData.arquivos as Array<{
          nome: string;
          tipo: string;
          tamanho: number;
          caminho: string;
        }> | null,
      } as Pedido);
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

  const downloadArquivo = async (caminho: string, nome: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("pedidos-arquivos")
        .download(caminho);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = nome;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download iniciado",
        description: `Arquivo ${nome} está sendo baixado.`,
      });
    } catch (error) {
      console.error("Erro ao baixar arquivo:", error);
      toast({
        title: "Erro ao baixar",
        description: "Não foi possível baixar o arquivo.",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const getFileIcon = (tipo: string) => {
    if (tipo.startsWith("image/")) return <ImageIcon className="h-5 w-5" />;
    if (tipo === "application/pdf") return <FileText className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
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
              variant="outline"
              size="sm"
              onClick={() => setShowChecklist(true)}
            >
              <Printer className="mr-2 h-4 w-4" />
              Imprimir Checklist
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFichaCorte(true)}
            >
              <Scissors className="mr-2 h-4 w-4" />
              Gerar Ficha de Corte
            </Button>
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
                codigoPedido={pedido.codigo_pedido || undefined}
              />
              <HistoricoEscaneamentos pedidoId={pedido.id} />
            </>
          )}
          <HistoricoAuditoria pedidoId={pedido.id} onUndo={handleUndo} />
        </div>
      </div>

      {/* Arquivos Anexados */}
      {pedido.arquivos && pedido.arquivos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Arquivos Anexados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pedido.arquivos.map((arquivo, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      {getFileIcon(arquivo.tipo)}
                    </div>
                    <div>
                      <p className="font-medium">{arquivo.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(arquivo.tamanho)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadArquivo(arquivo.caminho, arquivo.nome)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Baixar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Etapas de Produção */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Etapas de Produção</CardTitle>
          {podeEditar && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/pedidos/${id}/editar`)}
              className="gap-2"
            >
              <Settings2 className="h-4 w-4" />
              Editar Etapas
            </Button>
          )}
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

      {/* Modal do Checklist */}
      <AlertDialog open={showChecklist} onOpenChange={setShowChecklist}>
        <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="sr-only">Checklist de Produção</AlertDialogTitle>
          </AlertDialogHeader>
          <ChecklistProducao ref={checklistRef} pedido={pedido} />
          <AlertDialogFooter className="print:hidden">
            <AlertDialogCancel>Fechar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                window.print();
              }}
            >
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal da Ficha de Corte */}
      <AlertDialog open={showFichaCorte} onOpenChange={setShowFichaCorte}>
        <AlertDialogContent className="max-w-[320mm] max-h-[90vh] overflow-auto print:max-w-none print:max-h-none print:overflow-visible">
          <AlertDialogHeader>
            <AlertDialogTitle className="sr-only">Ficha de Corte</AlertDialogTitle>
          </AlertDialogHeader>
          <FichaCorte
            ref={fichaCorteRef}
            produtoModelo={pedido.produto_modelo}
            tipoPeca={pedido.tipo_peca}
            tecido={pedido.tecido}
            codigoPedido={pedido.codigo_pedido || pedido.id.slice(0, 8)}
            gradeTamanhos={pedido.grade_tamanhos || {}}
            quantidadeTotal={pedido.quantidade_total}
            observacoes={pedido.observacoes_pedido}
            clienteNome={pedido.clientes?.nome || "Cliente não identificado"}
          />
          <AlertDialogFooter className="print:hidden">
            <AlertDialogCancel>Fechar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                window.print();
              }}
            >
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
