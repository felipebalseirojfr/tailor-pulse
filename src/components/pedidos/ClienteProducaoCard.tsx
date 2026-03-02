import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Package, AlertCircle, Copy, SkipForward, Loader2 } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Pedido {
  id: string;
  produto_modelo: string;
  tipo_peca: string;
  quantidade_total: number;
  progresso_percentual: number;
  prazo_final: string;
  data_inicio: string;
  status_geral: string;
  prioridade: string;
  created_at: string;
  updated_at: string;
  tecido?: string;
  aviamentos?: string[];
  grade_tamanhos?: Record<string, number> | null;
  codigo_pedido?: string | null;
  clientes: {
    nome: string;
  };
  profiles: {
    nome: string;
  };
  etapas_producao: Array<{
    id: string;
    tipo_etapa: string;
    status: string;
    ordem: number;
    data_inicio?: string;
    data_termino?: string;
    data_inicio_prevista?: string;
    data_termino_prevista?: string;
    observacoes?: string;
  }>;
}

// Função para calcular quantidade total a partir da grade de tamanhos
const calcularQuantidadeTotal = (pedido: Pedido): number => {
  if (pedido.grade_tamanhos && typeof pedido.grade_tamanhos === 'object') {
    const valores = Object.values(pedido.grade_tamanhos).filter(
      (v): v is number => typeof v === 'number'
    );
    if (valores.length > 0) {
      return valores.reduce((acc, val) => acc + val, 0);
    }
  }
  return pedido.quantidade_total;
};

interface ClienteProducaoCardProps {
  cliente: string;
  producoes: Pedido[];
  onViewProducao: (producao: Pedido) => void;
}

