import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, Check, GripVertical, Trash2, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

export interface EtapaEditavel {
  id: string;
  tipo_etapa: string;
  ordem: number;
  data_inicio_prevista: string | null;
  data_termino_prevista: string | null;
  observacoes: string | null;
  isNew?: boolean;
  toDelete?: boolean;
}

interface EtapasEditorManagerProps {
  etapas: EtapaEditavel[];
  onChange: (etapas: EtapaEditavel[]) => void;
}

const tiposEtapaDisponiveis = [
  { value: "pilotagem", label: "Pilotagem" },
  { value: "liberacao_corte", label: "Liberação de Corte" },
  { value: "corte", label: "Corte" },
  { value: "lavanderia", label: "Lavanderia" },
  { value: "costura", label: "Costura" },
  { value: "caseado", label: "Caseado" },
  { value: "estamparia", label: "Estamparia" },
  { value: "bordado", label: "Bordado" },
  { value: "acabamento", label: "Acabamento" },
  { value: "entrega", label: "Entrega" },
];

export default function EtapasEditorManager({ etapas, onChange }: EtapasEditorManagerProps) {
  const [showAddPanel, setShowAddPanel] = useState(false);

  // Filtrar etapas que não estão marcadas para deletar
  const etapasAtivas = etapas.filter(e => !e.toDelete);
  
  // Etapas disponíveis para adicionar (que não estão já na lista ativa)
  const etapasParaAdicionar = tiposEtapaDisponiveis.filter(
    tipo => !etapasAtivas.some(e => e.tipo_etapa === tipo.value)
  );

  const adicionarEtapa = (tipoEtapa: string) => {
    const maxOrdem = etapasAtivas.length > 0 
      ? Math.max(...etapasAtivas.map(e => e.ordem)) 
      : 0;
    
    const novaEtapa: EtapaEditavel = {
      id: crypto.randomUUID(),
      tipo_etapa: tipoEtapa,
      ordem: maxOrdem + 1,
      data_inicio_prevista: null,
      data_termino_prevista: null,
      observacoes: null,
      isNew: true,
    };
    
    onChange([...etapas, novaEtapa]);
  };

  const removerEtapa = (etapaId: string) => {
    const etapa = etapas.find(e => e.id === etapaId);
    
    if (etapa?.isNew) {
      // Se é nova, remove completamente
      const novasEtapas = etapas
        .filter(e => e.id !== etapaId)
        .map((e, index) => {
          if (e.toDelete) return e;
          return { ...e, ordem: etapas.filter(et => !et.toDelete && et.id !== etapaId).findIndex(et => et.id === e.id) + 1 };
        });
      
      // Recalcular ordem
      let ordem = 1;
      const ordenadas = novasEtapas.map(e => {
        if (e.toDelete) return e;
        return { ...e, ordem: ordem++ };
      });
      
      onChange(ordenadas);
    } else {
      // Se já existe no banco, marca para deletar
      const novasEtapas = etapas.map(e => 
        e.id === etapaId ? { ...e, toDelete: true } : e
      );
      
      // Recalcular ordem das ativas
      let ordem = 1;
      const ordenadas = novasEtapas.map(e => {
        if (e.toDelete) return e;
        return { ...e, ordem: ordem++ };
      });
      
      onChange(ordenadas);
    }
  };

  const restaurarEtapa = (etapaId: string) => {
    const maxOrdem = etapasAtivas.length > 0 
      ? Math.max(...etapasAtivas.map(e => e.ordem)) 
      : 0;
    
    const novasEtapas = etapas.map(e => 
      e.id === etapaId ? { ...e, toDelete: false, ordem: maxOrdem + 1 } : e
    );
    onChange(novasEtapas);
  };

  const moverEtapa = (etapaId: string, direcao: 'up' | 'down') => {
    const etapasOrdenadas = etapasAtivas.sort((a, b) => a.ordem - b.ordem);
    const index = etapasOrdenadas.findIndex(e => e.id === etapaId);
    
    if (direcao === 'up' && index > 0) {
      const temp = etapasOrdenadas[index].ordem;
      etapasOrdenadas[index].ordem = etapasOrdenadas[index - 1].ordem;
      etapasOrdenadas[index - 1].ordem = temp;
    } else if (direcao === 'down' && index < etapasOrdenadas.length - 1) {
      const temp = etapasOrdenadas[index].ordem;
      etapasOrdenadas[index].ordem = etapasOrdenadas[index + 1].ordem;
      etapasOrdenadas[index + 1].ordem = temp;
    }
    
    // Mesclar com etapas deletadas
    const etapasDeletadas = etapas.filter(e => e.toDelete);
    onChange([...etapasOrdenadas, ...etapasDeletadas]);
  };

  const atualizarEtapa = (etapaId: string, campo: keyof EtapaEditavel, valor: any) => {
    const novasEtapas = etapas.map(e => 
      e.id === etapaId ? { ...e, [campo]: valor } : e
    );
    onChange(novasEtapas);
  };

  const getLabel = (tipoEtapa: string) => {
    return tiposEtapaDisponiveis.find(t => t.value === tipoEtapa)?.label || tipoEtapa;
  };

  const etapasDeletadas = etapas.filter(e => e.toDelete);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base">Etapas de Produção</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Reorganize, adicione ou remova etapas conforme necessário
          </p>
        </div>
        {etapasParaAdicionar.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddPanel(!showAddPanel)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Etapa
          </Button>
        )}
      </div>

      {/* Painel para adicionar novas etapas */}
      {showAddPanel && etapasParaAdicionar.length > 0 && (
        <Card className="p-4 border-dashed">
          <Label className="text-sm font-medium mb-3 block">Selecione uma etapa para adicionar:</Label>
          <div className="flex flex-wrap gap-2">
            {etapasParaAdicionar.map((tipo) => (
              <Button
                key={tipo.value}
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  adicionarEtapa(tipo.value);
                  if (etapasParaAdicionar.length === 1) {
                    setShowAddPanel(false);
                  }
                }}
              >
                <Plus className="h-3 w-3 mr-1" />
                {tipo.label}
              </Button>
            ))}
          </div>
        </Card>
      )}

      {/* Lista de etapas ativas */}
      <div className="space-y-3">
        {etapasAtivas
          .sort((a, b) => a.ordem - b.ordem)
          .map((etapa, index) => (
            <Card 
              key={etapa.id} 
              className={cn(
                "p-4",
                etapa.isNew && "border-primary/50 bg-primary/5"
              )}
            >
              <div className="flex items-start gap-3">
                {/* Controles de ordem */}
                <div className="flex flex-col items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={index === 0}
                    onClick={() => moverEtapa(etapa.id, 'up')}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </Button>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                    {etapa.ordem}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={index === etapasAtivas.length - 1}
                    onClick={() => moverEtapa(etapa.id, 'down')}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </Button>
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {getLabel(etapa.tipo_etapa)}
                      {etapa.isNew && (
                        <span className="ml-2 text-xs text-primary">(nova)</span>
                      )}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removerEtapa(etapa.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Início Previsto
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !etapa.data_inicio_prevista && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {etapa.data_inicio_prevista
                              ? format(new Date(etapa.data_inicio_prevista), "dd/MM/yyyy", { locale: ptBR })
                              : "Selecionar data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={etapa.data_inicio_prevista ? new Date(etapa.data_inicio_prevista) : undefined}
                            onSelect={(date) =>
                              atualizarEtapa(etapa.id, "data_inicio_prevista", date ? format(date, "yyyy-MM-dd") : null)
                            }
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Término Previsto
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !etapa.data_termino_prevista && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {etapa.data_termino_prevista
                              ? format(new Date(etapa.data_termino_prevista), "dd/MM/yyyy", { locale: ptBR })
                              : "Selecionar data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={etapa.data_termino_prevista ? new Date(etapa.data_termino_prevista) : undefined}
                            onSelect={(date) =>
                              atualizarEtapa(etapa.id, "data_termino_prevista", date ? format(date, "yyyy-MM-dd") : null)
                            }
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Observações</Label>
                    <Textarea
                      value={etapa.observacoes || ""}
                      onChange={(e) => atualizarEtapa(etapa.id, "observacoes", e.target.value)}
                      rows={2}
                      placeholder="Observações para esta etapa..."
                    />
                  </div>
                </div>
              </div>
            </Card>
          ))}
      </div>

      {etapasAtivas.length === 0 && (
        <Card className="p-8 text-center border-dashed">
          <p className="text-muted-foreground">
            Nenhuma etapa de produção selecionada. 
            Clique em "Adicionar Etapa" para começar.
          </p>
        </Card>
      )}

      {/* Etapas marcadas para remoção */}
      {etapasDeletadas.length > 0 && (
        <div className="space-y-3 pt-4 border-t">
          <Label className="text-sm font-medium text-destructive">
            Etapas marcadas para remoção
          </Label>
          <div className="space-y-2">
            {etapasDeletadas.map((etapa) => (
              <Card key={etapa.id} className="p-3 opacity-50 border-destructive/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm line-through">
                    {getLabel(etapa.tipo_etapa)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => restaurarEtapa(etapa.id)}
                  >
                    Restaurar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Essas etapas serão removidas ao salvar as alterações.
          </p>
        </div>
      )}
    </div>
  );
}
