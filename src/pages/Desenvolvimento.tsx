import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, MoreVertical, FileCode2, Ruler } from "lucide-react";

interface Referencia {
  id: string;
  codigo: string;
  cliente_id: string;
  tipo_peca_id: string;
  descricao: string | null;
  status: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}
interface Cliente { id: string; nome: string; abreviacao_2_letras: string | null; }
interface TipoPeca { id: string; nome: string; abreviacao_2_letras: string; ativo: boolean; }

const STATUSES: { value: string; label: string; color: string }[] = [
  { value: "aguardando", label: "Aguardando", color: "bg-muted text-foreground border-border" },
  { value: "em_desenvolvimento", label: "Em Desenvolvimento", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30" },
  { value: "piloto_em_producao", label: "Piloto em Produção", color: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30" },
  { value: "piloto_pronta", label: "Piloto Pronta", color: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30" },
  { value: "em_correcao", label: "Em Correção", color: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30" },
  { value: "piloto_lacrada", label: "Piloto Lacrada", color: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30" },
  { value: "cancelada", label: "Cancelada", color: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30" },
];

const daysSince = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d <= 0) return "hoje";
  if (d === 1) return "há 1 dia";
  return `há ${d} dias`;
};

export default function Desenvolvimento() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [refs, setRefs] = useState<Referencia[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tipos, setTipos] = useState<TipoPeca[]>([]);
  const [hasDxf, setHasDxf] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroCli, setFiltroCli] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");

  // modal nova
  const [dialogOpen, setDialogOpen] = useState(false);
  const [novoCli, setNovoCli] = useState("");
  const [novoTipo, setNovoTipo] = useState("");
  const [novoDesc, setNovoDesc] = useState("");
  const [novoOrigem, setNovoOrigem] = useState("__none__");
  const [proximoSeq, setProximoSeq] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);

  // confirm lacre
  const [confirmLacre, setConfirmLacre] = useState<Referencia | null>(null);

  const fetchAll = async () => {
    const [refRes, cliRes, tipoRes, dxfRes] = await Promise.all([
      (supabase.from("referencias") as any).select("*").order("created_at", { ascending: true }),
      supabase.from("clientes").select("id, nome, abreviacao_2_letras").order("nome"),
      (supabase.from("tipos_peca") as any).select("*").eq("ativo", true).order("nome"),
      (supabase.from("modelagens_dxf") as any).select("referencia_id").eq("ativo", true),
    ]);
    setRefs((refRes.data || []) as Referencia[]);
    setClientes((cliRes.data || []) as any);
    setTipos((tipoRes.data || []) as any);
    setHasDxf(new Set(((dxfRes.data as any[]) || []).map((d) => d.referencia_id)));
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const ch = supabase
      .channel("desenvolvimento-refs")
      .on("postgres_changes", { event: "*", schema: "public", table: "referencias" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    const f = async () => {
      if (!novoCli || !novoTipo) { setProximoSeq(null); return; }
      const { data } = await (supabase.rpc as any)("proximo_sequencial_referencia", {
        _cliente_id: novoCli, _tipo_peca_id: novoTipo,
      });
      setProximoSeq(typeof data === "number" ? data : 1);
    };
    f();
  }, [novoCli, novoTipo]);

  const cliSel = clientes.find((c) => c.id === novoCli);
  const tipoSel = tipos.find((t) => t.id === novoTipo);
  const cliSemAbrev = cliSel && !cliSel.abreviacao_2_letras;
  const codigoPreview = cliSel?.abreviacao_2_letras && tipoSel && proximoSeq
    ? `${tipoSel.abreviacao_2_letras}.${cliSel.abreviacao_2_letras}.${String(proximoSeq).padStart(4, "0")}`
    : "—";

  const resetNovo = () => {
    setNovoCli(""); setNovoTipo(""); setNovoDesc(""); setNovoOrigem("__none__"); setProximoSeq(null);
  };

  const cliById = useMemo(() => new Map(clientes.map((c) => [c.id, c])), [clientes]);
  const tipoById = useMemo(() => new Map(tipos.map((t) => [t.id, t])), [tipos]);

  const filtered = refs.filter((r) => {
    if (!r.ativo) return false;
    if (filtroCli !== "todos" && r.cliente_id !== filtroCli) return false;
    if (filtroTipo !== "todos" && r.tipo_peca_id !== filtroTipo) return false;
    if (busca) {
      const q = busca.toLowerCase();
      if (!r.codigo.toLowerCase().includes(q) && !(r.descricao || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const byStatus = (status: string) => filtered.filter((r) => (r.status || "aguardando") === status);

  const changeStatus = async (r: Referencia, newStatus: string) => {
    // optimistic
    setRefs((prev) => prev.map((x) => x.id === r.id ? { ...x, status: newStatus, updated_at: new Date().toISOString() } : x));
    const { error } = await (supabase.from("referencias") as any).update({ status: newStatus }).eq("id", r.id);
    if (error) {
      toast({ title: "Erro ao atualizar status", description: error.message, variant: "destructive" });
      fetchAll();
    } else {
      toast({ title: "Status atualizado" });
    }
  };

  const handleStatusClick = (r: Referencia, newStatus: string) => {
    if (newStatus === "piloto_lacrada") { setConfirmLacre(r); return; }
    changeStatus(r, newStatus);
  };

  const salvar = async () => {
    if (!novoCli || !novoTipo) return;
    if (cliSemAbrev) {
      toast({ title: "Cliente sem abreviação", variant: "destructive" });
      return;
    }
    setSalvando(true);
    const { data: userData } = await supabase.auth.getUser();
    const payload = {
      cliente_id: novoCli,
      tipo_peca_id: novoTipo,
      descricao: novoDesc.trim() || null,
      modelagem_origem_id: novoOrigem === "__none__" ? null : novoOrigem,
      criado_por: userData?.user?.id || null,
      status: "aguardando",
      codigo: "XX.XX.0000",
      sequencial: 0,
    };
    const { data, error } = await (supabase.from("referencias") as any).insert([payload]).select().single();
    setSalvando(false);
    if (error) {
      toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Desenvolvimento criado!", description: (data as any).codigo });
    setDialogOpen(false);
    resetNovo();
    navigate(`/cadastros/referencias/${(data as any).id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Desenvolvimento</h1>
          <p className="text-muted-foreground">Acompanhe o desenvolvimento de novas referências e pilotos</p>
        </div>
        <Button onClick={() => { resetNovo(); setDialogOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Desenvolvimento
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Input placeholder="Buscar por código ou descrição..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-64" />
        <Select value={filtroCli} onValueChange={setFiltroCli}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os clientes</SelectItem>
            {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {tipos.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4">
          {STATUSES.map((col) => {
            const items = byStatus(col.value);
            return (
              <div key={col.value} className="flex flex-col gap-2 min-w-0">
                <div className={`px-3 py-2 rounded-md border text-sm font-medium ${col.color}`}>
                  {col.label} ({items.length})
                </div>
                <div className="flex flex-col gap-2 min-h-[100px]">
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">Nenhuma referência nesta etapa.</p>
                  ) : items.map((r) => {
                    const cli = cliById.get(r.cliente_id);
                    const tp = tipoById.get(r.tipo_peca_id);
                    return (
                      <Card
                        key={r.id}
                        className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]"
                        onClick={() => navigate(`/cadastros/referencias/${r.id}`)}
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <Badge variant="secondary" className="font-mono text-xs tracking-widest">{r.codigo}</Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-6 w-6"><MoreVertical className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuLabel>Mover para</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {STATUSES.filter((s) => s.value !== r.status).map((s) => (
                                  <DropdownMenuItem key={s.value} onClick={() => handleStatusClick(r, s.value)}>
                                    {s.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <p className="text-sm font-medium line-clamp-2">{r.descricao || tp?.nome || "—"}</p>
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">{cli?.nome || "—"}</Badge>
                            <span className="text-xs text-muted-foreground">{daysSince(r.updated_at || r.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {hasDxf.has(r.id) && <span className="flex items-center gap-1"><Ruler className="h-3 w-3" /> DXF</span>}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Novo Desenvolvimento */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetNovo(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Desenvolvimento</DialogTitle>
            <DialogDescription>O código será gerado automaticamente no formato XX.YY.ZZZZ. Status inicial: Aguardando.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select value={novoCli} onValueChange={setNovoCli}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome} {c.abreviacao_2_letras ? `(${c.abreviacao_2_letras})` : "(sem abreviação)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {cliSemAbrev && (
                <div className="text-sm text-destructive flex items-center justify-between gap-2 bg-destructive/10 p-2 rounded">
                  <span>Este cliente não tem abreviação cadastrada. Cadastre a abreviação antes de criar uma referência.</span>
                  <Button type="button" size="sm" variant="outline" onClick={() => { setDialogOpen(false); navigate("/clientes"); }}>Editar cliente</Button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Tipo de Peça *</Label>
              <Select value={novoTipo} onValueChange={setNovoTipo}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {tipos.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome} ({t.abreviacao_2_letras})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={novoDesc} onChange={(e) => setNovoDesc(e.target.value)} placeholder="Ex: Camisa Slim Manga Longa" />
            </div>
            <div className="space-y-2">
              <Label>Modelagem Origem</Label>
              <Select value={novoOrigem} onValueChange={setNovoOrigem}>
                <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhuma</SelectItem>
                  {refs.filter((r) => r.ativo).map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.codigo} — {r.descricao || tipoById.get(r.tipo_peca_id)?.nome || "—"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-md border p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Código gerado:</p>
              <p className="text-2xl font-mono font-bold tracking-widest">{codigoPreview}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando || !novoCli || !novoTipo || !!cliSemAbrev}>
              {salvando ? "Criando..." : "Criar Desenvolvimento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmLacre} onOpenChange={(o) => { if (!o) setConfirmLacre(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar lacre da piloto?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação indica que a piloto foi aprovada pelo cliente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirmLacre) changeStatus(confirmLacre, "piloto_lacrada"); setConfirmLacre(null); }}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