export function ClienteProducaoCard({ cliente, producoes, onViewProducao }: ClienteProducaoCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [confirmData, setConfirmData] = useState<{ pedidoId: string; etapaAtual: string; proximaEtapa: string; etapaAtualId: string; proximaEtapaId: string } | null>(null);

  const handleAvancarEtapa = (producao: Pedido, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const etapasOrdenadas = [...(producao.etapas_producao || [])].sort((a, b) => a.ordem - b.ordem);
    const etapaEmAndamento = etapasOrdenadas.find((et) => et.status === "em_andamento");
    
    if (!etapaEmAndamento) {
      // Se não há etapa em andamento, iniciar a primeira pendente
      const primeiraPendente = etapasOrdenadas.find((et) => et.status === "pendente");
      if (!primeiraPendente) {
        toast.info("Todas as etapas já foram concluídas.");
        return;
      }
      setConfirmData({
        pedidoId: producao.id,
        etapaAtual: "Nenhuma",
        proximaEtapa: getEtapaLabel(primeiraPendente.tipo_etapa),
        etapaAtualId: "",
        proximaEtapaId: primeiraPendente.id,
      });
      return;
    }

    const indexAtual = etapasOrdenadas.findIndex((et) => et.id === etapaEmAndamento.id);
    const proximaEtapa = etapasOrdenadas[indexAtual + 1];

    setConfirmData({
      pedidoId: producao.id,
      etapaAtual: getEtapaLabel(etapaEmAndamento.tipo_etapa),
      proximaEtapa: proximaEtapa ? getEtapaLabel(proximaEtapa.tipo_etapa) : "Concluir",
      etapaAtualId: etapaEmAndamento.id,
      proximaEtapaId: proximaEtapa?.id || "",
    });
  };

  const confirmarAvanco = async () => {
    if (!confirmData) return;
    setAdvancingId(confirmData.pedidoId);
    
    try {
      // Concluir etapa atual
      if (confirmData.etapaAtualId) {
        const { error: errConcluir } = await supabase
          .from("etapas_producao")
          .update({ status: "concluido", data_termino: new Date().toISOString() })
          .eq("id", confirmData.etapaAtualId);
        if (errConcluir) throw errConcluir;
      }

      // Iniciar próxima etapa
      if (confirmData.proximaEtapaId) {
        const { error: errIniciar } = await supabase
          .from("etapas_producao")
          .update({ status: "em_andamento", data_inicio: new Date().toISOString() })
          .eq("id", confirmData.proximaEtapaId);
        if (errIniciar) throw errIniciar;
      }

      toast.success("Etapa avançada!", {
        description: confirmData.proximaEtapaId
          ? `Agora em: ${confirmData.proximaEtapa}`
          : "Produção concluída!",
      });

      // Recarregar a página para refletir mudanças
      window.location.reload();
    } catch (error: any) {
      console.error("Erro ao avançar etapa:", error);
      toast.error("Erro ao avançar etapa", { description: error.message });
    } finally {
      setAdvancingId(null);
      setConfirmData(null);
    }
  };

  const getEtapasResumo = () => {
    const etapasCounts: Record<string, number> = {};
    
    producoes.forEach((prod) => {
      const etapaAtual = prod.etapas_producao
        ?.find((e) => e.status === "em_andamento");
      
      if (etapaAtual) {
        const label = getEtapaLabel(etapaAtual.tipo_etapa);
        etapasCounts[label] = (etapasCounts[label] || 0) + 1;
      }
    });

    return etapasCounts;
  };

  const getEtapaLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      pilotagem: "Pilotagem",
      liberacao_corte: "Liberação",
      corte: "Corte",
      lavanderia: "Lavanderia",
      costura: "Costura",
      caseado: "Caseado",
      estamparia_bordado: "Estamparia",
      acabamento: "Acabamento",
      entrega: "Entrega",
    };
    return labels[tipo] || tipo;
  };

  const getEtapaAtual = (producao: Pedido) => {
    if (producao.status_geral === "concluido") {
      return "Concluído";
    }

    const etapaEmAndamento = producao.etapas_producao?.find(
      (e) => e.status === "em_andamento"
    );

    if (etapaEmAndamento) {
      return getEtapaLabel(etapaEmAndamento.tipo_etapa);
    }

    return "Aguardando";
  };

  const temProducaoAtrasada = () => {
    const hoje = new Date().toISOString().split("T")[0];
    return producoes.some(
      (p) => p.prazo_final < hoje && p.status_geral !== "concluido"
    );
  };

  const etapasResumo = getEtapasResumo();
  const totalProducoes = producoes.length;
  const isAtrasado = temProducaoAtrasada();

  return (
    <>
      <Card 
        className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary/20"
        onClick={() => setExpanded(true)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <h3 className="font-bold text-lg leading-tight">{cliente}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4" />
                <span>{totalProducoes} {totalProducoes === 1 ? 'produção' : 'produções'} ativa{totalProducoes !== 1 ? 's' : ''}</span>
              </div>
            </div>
            {isAtrasado && (
              <Badge variant="destructive" className="shrink-0">
                <AlertCircle className="h-3 w-3 mr-1" />
                Atraso
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Button 
            variant="ghost" 
            className="w-full justify-between text-primary hover:text-primary hover:bg-primary/10"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(true);
            }}
          >
            Ver produções
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Dialog com lista de produções */}
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{cliente}</DialogTitle>
            <p className="text-muted-foreground">
              {totalProducoes} {totalProducoes === 1 ? 'produção' : 'produções'} em andamento
            </p>
          </DialogHeader>
          
          <div className="space-y-3 mt-4">
            {[...producoes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((producao) => {
              const hoje = new Date().toISOString().split("T")[0];
              const isAtrasado = producao.prazo_final < hoje && producao.status_geral !== "concluido";
              
              return (
                <Card 
                  key={producao.id}
                  className="hover:shadow-md transition-all cursor-pointer"
                  onClick={() => {
                    setExpanded(false);
                    onViewProducao(producao);
                  }}
                >
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <h4 className="font-semibold">{producao.produto_modelo}</h4>
                          <p className="text-sm text-muted-foreground">{producao.tipo_peca}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {isAtrasado && (
                            <Badge variant="destructive" className="text-xs">Atrasado</Badge>
                          )}
                          <Badge 
                            variant="outline" 
                            className="font-mono text-xs cursor-pointer hover:bg-primary/10 transition-colors flex items-center gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              const op = producao.codigo_pedido || producao.id.slice(0, 8);
                              navigator.clipboard.writeText(op);
                              toast.success("OP copiada!", { description: op });
                            }}
                          >
                            OP:{producao.codigo_pedido || producao.id.slice(0, 8)}
                            <Copy className="h-3 w-3" />
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Quantidade</p>
                          <p className="font-medium">{calcularQuantidadeTotal(producao)} un</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Etapa Atual</p>
                          <p className="font-medium">{getEtapaAtual(producao)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Prazo</p>
                          <p className="font-medium">
                            {new Date(producao.prazo_final + 'T00:00:00').toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Progresso</span>
                          <span className="font-medium">{producao.progresso_percentual}%</span>
                        </div>
                        <Progress value={producao.progresso_percentual} className="h-2" />
                      </div>

                      <div className="flex gap-2">
                        {producao.status_geral !== "concluido" && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex-1 justify-center gap-2 border-primary/30 text-primary hover:bg-primary/10"
                            disabled={advancingId === producao.id}
                            onClick={(e) => handleAvancarEtapa(producao, e)}
                          >
                            {advancingId === producao.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <SkipForward className="h-4 w-4" />
                            )}
                            Avançar Etapa
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="flex-1 justify-between text-primary hover:text-primary hover:bg-primary/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpanded(false);
                            onViewProducao(producao);
                          }}
                        >
                          Ver detalhes
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação de avanço de etapa */}
      <AlertDialog open={!!confirmData} onOpenChange={(open) => !open && setConfirmData(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avançar etapa de produção?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmData?.etapaAtualId ? (
                <>
                  A etapa <strong>{confirmData.etapaAtual}</strong> será marcada como concluída
                  {confirmData.proximaEtapaId && (
                    <> e <strong>{confirmData.proximaEtapa}</strong> será iniciada</>
                  )}
                  .
                </>
              ) : (
                <>A etapa <strong>{confirmData?.proximaEtapa}</strong> será iniciada.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarAvanco}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
