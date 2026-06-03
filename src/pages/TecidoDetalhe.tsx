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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Power,
  RefreshCw,
  Trash2,
} from "lucide-react";
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

interface Variacao {
  id: string;
  tecido_id: string;
  cor: string;
  estoque_kg: number;
  ativo: boolean;
}

interface Preco {
  id: string;
  tecido_variacao_id: string;
  fornecedor_id: string;
  preco_por_kg: number;
  ativo: boolean;
  ultima_atualizacao: string;
  fornecedor_nome?: string;
}

interface Fornecedor {
  id: string;
  nome: string;
  ativo: boolean;
}

function calcRendimento(g: number, l: number) {
  if (!g || !l) return 0;
  return Math.round((1000 / (g * l)) * 100) / 100;
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatNumber(n: number, d = 2) {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

export default function TecidoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useUserRoles();
  const canEdit = hasRole("admin");

  const [loading, setLoading] = useState(true);
  const [tecido, setTecido] = useState<Tecido | null>(null);
  const [variacoes, setVariacoes] = useState<Variacao[]>([]);
  const [precos, setPrecos] = useState<Preco[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);

  // Edit tecido state
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    composicao: "",
    gramatura_g_m2: "",
    largura_m: "",
    rendimento_m_kg: "",
    observacoes: "",
    ativo: true,
  });
  const [rendimentoTouched, setRendimentoTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  // Variação modal
  const [varOpen, setVarOpen] = useState(false);
  const [varEditingId, setVarEditingId] = useState<string | null>(null);
  const [varForm, setVarForm] = useState({ cor: "", estoque_kg: "0", ativo: true });

  // Preço modal
  const [precoOpen, setPrecoOpen] = useState(false);
  const [precoVariacaoId, setPrecoVariacaoId] = useState<string | null>(null);
  const [precoEditingId, setPrecoEditingId] = useState<string | null>(null);
  const [precoForm, setPrecoForm] = useState({ fornecedor_id: "", preco_por_kg: "" });

  // Novo fornecedor inline modal
  const [novoFornOpen, setNovoFornOpen] = useState(false);
  const [novoFornForm, setNovoFornForm] = useState({ nome: "", telefone: "", email: "" });

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [tecRes, varRes, fornRes] = await Promise.all([
      supabase.from("tecidos" as any).select("*").eq("id", id).maybeSingle(),
      supabase.from("tecidos_variacoes" as any).select("*").eq("tecido_id", id).order("cor"),
      supabase.from("fornecedores" as any).select("id, nome, ativo").eq("ativo", true).order("nome"),
    ]);

    if (tecRes.error || !tecRes.data) {
      toast.error("Tecido não encontrado");
      navigate("/catalogo/tecidos");
      return;
    }
    const t = tecRes.data as unknown as Tecido;
    setTecido(t);
    setForm({
      nome: t.nome,
      composicao: t.composicao,
      gramatura_g_m2: String(t.gramatura_g_m2),
      largura_m: String(t.largura_m),
      rendimento_m_kg: String(t.rendimento_m_kg),
      observacoes: t.observacoes || "",
      ativo: t.ativo,
    });

    const varList = (varRes.data || []) as unknown as Variacao[];
    setVariacoes(varList);
    setFornecedores((fornRes.data || []) as unknown as Fornecedor[]);

    if (varList.length > 0) {
      const varIds = varList.map((v) => v.id);
      const { data: precosData } = await supabase
        .from("tecidos_fornecedores_precos" as any)
        .select("*, fornecedores(nome)")
        .in("tecido_variacao_id", varIds);
      const precosArr = ((precosData || []) as any[]).map((p) => ({
        ...p,
        fornecedor_nome: p.fornecedores?.nome,
      })) as Preco[];
      setPrecos(precosArr);
    } else {
      setPrecos([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Auto rendimento in edit
  useEffect(() => {
    if (!editing) return;
    const g = parseFloat(form.gramatura_g_m2);
    const l = parseFloat(form.largura_m);
    if (!rendimentoTouched && g > 0 && l > 0) {
      setForm((f) => ({ ...f, rendimento_m_kg: String(calcRendimento(g, l)) }));
    }
  }, [form.gramatura_g_m2, form.largura_m, rendimentoTouched, editing]);

  const recompute = () => {
    const g = parseFloat(form.gramatura_g_m2);
    const l = parseFloat(form.largura_m);
    if (g > 0 && l > 0) {
      setForm({ ...form, rendimento_m_kg: String(calcRendimento(g, l)) });
      setRendimentoTouched(false);
    }
  };

  const startEdit = () => {
    setEditing(true);
    setRendimentoTouched(true); // don't auto-overwrite when entering edit
  };
  const cancelEdit = () => {
    if (!tecido) return;
    setForm({
      nome: tecido.nome,
      composicao: tecido.composicao,
      gramatura_g_m2: String(tecido.gramatura_g_m2),
      largura_m: String(tecido.largura_m),
      rendimento_m_kg: String(tecido.rendimento_m_kg),
      observacoes: tecido.observacoes || "",
      ativo: tecido.ativo,
    });
    setRendimentoTouched(false);
    setEditing(false);
  };

  const saveTecido = async () => {
    if (!id) return;
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

    setSaving(true);
    const { error } = await supabase
      .from("tecidos" as any)
      .update({
        nome,
        composicao,
        gramatura_g_m2: g,
        largura_m: l,
        rendimento_m_kg: r,
        observacoes: form.observacoes.trim() || null,
        ativo: form.ativo,
      })
      .eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Tecido atualizado");
    setEditing(false);
    load();
  };

  // ---- Variações ----
  const openVarCreate = () => {
    setVarEditingId(null);
    setVarForm({ cor: "", estoque_kg: "0", ativo: true });
    setVarOpen(true);
  };
  const openVarEdit = (v: Variacao) => {
    setVarEditingId(v.id);
    setVarForm({ cor: v.cor, estoque_kg: String(v.estoque_kg), ativo: v.ativo });
    setVarOpen(true);
  };

  const saveVariacao = async () => {
    const cor = varForm.cor.trim();
    if (!cor) return toast.error("Cor é obrigatória");
    if (!id) return;

    let error;
    if (varEditingId) {
      ({ error } = await supabase
        .from("tecidos_variacoes" as any)
        .update({ cor, ativo: varForm.ativo })
        .eq("id", varEditingId));
    } else {
      ({ error } = await supabase.from("tecidos_variacoes" as any).insert({
        tecido_id: id,
        cor,
        estoque_kg: parseFloat(varForm.estoque_kg) || 0,
        ativo: varForm.ativo,
      }));
    }
    if (error) {
      if ((error as any).code === "23505") {
        toast.error("Já existe uma variação com essa cor");
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success(varEditingId ? "Variação atualizada" : "Variação criada");
    setVarOpen(false);
    load();
  };

  const toggleVariacaoAtivo = async (v: Variacao) => {
    const { error } = await supabase
      .from("tecidos_variacoes" as any)
      .update({ ativo: !v.ativo })
      .eq("id", v.id);
    if (error) return toast.error(error.message);
    toast.success(v.ativo ? "Variação desativada" : "Variação ativada");
    load();
  };

  // ---- Preços ----
  const openPrecoCreate = (variacaoId: string) => {
    setPrecoVariacaoId(variacaoId);
    setPrecoEditingId(null);
    setPrecoForm({ fornecedor_id: "", preco_por_kg: "" });
    setPrecoOpen(true);
  };
  const openPrecoEdit = (p: Preco) => {
    setPrecoVariacaoId(p.tecido_variacao_id);
    setPrecoEditingId(p.id);
    setPrecoForm({
      fornecedor_id: p.fornecedor_id,
      preco_por_kg: String(p.preco_por_kg),
    });
    setPrecoOpen(true);
  };

  const savePreco = async () => {
    if (!precoVariacaoId) return;
    const preco = parseFloat(precoForm.preco_por_kg);
    if (!precoForm.fornecedor_id) return toast.error("Selecione um fornecedor");
    if (!(preco >= 0)) return toast.error("Preço inválido");

    let error;
    if (precoEditingId) {
      ({ error } = await supabase
        .from("tecidos_fornecedores_precos" as any)
        .update({
          preco_por_kg: preco,
          ultima_atualizacao: new Date().toISOString(),
        })
        .eq("id", precoEditingId));
    } else {
      ({ error } = await supabase.from("tecidos_fornecedores_precos" as any).insert({
        tecido_variacao_id: precoVariacaoId,
        fornecedor_id: precoForm.fornecedor_id,
        preco_por_kg: preco,
      }));
    }
    if (error) {
      if ((error as any).code === "23505") {
        toast.error("Este fornecedor já tem preço cadastrado para esta variação");
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success("Preço salvo");
    setPrecoOpen(false);
    load();
  };

  const togglePrecoAtivo = async (p: Preco) => {
    const { error } = await supabase
      .from("tecidos_fornecedores_precos" as any)
      .update({ ativo: !p.ativo })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    load();
  };

  // ---- Novo fornecedor inline ----
  const saveNovoFornecedor = async () => {
    const nome = novoFornForm.nome.trim();
    if (!nome) return toast.error("Nome é obrigatório");
    const { data, error } = await supabase
      .from("fornecedores" as any)
      .insert({
        nome,
        telefone: novoFornForm.telefone.trim() || null,
        email: novoFornForm.email.trim() || null,
        ativo: true,
      })
      .select("id, nome, ativo")
      .single();
    if (error) return toast.error(error.message);
    const novo = data as unknown as Fornecedor;
    setFornecedores((prev) => [...prev, novo].sort((a, b) => a.nome.localeCompare(b.nome)));
    setPrecoForm((f) => ({ ...f, fornecedor_id: novo.id }));
    setNovoFornForm({ nome: "", telefone: "", email: "" });
    setNovoFornOpen(false);
    toast.success("Fornecedor cadastrado");
  };

  const precosPorVariacao = useMemo(() => {
    const map: Record<string, Preco[]> = {};
    precos.forEach((p) => {
      (map[p.tecido_variacao_id] ||= []).push(p);
    });
    return map;
  }, [precos]);

  if (loading || !tecido) {
    return (
      <div className="p-8 text-center text-muted-foreground">Carregando...</div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      {/* SEÇÃO A */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Dados do Tecido</h2>
          {canEdit && !editing && (
            <Button variant="outline" size="sm" onClick={startEdit}>
              <Pencil className="h-4 w-4 mr-2" /> Editar
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Nome *</Label>
            <Input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              disabled={!editing}
            />
          </div>
          <div>
            <Label>Composição *</Label>
            <Input
              value={form.composicao}
              onChange={(e) => setForm({ ...form, composicao: e.target.value })}
              disabled={!editing}
            />
          </div>
          <div>
            <Label>Gramatura (g/m²) *</Label>
            <Input
              type="number"
              step="0.01"
              value={form.gramatura_g_m2}
              onChange={(e) => setForm({ ...form, gramatura_g_m2: e.target.value })}
              disabled={!editing}
            />
          </div>
          <div>
            <Label>Largura (m) *</Label>
            <Input
              type="number"
              step="0.01"
              value={form.largura_m}
              onChange={(e) => setForm({ ...form, largura_m: e.target.value })}
              disabled={!editing}
            />
          </div>
          <div>
            <Label>Rendimento (m/kg) *</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                value={form.rendimento_m_kg}
                onChange={(e) => {
                  setForm({ ...form, rendimento_m_kg: e.target.value });
                  setRendimentoTouched(true);
                }}
                disabled={!editing}
              />
              {editing && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={recompute}
                  title="Recalcular a partir de gramatura × largura"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
            {editing && (
              <p className="text-xs text-muted-foreground mt-1">
                Calculado como 1000 / (gramatura × largura). Editável.
              </p>
            )}
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label className="m-0">Ativo</Label>
            <Switch
              checked={form.ativo}
              onCheckedChange={(v) => setForm({ ...form, ativo: v })}
              disabled={!editing}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Observações</Label>
            <Textarea
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              disabled={!editing}
            />
          </div>
        </div>

        {editing && (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={cancelEdit}>
              Cancelar
            </Button>
            <Button onClick={saveTecido} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        )}
      </Card>

      {/* SEÇÃO B */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Variações de Cor</h2>
          {canEdit && (
            <Button onClick={openVarCreate}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar Variação
            </Button>
          )}
        </div>

        {variacoes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhuma variação cadastrada ainda.
          </p>
        ) : (
          <Accordion type="multiple" className="w-full">
            {variacoes.map((v) => {
              const ps = (precosPorVariacao[v.id] || []).filter((p) => p.ativo);
              const valores = ps.map((p) => Number(p.preco_por_kg));
              const min = valores.length ? Math.min(...valores) : 0;
              const max = valores.length ? Math.max(...valores) : 0;
              const faixa =
                valores.length === 0
                  ? "Sem preço cadastrado"
                  : min === max
                  ? `${formatBRL(min)} / kg`
                  : `${formatBRL(min)} - ${formatBRL(max)} / kg`;

              return (
                <AccordionItem key={v.id} value={v.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 flex-1 flex-wrap text-left">
                      <Badge variant="outline" className="text-sm">{v.cor}</Badge>
                      <span className="text-sm text-muted-foreground">
                        Estoque: <span className="font-medium text-foreground">{formatNumber(Number(v.estoque_kg), 1)} kg</span>
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Fornecedores: <span className="font-medium text-foreground">{ps.length}</span>
                      </span>
                      <span className="text-sm text-muted-foreground">{faixa}</span>
                      {v.ativo ? (
                        <Badge className="bg-green-600 hover:bg-green-600">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      {canEdit && (
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" onClick={() => openVarEdit(v)}>
                            <Pencil className="h-3 w-3 mr-1" /> Editar
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => toggleVariacaoAtivo(v)}>
                            <Power className="h-3 w-3 mr-1" /> {v.ativo ? "Desativar" : "Ativar"}
                          </Button>
                          <Button size="sm" onClick={() => openPrecoCreate(v.id)}>
                            <Plus className="h-3 w-3 mr-1" /> Adicionar Preço
                          </Button>
                        </div>
                      )}

                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fornecedor</TableHead>
                              <TableHead>Preço / kg</TableHead>
                              <TableHead>Última atualização</TableHead>
                              <TableHead>Status</TableHead>
                              {canEdit && <TableHead className="text-right">Ações</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(precosPorVariacao[v.id] || []).length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={canEdit ? 5 : 4} className="text-center text-sm text-muted-foreground">
                                  Sem preços cadastrados
                                </TableCell>
                              </TableRow>
                            ) : (
                              (precosPorVariacao[v.id] || []).map((p) => (
                                <TableRow key={p.id}>
                                  <TableCell>{p.fornecedor_nome || "—"}</TableCell>
                                  <TableCell>{formatBRL(Number(p.preco_por_kg))}</TableCell>
                                  <TableCell>
                                    {new Date(p.ultima_atualizacao).toLocaleDateString("pt-BR")}
                                  </TableCell>
                                  <TableCell>
                                    {p.ativo ? (
                                      <Badge className="bg-green-600 hover:bg-green-600">Ativo</Badge>
                                    ) : (
                                      <Badge variant="secondary">Inativo</Badge>
                                    )}
                                  </TableCell>
                                  {canEdit && (
                                    <TableCell className="text-right space-x-1">
                                      <Button variant="ghost" size="sm" onClick={() => openPrecoEdit(p)}>
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button variant="ghost" size="sm" onClick={() => togglePrecoAtivo(p)}>
                                        <Power className="h-3 w-3" />
                                      </Button>
                                    </TableCell>
                                  )}
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </Card>

      {/* Variação Modal */}
      <Dialog open={varOpen} onOpenChange={setVarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{varEditingId ? "Editar Variação" : "Nova Variação"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Cor *</Label>
              <Input
                value={varForm.cor}
                onChange={(e) => setVarForm({ ...varForm, cor: e.target.value })}
                placeholder="Ex: Preto"
              />
            </div>
            {!varEditingId && (
              <div>
                <Label>Estoque inicial (kg)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={varForm.estoque_kg}
                  onChange={(e) => setVarForm({ ...varForm, estoque_kg: e.target.value })}
                />
              </div>
            )}
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label className="m-0">Ativo</Label>
              <Switch
                checked={varForm.ativo}
                onCheckedChange={(v) => setVarForm({ ...varForm, ativo: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVarOpen(false)}>Cancelar</Button>
            <Button onClick={saveVariacao}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preço Modal */}
      <Dialog open={precoOpen} onOpenChange={setPrecoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{precoEditingId ? "Editar Preço" : "Novo Preço de Fornecedor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Fornecedor *</Label>
              <Select
                value={precoForm.fornecedor_id}
                onValueChange={(v) => {
                  if (v === "__novo__") {
                    setNovoFornOpen(true);
                  } else {
                    setPrecoForm({ ...precoForm, fornecedor_id: v });
                  }
                }}
                disabled={!!precoEditingId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {fornecedores.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome}
                    </SelectItem>
                  ))}
                  <SelectItem value="__novo__" className="text-primary">
                    + Cadastrar novo fornecedor
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Preço por kg (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={precoForm.preco_por_kg}
                onChange={(e) => setPrecoForm({ ...precoForm, preco_por_kg: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrecoOpen(false)}>Cancelar</Button>
            <Button onClick={savePreco}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Novo Fornecedor inline */}
      <Dialog open={novoFornOpen} onOpenChange={setNovoFornOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Fornecedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Nome *</Label>
              <Input
                value={novoFornForm.nome}
                onChange={(e) => setNovoFornForm({ ...novoFornForm, nome: e.target.value })}
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={novoFornForm.telefone}
                onChange={(e) => setNovoFornForm({ ...novoFornForm, telefone: e.target.value })}
              />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                value={novoFornForm.email}
                onChange={(e) => setNovoFornForm({ ...novoFornForm, email: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoFornOpen(false)}>Cancelar</Button>
            <Button onClick={saveNovoFornecedor}>Cadastrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
