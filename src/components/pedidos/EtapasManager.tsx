import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Plus, GripVertical, Trash2, Calendar } from "lucide-react";
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

const tiposEtapa = [
  { value: "lacre_piloto", label: "Lacre Piloto" },
  { value: "liberacao_corte", label: "Liberação Corte" },
  { value: "corte", label: "Corte" },
  { value: "estampa", label: "Estampa" },
  { value: "bordado", label: "Bordado" },
  { value: "lavado", label: "Lavado" },
  { value: "costura", label: "Costura" },
  { value: "acabamento", label: "Acabamento" },
  { value: "entrega", label: "Entrega" },
];

export default function EtapasManager({ etapas, onChange }: EtapasManagerProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const addEtapa = () => {
    const newEtapa: Etapa = {
      id: crypto.randomUUID(),
      tipo_etapa: "",
      ordem: etapas.length + 1,
    };
    onChange([...etapas, newEtapa]);
  };

  const removeEtapa = (index: number) => {
    const newEtapas = etapas.filter((_, i) => i !== index);
    // Reordenar
    const reordered = newEtapas.map((etapa, i) => ({
      ...etapa,
      ordem: i + 1,
    }));
    onChange(reordered);
  };

  const updateEtapa = (index: number, updates: Partial<Etapa>) => {
    const newEtapas = [...etapas];
    newEtapas[index] = { ...newEtapas[index], ...updates };
    onChange(newEtapas);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newEtapas = [...etapas];
    const draggedItem = newEtapas[draggedIndex];
    newEtapas.splice(draggedIndex, 1);
    newEtapas.splice(index, 0, draggedItem);

    // Atualizar ordem
    const reordered = newEtapas.map((etapa, i) => ({
      ...etapa,
      ordem: i + 1,
    }));

    onChange(reordered);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base">Etapas de Produção *</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Adicione e ordene as etapas com seus respectivos prazos
          </p>
        </div>
        <Button type="button" onClick={addEtapa} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Etapa
        </Button>
      </div>

      {etapas.length === 0 && (
        <Card className="p-8 text-center border-dashed">
          <p className="text-muted-foreground">
            Nenhuma etapa adicionada. Clique em "Adicionar Etapa" para começar.
          </p>
        </Card>
      )}

      <div className="space-y-3">
        {etapas.map((etapa, index) => (
          <Card
            key={etapa.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={cn(
              "p-4 cursor-move transition-all",
              draggedIndex === index && "opacity-50"
            )}
          >
            <div className="flex items-start gap-3">
              <GripVertical className="h-5 w-5 text-muted-foreground mt-2 flex-shrink-0" />
              
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold">
                    {etapa.ordem}
                  </div>
                  
                  <div className="flex-1">
                    <Select
                      value={etapa.tipo_etapa}
                      onValueChange={(value) => updateEtapa(index, { tipo_etapa: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a etapa" />
                      </SelectTrigger>
                      <SelectContent>
                        {tiposEtapa.map((tipo) => (
                          <SelectItem key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEtapa(index)}
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
                            updateEtapa(index, { data_inicio_prevista: date })
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
                            updateEtapa(index, { data_termino_prevista: date })
                          }
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
