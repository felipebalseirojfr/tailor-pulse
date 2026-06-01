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
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Search, Tag, Check, ChevronsUpDown } from "lucide-react";
import { useUserRoles } from "@/hooks/useUserRoles";
import { cn } from "@/lib/utils";

type Unidade = "peca" | "kg" | "metro" | "cone" | "metragem" | "rolo";

const UNIDADES: { value: Unidade; label: string; short: string }[] = [
  { value: "peca", label: "Peça", short: "Peça" },
  { value: "kg", label: "kg", short: "kg" },
  { value: "metro", label: "Metro", short: "m" },
  { value: "cone", label: "Cone", short: "Cone" },
  { value: "metragem", label: "Metragem", short: "Metragem" },
  { value: "rolo", label: "Rolo", short: "Rolo" },
];

const unidadeLabel = (u: Unidade) => UNIDADES.find((x) => x.value === u)?.short ?? u;

interface Aviamento {
  id: string;
  nome: string;
  categoria: string;
  tamanho_medida: string | null;
  cor: string | null;
  unidade: Unidade;
  estoque: number;
  observacoes: string | null;
  ativo: boolean;
}

interface AviamentoAgg extends Aviamento {
  fornecedores_count: number;
  preco_min: number | null;
  preco_max: number | null;
}

interface FornecedorOpt {
  id: string;
  nome: string;
}

const emptyForm = {
  nome: "",
  categoria: "",
  tamanho_medida: "",
  cor: "",
  unidade: "peca" as Unidade,
  estoque: "0",
  observacoes: "",
  ativo: true,
  fornecedor_id: "",
  preco_por_unidade: "",
};

const fmtMoney = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

