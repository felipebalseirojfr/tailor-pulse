import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Search, Truck } from "lucide-react";
import { useUserRoles } from "@/hooks/useUserRoles";

interface Fornecedor {
  id: string;
  nome: string;
  cnpj: string | null;
  contato_nome: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

const emptyForm = {
  nome: "",
  cnpj: "",
  contato_nome: "",
  telefone: "",
  email: "",
  endereco: "",
  observacoes: "",
  ativo: true,
};

function maskCNPJ(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function Fornecedores() {
  const { hasRole } = useUserRoles();
  const canEdit = hasRole("admin");

  const [items, setItems] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("fornecedores" as any)
      .select("*")
      .order("nome", { ascending: true });
    if (error) {
      toast.error("Erro ao carregar fornecedores");
    } else {
      setItems((data || []) as unknown as Fornecedor[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((f) => {
      if (!showInactive && !f.ativo) return false;
      if (search && !f.nome.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [items, search, showInactive]);

  const totalAtivos = items.filter((i) => i.ativo).length;

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (f: Fornecedor) => {
    setEditingId(f.id);
    setForm({
      nome: f.nome ?? "",
      cnpj: f.cnpj ?? "",
      contato_nome: f.contato_nome ?? "",
      telefone: f.telefone ?? "",
      email: f.email ?? "",
      endereco: f.endereco ?? "",
      observacoes: f.observacoes ?? "",
      ativo: f.ativo,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    const nome = form.nome.trim();
    if (!nome) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (nome.length > 200) {
      toast.error("Nome muito longo (máx 200)");
      return;
    }
    const cnpjDigits = form.cnpj.replace(/\D/g, "");
    if (cnpjDigits && cnpjDigits.length !== 14) {
      toast.error("CNPJ deve ter 14 dígitos");
      return;
    }
    if (form.email && !isValidEmail(form.email.trim())) {
      toast.error("E-mail inválido");
      return;
    }

    const payload = {
      nome,
      cnpj: cnpjDigits ? maskCNPJ(cnpjDigits) : null,
      contato_nome: form.contato_nome.trim() || null,
      telefone: form.telefone.trim() || null,
      email: form.email.trim() || null,
      endereco: form.endereco.trim() || null,
      observacoes: form.observacoes.trim() || null,
      ativo: form.ativo,
    };

    setSaving(true);
    let error;
    if (editingId) {
      ({ error } = await supabase
        .from("fornecedores" as any)
        .update(payload)
        .eq("id", editingId));
    } else {
      ({ error } = await supabase.from("fornecedores" as any).insert(payload));
    }
    setSaving(false);

    if (error) {
      if (error.code === "23505") {
        toast.error("Já existe um fornecedor com este CNPJ");
      } else {
        toast.error(error.message || "Erro ao salvar");
      }
      return;
    }
    toast.success(editingId ? "Fornecedor atualizado" : "Fornecedor criado");
    setOpen(false);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            Fornecedores
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Total ativos: <span className="font-semibold">{totalAtivos}</span>
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Adicionar Fornecedor
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
            <Truck className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              {items.length === 0
                ? "Nenhum fornecedor cadastrado ainda"
                : "Nenhum fornecedor encontrado com esses filtros"}
            </p>
            {canEdit && items.length === 0 && (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" /> Cadastrar primeiro fornecedor
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((f) => (
                <TableRow
                  key={f.id}
                  className="cursor-pointer"
                  onClick={() => openEdit(f)}
                >
                  <TableCell className="font-medium">{f.nome}</TableCell>
                  <TableCell>{f.contato_nome || "—"}</TableCell>
                  <TableCell>{f.telefone || "—"}</TableCell>
                  <TableCell>{f.email || "—"}</TableCell>
                  <TableCell>{f.cnpj || "—"}</TableCell>
                  <TableCell>
                    {f.ativo ? (
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
            <SheetTitle>
              {editingId ? "Editar Fornecedor" : "Novo Fornecedor"}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                maxLength={200}
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label>CNPJ</Label>
              <Input
                value={form.cnpj}
                onChange={(e) =>
                  setForm({ ...form, cnpj: maskCNPJ(e.target.value) })
                }
                placeholder="XX.XXX.XXX/XXXX-XX"
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label>Contato (nome da pessoa)</Label>
              <Input
                value={form.contato_nome}
                onChange={(e) =>
                  setForm({ ...form, contato_nome: e.target.value })
                }
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label>Endereço</Label>
              <Textarea
                value={form.endereco}
                onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={form.observacoes}
                onChange={(e) =>
                  setForm({ ...form, observacoes: e.target.value })
                }
                disabled={!canEdit}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label className="m-0">Ativo</Label>
              <Switch
                checked={form.ativo}
                onCheckedChange={(v) => setForm({ ...form, ativo: v })}
                disabled={!canEdit}
              />
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            {canEdit && (
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
