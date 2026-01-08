import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Truck, X } from "lucide-react";

export interface FiltrosCarteira {
  status: string[];
  cliente: string;
  responsavel: string;
  prioridade: string;
}

interface CarteiraFiltersProps {
  tipoVisao: "entrega" | "faturamento";
  onTipoVisaoChange: (tipo: "entrega" | "faturamento") => void;
  usarPonderado: boolean;
  onUsarPonderadoChange: (value: boolean) => void;
  filtros: FiltrosCarteira;
  onFiltrosChange: (filtros: FiltrosCarteira) => void;
  clientes: { id: string; nome: string }[];
}

const statusOptions = [
  { value: "aguardando", label: "Aguardando" },
  { value: "em_producao", label: "Em Produção" },
  { value: "concluido", label: "Concluído" },
];

const prioridadeOptions = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

export const CarteiraFilters = ({
  tipoVisao,
  onTipoVisaoChange,
  usarPonderado,
  onUsarPonderadoChange,
  filtros,
  onFiltrosChange,
  clientes,
}: CarteiraFiltersProps) => {
  const toggleStatus = (status: string) => {
    const newStatus = filtros.status.includes(status)
      ? filtros.status.filter((s) => s !== status)
      : [...filtros.status, status];
    onFiltrosChange({ ...filtros, status: newStatus });
  };

  const limparFiltros = () => {
    onFiltrosChange({
      status: [],
      cliente: "",
      responsavel: "",
      prioridade: "",
    });
  };

  const temFiltrosAtivos = 
    filtros.status.length > 0 || 
    filtros.cliente || 
    filtros.prioridade;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          {/* Linha 1: Tipo de visão e Ponderado */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Toggle Entrega/Faturamento */}
            <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
              <Button
                variant={tipoVisao === "entrega" ? "default" : "ghost"}
                size="sm"
                onClick={() => onTipoVisaoChange("entrega")}
                className="gap-2"
              >
                <Truck className="h-4 w-4" />
                Mês de Entrega
              </Button>
              <Button
                variant={tipoVisao === "faturamento" ? "default" : "ghost"}
                size="sm"
                onClick={() => onTipoVisaoChange("faturamento")}
                className="gap-2"
              >
                <Calendar className="h-4 w-4" />
                Mês de Faturamento
              </Button>
            </div>

            {/* Toggle Ponderado */}
            <div className="flex items-center gap-2">
              <Switch
                id="ponderado"
                checked={usarPonderado}
                onCheckedChange={onUsarPonderadoChange}
              />
              <Label htmlFor="ponderado" className="text-sm cursor-pointer">
                Usar peças ponderadas
              </Label>
            </div>
          </div>

          {/* Linha 2: Filtros */}
          <div className="flex flex-wrap items-end gap-4">
            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <div className="flex flex-wrap gap-1">
                {statusOptions.map((opt) => (
                  <Badge
                    key={opt.value}
                    variant={filtros.status.includes(opt.value) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleStatus(opt.value)}
                  >
                    {opt.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Cliente */}
            <div className="space-y-1.5 min-w-[200px]">
              <Label className="text-xs text-muted-foreground">Cliente</Label>
              <Input
                placeholder="Buscar cliente..."
                value={filtros.cliente}
                onChange={(e) => onFiltrosChange({ ...filtros, cliente: e.target.value })}
                className="h-9"
              />
            </div>

            {/* Prioridade */}
            <div className="space-y-1.5 min-w-[140px]">
              <Label className="text-xs text-muted-foreground">Prioridade</Label>
              <Select
                value={filtros.prioridade || "all"}
                onValueChange={(v) => onFiltrosChange({ ...filtros, prioridade: v === "all" ? "" : v })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {prioridadeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Limpar Filtros */}
            {temFiltrosAtivos && (
              <Button variant="ghost" size="sm" onClick={limparFiltros} className="h-9">
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
