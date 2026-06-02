import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, Users as UsersIcon, Mail, Phone, User, Pencil, Trash2, UsersRound, AlertTriangle, Shirt, FileCode2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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

const ETAPAS_NOMES: Record<string, string> = {
  pilotagem: "Pilotagem",
  aplicacao_travete: "Aplicação de Travete",
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

interface Cliente {
  id: string;
  nome: string;
  contato: string | null;
  email: string | null;
  telefone: string | null;
  abreviacao_2_letras: string | null;
  cnpj: string | null;
  endereco: string | null;
}

const emptyFormCliente = {
  nome: "",
  contato: "",
  email: "",
  telefone: "",
  abreviacao_2_letras: "",
  cnpj: "",
  endereco: "",
};

const formatCnpjMask = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

interface Terceiro {
  id: string;
  nome: string;
  tipo_etapa: string;
  ativo: boolean;
}

interface TipoPeca {
  id: string;
  nome: string;
  abreviacao_2_letras: string;
  ativo: boolean;
}

const sugerirAbreviacao = (nome: string): string => {
  const norm = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  if (!norm) return "";
  const vogais = new Set(["A", "E", "I", "O", "U"]);
  const consoantes = norm.split("").filter((c) => !vogais.has(c));
  let result = "";
  if (consoantes.length >= 2) {
    result = consoantes[0] + consoantes[1];
  } else if (consoantes.length === 1) {
    const firstVogal = norm.split("").find((c) => vogais.has(c)) || "";
    result = consoantes[0] + firstVogal;
  } else {
    result = norm.slice(0, 2);
  }
  while (result.length < 2) result += "X";
  return result.slice(0, 2);
};

export default function Clientes() {
  // ── Clientes ──
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesComPedidos, setClientesComPedidos] = useState<Set<string>>(new Set());
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [dialogClienteOpen, setDialogClienteOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [deleteClienteOpen, setDeleteClienteOpen] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null);
  const [formCliente, setFormCliente] = useState(emptyFormCliente);
  const [soSemAbreviacao, setSoSemAbreviacao] = useState(false);

  // ── Terceiros ──
  const [terceiros, setTerceiros] = useState<Terceiro[]>([]);
  const [loadingTerceiros, setLoadingTerceiros] = useState(true);
  const [formTerceiroOpen, setFormTerceiroOpen] = useState(false);
  const [editingTerceiro, setEditingTerceiro] = useState<Terceiro | null>(null);
  const [deleteTerceiroOpen, setDeleteTerceiroOpen] = useState(false);
  const [terceiroToDelete, setTerceiroToDelete] = useState<Terceiro | null>(null);
  const [nomeTerceiro, setNomeTerceiro] = useState("");
  const [tipoEtapa, setTipoEtapa] = useState("");
  const [salvandoTerceiro, setSalvandoTerceiro] = useState(false);
  const [filtroEtapa, setFiltroEtapa] = useState("todos");

  // ── Tipos de Peça ──
  const [tiposPeca, setTiposPeca] = useState<TipoPeca[]>([]);
  const [loadingTiposPeca, setLoadingTiposPeca] = useState(true);
  const [buscaTipoPeca, setBuscaTipoPeca] = useState("");
  const [mostrarInativosTipo, setMostrarInativosTipo] = useState(false);
  const [dialogTipoPecaOpen, setDialogTipoPecaOpen] = useState(false);
  const [editingTipoPeca, setEditingTipoPeca] = useState<TipoPeca | null>(null);
  const [formTipoPeca, setFormTipoPeca] = useState({ nome: "", abreviacao_2_letras: "", ativo: true });
  const [abrevManual, setAbrevManual] = useState(false);
  const [salvandoTipoPeca, setSalvandoTipoPeca] = useState(false);
  const [deletandoTipoPeca, setDeletandoTipoPeca] = useState<TipoPeca | null>(null);
  const [confirmandoDeleteTipoPeca, setConfirmandoDeleteTipoPeca] = useState(false);

  // ── Referências ──
  interface Referencia {
    id: string;
    codigo: string;
    cliente_id: string;
    tipo_peca_id: string;
    sequencial: number;
    descricao: string | null;
    modelagem_origem_id: string | null;
    status: string;
    ativo: boolean;
  }
  const [referencias, setReferencias] = useState<Referencia[]>([]);
  const [loadingReferencias, setLoadingReferencias] = useState(true);
  const [buscaRef, setBuscaRef] = useState("");
  const [filtroClienteRef, setFiltroClienteRef] = useState("todos");
  const [filtroTipoRef, setFiltroTipoRef] = useState("todos");
  const [mostrarInativosRef, setMostrarInativosRef] = useState(false);
  const [dialogRefOpen, setDialogRefOpen] = useState(false);
  const [novaRefCliente, setNovaRefCliente] = useState("");
  const [novaRefTipo, setNovaRefTipo] = useState("");
  const [novaRefDescricao, setNovaRefDescricao] = useState("");
  const [novaRefOrigem, setNovaRefOrigem] = useState<string>("__none__");
  const [proximoSeq, setProximoSeq] = useState<number | null>(null);
  const [salvandoRef, setSalvandoRef] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const initialTab = (location.state as any)?.tab || "clientes";
  const { toast } = useToast();

  useEffect(() => {
    fetchClientes();
    fetchTerceiros();
    fetchTiposPeca();
    fetchReferencias();

    const clientesChannel = supabase
      .channel('clientes-changes-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, (payload) => {
        if (payload.eventType !== 'DELETE') fetchClientes();
      })
      .subscribe();

    const refChannel = supabase
      .channel('referencias-changes-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referencias' }, () => {
        fetchReferencias();
      })
      .subscribe();

    return () => { supabase.removeChannel(clientesChannel); supabase.removeChannel(refChannel); };
  }, []);

  const fetchReferencias = async () => {
    try {
      const { data, error } = await (supabase.from("referencias") as any).select("*").order("codigo");
      if (error) throw error;
      setReferencias((data || []) as Referencia[]);
    } catch (error) {
      console.error("Erro ao buscar referências:", error);
    } finally {
      setLoadingReferencias(false);
    }
  };

  // Atualiza preview do próximo sequencial quando cliente+tipo selecionados
  useEffect(() => {
    const fetchSeq = async () => {
      if (!novaRefCliente || !novaRefTipo) { setProximoSeq(null); return; }
      const { data } = await (supabase.rpc as any)("proximo_sequencial_referencia", {
        _cliente_id: novaRefCliente,
        _tipo_peca_id: novaRefTipo,
      });
      setProximoSeq(typeof data === "number" ? data : 1);
    };
    fetchSeq();
  }, [novaRefCliente, novaRefTipo]);

  const clienteSelecionado = clientes.find((c) => c.id === novaRefCliente);
  const tipoSelecionado = tiposPeca.find((t) => t.id === novaRefTipo);
  const clienteSemAbrev = clienteSelecionado && !clienteSelecionado.abreviacao_2_letras;
  const codigoPreview = clienteSelecionado?.abreviacao_2_letras && tipoSelecionado && proximoSeq
    ? `${tipoSelecionado.abreviacao_2_letras}.${clienteSelecionado.abreviacao_2_letras}.${String(proximoSeq).padStart(4, "0")}`
    : "—";

  const resetNovaRef = () => {
    setNovaRefCliente("");
    setNovaRefTipo("");
    setNovaRefDescricao("");
    setNovaRefOrigem("__none__");
    setProximoSeq(null);
  };

  const editarClienteSemAbrev = () => {
    if (!clienteSelecionado) return;
    setDialogRefOpen(false);
    handleEditCliente(clienteSelecionado as any);
  };

  const salvarReferencia = async () => {
    if (!novaRefCliente || !novaRefTipo) return;
    if (clienteSemAbrev) {
      toast({ title: "Cliente sem abreviação", description: "Cadastre a abreviação do cliente antes.", variant: "destructive" });
      return;
    }
    setSalvandoRef(true);
    const { data: userData } = await supabase.auth.getUser();
    const payload = {
      cliente_id: novaRefCliente,
      tipo_peca_id: novaRefTipo,
      descricao: novaRefDescricao.trim() || null,
      modelagem_origem_id: novaRefOrigem === "__none__" ? null : novaRefOrigem,
      criado_por: userData?.user?.id || null,
      // codigo e sequencial são gerados pelo trigger; passamos placeholders aceitos pelo CHECK
      codigo: "XX.XX.0000",
      sequencial: 0,
    };
    const { data, error } = await (supabase.from("referencias") as any).insert([payload]).select().single();
    setSalvandoRef(false);
    if (error) {
      toast({ title: "Erro ao criar referência", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Referência criada!", description: (data as any).codigo });
    setDialogRefOpen(false);
    resetNovaRef();
    fetchReferencias();
    navigate(`/cadastros/referencias/${(data as any).id}`);
  };


  const fetchTiposPeca = async () => {
    try {
      const { data, error } = await (supabase.from("tipos_peca") as any).select("*").order("nome");
      if (error) throw error;
      setTiposPeca((data || []) as TipoPeca[]);
    } catch (error) {
      console.error("Erro ao buscar tipos de peça:", error);
    } finally {
      setLoadingTiposPeca(false);
    }
  };

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase.from("clientes").select("*").order("nome");
      if (error) throw error;
      setClientes(data || []);
      const { data: pedidos } = await supabase.from("pedidos").select("cliente_id, status_geral").neq("status_geral", "concluido");
      setClientesComPedidos(new Set(pedidos?.map(p => p.cliente_id) || []));
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
    } finally {
      setLoadingClientes(false);
    }
  };

  const fetchTerceiros = async () => {
    try {
      const { data, error } = await (supabase.from("terceiros") as any).select("*").order("tipo_etapa").order("nome");
      if (error) throw error;
      setTerceiros((data || []) as Terceiro[]);
    } catch (error) {
      console.error("Erro ao buscar terceiros:", error);
    } finally {
      setLoadingTerceiros(false);
    }
  };

  const handleSubmitCliente = async (e: React.FormEvent) => {
    e.preventDefault();

    const abrev = formCliente.abreviacao_2_letras.trim().toUpperCase();
    const cnpjMasked = formCliente.cnpj.trim();
    const cnpjDigits = cnpjMasked.replace(/\D/g, "");

    if (abrev && !/^[A-Z]{2}$/.test(abrev)) {
      toast({ title: "Abreviação inválida", description: "Use exatamente 2 letras maiúsculas (A-Z).", variant: "destructive" });
      return;
    }
    if (cnpjDigits && cnpjDigits.length !== 14) {
      toast({ title: "CNPJ inválido", description: "O CNPJ deve ter 14 dígitos.", variant: "destructive" });
      return;
    }

    // Friendly uniqueness checks
    if (abrev) {
      const conflito = clientes.find(
        (c) => c.abreviacao_2_letras === abrev && c.id !== editingCliente?.id
      );
      if (conflito) {
        toast({ title: "Abreviação já em uso", description: `Esta abreviação já está em uso pelo cliente ${conflito.nome}.`, variant: "destructive" });
        return;
      }
    }
    if (cnpjDigits) {
      const conflitoCnpj = clientes.find(
        (c) => c.cnpj && c.cnpj.replace(/\D/g, "") === cnpjDigits && c.id !== editingCliente?.id
      );
      if (conflitoCnpj) {
        toast({ title: "CNPJ já cadastrado", description: `Este CNPJ já está cadastrado para o cliente ${conflitoCnpj.nome}.`, variant: "destructive" });
        return;
      }
    }

    const payload = {
      nome: formCliente.nome,
      contato: formCliente.contato || null,
      email: formCliente.email || null,
      telefone: formCliente.telefone || null,
      abreviacao_2_letras: abrev || null,
      cnpj: cnpjDigits ? formatCnpjMask(cnpjDigits) : null,
      endereco: formCliente.endereco.trim() || null,
    };

    try {
      if (editingCliente) {
        const { error } = await supabase.from("clientes").update(payload).eq("id", editingCliente.id);
        if (error) throw error;
        toast({ title: "Cliente atualizado!" });
      } else {
        const { error } = await supabase.from("clientes").insert([payload]);
        if (error) throw error;
        toast({ title: "Cliente cadastrado!" });
      }
      setDialogClienteOpen(false);
      setEditingCliente(null);
      setFormCliente(emptyFormCliente);
      fetchClientes();
    } catch (error: any) {
      toast({ title: "Erro ao salvar cliente", description: error.message, variant: "destructive" });
    }
  };

  const handleEditCliente = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setFormCliente({
      nome: cliente.nome,
      contato: cliente.contato || "",
      email: cliente.email || "",
      telefone: cliente.telefone || "",
      abreviacao_2_letras: cliente.abreviacao_2_letras || "",
      cnpj: cliente.cnpj || "",
      endereco: cliente.endereco || "",
    });
    setDialogClienteOpen(true);
  };

  const handleDeleteClienteClick = async (cliente: Cliente) => {
    const { data: pedidos, error } = await supabase.from("pedidos").select("id").eq("cliente_id", cliente.id);
    if (error) return;
    if (pedidos && pedidos.length > 0) {
      toast({ title: "Não é possível excluir", description: `Este cliente possui ${pedidos.length} pedido(s). Exclua os pedidos primeiro.`, variant: "destructive" });
      return;
    }
    setClienteToDelete(cliente);
    setDeleteClienteOpen(true);
  };

  const handleDeleteClienteConfirm = async () => {
    if (!clienteToDelete) return;
    try {
      const { error } = await supabase.from("clientes").delete().eq("id", clienteToDelete.id);
      if (error) throw error;
      setClientes(prev => prev.filter(c => c.id !== clienteToDelete.id));
      toast({ title: "Cliente excluído!" });
      setDeleteClienteOpen(false);
      setClienteToDelete(null);
    } catch (error: any) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    }
  };

  const abrirNovoTerceiro = () => {
    setEditingTerceiro(null);
    setNomeTerceiro("");
    setTipoEtapa("");
    setFormTerceiroOpen(true);
  };

  const abrirEditarTerceiro = (terceiro: Terceiro) => {
    setEditingTerceiro(terceiro);
    setNomeTerceiro(terceiro.nome);
    setTipoEtapa(terceiro.tipo_etapa);
    setFormTerceiroOpen(true);
  };

  const salvarTerceiro = async () => {
    if (!nomeTerceiro.trim() || !tipoEtapa) {
      toast({ title: "Preencha o nome e a etapa.", variant: "destructive" });
      return;
    }
    setSalvandoTerceiro(true);
    try {
      if (editingTerceiro) {
        const { error } = await (supabase.from("terceiros") as any).update({ nome: nomeTerceiro.trim(), tipo_etapa: tipoEtapa }).eq("id", editingTerceiro.id);
        if (error) throw error;
        toast({ title: "Terceiro atualizado!" });
      } else {
        const { error } = await (supabase.from("terceiros") as any).insert({ nome: nomeTerceiro.trim(), tipo_etapa: tipoEtapa });
        if (error) throw error;
        toast({ title: "Terceiro cadastrado!" });
      }
      setFormTerceiroOpen(false);
      fetchTerceiros();
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setSalvandoTerceiro(false);
    }
  };

  const deletarTerceiro = async () => {
    if (!terceiroToDelete) return;
    try {
      const { error } = await (supabase.from("terceiros") as any).delete().eq("id", terceiroToDelete.id);
      if (error) throw error;
      toast({ title: "Terceiro removido." });
      fetchTerceiros();
    } catch (error: any) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    } finally {
      setDeleteTerceiroOpen(false);
      setTerceiroToDelete(null);
    }
  };

  const toggleAtivoTerceiro = async (terceiro: Terceiro) => {
    const { error } = await (supabase.from("terceiros") as any).update({ ativo: !terceiro.ativo }).eq("id", terceiro.id);
    if (!error) fetchTerceiros();
  };

  const etapasComTerceiros = [...new Set(terceiros.map((t) => t.tipo_etapa))];
  const terceirosFiltrados = filtroEtapa === "todos" ? terceiros : terceiros.filter((t) => t.tipo_etapa === filtroEtapa);

  // ── Tipos de Peça handlers ──
  const abrirNovoTipoPeca = () => {
    setEditingTipoPeca(null);
    setFormTipoPeca({ nome: "", abreviacao_2_letras: "", ativo: true });
    setAbrevManual(false);
    setDialogTipoPecaOpen(true);
  };

  const abrirEditarTipoPeca = (tipo: TipoPeca) => {
    setEditingTipoPeca(tipo);
    setFormTipoPeca({ nome: tipo.nome, abreviacao_2_letras: tipo.abreviacao_2_letras, ativo: tipo.ativo });
    setAbrevManual(true);
    setDialogTipoPecaOpen(true);
  };

  const handleNomeTipoPecaChange = (nome: string) => {
    setFormTipoPeca((prev) => {
      const next = { ...prev, nome };
      if (!abrevManual) {
        next.abreviacao_2_letras = sugerirAbreviacao(nome);
      }
      return next;
    });
  };

  const handleAbrevTipoPecaChange = (val: string) => {
    const clean = val.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
    setAbrevManual(clean.length > 0);
    setFormTipoPeca((prev) => ({ ...prev, abreviacao_2_letras: clean }));
    if (clean.length === 0) {
      // re-activate auto suggestion
      setAbrevManual(false);
      setFormTipoPeca((prev) => ({ ...prev, abreviacao_2_letras: sugerirAbreviacao(prev.nome) }));
    }
  };

  const salvarTipoPeca = async () => {
    const nome = formTipoPeca.nome.trim();
    const abrev = formTipoPeca.abreviacao_2_letras.trim().toUpperCase();
    if (!nome) {
      toast({ title: "Informe o nome do tipo de peça.", variant: "destructive" });
      return;
    }
    if (!/^[A-Z]{2}$/.test(abrev)) {
      toast({ title: "Abreviação inválida", description: "Use exatamente 2 letras maiúsculas (A-Z).", variant: "destructive" });
      return;
    }
    const conflitoNome = tiposPeca.find(
      (t) => t.nome.toLowerCase() === nome.toLowerCase() && t.id !== editingTipoPeca?.id
    );
    if (conflitoNome) {
      toast({ title: "Nome duplicado", description: `Já existe um tipo de peça com o nome "${conflitoNome.nome}".`, variant: "destructive" });
      return;
    }
    const conflitoAbrev = tiposPeca.find(
      (t) => t.abreviacao_2_letras === abrev && t.id !== editingTipoPeca?.id
    );
    if (conflitoAbrev) {
      toast({ title: "Abreviação já em uso", description: `Esta abreviação já está em uso pelo tipo "${conflitoAbrev.nome}".`, variant: "destructive" });
      return;
    }

    setSalvandoTipoPeca(true);
    try {
      const payload = { nome, abreviacao_2_letras: abrev, ativo: formTipoPeca.ativo };
      if (editingTipoPeca) {
        const { error } = await (supabase.from("tipos_peca") as any).update(payload).eq("id", editingTipoPeca.id);
        if (error) throw error;
        toast({ title: "Tipo de peça atualizado!" });
      } else {
        const { error } = await (supabase.from("tipos_peca") as any).insert(payload);
        if (error) throw error;
        toast({ title: "Tipo de peça cadastrado!" });
      }
      setDialogTipoPecaOpen(false);
      fetchTiposPeca();
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setSalvandoTipoPeca(false);
    }
  };

  const toggleAtivoTipoPeca = async (tipo: TipoPeca) => {
    const { error } = await (supabase.from("tipos_peca") as any).update({ ativo: !tipo.ativo }).eq("id", tipo.id);
    if (!error) fetchTiposPeca();
  };

  const confirmarDeleteTipoPeca = async () => {
    if (!deletandoTipoPeca) return;
    try {
      const { count, error: errCount } = await (supabase.from("referencias") as any)
        .select("id", { count: "exact", head: true })
        .eq("tipo_peca_id", deletandoTipoPeca.id);
      if (errCount) throw errCount;
      if ((count ?? 0) > 0) {
        toast({
          title: "Não é possível excluir",
          description: `Este tipo está vinculado a ${count} referência(s). Desative-o em vez de excluir.`,
          variant: "destructive",
        });
        setConfirmandoDeleteTipoPeca(false);
        setDeletandoTipoPeca(null);
        return;
      }
      const { error } = await (supabase.from("tipos_peca") as any).delete().eq("id", deletandoTipoPeca.id);
      if (error) throw error;
      toast({ title: "Tipo de peça excluído" });
      setConfirmandoDeleteTipoPeca(false);
      setDeletandoTipoPeca(null);
      fetchTiposPeca();
    } catch (e: any) {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    }
  };

  const tiposPecaAtivos = tiposPeca.filter((t) => t.ativo);
  const tiposPecaFiltrados = tiposPeca
    .filter((t) => mostrarInativosTipo || t.ativo)
    .filter((t) => !buscaTipoPeca.trim() || t.nome.toLowerCase().includes(buscaTipoPeca.trim().toLowerCase()));

  const referenciasAtivas = referencias.filter((r) => r.ativo);
  const referenciasFiltradas = referencias
    .filter((r) => mostrarInativosRef || r.ativo)
    .filter((r) => filtroClienteRef === "todos" || r.cliente_id === filtroClienteRef)
    .filter((r) => filtroTipoRef === "todos" || r.tipo_peca_id === filtroTipoRef)
    .filter((r) => {
      const q = buscaRef.trim().toLowerCase();
      if (!q) return true;
      return r.codigo.toLowerCase().includes(q) || (r.descricao || "").toLowerCase().includes(q);
    });
  const clientesById = new Map(clientes.map((c) => [c.id, c]));
  const tiposById = new Map(tiposPeca.map((t) => [t.id, t]));
  const refById = new Map(referencias.map((r) => [r.id, r]));

  const ClienteCard = ({ cliente }: { cliente: Cliente }) => (
    <Card className={clientesComPedidos.has(cliente.id) ? "border-primary/30" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-lg">{cliente.nome}</CardTitle>
            {cliente.abreviacao_2_letras ? (
              <Badge variant="secondary" className="font-mono">{cliente.abreviacao_2_letras}</Badge>
            ) : (
              <Badge variant="outline" className="border-yellow-500/60 text-yellow-600 dark:text-yellow-400 gap-1" title="Abreviação pendente — necessária para gerar códigos de referência">
                <AlertTriangle className="h-3 w-3" /> Abreviação pendente
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditCliente(cliente)}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteClienteClick(cliente)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {cliente.contato && <div className="flex items-center gap-2 text-sm"><User className="h-4 w-4 text-muted-foreground" /><span>{cliente.contato}</span></div>}
        {cliente.email && <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /><span className="truncate">{cliente.email}</span></div>}
        {cliente.telefone && <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /><span>{cliente.telefone}</span></div>}
        {cliente.cnpj && <div className="text-xs text-muted-foreground">CNPJ: {cliente.cnpj}</div>}
        {!cliente.contato && !cliente.email && !cliente.telefone && <p className="text-sm text-muted-foreground">Sem informações de contato</p>}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cadastros</h1>
        <p className="text-muted-foreground">Gerencie clientes e fornecedores externos</p>
      </div>

      <Tabs defaultValue={initialTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="clientes" className="gap-2">
            <UsersIcon className="h-4 w-4" />
            Clientes ({clientes.length})
          </TabsTrigger>
          <TabsTrigger value="terceiros" className="gap-2">
            <UsersRound className="h-4 w-4" />
            Terceiros ({terceiros.length})
          </TabsTrigger>
          <TabsTrigger value="tipos_peca" className="gap-2">
            <Shirt className="h-4 w-4" />
            Tipos de Peça ({tiposPecaAtivos.length})
          </TabsTrigger>
          <TabsTrigger value="referencias" className="gap-2">
            <FileCode2 className="h-4 w-4" />
            Referências ({referenciasAtivas.length})
          </TabsTrigger>
        </TabsList>

        {/* ABA CLIENTES */}
        <TabsContent value="clientes">
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={soSemAbreviacao} onCheckedChange={setSoSemAbreviacao} />
                Mostrar só clientes sem abreviação
              </label>
              <Dialog open={dialogClienteOpen} onOpenChange={(open) => { setDialogClienteOpen(open); if (!open) { setEditingCliente(null); setFormCliente(emptyFormCliente); } }}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-2 h-4 w-4" />Novo Cliente</Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <form onSubmit={handleSubmitCliente}>
                    <DialogHeader>
                      <DialogTitle>{editingCliente ? "Editar Cliente" : "Cadastrar Cliente"}</DialogTitle>
                      <DialogDescription>{editingCliente ? "Atualize as informações do cliente" : "Adicione um novo cliente à sua lista"}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="nome">Nome da Marca *</Label>
                        <Input id="nome" value={formCliente.nome} onChange={(e) => setFormCliente({ ...formCliente, nome: e.target.value })} placeholder="Ex: Marca Premium" required />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="abreviacao">Abreviação (2 letras)</Label>
                          <Input
                            id="abreviacao"
                            value={formCliente.abreviacao_2_letras}
                            onChange={(e) =>
                              setFormCliente({
                                ...formCliente,
                                abreviacao_2_letras: e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2),
                              })
                            }
                            placeholder="VT"
                            maxLength={2}
                            className="uppercase font-mono tracking-widest"
                          />
                          <p className="text-xs text-muted-foreground">
                            2 letras maiúsculas. Usado para gerar códigos de referência (ex: CM.VT.0001). Deve ser única.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cnpj">CNPJ</Label>
                          <Input
                            id="cnpj"
                            value={formCliente.cnpj}
                            onChange={(e) => setFormCliente({ ...formCliente, cnpj: formatCnpjMask(e.target.value) })}
                            placeholder="00.000.000/0000-00"
                            inputMode="numeric"
                          />
                          <p className="text-xs text-muted-foreground">Opcional. Mascarado automaticamente.</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contato">Pessoa de Contato</Label>
                        <Input id="contato" value={formCliente.contato} onChange={(e) => setFormCliente({ ...formCliente, contato: e.target.value })} placeholder="Ex: João Silva" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={formCliente.email} onChange={(e) => setFormCliente({ ...formCliente, email: e.target.value })} placeholder="contato@marca.com" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="telefone">Telefone</Label>
                        <Input id="telefone" value={formCliente.telefone} onChange={(e) => setFormCliente({ ...formCliente, telefone: e.target.value })} placeholder="(11) 99999-9999" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endereco">Endereço</Label>
                        <Textarea
                          id="endereco"
                          value={formCliente.endereco}
                          onChange={(e) => setFormCliente({ ...formCliente, endereco: e.target.value })}
                          placeholder="Rua X, 123 — São Paulo/SP"
                          rows={2}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setDialogClienteOpen(false)}>Cancelar</Button>
                      <Button type="submit">{editingCliente ? "Salvar" : "Cadastrar"}</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>


            {loadingClientes ? (
              <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
            ) : clientes.length === 0 ? (
              <Card><CardContent className="py-16 text-center"><UsersIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" /><h3 className="mb-2 text-lg font-semibold">Nenhum cliente cadastrado</h3><Button onClick={() => setDialogClienteOpen(true)}><Plus className="mr-2 h-4 w-4" />Adicionar Cliente</Button></CardContent></Card>
            ) : (() => {
              const base = soSemAbreviacao
                ? clientes.filter((c) => !c.abreviacao_2_letras)
                : clientes;
              const ativos = base.filter((c) => clientesComPedidos.has(c.id));
              const inativos = base.filter((c) => !clientesComPedidos.has(c.id));
              return (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Com Pedidos Ativos</h2>
                    {ativos.length === 0 ? (
                      <Card><CardContent className="py-8 text-center"><p className="text-muted-foreground">Nenhum cliente com pedidos ativos</p></CardContent></Card>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {ativos.map(c => <ClienteCard key={c.id} cliente={c} />)}
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Sem Pedido Ativo</h2>
                    {inativos.length === 0 ? (
                      <Card><CardContent className="py-8 text-center"><p className="text-muted-foreground">{soSemAbreviacao ? "Nenhum cliente sem abreviação nesta seção" : "Todos os clientes têm pedidos ativos"}</p></CardContent></Card>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {inativos.map(c => <ClienteCard key={c.id} cliente={c} />)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </TabsContent>

        {/* ABA TERCEIROS */}
        <TabsContent value="terceiros">
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-2 flex-wrap">
                <Button variant={filtroEtapa === "todos" ? "default" : "outline"} size="sm" onClick={() => setFiltroEtapa("todos")}>
                  Todos ({terceiros.length})
                </Button>
                {etapasComTerceiros.map((etapa) => (
                  <Button key={etapa} variant={filtroEtapa === etapa ? "default" : "outline"} size="sm" onClick={() => setFiltroEtapa(etapa)}>
                    {ETAPAS_NOMES[etapa] || etapa} ({terceiros.filter(t => t.tipo_etapa === etapa).length})
                  </Button>
                ))}
              </div>
              <Button onClick={abrirNovoTerceiro} className="gap-2 shrink-0">
                <Plus className="h-4 w-4" />Novo Terceiro
              </Button>
            </div>

            {loadingTerceiros ? (
              <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
            ) : terceirosFiltrados.length === 0 ? (
              <Card><CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground"><UsersRound className="h-12 w-12 mb-3 opacity-20" /><p className="font-medium">Nenhum terceiro cadastrado</p><p className="text-sm">Clique em "Novo Terceiro" para começar</p></CardContent></Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {terceirosFiltrados.map((terceiro) => (
                  <Card key={terceiro.id} className={`transition-opacity ${!terceiro.ativo ? "opacity-50" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold truncate">{terceiro.nome}</p>
                            {!terceiro.ativo && <Badge variant="secondary" className="text-xs shrink-0">Inativo</Badge>}
                          </div>
                          <Badge variant="outline" className="text-xs">{ETAPAS_NOMES[terceiro.tipo_etapa] || terceiro.tipo_etapa}</Badge>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => abrirEditarTerceiro(terceiro)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => { setTerceiroToDelete(terceiro); setDeleteTerceiroOpen(true); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="w-full mt-2 text-xs h-7" onClick={() => toggleAtivoTerceiro(terceiro)}>
                        {terceiro.ativo ? "Desativar" : "Ativar"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ABA TIPOS DE PEÇA */}
        <TabsContent value="tipos_peca">
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Catálogo de tipos de peça para gerar códigos de referência (ex: CM.VT.0001)
            </p>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4 flex-wrap">
                <Input
                  placeholder="Buscar por nome..."
                  value={buscaTipoPeca}
                  onChange={(e) => setBuscaTipoPeca(e.target.value)}
                  className="w-64"
                />
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={mostrarInativosTipo} onCheckedChange={setMostrarInativosTipo} />
                  Mostrar inativos
                </label>
              </div>
              <Button onClick={abrirNovoTipoPeca} className="gap-2">
                <Plus className="h-4 w-4" /> Novo Tipo de Peça
              </Button>
            </div>

            {loadingTiposPeca ? (
              <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
            ) : tiposPecaFiltrados.length === 0 ? (
              <Card><CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Shirt className="h-12 w-12 mb-3 opacity-20" />
                <p className="font-medium">
                  {tiposPeca.length === 0 ? "Nenhum tipo de peça cadastrado ainda" : "Nenhum tipo encontrado com este filtro"}
                </p>
              </CardContent></Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {tiposPecaFiltrados.map((tipo) => (
                  <Card key={tipo.id} className={`transition-opacity ${!tipo.ativo ? "opacity-50" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-semibold truncate">{tipo.nome}</p>
                            <Badge variant="secondary" className="font-mono tracking-widest">{tipo.abreviacao_2_letras}</Badge>
                            {!tipo.ativo && <Badge variant="outline" className="text-xs">Inativo</Badge>}
                            {tipo.ativo && <Badge className="bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30 text-xs" variant="outline">Ativo</Badge>}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => abrirEditarTipoPeca(tipo)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => { setDeletandoTipoPeca(tipo); setConfirmandoDeleteTipoPeca(true); }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="w-full mt-2 text-xs h-7" onClick={() => toggleAtivoTipoPeca(tipo)}>
                        {tipo.ativo ? "Desativar" : "Ativar"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ABA REFERÊNCIAS */}
        <TabsContent value="referencias">
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Catálogo de referências (peças desenvolvidas) com código no formato XX.YY.ZZZZ
            </p>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <Input
                  placeholder="Buscar por código ou descrição..."
                  value={buscaRef}
                  onChange={(e) => setBuscaRef(e.target.value)}
                  className="w-64"
                />
                <Select value={filtroClienteRef} onValueChange={setFiltroClienteRef}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Cliente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os clientes</SelectItem>
                    {clientes.filter((c) => c.abreviacao_2_letras).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filtroTipoRef} onValueChange={setFiltroTipoRef}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Tipo de Peça" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    {tiposPecaAtivos.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={mostrarInativosRef} onCheckedChange={setMostrarInativosRef} />
                  Mostrar inativos
                </label>
              </div>
              <Button onClick={() => { resetNovaRef(); setDialogRefOpen(true); }} className="gap-2">
                <Plus className="h-4 w-4" /> Nova Referência
              </Button>
            </div>

            {loadingReferencias ? (
              <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
            ) : referenciasFiltradas.length === 0 ? (
              <Card><CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <FileCode2 className="h-12 w-12 mb-3 opacity-20" />
                <p className="font-medium">
                  {referencias.length === 0 ? "Nenhuma referência cadastrada ainda" : "Nenhuma referência encontrada com este filtro"}
                </p>
                {referencias.length === 0 && (
                  <Button onClick={() => { resetNovaRef(); setDialogRefOpen(true); }} className="mt-4 gap-2">
                    <Plus className="h-4 w-4" /> Nova Referência
                  </Button>
                )}
              </CardContent></Card>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/30">
                      <tr className="text-left">
                        <th className="p-3 font-medium">Código</th>
                        <th className="p-3 font-medium">Descrição</th>
                        <th className="p-3 font-medium">Cliente</th>
                        <th className="p-3 font-medium">Tipo de Peça</th>
                        <th className="p-3 font-medium">Modelagem Origem</th>
                        <th className="p-3 font-medium">Status</th>
                        <th className="p-3 font-medium">Ativo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referenciasFiltradas.map((r) => {
                        const cli = clientesById.get(r.cliente_id);
                        const tp = tiposById.get(r.tipo_peca_id);
                        const origem = r.modelagem_origem_id ? refById.get(r.modelagem_origem_id) : null;
                        return (
                          <tr
                            key={r.id}
                            onClick={() => navigate(`/cadastros/referencias/${r.id}`)}
                            className="border-b cursor-pointer hover:bg-muted/40 transition-colors"
                          >
                            <td className="p-3">
                              <Badge variant="secondary" className="font-mono tracking-widest">{r.codigo}</Badge>
                            </td>
                            <td className="p-3">{r.descricao || <span className="text-muted-foreground">—</span>}</td>
                            <td className="p-3">{cli?.nome || "—"}</td>
                            <td className="p-3">{tp?.nome || "—"}</td>
                            <td className="p-3 font-mono text-xs">{origem?.codigo || <span className="text-muted-foreground font-sans">—</span>}</td>
                            <td className="p-3">
                              <Badge variant="outline" className={r.status === "em_desenvolvimento" ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30" : ""}>
                                {r.status === "em_desenvolvimento" ? "Em desenvolvimento" : r.status}
                              </Badge>
                            </td>
                            <td className="p-3">
                              {r.ativo ? (
                                <Badge variant="outline" className="bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30">Ativo</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-muted">Inativo</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal Nova Referência */}
      <Dialog open={dialogRefOpen} onOpenChange={(o) => { setDialogRefOpen(o); if (!o) resetNovaRef(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Referência</DialogTitle>
            <DialogDescription>O código será gerado automaticamente no formato XX.YY.ZZZZ</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select value={novaRefCliente} onValueChange={setNovaRefCliente}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome} {c.abreviacao_2_letras ? `(${c.abreviacao_2_letras})` : "(sem abreviação)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {clienteSemAbrev && (
                <div className="text-sm text-destructive flex items-center justify-between gap-2 bg-destructive/10 p-2 rounded">
                  <span>Este cliente não tem abreviação cadastrada. Cadastre a abreviação antes de criar uma referência.</span>
                  <Button type="button" size="sm" variant="outline" onClick={editarClienteSemAbrev}>Editar cliente</Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Tipo de Peça *</Label>
              <Select value={novaRefTipo} onValueChange={setNovaRefTipo}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo de peça" /></SelectTrigger>
                <SelectContent>
                  {tiposPecaAtivos.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.nome} ({t.abreviacao_2_letras})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={novaRefDescricao}
                onChange={(e) => setNovaRefDescricao(e.target.value)}
                placeholder="Ex: Camisa Slim Manga Longa"
              />
            </div>

            <div className="space-y-2">
              <Label>Modelagem Origem</Label>
              <Select value={novaRefOrigem} onValueChange={setNovaRefOrigem}>
                <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhuma</SelectItem>
                  {referenciasAtivas.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.codigo} — {r.descricao || tiposById.get(r.tipo_peca_id)?.nome || "—"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Selecione uma referência existente cuja modelagem será reaproveitada (opcional).</p>
            </div>

            <div className="rounded-md border p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Código gerado:</p>
              <p className="text-2xl font-mono font-bold tracking-widest">{codigoPreview}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogRefOpen(false)}>Cancelar</Button>
            <Button
              onClick={salvarReferencia}
              disabled={salvandoRef || !novaRefCliente || !novaRefTipo || !!clienteSemAbrev}
            >
              {salvandoRef ? "Criando..." : "Criar Referência"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Tipo de Peça */}
      <Dialog open={dialogTipoPecaOpen} onOpenChange={setDialogTipoPecaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTipoPeca ? "Editar Tipo de Peça" : "Novo Tipo de Peça"}</DialogTitle>
            <DialogDescription>
              Cadastre um tipo de peça e a abreviação usada nos códigos de referência.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="tp-nome">Nome do tipo de peça *</Label>
              <Input
                id="tp-nome"
                value={formTipoPeca.nome}
                onChange={(e) => handleNomeTipoPecaChange(e.target.value)}
                onBlur={() => {
                  if (!abrevManual) {
                    setFormTipoPeca((prev) => ({ ...prev, abreviacao_2_letras: sugerirAbreviacao(prev.nome) }));
                  }
                }}
                placeholder="Ex: Camisa, Calça, Vestido"
                maxLength={100}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tp-abrev">Abreviação (2 letras) *</Label>
              <Input
                id="tp-abrev"
                value={formTipoPeca.abreviacao_2_letras}
                onChange={(e) => handleAbrevTipoPecaChange(e.target.value)}
                placeholder="CM"
                maxLength={2}
                className="uppercase font-mono tracking-widest w-24"
                required
              />
              <p className="text-xs text-muted-foreground">
                2 letras maiúsculas. Será usada no código de referência. Deve ser única.
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="tp-ativo">Ativo</Label>
              <Switch
                id="tp-ativo"
                checked={formTipoPeca.ativo}
                onCheckedChange={(v) => setFormTipoPeca((prev) => ({ ...prev, ativo: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogTipoPecaOpen(false)}>Cancelar</Button>
            <Button onClick={salvarTipoPeca} disabled={salvandoTipoPeca}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal terceiro */}
      <AlertDialog open={formTerceiroOpen} onOpenChange={setFormTerceiroOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{editingTerceiro ? "Editar Terceiro" : "Novo Terceiro"}</AlertDialogTitle>
            <AlertDialogDescription>Preencha o nome e a etapa que este fornecedor atende.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome *</label>
              <Input placeholder="Ex: Costureira Maria" value={nomeTerceiro} onChange={(e) => setNomeTerceiro(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Etapa *</label>
              <Select value={tipoEtapa} onValueChange={setTipoEtapa}>
                <SelectTrigger><SelectValue placeholder="Selecione a etapa" /></SelectTrigger>
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
            <AlertDialogAction onClick={salvarTerceiro} disabled={salvandoTerceiro}>
              {salvandoTerceiro ? "Salvando..." : editingTerceiro ? "Salvar" : "Cadastrar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmar exclusão terceiro */}
      <AlertDialog open={deleteTerceiroOpen} onOpenChange={setDeleteTerceiroOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover terceiro?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deletarTerceiro} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmar exclusão cliente */}
      <AlertDialog open={deleteClienteOpen} onOpenChange={setDeleteClienteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir <strong>{clienteToDelete?.nome}</strong>? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClienteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
