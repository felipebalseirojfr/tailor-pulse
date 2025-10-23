import { useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, ChevronRight, Edit2, Save, X, ChevronLeft } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { QRCodeDisplay } from "./QRCodeDisplay";

interface PedidoDetailsSheetProps {
  pedido: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function PedidoDetailsSheet({
  pedido,
  open,
  onOpenChange,
  onUpdate,
}: PedidoDetailsSheetProps) {
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    produto_modelo: "",
    tipo_peca: "",
    quantidade_total: 0,
    tecido: "",
    aviamentos: [] as string[],
    data_inicio: "",
    prazo_final: "",
  });

  if (!pedido) return null;

  const etapas = pedido.etapas_producao || [];
  const etapaAtual = etapas.find((e: any) => e.status === "em_andamento");

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
      await supabase
        .from("pedidos")
        .update(editData)
        .eq("id", pedido.id);

      toast.success("Pedido atualizado com sucesso!");
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error("Erro ao atualizar pedido:", error);
      toast.error("Erro ao atualizar pedido");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

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
      // Marcar etapa atual como pendente
      await supabase
        .from("etapas_producao")
        .update({ 
          status: "pendente", 
          data_inicio: null, 
          data_termino: null 
        })
        .eq("id", etapaAtualObj.id);

      // Marcar etapa anterior como em andamento
      await supabase
        .from("etapas_producao")
        .update({ 
          status: "em_andamento", 
          data_termino: null 
        })
        .eq("id", etapaAnterior.id);

      toast.success("Etapa retrocedida com sucesso!");
      onUpdate();
    } catch (error) {
      console.error("Erro ao voltar etapa:", error);
      toast.error("Erro ao voltar etapa");
    } finally {
      setLoading(false);
    }
  };

  const handleMoverProximaEtapa = async () => {
    if (!etapaAtual) {
      toast.error("Não há etapa em andamento");
      return;
    }

    setLoading(true);
    try {
      // Marcar etapa atual como concluída
      await supabase
        .from("etapas_producao")
        .update({
          status: "concluido",
          data_termino: new Date().toISOString(),
        })
        .eq("id", etapaAtual.id);

      // Buscar próxima etapa
      const proximaEtapa = etapas.find(
        (e: any) => e.ordem === etapaAtual.ordem + 1
      );

      if (proximaEtapa) {
        await supabase
          .from("etapas_producao")
          .update({
            status: "em_andamento",
            data_inicio: new Date().toISOString(),
          })
          .eq("id", proximaEtapa.id);

        toast.success("Etapa avançada com sucesso!");
      } else {
        // Última etapa, marcar pedido como concluído
        await supabase
          .from("pedidos")
          .update({
            status_geral: "concluido",
            progresso_percentual: 100,
          })
          .eq("id", pedido.id);

        toast.success("Pedido concluído!");
      }

      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao avançar etapa:", error);
      toast.error("Erro ao avançar etapa");
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarConcluido = async () => {
    setLoading(true);
    try {
      await supabase
        .from("pedidos")
        .update({
          status_geral: "concluido",
          progresso_percentual: 100,
        })
        .eq("id", pedido.id);

      // Marcar todas as etapas como concluídas
      await supabase
        .from("etapas_producao")
        .update({
          status: "concluido",
          data_termino: new Date().toISOString(),
        })
        .eq("pedido_id", pedido.id)
        .neq("status", "concluido");

      toast.success("Pedido marcado como concluído!");
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao concluir pedido:", error);
      toast.error("Erro ao concluir pedido");
    } finally {
      setLoading(false);
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
      acabamento: "Acabamento",
      entrega: "Entrega",
    };
    return labels[tipo] || tipo;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "concluido":
        return <Badge className="bg-success text-success-foreground">Concluída</Badge>;
      case "em_andamento":
        return <Badge className="bg-warning text-warning-foreground">Em Andamento</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Detalhes do Pedido</SheetTitle>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleVoltarEtapa}
                disabled={loading}
                title="Voltar etapa"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {!isEditing ? (
                <Button size="sm" variant="outline" onClick={handleEditClick}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSaveEdit} disabled={loading}>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Informações Principais */}
          {!isEditing ? (
            <>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Produto</p>
                  <p className="text-lg font-semibold">{pedido.produto_modelo}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="font-medium">{pedido.clientes?.nome}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo de Peça</p>
                    <p className="font-medium">{pedido.tipo_peca}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Detalhes de Produção */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Quantidade Total</p>
                    <p className="text-lg font-semibold">{pedido.quantidade_total} peças</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Progresso</p>
                    <p className="text-lg font-semibold">{pedido.progresso_percentual}%</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Início</p>
                    <p className="font-medium">
                      {format(new Date(pedido.data_inicio), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Prazo de Entrega</p>
                    <p className="font-medium">
                      {format(new Date(pedido.prazo_final), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Materiais */}
              {(pedido.tecido || pedido.aviamentos) && (
                <>
                  <div className="space-y-3">
                    <h3 className="font-semibold">Materiais</h3>
                    {pedido.tecido && (
                      <div>
                        <p className="text-sm text-muted-foreground">Tecido</p>
                        <p className="font-medium">{pedido.tecido}</p>
                      </div>
                    )}
                    {pedido.aviamentos && pedido.aviamentos.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground">Aviamentos</p>
                        <p className="font-medium">{pedido.aviamentos.join(", ")}</p>
                      </div>
                    )}
                  </div>
                  <Separator />
                </>
              )}
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="produto_modelo">Produto</Label>
                  <Input
                    id="produto_modelo"
                    value={editData.produto_modelo}
                    onChange={(e) =>
                      setEditData({ ...editData, produto_modelo: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tipo_peca">Tipo de Peça</Label>
                    <Input
                      id="tipo_peca"
                      value={editData.tipo_peca}
                      onChange={(e) =>
                        setEditData({ ...editData, tipo_peca: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="quantidade_total">Quantidade Total</Label>
                    <Input
                      id="quantidade_total"
                      type="number"
                      value={editData.quantidade_total}
                      onChange={(e) =>
                        setEditData({ ...editData, quantidade_total: parseInt(e.target.value) })
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="data_inicio">Data de Início</Label>
                    <Input
                      id="data_inicio"
                      type="date"
                      value={editData.data_inicio}
                      onChange={(e) =>
                        setEditData({ ...editData, data_inicio: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="prazo_final">Prazo de Entrega</Label>
                    <Input
                      id="prazo_final"
                      type="date"
                      value={editData.prazo_final}
                      onChange={(e) =>
                        setEditData({ ...editData, prazo_final: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold">Materiais</h3>
                <div>
                  <Label htmlFor="tecido">Tecido</Label>
                  <Textarea
                    id="tecido"
                    value={editData.tecido}
                    onChange={(e) =>
                      setEditData({ ...editData, tecido: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="aviamentos">Aviamentos</Label>
                  <Textarea
                    id="aviamentos"
                    value={editData.aviamentos.join(", ")}
                    onChange={(e) =>
                      setEditData({ 
                        ...editData, 
                        aviamentos: e.target.value.split(",").map(s => s.trim()).filter(s => s) 
                      })
                    }
                  />
                </div>
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
                .map((etapa: any, index: number) => (
                  <div key={etapa.id} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`rounded-full p-1 ${
                          etapa.status === "concluida"
                            ? "bg-success"
                            : etapa.status === "em_andamento"
                            ? "bg-warning"
                            : "bg-muted"
                        }`}
                      >
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      </div>
                      {index < etapas.length - 1 && (
                        <div className="w-0.5 h-8 bg-muted mt-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{getEtapaLabel(etapa.tipo_etapa)}</p>
                        {getStatusBadge(etapa.status)}
                      </div>
                      {etapa.data_inicio && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Início: {format(new Date(etapa.data_inicio), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      )}
                      {etapa.data_termino && (
                        <p className="text-xs text-muted-foreground">
                          Término: {format(new Date(etapa.data_termino), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      )}
                      {etapa.observacoes && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {etapa.observacoes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* QR Code */}
          {pedido.qr_code_ref && (
            <>
              <Separator />
              <QRCodeDisplay
                qrCodeRef={pedido.qr_code_ref}
                produtoModelo={pedido.produto_modelo}
                pedidoId={pedido.id}
              />
            </>
          )}

          {/* Ações */}
          {pedido.status_geral !== "concluido" && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-semibold">Ações Rápidas</h3>
                <div className="flex flex-col gap-2">
                  {etapaAtual && (
                    <Button
                      onClick={handleMoverProximaEtapa}
                      disabled={loading}
                      className="w-full"
                    >
                      <ChevronRight className="mr-2 h-4 w-4" />
                      Mover para Próxima Etapa
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleMarcarConcluido}
                    disabled={loading}
                    className="w-full"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Marcar como Concluído
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
