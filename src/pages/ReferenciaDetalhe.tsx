import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Pencil, FileText, Scissors, FileDown } from "lucide-react";
import ModelagemDxfSection from "@/components/referencias/ModelagemDxfSection";
import DxfBanner from "@/components/desenvolvimento/DxfBanner";
import EtapasPilotoSection from "@/components/desenvolvimento/EtapasPilotoSection";

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
  criado_por: string | null;
  created_at: string;
}

const statusBadgeClass = (status: string) =>
  status === "rascunho"
    ? "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30"
    : status === "em_desenvolvimento"
    ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30"
    : "bg-muted text-foreground";

const statusLabel = (status: string) =>
  status === "rascunho" ? "Rascunho" : status === "em_desenvolvimento" ? "Em desenvolvimento" : status;

export default function ReferenciaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [ref, setRef] = useState<Referencia | null>(null);
  const [clienteNome, setClienteNome] = useState<string>("");
  const [tipoPecaNome, setTipoPecaNome] = useState<string>("");
  const [criadoPorNome, setCriadoPorNome] = useState<string>("");
  const [origens, setOrigens] = useState<{ id: string; codigo: string; descricao: string | null }[]>([]);
  const [origemCodigo, setOrigemCodigo] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form
  const [descricao, setDescricao] = useState("");
  const [modelagemOrigemId, setModelagemOrigemId] = useState<string>("__none__");
  const [status, setStatus] = useState("em_desenvolvimento");
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchAll();
  }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    const { data, error } = await (supabase.from("referencias") as any)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) {
      toast({ title: "Referência não encontrada", variant: "destructive" });
      setLoading(false);
      return;
    }
    const r = data as Referencia;
    setRef(r);
    setDescricao(r.descricao || "");
    setModelagemOrigemId(r.modelagem_origem_id || "__none__");
    setStatus(r.status);
    setAtivo(r.ativo);

    const [cli, tipo, prof, todasOrigens] = await Promise.all([
      supabase.from("clientes").select("nome").eq("id", r.cliente_id).maybeSingle(),
      (supabase.from("tipos_peca") as any).select("nome").eq("id", r.tipo_peca_id).maybeSingle(),
      r.criado_por
        ? supabase.from("profiles").select("nome").eq("id", r.criado_por).maybeSingle()
        : Promise.resolve({ data: null }),
      (supabase.from("referencias") as any)
        .select("id, codigo, descricao")
        .eq("ativo", true)
        .neq("id", r.id)
        .order("codigo"),
    ]);
    setClienteNome((cli.data as any)?.nome || "");
    setTipoPecaNome((tipo.data as any)?.nome || "");
    setCriadoPorNome((prof.data as any)?.nome || "");
    setOrigens(((todasOrigens.data as any[]) || []) as any);

    if (r.modelagem_origem_id) {
      const { data: orig } = await (supabase.from("referencias") as any)
        .select("codigo")
        .eq("id", r.modelagem_origem_id)
        .maybeSingle();
      setOrigemCodigo((orig as any)?.codigo || "");
    } else {
      setOrigemCodigo("");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!ref) return;
    setSaving(true);
    const payload = {
      descricao: descricao.trim() || null,
      modelagem_origem_id: modelagemOrigemId === "__none__" ? null : modelagemOrigemId,
      status: status.trim() || "em_desenvolvimento",
      ativo,
    };
    const { error } = await (supabase.from("referencias") as any)
      .update(payload)
      .eq("id", ref.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Referência atualizada!" });
    setEditMode(false);
    fetchAll();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!ref) {
    return (
      <div className="space-y-4">
        <Link to="/clientes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <p>Referência não encontrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/clientes"
          state={{ tab: "referencias" }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para Cadastros
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-mono font-bold tracking-widest">{ref.codigo}</h1>
          <p className="text-muted-foreground mt-1">
            {ref.descricao || "Sem descrição"} · {clienteNome} · {tipoPecaNome}
          </p>
        </div>
        <Badge variant="outline" className={statusBadgeClass(ref.status)}>
          {statusLabel(ref.status)}
        </Badge>
      </div>

      {/* DXF banner — visible only in development statuses */}
      {(ref.status === "em_desenvolvimento" || ref.status === "piloto_em_producao") && (
        <DxfBanner referenciaId={ref.id} onChange={fetchAll} />
      )}

      {/* Section F — Etapas da Piloto */}
      <EtapasPilotoSection referenciaId={ref.id} onChanged={fetchAll} />

      {/* Section A — Dados */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Dados da Referência</CardTitle>
          {!editMode ? (
            <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
              <Pencil className="h-4 w-4 mr-2" /> Editar
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setEditMode(false); fetchAll(); }}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-xs text-muted-foreground">Código</Label>
            <p className="font-mono font-semibold tracking-widest">{ref.codigo}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Sequencial</Label>
            <p className="font-mono">{String(ref.sequencial).padStart(4, "0")}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Cliente</Label>
            <p>{clienteNome}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Tipo de Peça</Label>
            <p>{tipoPecaNome}</p>
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label>Descrição</Label>
            {editMode ? (
              <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Camisa Slim Manga Longa" />
            ) : (
              <p>{ref.descricao || <span className="text-muted-foreground">—</span>}</p>
            )}
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label>Modelagem Origem</Label>
            {editMode ? (
              <Select value={modelagemOrigemId} onValueChange={setModelagemOrigemId}>
                <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhuma</SelectItem>
                  {origens.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.codigo} — {o.descricao || "sem descrição"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="font-mono">{origemCodigo || <span className="text-muted-foreground font-sans">—</span>}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            {editMode ? (
              <Input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="em_desenvolvimento" />
            ) : (
              <p>{statusLabel(ref.status)}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Ativo</Label>
            {editMode ? (
              <Switch checked={ativo} onCheckedChange={setAtivo} />
            ) : (
              <Badge variant="outline" className={ativo ? "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30" : "bg-muted"}>
                {ativo ? "Ativo" : "Inativo"}
              </Badge>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Criado em</Label>
            <p className="text-sm">{new Date(ref.created_at).toLocaleString("pt-BR")}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Criado por</Label>
            <p className="text-sm">{criadoPorNome || "—"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Section B — Ficha Técnica */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Ficha Técnica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground">Ficha Técnica ainda não cadastrada. Esta funcionalidade será implementada em breve.</p>
          <Button disabled title="Em breve" variant="outline">Editar Ficha Técnica</Button>
        </CardContent>
      </Card>

      {/* Section C — Ficha de Costura */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Scissors className="h-5 w-5" /> Ficha de Costura</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground">Ficha de Costura ainda não cadastrada. Em breve.</p>
          <Button disabled title="Em breve" variant="outline">Editar Ficha de Costura</Button>
        </CardContent>
      </Card>

      {/* Section D — PDFs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileDown className="h-5 w-5" /> Documentos PDF</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground">Geração de PDF disponível após a Ficha Técnica e a Ficha de Costura estarem preenchidas.</p>
          <div className="flex gap-2 flex-wrap">
            <Button disabled title="Em breve" variant="outline">Gerar Ficha Técnica (PDF)</Button>
            <Button disabled title="Em breve" variant="outline">Gerar Ficha de Costura (PDF)</Button>
          </div>
        </CardContent>
      </Card>

      {/* Section E — Modelagem DXF */}
      <ModelagemDxfSection referenciaId={ref.id} />
    </div>
  );
}