export default function Aviamentos() {
  const navigate = useNavigate();
  const { hasRole } = useUserRoles();
  const canEdit = hasRole("admin");

  const [items, setItems] = useState<AviamentoAgg[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("__todas__");
  const [showInactive, setShowInactive] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [catPopoverOpen, setCatPopoverOpen] = useState(false);

  const [fornecedores, setFornecedores] = useState<FornecedorOpt[]>([]);
  const [fornPopoverOpen, setFornPopoverOpen] = useState(false);
  const [novoFornOpen, setNovoFornOpen] = useState(false);
  const [novoFornNome, setNovoFornNome] = useState("");
  const [novoFornCnpj, setNovoFornCnpj] = useState("");
  const [savingForn, setSavingForn] = useState(false);

  const [quickOpen, setQuickOpen] = useState(false);
  const [quickItem, setQuickItem] = useState<AviamentoAgg | null>(null);
  const [quickPrecos, setQuickPrecos] = useState<Array<{ fornecedor_nome: string; preco_por_unidade: number; ativo: boolean }>>([]);
  const [quickLoading, setQuickLoading] = useState(false);

  const openQuickView = async (a: AviamentoAgg) => {
    setQuickItem(a);
    setQuickOpen(true);
    setQuickLoading(true);
    setQuickPrecos([]);
    const { data } = await supabase
      .from("aviamentos_fornecedores_precos" as any)
      .select("preco_por_unidade, ativo, fornecedor_id")
      .eq("aviamento_id", a.id);
    const rows = (data || []) as unknown as Array<{ preco_por_unidade: number; ativo: boolean; fornecedor_id: string }>;
    const enriched = rows.map((r) => ({
      preco_por_unidade: Number(r.preco_por_unidade),
      ativo: r.ativo,
      fornecedor_nome: fornecedores.find((f) => f.id === r.fornecedor_id)?.nome ?? "—",
    }));
    setQuickPrecos(enriched);
    setQuickLoading(false);
  };

  const formatCnpj = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 14);
    return d
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  };

  const handleCreateFornecedor = async () => {
    const nome = novoFornNome.trim();
    const cnpjDigits = novoFornCnpj.replace(/\D/g, "");
    if (!nome) return toast.error("Informe o nome do fornecedor");
    if (cnpjDigits.length !== 14) return toast.error("Informe um CNPJ válido (14 dígitos)");
    setSavingForn(true);
    const { data, error } = await supabase
      .from("fornecedores" as any)
      .insert({ nome, cnpj: formatCnpj(cnpjDigits), ativo: true })
      .select("id, nome")
      .single();
    setSavingForn(false);
    if (error) {
      toast.error(error.message || "Erro ao criar fornecedor");
      return;
    }
    const novo = data as unknown as FornecedorOpt;
    setFornecedores((prev) => [...prev, novo].sort((a, b) => a.nome.localeCompare(b.nome)));
    setForm((f) => ({ ...f, fornecedor_id: novo.id }));
    setNovoFornNome("");
    setNovoFornCnpj("");
    setNovoFornOpen(false);
    setFornPopoverOpen(false);
    toast.success("Fornecedor cadastrado");
  };

  const load = async () => {
    setLoading(true);
    const { data: avs, error } = await supabase
      .from("aviamentos" as any)
      .select("*")
      .order("nome", { ascending: true });
    if (error) {
      toast.error("Erro ao carregar aviamentos");
      setLoading(false);
      return;
    }
    const list = (avs || []) as unknown as Aviamento[];

    const { data: precos } = await supabase
      .from("aviamentos_fornecedores_precos" as any)
      .select("aviamento_id, preco_por_unidade, ativo");
    const precosArr = (precos || []) as unknown as Array<{
      aviamento_id: string; preco_por_unidade: number; ativo: boolean;
    }>;

    const agg: AviamentoAgg[] = list.map((a) => {
      const ps = precosArr.filter((p) => p.aviamento_id === a.id && p.ativo);
      const vals = ps.map((p) => Number(p.preco_por_unidade));
      return {
        ...a,
        fornecedores_count: ps.length,
        preco_min: vals.length ? Math.min(...vals) : null,
        preco_max: vals.length ? Math.max(...vals) : null,
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

  const categorias = useMemo(() => {
    const s = new Set<string>();
    items.filter((i) => i.ativo).forEach((i) => i.categoria && s.add(i.categoria));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((a) => {
      if (!showInactive && !a.ativo) return false;
      if (search && !a.nome.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoriaFilter !== "__todas__" && a.categoria !== categoriaFilter) return false;
      return true;
    });
  }, [items, search, showInactive, categoriaFilter]);

  const totalAtivos = items.filter((i) => i.ativo).length;

  const openCreate = () => {
    setForm(emptyForm);
    setOpen(true);
  };

  const handleSave = async () => {
    const nome = form.nome.trim();
    const categoria = form.categoria.trim();
    const estoque = parseFloat(form.estoque || "0");
    if (!nome) return toast.error("Nome é obrigatório");
    if (!categoria) return toast.error("Categoria é obrigatória");
    if (!form.unidade) return toast.error("Unidade é obrigatória");
    if (isNaN(estoque) || estoque < 0) return toast.error("Estoque inválido");

    const fornecedorId = form.fornecedor_id;
    const precoStr = form.preco_por_unidade.trim();
    const precoNum = parseFloat(precoStr);
    if (fornecedorId) {
      if (!(precoNum > 0)) return toast.error("Informe um preço por unidade válido");
    }

    setSaving(true);
    const { data, error } = await supabase
      .from("aviamentos" as any)
      .insert({
        nome,
        categoria,
        tamanho_medida: form.tamanho_medida.trim() || null,
        cor: form.cor.trim() || null,
        unidade: form.unidade,
        estoque,
        observacoes: form.observacoes.trim() || null,
        ativo: form.ativo,
      })
      .select("id")
      .single();

    if (error) {
      setSaving(false);
      return toast.error(error.message || "Erro ao salvar");
    }
    const newId = (data as any)?.id as string;

    if (fornecedorId && newId) {
      const { error: pErr } = await supabase
        .from("aviamentos_fornecedores_precos" as any)
        .insert({
          aviamento_id: newId,
          fornecedor_id: fornecedorId,
          preco_por_unidade: precoNum,
          ativo: true,
        });
      if (pErr) {
        setSaving(false);
        toast.error("Aviamento criado, mas falhou ao salvar preço: " + pErr.message);
        setOpen(false);
        load();
        return;
      }
    }

    setSaving(false);
    toast.success("Aviamento criado");
    setOpen(false);
    load();
  };

  const priceRange = (a: AviamentoAgg) => {
    if (a.preco_min == null) return "Sem preço cadastrado";
    const unit = unidadeLabel(a.unidade);
    if (a.preco_min === a.preco_max) return `${fmtMoney(a.preco_min)} / ${unit}`;
    return `${fmtMoney(a.preco_min)} - ${fmtMoney(a.preco_max!)} / ${unit}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tag className="h-6 w-6 text-primary" /> Aviamentos
          </h1>
          <p className="text-sm text-muted-foreground">
            Catálogo de aviamentos com preços por fornecedor
          </p>
          <p className="text-xs text-muted-foreground mt-1">Total ativos: {totalAtivos}</p>
        </div>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Adicionar Aviamento
          </Button>
        )}
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="min-w-[200px]">
            <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__todas__">Todas as categorias</SelectItem>
                {categorias.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="inativos" checked={showInactive} onCheckedChange={setShowInactive} />
            <Label htmlFor="inativos" className="text-sm cursor-pointer">Mostrar inativos</Label>
          </div>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Tamanho/Medida</TableHead>
              <TableHead>Cor</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead>N° Fornec.</TableHead>
              <TableHead>Faixa de preço</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                Nenhum aviamento encontrado. {canEdit && "Clique em 'Adicionar Aviamento' para começar."}
              </TableCell></TableRow>
            ) : (
              filtered.map((a) => (
                <TableRow
                  key={a.id}
                  className="cursor-pointer"
                  onClick={() => openQuickView(a)}
                >
                  <TableCell className="font-medium">{a.nome}</TableCell>
                  <TableCell><Badge variant="secondary">{a.categoria}</Badge></TableCell>
                  <TableCell>{a.tamanho_medida || "—"}</TableCell>
                  <TableCell>{a.cor || "—"}</TableCell>
                  <TableCell>{unidadeLabel(a.unidade)}</TableCell>
                  <TableCell>{Number(a.estoque).toLocaleString("pt-BR")} {unidadeLabel(a.unidade)}</TableCell>
                  <TableCell>{a.fornecedores_count}</TableCell>
                  <TableCell className="text-sm">{priceRange(a)}</TableCell>
                  <TableCell>
                    <Badge variant={a.ativo ? "default" : "outline"}>
                      {a.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Novo Aviamento</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div>
              <Label>Categoria *</Label>
              <Popover open={catPopoverOpen} onOpenChange={setCatPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                    {form.categoria || "Selecione ou digite..."}
                    <ChevronsUpDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput
                      placeholder="Buscar ou criar categoria..."
                      value={form.categoria}
                      onValueChange={(v) => setForm((f) => ({ ...f, categoria: v }))}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {form.categoria.trim() ? (
                          <button
                            type="button"
                            className="text-sm text-primary"
                            onClick={() => setCatPopoverOpen(false)}
                          >
                            Usar "{form.categoria.trim()}"
                          </button>
                        ) : "Digite para criar"}
                      </CommandEmpty>
                      <CommandGroup>
                        {categorias.map((c) => (
                          <CommandItem
                            key={c}
                            value={c}
                            onSelect={() => {
                              setForm((f) => ({ ...f, categoria: c }));
                              setCatPopoverOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", form.categoria === c ? "opacity-100" : "opacity-0")} />
                            {c}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tamanho/Medida</Label>
                <Input value={form.tamanho_medida} onChange={(e) => setForm({ ...form, tamanho_medida: e.target.value })} placeholder="ex: 12mm" />
              </div>
              <div>
                <Label>Cor</Label>
                <Input value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Unidade *</Label>
                <Select value={form.unidade} onValueChange={(v) => setForm({ ...form, unidade: v as Unidade })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNIDADES.map((u) => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estoque inicial</Label>
                <Input type="number" inputMode="decimal" min="0" value={form.estoque} onChange={(e) => setForm({ ...form, estoque: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            </div>

            <div className="rounded-md border p-3 space-y-3">
              <div>
                <Label className="text-sm font-semibold">Fornecedor e preço (opcional)</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Já vincule um fornecedor com o preço por unidade. Você pode adicionar mais depois.
                </p>
              </div>
              <div>
                <Label>Fornecedor</Label>
                <Popover open={fornPopoverOpen} onOpenChange={setFornPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal"
                    >
                      {form.fornecedor_id
                        ? fornecedores.find((f) => f.id === form.fornecedor_id)?.nome ?? "Selecione..."
                        : "Selecione ou busque..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar fornecedor..." />
                      <CommandList>
                        <CommandEmpty>
                          <div className="py-3 text-center text-sm">Nenhum fornecedor encontrado.</div>
                        </CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="__nenhum__"
                            onSelect={() => {
                              setForm({ ...form, fornecedor_id: "" });
                              setFornPopoverOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", !form.fornecedor_id ? "opacity-100" : "opacity-0")} />
                            Nenhum
                          </CommandItem>
                          {fornecedores.map((f) => (
                            <CommandItem
                              key={f.id}
                              value={f.nome}
                              onSelect={() => {
                                setForm({ ...form, fornecedor_id: f.id });
                                setFornPopoverOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", form.fornecedor_id === f.id ? "opacity-100" : "opacity-0")} />
                              {f.nome}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <div className="border-t p-1">
                          <Button
                            type="button"
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={() => {
                              setNovoFornOpen(true);
                              setFornPopoverOpen(false);
                            }}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Cadastrar novo fornecedor
                          </Button>
                        </div>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              {form.fornecedor_id && (
                <div>
                  <Label>Preço por {unidadeLabel(form.unidade)} (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.preco_por_unidade}
                    onChange={(e) => setForm({ ...form, preco_por_unidade: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
              <Label>Ativo</Label>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={novoFornOpen} onOpenChange={setNovoFornOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Fornecedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                value={novoFornNome}
                onChange={(e) => setNovoFornNome(e.target.value)}
                placeholder="Nome do fornecedor"
                autoFocus
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label>CNPJ *</Label>
              <Input
                value={novoFornCnpj}
                onChange={(e) => setNovoFornCnpj(formatCnpj(e.target.value))}
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateFornecedor();
                  }
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Você pode completar os outros dados depois em Catálogo &gt; Fornecedores.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoFornOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateFornecedor} disabled={savingForn}>
              {savingForn ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
