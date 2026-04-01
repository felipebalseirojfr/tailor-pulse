import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Users } from "lucide-react";

const ETAPAS_NOMES: Record<string, string> = {
  pilotagem: "Pilotagem",
  compra_de_insumos: "Compra de Insumos",
  lacre_piloto: "Lacre Piloto",
  liberacao_corte: "Liberação de Corte",
  corte: "Corte",
  lavanderia: "Lavanderia",
  costura: "Costura",
  caseado: "Caseado",
  estamparia_bordado: "Estamparia/Bordado",
  estamparia: "Estamparia",
  bordado: "Bordado",
  personalizacao: "Personalização",
  acabamento: "Acabamento",
  entrega: "Entrega",
};

interface Terceiro {
  id: string;
  nome: string;
  tipo_etapa: string;
  ativo: boolean;
}

export default function Terceiros() {
  const { toast } = useToast();
  const [terceiros, setTerceiros] = useState<Terceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<Terceiro | null>(null);
  const [deletandoId, setDeletandoId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [tipoEtapa, setTipoEtapa] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [filtroEtapa, setFiltroEtapa] = useState<string>("todos");

  useEffect(() => {
    fetchTerceiros();
  }, []);

  const fetchTerceiros = async () => {
    try {
      const { data, error } = await supabase
        .from("terceiros")
        .select("*")
        .order("tipo_etapa")
        .order("nome");
      if (error) throw error;
      setTerceiros(data || []);
    } catch (error) {
      console.error("Erro ao buscar terceiros:", error);
    } finally {
      setLoading(false);
    }
  };

  const abrirNovo = () => {
    setEditando(null);
    setNome("");
    setTipoEtapa("");
    setFormAberto(true);
  };

  const abrirEditar = (terceiro: Terceiro) => {
    setEditando(terceiro);
    setNome(terceiro.nome);
    setTipoEtapa(terceiro.tipo_etapa);
    setFormAberto(true);
  };

  const salvar = async () => {
    if (!nome.trim() || !tipoEtapa) {
      toast({ title: "Preencha o nome e a etapa.", variant: "destructive" });
      return;
    }
    setSalvando(true);
    try {
      if (editando) {
        const { error } = await supabase
          .from("terceiros")
          .update({ nome: nome.trim(), tipo_etapa: tipoEtapa })
          .eq("id", editando.id);
        if (error) throw error;
        toast({ title: "Terceiro atualizado!" });
      } else {
        const { error } = await supabase
          .from("terceiros")
          .insert({ nome: nome.trim(), tipo_etapa: tipoEtapa });
        if (error) throw error;
        toast({ title: "Terceiro cadastrado!" });
      }
      setFormAberto(false);
      fetchTerceiros();
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  const deletar = async () => {
    if (!deletandoId) return;
    try {
      const { error } = await supabase.from("terceiros").delete().eq("id", deletandoId);
      if (error) throw error;
      toast({ title: "Terceiro removido." });
      fetchTerceiros();
    } catch (error: any) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    } finally {
      setDeletandoId(null);
    }
  };

  const toggleAtivo = async (terceiro: Terceiro) => {
    const { error } = await supabase
      .from("terceiros")
      .update({ ativo: !terceiro.ativo })
      .eq("id", terceiro.id);
    if (!error) fetchTerceiros();
  };

  const etapasComTerceiros = [...new Set(terceiros.map((t) => t.tipo_etapa))];
  const terceirosFiltrados = filtroEtapa === "todos"
    ? terceiros
    : terceiros.filter((t) => t.tipo_etapa === filtroEtapa);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            Terceiros
          </h1>
          <p className="text-muted-foreground mt-1">
            Fornecedores externos por etapa de produção
          </p>
        </div>
        <Button onClick={abrirNovo} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Terceiro
        </Button>
      </div>

      {/* Filtros por etapa */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filtroEtapa === "todos" ? "default" : "outline"}
          size="sm"
          onClick={() => setFiltroEtapa("todos")}
        >
          Todos ({terceiros.length})
        </Button>
        {etapasComTerceiros.map((etapa) => (
          <Button
            key={etapa}
            variant={filtroEtapa === etapa ? "default" : "outline"}
            size="sm"
            onClick={() => setFiltroEtapa(etapa)}
          >
            {ETAPAS_NOMES[etapa] || etapa} ({terceiros.filter((t) => t.tipo_etapa === etapa).length})
          </Button>
        ))}
      </div>

      {/* Lista */}
      {terceirosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users className="h-12 w-12 mb-3 opacity-20" />
            <p className="font-medium">Nenhum terceiro cadastrado</p>
            <p className="text-sm">Clique em "Novo Terceiro" para começar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {terceirosFiltrados.map((terceiro) => (
            <Card key={terceiro.id} className={`transition-opacity ${!terceiro.ativo ? "opacity-50" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold truncate">{terceiro.nome}</p>
                      {!terceiro.ativo && (
                        <Badge variant="secondary" className="text-xs shrink-0">Inativo</Badge>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {ETAPAS_NOMES[terceiro.tipo_etapa] || terceiro.tipo_etapa}
                    </Badge>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => abrirEditar(terceiro)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => setDeletandoId(terceiro.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="w-full mt-2 text-xs h-7" onClick={() => toggleAtivo(terceiro)}>
                  {terceiro.ativo ? "Desativar" : "Ativar"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal cadastro/edição */}
      <AlertDialog open={formAberto} onOpenChange={setFormAberto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{editando ? "Editar Terceiro" : "Novo Terceiro"}</AlertDialogTitle>
            <AlertDialogDescription>
              Preencha o nome e a etapa que este fornecedor atende.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome *</label>
              <Input
                placeholder="Ex: Costureira Maria"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Etapa *</label>
              <Select value={tipoEtapa} onValueChange={setTipoEtapa}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a etapa" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ETAPAS_NOMES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : editando ? "Salvar" : "Cadastrar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmar exclusão */}
      <AlertDialog open={!!deletandoId} onOpenChange={() => setDeletandoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover terceiro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deletar}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
