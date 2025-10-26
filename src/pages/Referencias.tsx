import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Scissors, Sparkles, CheckCircle2, Search, Filter } from "lucide-react";
import { toast } from "sonner";

interface Referencia {
  id: string;
  codigo_referencia: string;
  quantidade: number;
  tecido_material: string | null;
  etapa_producao: "corte" | "costura" | "acabamento" | "pronto";
  data_inicio_producao: string | null;
  data_termino: string | null;
  valor_unitario: number;
  valor_total: number;
  observacoes: string | null;
  pedido_id: string;
  pedidos: {
    codigo_pedido: string;
    clientes: {
      nome: string;
    };
  };
}

const etapaLabels = {
  corte: "Corte",
  costura: "Costura",
  acabamento: "Acabamento",
  pronto: "Pronto",
};

const etapaIcons = {
  corte: Scissors,
  costura: Sparkles,
  acabamento: Sparkles,
  pronto: CheckCircle2,
};

const etapaColors = {
  corte: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  costura: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  acabamento: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  pronto: "bg-green-500/10 text-green-600 border-green-500/20",
};

export default function Referencias() {
  const [referencias, setReferencias] = useState<Referencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [etapaFilter, setEtapaFilter] = useState<string>("all");

  useEffect(() => {
    fetchReferencias();

    const channel = supabase
      .channel("referencias-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "referencias" },
        () => {
          fetchReferencias();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchReferencias = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("referencias")
        .select(
          `
          *,
          pedidos!inner (
            codigo_pedido,
            clientes!inner (
              nome
            )
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReferencias(data || []);
    } catch (error) {
      console.error("Erro ao buscar referências:", error);
      toast.error("Erro ao carregar referências");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEtapa = async (
    id: string,
    novaEtapa: Referencia["etapa_producao"]
  ) => {
    try {
      const updates: any = { etapa_producao: novaEtapa };

      if (novaEtapa === "corte" && !referencias.find((r) => r.id === id)?.data_inicio_producao) {
        updates.data_inicio_producao = new Date().toISOString().split("T")[0];
      }

      if (novaEtapa === "pronto") {
        updates.data_termino = new Date().toISOString().split("T")[0];
      }

      const { error } = await supabase
        .from("referencias")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      toast.success("Etapa atualizada com sucesso");
      fetchReferencias();
    } catch (error) {
      console.error("Erro ao atualizar etapa:", error);
      toast.error("Erro ao atualizar etapa");
    }
  };

  const filteredReferencias = referencias.filter((ref) => {
    const matchesSearch =
      ref.codigo_referencia.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.pedidos.codigo_pedido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.pedidos.clientes.nome.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesEtapa = etapaFilter === "all" || ref.etapa_producao === etapaFilter;

    return matchesSearch && matchesEtapa;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Carregando referências...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Controle de Produção</h1>
        <p className="text-muted-foreground mt-2">
          Visualização e controle de todas as referências em produção
        </p>
      </div>

      <Card className="p-6">
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, pedido ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={etapaFilter} onValueChange={setEtapaFilter}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por etapa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as etapas</SelectItem>
              <SelectItem value="corte">Corte</SelectItem>
              <SelectItem value="costura">Costura</SelectItem>
              <SelectItem value="acabamento">Acabamento</SelectItem>
              <SelectItem value="pronto">Pronto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead className="text-center">Quantidade</TableHead>
                <TableHead>Tecido/Material</TableHead>
                <TableHead className="text-center">Etapa Atual</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Término</TableHead>
                <TableHead className="text-right">Valor Unit.</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReferencias.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                    Nenhuma referência encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredReferencias.map((ref) => {
                  const Icon = etapaIcons[ref.etapa_producao];
                  return (
                    <TableRow key={ref.id}>
                      <TableCell className="font-medium">{ref.codigo_referencia}</TableCell>
                      <TableCell>{ref.pedidos.clientes.nome}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{ref.pedidos.codigo_pedido}</Badge>
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {ref.quantidade}
                      </TableCell>
                      <TableCell>{ref.tecido_material || "-"}</TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          <Badge className={etapaColors[ref.etapa_producao]}>
                            <Icon className="h-3 w-3 mr-1" />
                            {etapaLabels[ref.etapa_producao]}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {ref.data_inicio_producao
                          ? new Date(ref.data_inicio_producao).toLocaleDateString("pt-BR")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {ref.data_termino
                          ? new Date(ref.data_termino).toLocaleDateString("pt-BR")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {ref.valor_unitario.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        R$ {ref.valor_total.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={ref.etapa_producao}
                          onValueChange={(value) =>
                            handleUpdateEtapa(ref.id, value as Referencia["etapa_producao"])
                          }
                        >
                          <SelectTrigger className="w-32 mx-auto">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="corte">Corte</SelectItem>
                            <SelectItem value="costura">Costura</SelectItem>
                            <SelectItem value="acabamento">Acabamento</SelectItem>
                            <SelectItem value="pronto">Pronto</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          Total: {filteredReferencias.length} referências
          {etapaFilter !== "all" && ` na etapa de ${etapaLabels[etapaFilter as keyof typeof etapaLabels]}`}
        </div>
      </Card>
    </div>
  );
}
