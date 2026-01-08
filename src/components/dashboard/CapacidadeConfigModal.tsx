import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { OcupacaoMensal } from "@/hooks/useCapacidadeOcupacao";
import { Pencil, Plus, Save } from "lucide-react";

interface CapacidadeConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  ocupacoes: OcupacaoMensal[];
}

interface CapacidadeForm {
  mes: string;
  capacidade_pecas: number | "";
  observacoes: string;
}

export const CapacidadeConfigModal = ({
  open,
  onOpenChange,
  onSave,
  ocupacoes,
}: CapacidadeConfigModalProps) => {
  const [editingMes, setEditingMes] = useState<string | null>(null);
  const [form, setForm] = useState<CapacidadeForm>({
    mes: "",
    capacidade_pecas: "",
    observacoes: "",
  });
  const [saving, setSaving] = useState(false);

  // Gerar lista de meses para exibição
  const meses = Array.from({ length: 7 }, (_, i) => {
    const data = addMonths(startOfMonth(new Date()), i);
    return {
      value: format(data, "yyyy-MM"),
      label: format(data, "MMMM/yyyy", { locale: ptBR }),
    };
  });

  useEffect(() => {
    if (editingMes) {
      const ocupacao = ocupacoes.find((o) => o.mes === editingMes);
      setForm({
        mes: editingMes,
        capacidade_pecas: ocupacao?.capacidade || "",
        observacoes: "",
      });
    }
  }, [editingMes, ocupacoes]);

  const handleSave = async () => {
    if (!form.mes || !form.capacidade_pecas) {
      toast.error("Preencha o mês e a capacidade");
      return;
    }

    setSaving(true);
    try {
      const ocupacao = ocupacoes.find((o) => o.mes === form.mes);

      if (ocupacao?.capacidade) {
        // Atualizar
        const { error } = await supabase
          .from("capacidade_mensal")
          .update({
            capacidade_pecas: Number(form.capacidade_pecas),
            observacoes: form.observacoes || null,
          })
          .eq("mes", form.mes);

        if (error) throw error;
        toast.success("Capacidade atualizada!");
      } else {
        // Inserir
        const { error } = await supabase.from("capacidade_mensal").insert({
          mes: form.mes,
          capacidade_pecas: Number(form.capacidade_pecas),
          observacoes: form.observacoes || null,
        });

        if (error) throw error;
        toast.success("Capacidade cadastrada!");
      }

      setEditingMes(null);
      setForm({ mes: "", capacidade_pecas: "", observacoes: "" });
      onSave();
    } catch (error: any) {
      console.error("Erro ao salvar capacidade:", error);
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getOcupacaoForMes = (mes: string) => {
    return ocupacoes.find((o) => o.mes === mes);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configurar Capacidade Mensal</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {editingMes ? (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-sm font-medium">
                Editando: {meses.find((m) => m.value === editingMes)?.label}
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacidade">Capacidade (peças/mês)</Label>
                <Input
                  id="capacidade"
                  type="number"
                  min="1"
                  value={form.capacidade_pecas}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      capacidade_pecas: e.target.value ? Number(e.target.value) : "",
                    }))
                  }
                  placeholder="Ex: 5000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações (opcional)</Label>
                <Textarea
                  id="observacoes"
                  value={form.observacoes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, observacoes: e.target.value }))
                  }
                  placeholder="Ex: Capacidade reduzida por férias coletivas"
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditingMes(null)}
                  disabled={saving}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {meses.map((mes) => {
                const ocupacao = getOcupacaoForMes(mes.value);
                const hasCapacidade = ocupacao?.capacidade !== null;
                const nivel = ocupacao?.nivel;

                return (
                  <div
                    key={mes.value}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <div className="font-medium capitalize">{mes.label}</div>
                      {hasCapacidade ? (
                        <div className="text-sm text-muted-foreground">
                          Capacidade: {ocupacao?.capacidade?.toLocaleString()} peças
                          {ocupacao && ocupacao.ocupacao !== null && (
                            <span
                              className={`ml-2 ${
                                nivel === "vermelho"
                                  ? "text-red-600"
                                  : nivel === "laranja"
                                  ? "text-orange-600"
                                  : nivel === "amarelo"
                                  ? "text-yellow-600"
                                  : "text-green-600"
                              }`}
                            >
                              ({ocupacao.ocupacao.toFixed(0)}% ocupado)
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          Sem capacidade configurada
                        </div>
                      )}
                    </div>
                    <Button
                      variant={hasCapacidade ? "ghost" : "outline"}
                      size="sm"
                      onClick={() => {
                        setEditingMes(mes.value);
                        setForm({
                          mes: mes.value,
                          capacidade_pecas: ocupacao?.capacidade || "",
                          observacoes: "",
                        });
                      }}
                    >
                      {hasCapacidade ? (
                        <Pencil className="h-4 w-4" />
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-1" />
                          Configurar
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
