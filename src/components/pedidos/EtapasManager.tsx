import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export interface Etapa {
  id: string;
  tipo_etapa: string;
  ordem: number;
  data_inicio_prevista?: Date;
  data_termino_prevista?: Date;
  terceiro_id?: string | null;
  observacoes?: string | null;
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
  { value: "aplicacao_travete", label: "Aplicação de Travete" },
  { value: "entrega", label: "Entrega" },
];

interface Terceiro {
  id: string;
  nome: string;
  tipo_etapa: string;
}

export default function EtapasManager({ etapas, onChange }: EtapasManagerProps) {
  const [terceiros, setTerceiros] = useState<Terceiro[]>([]);

  useEffect(() => {
    const fetchTerceiros = async () => {
      const { data } = await supabase
        .from("terceiros")
        .select("id, nome, tipo_etapa")
        .eq("ativo", true)
        .order("nome");
      if (data) setTerceiros(data as Terceiro[]);
    };
    fetchTerceiros();
  }, []);

  const toggleEtapa = (tipoEtapa: string) => {
    const etapaExistente = etapas.find(e => e.tipo_etapa === tipoEtapa);

    if (etapaExistente) {
      const novasEtapas = etapas
        .filter(e => e.tipo_etapa !== tipoEtapa)
        .map((e, index) => ({ ...e, ordem: index + 1 }));
      onChange(novasEtapas);
    } else {
      const novaEtapa: Etapa = {
        id: crypto.randomUUID(),
        tipo_etapa: tipoEtapa,
        ordem: etapas.length + 1,
        terceiro_id: null,
      };
      onChange([...etapas, novaEtapa]);
    }
  };

  const updateTerceiro = (tipoEtapa: string, terceiroId: string | null) => {
    onChange(etapas.map(e => e.tipo_etapa === tipoEtapa ? { ...e, terceiro_id: terceiroId } : e));
  };

  const updateObservacoes = (tipoEtapa: string, observacoes: string) => {
    onChange(etapas.map(e => e.tipo_etapa === tipoEtapa ? { ...e, observacoes } : e));
  };


  const getTerceirosForEtapa = (tipoEtapa: string) =>
    terceiros.filter(t => t.tipo_etapa === tipoEtapa);

  const getEtapaOrdem = (tipoEtapa: string): number | null => {
    const etapa = etapas.find(e => e.tipo_etapa === tipoEtapa);
    return etapa ? etapa.ordem : null;
  };

  const isEtapaSelecionada = (tipoEtapa: string): boolean => {
    return etapas.some(e => e.tipo_etapa === tipoEtapa);
  };

  // Etapas selecionadas que têm terceiros disponíveis
  const etapasComTerceiros = etapas
    .filter(e => getTerceirosForEtapa(e.tipo_etapa).length > 0)
    .sort((a, b) => a.ordem - b.ordem);

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
          const qtdTerceiros = getTerceirosForEtapa(tipo.value).length;

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
                <div className="flex-1">
                  <span className="font-medium block">{tipo.label}</span>
                  {qtdTerceiros > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {qtdTerceiros} {qtdTerceiros === 1 ? "opção" : "opções"} disponível{qtdTerceiros > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {etapasComTerceiros.length > 0 && (
        <Card className="p-4 space-y-3">
          <div>
            <Label className="text-base">Definir Responsáveis</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Selecione qual fornecedor/oficina ficará responsável por cada etapa
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {etapasComTerceiros.map((etapa) => {
              const opcoes = getTerceirosForEtapa(etapa.tipo_etapa);
              const label = tiposEtapaDisponiveis.find(t => t.value === etapa.tipo_etapa)?.label || etapa.tipo_etapa;
              return (
                <div key={etapa.id} className="space-y-1.5">
                  <Label className="text-sm">{etapa.ordem}. {label}</Label>
                  <Select
                    value={etapa.terceiro_id || "none"}
                    onValueChange={(v) => updateTerceiro(etapa.tipo_etapa, v === "none" ? null : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não definido</SelectItem>
                      {opcoes.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
