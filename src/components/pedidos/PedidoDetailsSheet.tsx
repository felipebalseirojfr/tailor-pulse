import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, ChevronRight, Edit2, Save, X, ChevronLeft, ExternalLink, Trash2, Scissors, Printer, Copy } from "lucide-react";
import { AvancarEtapaDialog } from "./AvancarEtapaDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { QRCodeDisplay } from "./QRCodeDisplay";
import { FichaCorte } from "./FichaCorte";
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

interface Terceiro {
  id: string;
  nome: string;
  tipo_etapa: string;
}

interface PedidoDetailsSheetProps {
  pedido: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  onDelete?: (pedidoId: string) => void;
}

export function PedidoDetailsSheet({
  pedido,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
}: PedidoDetailsSheetProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showAvancarDialog, setShowAvancarDialog] = useState(false);
  const [showFichaCorte, setShowFichaCorte] = useState(false);
  const [terceiros, setTerceiros] = useState<Terceiro[]>([]);
  const fichaCorteRef = useRef<HTMLDivElement>(null);
  const [editData, setEditData] = useState({
    produto_modelo: "",
    tipo_peca: "",
    quantidade_total: 0,
    tecido: "",
    aviamentos: [] as string[],
    data_inicio: "",
    prazo_final: "",
  });

  // Buscar todos os terceiros ativos ao abrir
  useEffect(() => {
    if (open) {
      (supabase
        .from("terceiros") as any)
        .select("id, nome, tipo_etapa")
        .eq("ativo", true)
        .order("nome")
        .then(({ data }: any) => {
          if (data) setTerceiros(data as Terceiro[]);
        });
    }
  }, [open]);

  if (!pedido) return null;

  const etapas = pedido.etapas_producao || [];
  const etapaAtual = etapas.find((e: any) => e.status === "em_andamento");
  const proximaEtapa = etapaAtual ? etapas.find((e: any) => e.ordem === etapaAtual.ordem + 1) : null;

  // Terceiros disponíveis para a próxima etapa
  const terceirosProximaEtapa = proximaEtapa
    ? terceiros.filter((t) => t.tipo_etapa === proximaEtapa.tipo_etapa)
    : [];

  const getTerceirosDaEtapa = (tipoEtapa: string) =>
    terceiros.filter((t) => t.tipo_etapa === tipoEtapa);

  const atualizarTerceiroEtapa = async (etapaId: string, terceiroId: string | null) => {
    try {
      const { error } = await supabase
        .from("etapas_producao")
        .update({ terceiro_id: terceiroId })
        .eq("id", etapaId);
      if (error) throw error;
      toast.success("Terceiro atualizado!");
      onUpdate();
    } catch (error: any) {
      toast.error("Erro ao atualizar terceiro");
    }
  };

  const handleEditClick = () => {
    setEditData({
      produto_modelo: pedido.produto_modelo,
      tipo_peca: pedido.tipo_peca,
      quantidade_total: pedido.quantidade_total,
      tecido: pedido.tecido || "",
      aviamentos: pedido.aviamentos || [],
      data_inicio: pedido.data_inicio,
      prazo_final: pedido.prazo_final,
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    setLoading(true);
    try {
      await supabase.from("pedidos").update(editData).eq("id", pedido.id);
      toast.success("Pedido atualizado com sucesso!");
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      toast.error("Erro ao atualizar pedido");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => setIsEditing(false);

  const handleVoltarEtapa = async () => {
    const etapasOrdenadas = [...etapas].sort((a: any, b: any) => a.ordem - b.ordem);
    const etapaAtualIndex = etapasOrdenadas.findIndex((e: any) => e.status === "em_andamento");
    if (etapaAtualIndex <= 0) {
      toast.error("Não é possível voltar. Esta é a primeira etapa ou não há etapa em andamento.");
      return;
    }
    const etapaAtualObj = etapasOrdenadas[etapaAtualIndex];
    const etapaAnterior = etapasOrdenadas[etapaAtualIndex - 1];
    setLoading(true);
    try {
      await supabase.from("etapas_producao").update({ status: "pendente", data_inicio: null, data_termino: null }).eq("id", etapaAtualObj.id);
      await supabase.from("etapas_producao").update({ status: "em_andamento", data_termino: null }).eq("id", etapaAnterior.id);
      toast.success("Etapa retrocedida com sucesso!");
      onUpdate();
    } catch (error) {
      toast.error("Erro ao voltar etapa");
    } finally {
      setLoading(false);
    }
  };

  const handleMoverProximaEtapa = async (dataInicio: Date, dataTerminoPrevista: Date, terceiroId?: string | null) => {
    if (!etapaAtual) {
      toast.error("Não há etapa em andamento");
      return;
    }
    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from("etapas_producao")
        .update({ status: "concluido", data_termino: new Date().toISOString() })
        .eq("id", etapaAtual.id);
      if (updateError) throw new Error(updateError.message);

      if (proximaEtapa) {
        const updates: any = {
          status: "em_andamento",
          data_inicio: dataInicio.toISOString(),
          data_inicio_prevista: dataInicio.toISOString().split('T')[0],
          data_termino_prevista: dataTerminoPrevista.toISOString().split('T')[0],
        };
        // Só salva terceiro se vier do dialog (não undefined)
        if (terceiroId !== undefined) {
          updates.terceiro_id = terceiroId;
        }
        const { error: proximaError } = await supabase
          .from("etapas_producao")
          .update(updates)
          .eq("id", proximaEtapa.id);
        if (proximaError) throw new Error(proximaError.message);
        toast.success("Etapa avançada com sucesso!");
      } else {
        const { error: pedidoError } = await supabase
          .from("pedidos")
          .update({ status_geral: "concluido", progresso_percentual: 100 })
          .eq("id", pedido.id);
        if (pedidoError) throw new Error(pedidoError.message);
        toast.success("Pedido concluído!");
      }
      onUpdate();
    } catch (error: any) {
      toast.error(`Erro ao avançar etapa: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
      setShowAvancarDialog(false);
    }
  };

  const handleMarcarConcluido = async () => {
    setLoading(true);
    try {
      await supabase.from("pedidos").update({ status_geral: "concluido", progresso_percentual: 100 }).eq("id", pedido.id);
      await supabase.from("etapas_producao").update({ status: "concluido", data_termino: new Date().toISOString() }).eq("pedido_id", pedido.id).neq("status", "concluido");
      toast.success("Pedido marcado como concluído!");
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao concluir pedido");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePedido = async () => {
    if (!pedido) return;
    try {
      const { error: etapasError } = await supabase.from("etapas_producao").delete().eq("pedido_id", pedido.id).select();
      if (etapasError) throw new Error(`Erro ao excluir etapas: ${etapasError.message}`);
      const { error: pedidoError } = await supabase.from("pedidos").delete().eq("id", pedido.id).select();
      if (pedidoError) throw new Error(`Erro ao excluir pedido: ${pedidoError.message}`);
      onOpenChange(false);
      if (onDelete) onDelete(pedido.id);
      toast.success("Pedido excluído com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir pedido.");
    }
  };

  const getEtapaLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      pilotagem: "Pilotagem",
      liberacao_corte: "Liberação de Corte",
      corte: "Corte",
      lavanderia: "Lavanderia",
      costura: "Costura",
      caseado: "Caseado",
      estamparia_bordado: "Estamparia/Bordado",
      estamparia: "Estamparia",
      bordado: "Bordado",
      acabamento: "Acabamento",
      entrega: "Entrega",
    };
    return labels[tipo] || tipo;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "concluido": return <Badge className="bg-success text-success-foreground">Concluída</Badge>;
      case "em_andamento": return <Badge className="bg-warning text-warning-foreground">Em Andamento</Badge>;
      default: return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <SheetTitle>Detalhes do Pedido</SheetTitle>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="font-mono text-xs cursor-pointer hover:bg-primary/10 transition-colors flex items-center gap-1"
                  onClick={() => {
                    const op = pedido.codigo_pedido || pedido.id.slice(0, 8);
                    navigator.clipboard.writeText(op);
                    toast.success("OP copiada!", { description: op });
                  }}
                >
                  OP:{pedido.codigo_pedido || pedido.id.slice(0, 8)}
                  <Copy className="h-3 w-3" />
                </Badge>
                <Button size="sm" variant="outline" onClick={handleVoltarEtapa} disabled={loading} title="Voltar etapa">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {!isEditing ? (
                  <Button size="sm" variant="outline" onClick={handleEditClick}>
                    <Edit2 className="mr-2 h-4 w-4" />Editar
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                      <X className="mr-2 h-4 w-4" />Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit} disabled={loading}>
                      <Save className="mr-2 h-4 w-4" />Salvar
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <Link to={`/pedidos/${pedido.id}`}>
              <Button variant="secondary" size="sm" className="w-full">
                <ExternalLink className="mr-2 h-4 w-4" />Ver Detalhes Completos
              </Button>
            </Link>
          </div>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {!isEditing ? (
            <>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Produto</p>
                  <p className="text-lg font-semibold">{pedido.produto_modelo}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-sm text-muted-foreground">Cliente</p><p className="font-medium">{pedido.clientes?.nome}</p></div>
                  <div><p className="text-sm text-muted-foreground">Tipo de Peça</p><p className="font-medium">{pedido.tipo_peca}</p></div>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-sm text-muted-foreground">Quantidade Total</p><p className="text-lg font-semibold">{pedido.quantidade_total} peças</p></div>
                  <div><p className="text-sm text-muted-foreground">Progresso</p><p className="text-lg font-semibold">{pedido.progresso_percentual}%</p></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-sm text-muted-foreground">Data de Início</p><p className="font-medium">{format(new Date(pedido.data_inicio), "dd/MM/yyyy", { locale: ptBR })}</p></div>
                  <div><p className="text-sm text-muted-foreground">Prazo de Entrega</p><p className="font-medium">{format(new Date(pedido.prazo_final), "dd/MM/yyyy", { locale: ptBR })}</p></div>
                </div>
              </div>
              <Separator />
              {(pedido.preco_venda || pedido.composicao_tecido) && (
                <>
                  <div className="space-y-3">
                    <h3 className="font-semibold">Informações Comerciais</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {pedido.preco_venda && <div><p className="text-sm text-muted-foreground">Preço de Venda</p><p className="font-medium text-lg">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pedido.preco_venda)}</p></div>}
                      {pedido.composicao_tecido && <div><p className="text-sm text-muted-foreground">Composição (NCM)</p><p className="font-medium">{pedido.composicao_tecido}</p></div>}
                    </div>
                  </div>
                  <Separator />
                </>
              )}
              {(pedido.tecido || pedido.aviamentos) && (
                <>
                  <div className="space-y-3">
                    <h3 className="font-semibold">Materiais</h3>
                    {pedido.tecido && <div><p className="text-sm text-muted-foreground">Tecido</p><p className="font-medium">{pedido.tecido}</p></div>}
                    {pedido.aviamentos && pedido.aviamentos.length > 0 && <div><p className="text-sm text-muted-foreground">Aviamentos</p><p className="font-medium">{pedido.aviamentos.join(", ")}</p></div>}
                  </div>
                  <Separator />
                </>
              )}
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div><Label htmlFor="produto_modelo">Produto</Label><Input id="produto_modelo" value={editData.produto_modelo} onChange={(e) => setEditData({ ...editData, produto_modelo: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label htmlFor="tipo_peca">Tipo de Peça</Label><Input id="tipo_peca" value={editData.tipo_peca} onChange={(e) => setEditData({ ...editData, tipo_peca: e.target.value })} /></div>
                  <div><Label htmlFor="quantidade_total">Quantidade Total</Label><Input id="quantidade_total" type="number" value={editData.quantidade_total} onChange={(e) => setEditData({ ...editData, quantidade_total: parseInt(e.target.value) })} /></div>
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label htmlFor="data_inicio">Data de Início</Label><Input id="data_inicio" type="date" value={editData.data_inicio} onChange={(e) => setEditData({ ...editData, data_inicio: e.target.value })} /></div>
                  <div><Label htmlFor="prazo_final">Prazo de Entrega</Label><Input id="prazo_final" type="date" value={editData.prazo_final} onChange={(e) => setEditData({ ...editData, prazo_final: e.target.value })} /></div>
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <h3 className="font-semibold">Materiais</h3>
                <div><Label htmlFor="tecido">Tecido</Label><Textarea id="tecido" value={editData.tecido} onChange={(e) => setEditData({ ...editData, tecido: e.target.value })} /></div>
                <div><Label htmlFor="aviamentos">Aviamentos</Label><Textarea id="aviamentos" value={editData.aviamentos.join(", ")} onChange={(e) => setEditData({ ...editData, aviamentos: e.target.value.split(",").map(s => s.trim()).filter(s => s) })} /></div>
              </div>
              <Separator />
            </>
          )}

          {/* Timeline de Etapas */}
          <div className="space-y-3">
            <h3 className="font-semibold">Histórico de Etapas</h3>
            <div className="space-y-3">
              {etapas
                .sort((a: any, b: any) => a.ordem - b.ordem)
                .map((etapa: any, index: number) => {
                  const terceirosDaEtapa = getTerceirosDaEtapa(etapa.tipo_etapa);
                  const temTerceiros = terceirosDaEtapa.length > 0;

                  return (
                    <div key={etapa.id} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`rounded-full p-1 ${etapa.status === "concluido" ? "bg-success" : etapa.status === "em_andamento" ? "bg-warning" : "bg-muted"}`}>
                          <CheckCircle2 className="h-4 w-4 text-white" />
                        </div>
                        {index < etapas.length - 1 && <div className="w-0.5 h-8 bg-muted mt-1" />}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{getEtapaLabel(etapa.tipo_etapa)}</p>
                          {getStatusBadge(etapa.status)}
                        </div>
                        {etapa.data_inicio && <p className="text-xs text-muted-foreground mt-1">Início: {format(new Date(etapa.data_inicio), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>}
                        {etapa.data_termino && <p className="text-xs text-muted-foreground">Término: {format(new Date(etapa.data_termino), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>}
                        {etapa.observacoes && <p className="text-sm text-muted-foreground mt-1">{etapa.observacoes}</p>}

                        {/* Seletor de terceiro — só aparece se houver terceiros cadastrados para essa etapa */}
                        {temTerceiros && (
                          <div className="mt-2">
                            <Select
                              value={etapa.terceiro_id || "nenhum"}
                              onValueChange={(value) => atualizarTerceiroEtapa(etapa.id, value === "nenhum" ? null : value)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Definir terceiro..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="nenhum">Nenhum</SelectItem>
                                {terceirosDaEtapa.map((t) => (
                                  <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Botão Ficha de Corte + QR Code */}
          <Separator />
          <div className="space-y-3">
            <Button variant="outline" className="w-full" onClick={() => setShowFichaCorte(true)}>
              <Scissors className="mr-2 h-4 w-4" />Gerar Ficha de Corte
            </Button>
            {pedido.qr_code_ref && (
              <QRCodeDisplay qrCodeRef={pedido.qr_code_ref} produtoModelo={pedido.produto_modelo} pedidoId={pedido.id} codigoPedido={pedido.codigo_pedido || undefined} />
            )}
          </div>

          {/* Ações */}
          {pedido.status_geral !== "concluido" && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-semibold">Ações Rápidas</h3>
                <div className="flex flex-col gap-2">
                  {etapaAtual && (
                    <Button onClick={() => setShowAvancarDialog(true)} disabled={loading} className="w-full">
                      <ChevronRight className="mr-2 h-4 w-4" />Mover para Próxima Etapa
                    </Button>
                  )}
                  <Button variant="outline" onClick={handleMarcarConcluido} disabled={loading} className="w-full">
                    <CheckCircle2 className="mr-2 h-4 w-4" />Marcar como Concluído
                  </Button>
                </div>
              </div>
            </>
          )}

          <Separator />
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)} className="w-full">
            <Trash2 className="mr-2 h-4 w-4" />Excluir Pedido
          </Button>
        </div>
      </SheetContent>

      {/* Dialog de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o pedido <strong>{pedido.produto_modelo}</strong>? Esta ação não pode ser desfeita e todas as etapas de produção associadas serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePedido} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir Pedido</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog da Ficha de Corte */}
      <AlertDialog open={showFichaCorte} onOpenChange={setShowFichaCorte}>
        <AlertDialogContent className="max-w-[90vw] max-h-[90vh] overflow-auto print:max-w-none print:max-h-none print:overflow-visible print:shadow-none print:border-none">
          <AlertDialogHeader className="print:hidden">
            <AlertDialogTitle>Ficha de Corte</AlertDialogTitle>
            <AlertDialogDescription>Visualize e imprima a ficha de corte do pedido.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="overflow-auto">
            <FichaCorte ref={fichaCorteRef} produtoModelo={pedido.produto_modelo} tipoPeca={pedido.tipo_peca} tecido={pedido.tecido || ""} codigoPedido={pedido.codigo_pedido || pedido.id.slice(0, 8)} gradeTamanhos={pedido.grade_tamanhos || {}} quantidadeTotal={pedido.quantidade_total} observacoes={pedido.observacoes_pedido} clienteNome={pedido.clientes?.nome || ""} />
          </div>
          <AlertDialogFooter className="print:hidden">
            <AlertDialogCancel>Fechar</AlertDialogCancel>
            <AlertDialogAction onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Imprimir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de avançar etapa com terceiros */}
      {etapaAtual && (
        <AvancarEtapaDialog
          open={showAvancarDialog}
          onOpenChange={setShowAvancarDialog}
          etapaAtualNome={getEtapaLabel(etapaAtual.tipo_etapa)}
          proximaEtapaNome={proximaEtapa ? getEtapaLabel(proximaEtapa.tipo_etapa) : "Concluir"}
          isConcluindo={!proximaEtapa}
          loading={loading}
          terceirosDisponiveis={terceirosProximaEtapa}
          terceiroAtualId={proximaEtapa?.terceiro_id || null}
          onConfirm={handleMoverProximaEtapa}
        />
      )}
    </Sheet>
  );
}
