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
  { value: "compra_de_insumos", label: "Compra de Insumos" },
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

    </div>
  );
}
