import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { toast } from "sonner";
import { ArrowLeft, Plus, Check, ChevronsUpDown, Pencil } from "lucide-react";
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

const unidadeLabel = (u: Unidade) => UNIDADES.find((x) => x.value === u)?.label ?? u;
const unidadeShort = (u: Unidade) => UNIDADES.find((x) => x.value === u)?.short ?? u;

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

interface FornecedorOpt { id: string; nome: string }

interface PrecoRow {
  id: string;
  aviamento_id: string;
  fornecedor_id: string;
  preco_por_unidade: number;
  ativo: boolean;
  ultima_atualizacao: string;
  fornecedor_nome?: string;
}

const fmtMoney = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

export default function AviamentoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useUserRoles();
  const canEdit = hasRole("admin");

  const [item, setItem] = useState<Aviamento | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Aviamento | null>(null);
  const [saving, setSaving] = useState(false);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [catPopoverOpen, setCatPopoverOpen] = useState(false);

  const [precos, setPrecos] = useState<PrecoRow[]>([]);
  const [fornecedores, setFornecedores] = useState<FornecedorOpt[]>([]);

  // Modal de preço
  const [precoOpen, setPrecoOpen] = useState(false);
  const [precoEditId, setPrecoEditId] = useState<string | null>(null);
  const [precoForm, setPrecoForm] = useState({ fornecedor_id: "", preco: "" });
  const [savingPreco, setSavingPreco] = useState(false);
  const [fornPopoverOpen, setFornPopoverOpen] = useState(false);

  // Quick novo fornecedor
  const [novoFornOpen, setNovoFornOpen] = useState(false);
  const [novoFornNome, setNovoFornNome] = useState("");
  const [novoFornCnpj, setNovoFornCnpj] = useState("");
  const [savingForn, setSavingForn] = useState(false);

  const formatCnpj = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 14);
    return d
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  };

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("aviamentos" as any).select("*").eq("id", id).maybeSingle();
    if (error || !data) {
      toast.error("Aviamento não encontrado");
      navigate("/catalogo/aviamentos");
      return;
    }
    const a = data as unknown as Aviamento;
    setItem(a);
    setForm(a);

    const { data: ps } = await supabase
      .from("aviamentos_fornecedores_precos" as any)
      .select("*")
      .eq("aviamento_id", id)
      .order("ultima_atualizacao", { ascending: false });
    const psArr = (ps || []) as unknown as PrecoRow[];

    const fornIds = Array.from(new Set(psArr.map((p) => p.fornecedor_id)));
    let map: Record<string, string> = {};
    if (fornIds.length) {
      const { data: fs } = await supabase
        .from("fornecedores" as any).select("id, nome").in("id", fornIds);
      ((fs || []) as unknown as FornecedorOpt[]).forEach((f) => { map[f.id] = f.nome; });
    }
    setPrecos(psArr.map((p) => ({ ...p, fornecedor_nome: map[p.fornecedor_id] })));

    const { data: allCats } = await supabase
      .from("aviamentos" as any).select("categoria").eq("ativo", true);
    const cats = Array.from(new Set(((allCats || []) as any[]).map((r) => r.categoria).filter(Boolean))) as string[];
    setCategorias(cats.sort((a, b) => a.localeCompare(b)));

    const { data: fAtivos } = await supabase
      .from("fornecedores" as any).select("id, nome").eq("ativo", true).order("nome");
    setFornecedores(((fAtivos || []) as unknown as FornecedorOpt[]));

    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const startEdit = () => { setEditing(true); setForm(item); };
  const cancelEdit = () => { setEditing(false); setForm(item); };

  const saveEdit = async () => {
    if (!form || !item) return;
    if (!form.nome.trim()) return toast.error("Nome é obrigatório");
    if (!form.categoria.trim()) return toast.error("Categoria é obrigatória");
    setSaving(true);
    const { error } = await supabase.from("aviamentos" as any).update({
      nome: form.nome.trim(),
      categoria: form.categoria.trim(),
      tamanho_medida: form.tamanho_medida?.trim() || null,
      cor: form.cor?.trim() || null,
      unidade: form.unidade,
      observacoes: form.observacoes?.trim() || null,
      ativo: form.ativo,
    }).eq("id", item.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Aviamento atualizado");
    setEditing(false);
    load();
  };

  const openPrecoCreate = () => {
    setPrecoEditId(null);
    setPrecoForm({ fornecedor_id: "", preco: "" });
    setPrecoOpen(true);
  };

  const openPrecoEdit = (p: PrecoRow) => {
    setPrecoEditId(p.id);
    setPrecoForm({ fornecedor_id: p.fornecedor_id, preco: String(p.preco_por_unidade) });
    setPrecoOpen(true);
  };

  const savePreco = async () => {
    if (!item) return;
    const preco = parseFloat(precoForm.preco.replace(",", "."));
    if (!precoForm.fornecedor_id) return toast.error("Selecione um fornecedor");
    if (isNaN(preco) || preco < 0) return toast.error("Preço inválido");

    setSavingPreco(true);
    if (precoEditId) {
      const { error } = await supabase.from("aviamentos_fornecedores_precos" as any).update({
        preco_por_unidade: preco,
        ultima_atualizacao: new Date().toISOString(),
      }).eq("id", precoEditId);
      setSavingPreco(false);
      if (error) return toast.error(error.message);
    } else {
      // Duplicate check
      const dup = precos.find((p) => p.fornecedor_id === precoForm.fornecedor_id);
      if (dup) { setSavingPreco(false); return toast.error("Este fornecedor já tem um preço cadastrado"); }
      const { error } = await supabase.from("aviamentos_fornecedores_precos" as any).insert({
        aviamento_id: item.id,
        fornecedor_id: precoForm.fornecedor_id,
        preco_por_unidade: preco,
        ativo: true,
      });
      setSavingPreco(false);
      if (error) {
        if (error.code === "23505") return toast.error("Este fornecedor já tem um preço cadastrado");
        return toast.error(error.message);
      }
    }
    toast.success("Preço salvo");
    setPrecoOpen(false);
    load();
  };

  const togglePrecoAtivo = async (p: PrecoRow) => {
    const { error } = await supabase.from("aviamentos_fornecedores_precos" as any)
      .update({ ativo: !p.ativo }).eq("id", p.id);
    if (error) return toast.error(error.message);
    load();
  };

  const createFornecedor = async () => {
    const nome = novoFornNome.trim();
    const cnpjDigits = novoFornCnpj.replace(/\D/g, "");
    if (!nome) return toast.error("Informe o nome");
    if (cnpjDigits.length !== 14) return toast.error("CNPJ deve ter 14 dígitos");
    setSavingForn(true);
    const { data, error } = await supabase.from("fornecedores" as any)
      .insert({ nome, cnpj: formatCnpj(cnpjDigits), ativo: true })
      .select("id, nome").single();
    setSavingForn(false);
    if (error) return toast.error(error.message);
    const novo = data as unknown as FornecedorOpt;
    setFornecedores((p) => [...p, novo].sort((a, b) => a.nome.localeCompare(b.nome)));
    setPrecoForm((f) => ({ ...f, fornecedor_id: novo.id }));
    setNovoFornNome(""); setNovoFornCnpj("");
    setNovoFornOpen(false); setFornPopoverOpen(false);
    toast.success("Fornecedor cadastrado");
  };

  const fornNome = (fid: string) => fornecedores.find((f) => f.id === fid)?.nome ?? "";

  if (loading || !item || !form) {
    return <div className="py-8 text-center text-muted-foreground">Carregando...</div>;
  }

  const unitShort = unidadeShort(item.unidade);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
      </Button>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{item.nome}</h1>
          <p className="text-sm text-muted-foreground">{item.categoria}</p>
        </div>
        {canEdit && !editing && (
          <Button variant="outline" onClick={startEdit}>
            <Pencil className="h-4 w-4 mr-2" /> Editar
          </Button>
        )}
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Dados do Aviamento</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Nome</Label>
            <Input value={form.nome} disabled={!editing}
              onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div>
            <Label>Categoria</Label>
            {editing ? (
              <Popover open={catPopoverOpen} onOpenChange={setCatPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                    {form.categoria || "Selecione..."}
                    <ChevronsUpDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput
                      placeholder="Buscar ou criar..."
                      value={form.categoria}
                      onValueChange={(v) => setForm({ ...form, categoria: v })}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {form.categoria.trim()
                          ? <button type="button" className="text-sm text-primary"
                              onClick={() => setCatPopoverOpen(false)}>
                              Usar "{form.categoria.trim()}"
                            </button>
                          : "Digite para criar"}
                      </CommandEmpty>
                      <CommandGroup>
                        {categorias.map((c) => (
                          <CommandItem key={c} value={c} onSelect={() => {
                            setForm({ ...form, categoria: c });
                            setCatPopoverOpen(false);
                          }}>
                            <Check className={cn("mr-2 h-4 w-4", form.categoria === c ? "opacity-100" : "opacity-0")} />
                            {c}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            ) : (
              <Input value={form.categoria} disabled />
            )}
          </div>
          <div>
            <Label>Tamanho/Medida</Label>
            <Input value={form.tamanho_medida ?? ""} disabled={!editing}
              onChange={(e) => setForm({ ...form, tamanho_medida: e.target.value })} />
          </div>
          <div>
            <Label>Cor</Label>
            <Input value={form.cor ?? ""} disabled={!editing}
              onChange={(e) => setForm({ ...form, cor: e.target.value })} />
          </div>
          <div>
            <Label>Unidade de medida</Label>
            <Select value={form.unidade} disabled={!editing}
              onValueChange={(v) => setForm({ ...form, unidade: v as Unidade })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {UNIDADES.map((u) => (
                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!editing && (
            <div>
              <Label>Estoque atual</Label>
              <Input value={`${Number(item.estoque).toLocaleString("pt-BR")} ${unitShort}`} disabled />
            </div>
          )}
          <div className="md:col-span-2">
            <Label>Observações</Label>
            <Textarea value={form.observacoes ?? ""} disabled={!editing}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.ativo} disabled={!editing}
              onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
            <Label>Ativo</Label>
          </div>
        </div>
        {editing && (
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={cancelEdit}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Preços por Fornecedor</h2>
          {canEdit && (
            <Button size="sm" onClick={openPrecoCreate}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar Preço
            </Button>
          )}
        </div>
        {precos.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Nenhum preço cadastrado ainda
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Preço por {unitShort}</TableHead>
                <TableHead>Última atualização</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {precos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.fornecedor_nome || "—"}</TableCell>
                  <TableCell>{fmtMoney(Number(p.preco_por_unidade))}</TableCell>
                  <TableCell>{new Date(p.ultima_atualizacao).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>
                    <Badge variant={p.ativo ? "default" : "outline"}>
                      {p.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="ghost" onClick={() => openPrecoEdit(p)}>Editar</Button>
                      <Button size="sm" variant="ghost" onClick={() => togglePrecoAtivo(p)}>
                        {p.ativo ? "Desativar" : "Ativar"}
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Preço Modal */}
      <Dialog open={precoOpen} onOpenChange={setPrecoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{precoEditId ? "Editar Preço" : "Adicionar Preço de Fornecedor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Fornecedor</Label>
              <Popover open={fornPopoverOpen} onOpenChange={setFornPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" disabled={!!precoEditId}
                    className="w-full justify-between font-normal">
                    {precoForm.fornecedor_id ? fornNome(precoForm.fornecedor_id) : "Selecione..."}
                    <ChevronsUpDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar fornecedor..." />
                    <CommandList>
                      <CommandEmpty>Nenhum fornecedor encontrado</CommandEmpty>
                      <CommandGroup>
                        {fornecedores.map((f) => (
                          <CommandItem key={f.id} value={f.nome} onSelect={() => {
                            setPrecoForm((pf) => ({ ...pf, fornecedor_id: f.id }));
                            setFornPopoverOpen(false);
                          }}>
                            <Check className={cn("mr-2 h-4 w-4",
                              precoForm.fornecedor_id === f.id ? "opacity-100" : "opacity-0")} />
                            {f.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      <div className="border-t p-2">
                        <Button variant="ghost" size="sm" className="w-full justify-start"
                          onClick={() => { setFornPopoverOpen(false); setNovoFornOpen(true); }}>
                          <Plus className="h-4 w-4 mr-2" /> Cadastrar novo fornecedor
                        </Button>
                      </div>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Preço por {unitShort}</Label>
              <Input type="number" inputMode="decimal" step="0.01" min="0"
                value={precoForm.preco}
                onChange={(e) => setPrecoForm({ ...precoForm, preco: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrecoOpen(false)}>Cancelar</Button>
            <Button onClick={savePreco} disabled={savingPreco}>{savingPreco ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Novo fornecedor */}
      <Dialog open={novoFornOpen} onOpenChange={setNovoFornOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Fornecedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={novoFornNome} onChange={(e) => setNovoFornNome(e.target.value)} />
            </div>
            <div>
              <Label>CNPJ</Label>
              <Input inputMode="numeric" value={novoFornCnpj}
                onChange={(e) => setNovoFornCnpj(formatCnpj(e.target.value))}
                onKeyDown={(e) => { if (e.key === "Enter") createFornecedor(); }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoFornOpen(false)}>Cancelar</Button>
            <Button onClick={createFornecedor} disabled={savingForn}>
              {savingForn ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
