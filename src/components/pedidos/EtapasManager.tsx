import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface Etapa {
  id: string;
  tipo_etapa: string;
  ordem: number;
  data_inicio_prevista?: Date;
  data_termino_prevista?: Date;
}

interface EtapasManagerProps {
  etapas: Etapa[];
  onChange: (etapas: Etapa[]) => void;
}

const tiposEtapaDisponiveis = [
  { value: "pilotagem", label: "Pilotagem" },
  { value: "liberacao_corte", label: "Liberação de Corte" },
  { value: "corte", label: "Corte" },
  { value: "lavanderia", label: "Lavanderia" },
  { value: "costura", label: "Costura" },
  { value: "caseado", label: "Caseado" },
  { value: "estamparia_bordado", label: "Estamparia/Bordado" },
  { value: "acabamento", label: "Acabamento" },
  { value: "entrega", label: "Entrega" },
];

export default function EtapasManager({ etapas, onChange }: EtapasManagerProps) {
  const toggleEtapa = (tipoEtapa: string) => {
    const etapaExistente = etapas.find(e => e.tipo_etapa === tipoEtapa);
    
    if (etapaExistente) {
      // Remove a etapa e reordena as restantes
      const novasEtapas = etapas
        .filter(e => e.tipo_etapa !== tipoEtapa)
        .map((e, index) => ({
          ...e,
          ordem: index + 1,
        }));
      onChange(novasEtapas);
    } else {
      // Adiciona a etapa com a próxima ordem
      const novaEtapa: Etapa = {
        id: crypto.randomUUID(),
        tipo_etapa: tipoEtapa,
        ordem: etapas.length + 1,
      };
      onChange([...etapas, novaEtapa]);
    }
  };

  const updateEtapa = (tipoEtapa: string, updates: Partial<Etapa>) => {
    const novasEtapas = etapas.map(e => 
      e.tipo_etapa === tipoEtapa ? { ...e, ...updates } : e
    );
    onChange(novasEtapas);
  };

  const getEtapaOrdem = (tipoEtapa: string): number | null => {
    const etapa = etapas.find(e => e.tipo_etapa === tipoEtapa);
    return etapa ? etapa.ordem : null;
  };

  const isEtapaSelecionada = (tipoEtapa: string): boolean => {
    return etapas.some(e => e.tipo_etapa === tipoEtapa);
  };

  const getEtapa = (tipoEtapa: string): Etapa | undefined => {
    return etapas.find(e => e.tipo_etapa === tipoEtapa);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base">Etapas de Produção *</Label>
        <p className="text-sm text-muted-foreground mt-1">
          Clique nas etapas para selecionar na ordem desejada
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiposEtapaDisponiveis.map((tipo) => {
          const ordem = getEtapaOrdem(tipo.value);
          const selecionada = isEtapaSelecionada(tipo.value);
          
          return (
            <Card
              key={tipo.value}
              className={cn(
                "p-4 cursor-pointer transition-all hover:border-primary",
                selecionada && "border-primary bg-primary/5"
              )}
              onClick={() => toggleEtapa(tipo.value)}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold flex-shrink-0",
                  selecionada ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  {selecionada ? ordem : <Check className="h-5 w-5 opacity-0" />}
                </div>
                <span className="font-medium">{tipo.label}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {etapas.length > 0 && (
        <div className="space-y-3 pt-4">
          <Label className="text-sm font-medium">Prazos das Etapas Selecionadas</Label>
          {etapas
            .sort((a, b) => a.ordem - b.ordem)
            .map((etapa) => {
              const tipoInfo = tiposEtapaDisponiveis.find(t => t.value === etapa.tipo_etapa);
              
              return (
                <Card key={etapa.id} className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold flex-shrink-0">
                      {etapa.ordem}
                    </div>
                    <span className="font-medium">{tipoInfo?.label}</span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 ml-11">
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
                              ? format(etapa.data_inicio_prevista, "dd/MM/yyyy", {
                                  locale: ptBR,
                                })
                              : "Selecionar data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={etapa.data_inicio_prevista}
                            onSelect={(date) =>
                              updateEtapa(etapa.tipo_etapa, { data_inicio_prevista: date })
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
                              ? format(etapa.data_termino_prevista, "dd/MM/yyyy", {
                                  locale: ptBR,
                                })
                              : "Selecionar data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={etapa.data_termino_prevista}
                            onSelect={(date) =>
                              updateEtapa(etapa.tipo_etapa, { data_termino_prevista: date })
                            }
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </Card>
              );
            })}
        </div>
      )}
    </div>
  );
}
