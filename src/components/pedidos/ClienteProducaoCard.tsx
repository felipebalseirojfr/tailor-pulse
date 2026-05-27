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
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AvancarEtapaDialog } from "./AvancarEtapaDialog";

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
  foto_modelo_url?: string | null;
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
    terceiro_id?: string | null;
    terceiros?: { nome: string } | null;
  }>;
}

import { calcularQuantidadeReal } from "@/lib/quantidade-utils";

const __toLocalISO=(d: Date)=>{const y=d.getFullYear();const m=String(d.getMonth()+1).padStart(2,"0");const day=String(d.getDate()).padStart(2,"0");return `${y}-${m}-${day}`;};


const calcularQuantidadeTotal = (pedido: Pedido): number => {
  return calcularQuantidadeReal(pedido.grade_tamanhos, pedido.quantidade_total);
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

  const confirmarAvanco = async (dataInicio: Date, dataTerminoPrevista: Date) => {
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

      // Iniciar próxima etapa com datas informadas
      if (confirmData.proximaEtapaId) {
        const { error: errIniciar } = await supabase
          .from("etapas_producao")
          .update({ 
            status: "em_andamento", 
            data_inicio: dataInicio.toISOString(),
            data_inicio_prevista: __toLocalISO(dataInicio),
            data_termino_prevista: __toLocalISO(dataTerminoPrevista),
          })
          .eq("id", confirmData.proximaEtapaId);
        if (errIniciar) throw errIniciar;
      }

      toast.success("Etapa avançada!", {
        description: confirmData.proximaEtapaId
          ? `Agora em: ${confirmData.proximaEtapa}`
          : "Produção concluída!",
      });
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
      aplicacao_travete: "Aplicação de Travete",
      compra_de_insumos: "Compra Insumos",
      liberacao_corte: "Liberação",
      corte: "Corte",
      lavanderia: "Lavanderia",
      costura: "Costura",
      caseado: "Caseado",
      estamparia_bordado: "Estamparia",
      estamparia: "Estamparia",
      bordado: "Bordado",
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

    const proximaPendente = [...(producao.etapas_producao || [])]
      .sort((a: any, b: any) => a.ordem - b.ordem)
      .find((e: any) => e.status === "pendente");

    if (proximaPendente) {
      return `Aguardando: ${getEtapaLabel(proximaPendente.tipo_etapa)}`;
    }

    return "Aguardando";
  };

  const getEtapaAtualObj = (producao: Pedido) => {
    return (
      producao.etapas_producao?.find((e: any) => e.status === "em_andamento") ||
      [...(producao.etapas_producao || [])]
        .sort((a: any, b: any) => a.ordem - b.ordem)
        .find((e: any) => e.status === "pendente")
    );
  };

  const getOficinaAtual = (producao: Pedido): string | null => {
    const etapa = getEtapaAtualObj(producao);
    return (etapa as any)?.terceiros?.nome || null;
  };

  const getObservacaoAtual = (producao: Pedido): string | null => {
    const etapa = getEtapaAtualObj(producao);
    const obs = (etapa as any)?.observacoes;
    return obs && String(obs).trim() ? String(obs).trim() : null;
  };

  const temProducaoAtrasada = () => {
    const hoje = __toLocalISO(new Date());
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
              const hoje = __toLocalISO(new Date());
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
                        <div className="flex items-start gap-3 flex-1">
                          {producao.foto_modelo_url && (
                            <img
                              src={producao.foto_modelo_url}
                              alt={producao.produto_modelo}
                              className="w-12 h-12 object-cover rounded-md border border-border flex-shrink-0"
                              loading="lazy"
                            />
                          )}
                          <div className="space-y-1 flex-1 min-w-0">
                            <h4 className="font-semibold">{producao.produto_modelo}</h4>
                            <p className="text-sm text-muted-foreground">{producao.tipo_peca}</p>
                          </div>
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
                          {getOficinaAtual(producao) && (
                            <p className="text-xs text-muted-foreground truncate" title={getOficinaAtual(producao) || ""}>
                              📍 {getOficinaAtual(producao)}
                            </p>
                          )}
                          {getObservacaoAtual(producao) && (
                            <p className="text-xs text-muted-foreground italic mt-1 line-clamp-2" title={getObservacaoAtual(producao) || ""}>
                              📝 {getObservacaoAtual(producao)}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Prazo de entrega</p>
                          <p className="font-medium">
                            {new Date(producao.prazo_final + 'T00:00:00').toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>

                      {(() => {
                        const ordem = ["1","2","4","6","8","10","12","14","PP","P","M","G","GG","XGG","XGG1","XGG2","XGG3"];
                        const entradas = Object.entries(producao.grade_tamanhos || {})
                          .filter(([_, q]) => typeof q === "number" && (q as number) > 0)
                          .sort((a, b) => {
                            const ia = ordem.indexOf(a[0]); const ib = ordem.indexOf(b[0]);
                            return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
                          });
                        if (entradas.length === 0) return null;
                        return (
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Grade de Tamanhos</p>
                            <div className="flex flex-wrap gap-1">
                              {entradas.map(([tam, qtd]) => (
                                <span key={tam} className="px-2 py-0.5 rounded-md border border-border bg-muted/40 text-xs">
                                  <span className="font-semibold">{tam}</span>
                                  <span className="text-muted-foreground"> · </span>
                                  <span>{qtd as number}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

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

      {/* Modal de avanço de etapa com datas */}
      <AvancarEtapaDialog
        open={!!confirmData}
        onOpenChange={(open) => !open && setConfirmData(null)}
        etapaAtualNome={confirmData?.etapaAtual || ""}
        proximaEtapaNome={confirmData?.proximaEtapa || ""}
        isConcluindo={!!confirmData && !confirmData.proximaEtapaId}
        loading={!!advancingId}
        onConfirm={confirmarAvanco}
      />
    </>
  );
}
