import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Search, Shirt, RefreshCw } from "lucide-react";
import { useUserRoles } from "@/hooks/useUserRoles";

interface Tecido {
  id: string;
  nome: string;
  composicao: string;
  gramatura_g_m2: number;
  largura_m: number;
  rendimento_m_kg: number;
  observacoes: string | null;
  ativo: boolean;
}

interface TecidoComAgregados extends Tecido {
  variacoes_count: number;
  estoque_total: number;
}

interface FornecedorOpt {
  id: string;
  nome: string;
}

const emptyForm = {
  nome: "",
  composicao: "",
  gramatura_g_m2: "",
  largura_m: "",
  rendimento_m_kg: "",
  observacoes: "",
  ativo: true,
  fornecedor_id: "",
  cor_inicial: "",
  preco_por_kg: "",
};

function calcRendimento(gramatura: number, largura: number): number {
  if (!gramatura || !largura) return 0;
  return Math.round((1000 / (gramatura * largura)) * 100) / 100;
}

function formatNumber(n: number, decimals = 2): string {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default function Tecidos() {
  const navigate = useNavigate();
  const { hasRole } = useUserRoles();
  const canEdit = hasRole("admin");

  const [items, setItems] = useState<TecidoComAgregados[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [rendimentoTouched, setRendimentoTouched] = useState(false);
  const [fornecedores, setFornecedores] = useState<FornecedorOpt[]>([]);

  const load = async () => {
    setLoading(true);
    const { data: tecidos, error } = await supabase
      .from("tecidos" as any)
      .select("*")
      .order("nome", { ascending: true });
    if (error) {
      toast.error("Erro ao carregar tecidos");
      setLoading(false);
      return;
    }
    const tecidosList = (tecidos || []) as unknown as Tecido[];

    const { data: variacoes } = await supabase
      .from("tecidos_variacoes" as any)
      .select("tecido_id, estoque_kg, ativo");

    const variacoesArr = (variacoes || []) as unknown as Array<{
      tecido_id: string;
      estoque_kg: number;
      ativo: boolean;
    }>;

    const agg = tecidosList.map((t) => {
      const vs = variacoesArr.filter((v) => v.tecido_id === t.id && v.ativo);
      return {
        ...t,
        variacoes_count: vs.length,
        estoque_total: vs.reduce((s, v) => s + Number(v.estoque_kg || 0), 0),
      };
    });

    setItems(agg);
    setLoading(false);
  };

  useEffect(() => {
    load();
    (async () => {
      const { data } = await supabase
        .from("fornecedores" as any)
        .select("id, nome")
        .eq("ativo", true)
        .order("nome", { ascending: true });
      setFornecedores(((data || []) as unknown as FornecedorOpt[]));
    })();
  }, []);

  // Auto-calc rendimento
  useEffect(() => {
    const g = parseFloat(form.gramatura_g_m2);
    const l = parseFloat(form.largura_m);
    if (!rendimentoTouched && g > 0 && l > 0) {
      setForm((f) => ({ ...f, rendimento_m_kg: String(calcRendimento(g, l)) }));
    }
  }, [form.gramatura_g_m2, form.largura_m, rendimentoTouched]);

  const filtered = useMemo(() => {
    return items.filter((t) => {
      if (!showInactive && !t.ativo) return false;
      if (search && !t.nome.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [items, search, showInactive]);

  const totalAtivos = items.filter((i) => i.ativo).length;

  const openCreate = () => {
    setForm(emptyForm);
    setRendimentoTouched(false);
    setOpen(true);
  };

  const recomputeRendimento = () => {
    const g = parseFloat(form.gramatura_g_m2);
    const l = parseFloat(form.largura_m);
    if (g > 0 && l > 0) {
      setForm({ ...form, rendimento_m_kg: String(calcRendimento(g, l)) });
      setRendimentoTouched(false);
    }
  };

  const handleSave = async () => {
    const nome = form.nome.trim();
    const composicao = form.composicao.trim();
    const g = parseFloat(form.gramatura_g_m2);
    const l = parseFloat(form.largura_m);
    const r = parseFloat(form.rendimento_m_kg);

    if (!nome) return toast.error("Nome é obrigatório");
    if (!composicao) return toast.error("Composição é obrigatória");
    if (!(g > 0)) return toast.error("Gramatura deve ser maior que 0");
    if (!(l > 0)) return toast.error("Largura deve ser maior que 0");
    if (!(r > 0)) return toast.error("Rendimento deve ser maior que 0");

    // Optional supplier block: if a supplier is selected, cor + preço are required
    const fornecedorId = form.fornecedor_id;
    const corInicial = form.cor_inicial.trim();
    const precoStr = form.preco_por_kg.trim();
    const precoNum = parseFloat(precoStr);
    if (fornecedorId) {
      if (!corInicial) return toast.error("Informe a cor da variação inicial");
      if (!(precoNum > 0)) return toast.error("Informe um preço por kg válido");
    }

    setSaving(true);
    const { data, error } = await supabase
      .from("tecidos" as any)
      .insert({
        nome,
        composicao,
        gramatura_g_m2: g,
        largura_m: l,
        rendimento_m_kg: r,
        observacoes: form.observacoes.trim() || null,
        ativo: form.ativo,
      })
      .select("id")
      .single();

    if (error) {
      setSaving(false);
      toast.error(error.message || "Erro ao salvar");
      return;
    }
    const newId = (data as any)?.id as string;

    if (fornecedorId && newId) {
      const { data: variacao, error: vErr } = await supabase
        .from("tecidos_variacoes" as any)
        .insert({ tecido_id: newId, cor: corInicial, estoque_kg: 0, ativo: true })
        .select("id")
        .single();
      if (vErr) {
        setSaving(false);
        toast.error("Tecido criado, mas falhou ao criar variação: " + vErr.message);
        navigate(`/catalogo/tecidos/${newId}`);
        return;
      }
      const variacaoId = (variacao as any)?.id;
      const { error: pErr } = await supabase
        .from("tecidos_fornecedores_precos" as any)
        .insert({
          tecido_variacao_id: variacaoId,
          fornecedor_id: fornecedorId,
          preco_por_kg: precoNum,
          ativo: true,
        });
      if (pErr) {
        setSaving(false);
        toast.error("Variação criada, mas falhou ao salvar preço: " + pErr.message);
        navigate(`/catalogo/tecidos/${newId}`);
        return;
      }
    }

    setSaving(false);
    toast.success("Tecido criado");
    setOpen(false);
    if (newId) navigate(`/catalogo/tecidos/${newId}`);
    else load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shirt className="h-6 w-6 text-primary" />
            Tecidos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Catálogo de tecidos com variações e preços por fornecedor
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Total ativos: <span className="font-semibold">{totalAtivos}</span>
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Adicionar Tecido
          </Button>
        )}
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome..."
              className="pl-9"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={showInactive} onCheckedChange={setShowInactive} />
            Mostrar inativos
          </label>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <Shirt className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              {items.length === 0
                ? "Nenhum tecido cadastrado ainda"
                : "Nenhum tecido encontrado com esses filtros"}
            </p>
            {canEdit && items.length === 0 && (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" /> Cadastrar primeiro tecido
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Composição</TableHead>
                <TableHead>Gramatura</TableHead>
                <TableHead>Largura</TableHead>
                <TableHead>Rendimento</TableHead>
                <TableHead>Variações</TableHead>
                <TableHead>Estoque total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow
                  key={t.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/catalogo/tecidos/${t.id}`)}
                >
                  <TableCell className="font-medium">{t.nome}</TableCell>
                  <TableCell>{t.composicao}</TableCell>
                  <TableCell>{formatNumber(Number(t.gramatura_g_m2), 0)} g/m²</TableCell>
                  <TableCell>{formatNumber(Number(t.largura_m))} m</TableCell>
                  <TableCell>{formatNumber(Number(t.rendimento_m_kg))} m/kg</TableCell>
                  <TableCell>{t.variacoes_count}</TableCell>
                  <TableCell>{formatNumber(t.estoque_total, 1)} kg</TableCell>
                  <TableCell>
                    {t.ativo ? (
                      <Badge className="bg-green-600 hover:bg-green-600">Ativo</Badge>
                    ) : (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Novo Tecido</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Rugby Light"
              />
            </div>
            <div>
              <Label>Composição *</Label>
              <Input
                value={form.composicao}
                onChange={(e) => setForm({ ...form, composicao: e.target.value })}
                placeholder="Ex: 100% Algodão"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Gramatura (g/m²) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.gramatura_g_m2}
                  onChange={(e) =>
                    setForm({ ...form, gramatura_g_m2: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Largura (m) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.largura_m}
                  onChange={(e) => setForm({ ...form, largura_m: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Rendimento (m/kg) *</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.rendimento_m_kg}
                  onChange={(e) => {
                    setForm({ ...form, rendimento_m_kg: e.target.value });
                    setRendimentoTouched(true);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={recomputeRendimento}
                  title="Recalcular a partir de gramatura × largura"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Calculado automaticamente como 1000 / (gramatura × largura). Pode ser editado.
              </p>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              />
            </div>

            <div className="rounded-md border p-3 space-y-3">
              <div>
                <Label className="text-sm font-semibold">Fornecedor (opcional)</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Já vincule um fornecedor criando uma variação inicial com preço. Você pode adicionar mais depois.
                </p>
              </div>
              <div>
                <Label>Fornecedor</Label>
                <Select
                  value={form.fornecedor_id || "none"}
                  onValueChange={(v) =>
                    setForm({ ...form, fornecedor_id: v === "none" ? "" : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {fornecedores.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.fornecedor_id && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Cor inicial *</Label>
                    <Input
                      value={form.cor_inicial}
                      onChange={(e) => setForm({ ...form, cor_inicial: e.target.value })}
                      placeholder="Ex: Preto"
                    />
                  </div>
                  <div>
                    <Label>Preço por kg (R$) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.preco_por_kg}
                      onChange={(e) => setForm({ ...form, preco_por_kg: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <Label className="m-0">Ativo</Label>
              <Switch
                checked={form.ativo}
                onCheckedChange={(v) => setForm({ ...form, ativo: v })}
              />
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
