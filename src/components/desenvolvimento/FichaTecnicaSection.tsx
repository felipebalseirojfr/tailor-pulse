import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Trash2, Pencil, Download, Upload, ArrowUp, ArrowDown, Lock, Unlock } from "lucide-react";

interface Props {
  referenciaId: string;
  refInfo: { codigo: string; cliente: string; tipoPeca: string; descricao: string | null };
  onSummaryChange?: (s: { tecidos: number; aviamentos: number; status: string } | null) => void;
}

type Ficha = {
  id: string;
  status: string;
  observacoes_gerais: string | null;
  referencia_cliente: string | null;
  colecao: string | null;
  finalizada_em: string | null;
};

export default function FichaTecnicaSection({ referenciaId, refInfo, onSummaryChange }: Props) {
  const { toast } = useToast();
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [loading, setLoading] = useState(true);

  const [tecidos, setTecidos] = useState<any[]>([]);
  const [aviamentos, setAviamentos] = useState<any[]>([]);
  const [medidas, setMedidas] = useState<any[]>([]);
  const [customizacoes, setCustomizacoes] = useState<any[]>([]);
  const [arquivos, setArquivos] = useState<any[]>([]);
  const [hasDxf, setHasDxf] = useState(false);

  // catalogs
  const [catVariacoes, setCatVariacoes] = useState<any[]>([]);
  const [catAviamentos, setCatAviamentos] = useState<any[]>([]);

  // modals
  const [tecidoModal, setTecidoModal] = useState<any | null>(null);
  const [aviamentoModal, setAviamentoModal] = useState<any | null>(null);
  const [medidaModal, setMedidaModal] = useState<any | null>(null);
  const [customModal, setCustomModal] = useState<any | null>(null);
  const [finalizeOpen, setFinalizeOpen] = useState(false);

  const [identEdit, setIdentEdit] = useState({ referencia_cliente: "", colecao: "" });
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    load();
  }, [referenciaId]);

  const readOnly = ficha?.status === "finalizada";

  const load = async () => {
    setLoading(true);
    const { data: f } = await (supabase.from("fichas_tecnicas" as any) as any)
      .select("*").eq("referencia_id", referenciaId).maybeSingle();
    if (f) {
      setFicha(f as any);
      setIdentEdit({ referencia_cliente: (f as any).referencia_cliente || "", colecao: (f as any).colecao || "" });
      setObservacoes((f as any).observacoes_gerais || "");
      await loadChildren((f as any).id);
    } else {
      setFicha(null);
      onSummaryChange?.(null);
    }

    const { data: dxf } = await (supabase.from("modelagens_dxf") as any)
      .select("id").eq("referencia_id", referenciaId).eq("ativo", true).limit(1);
    setHasDxf((dxf || []).length > 0);

    // catalogs
    const [{ data: vars }, { data: avis }] = await Promise.all([
      (supabase.from("tecidos_variacoes") as any)
        .select("id, cor, tecido_id, tecidos(nome, composicao, rendimento_m_kg)")
        .eq("ativo", true).order("cor"),
      (supabase.from("aviamentos") as any)
        .select("id, nome, categoria, unidade").eq("ativo", true).order("nome"),
    ]);
    setCatVariacoes(vars || []);
    setCatAviamentos(avis || []);
    setLoading(false);
  };

  const loadChildren = async (fId: string) => {
    const [t, a, m, c, arq] = await Promise.all([
      (supabase.from("fichas_tecnicas_tecidos" as any) as any)
        .select("*, tecidos_variacoes(id, cor, tecidos(nome, composicao, rendimento_m_kg))")
        .eq("ficha_tecnica_id", fId).order("created_at"),
      (supabase.from("fichas_tecnicas_aviamentos" as any) as any)
        .select("*, aviamentos(nome, categoria, unidade)").eq("ficha_tecnica_id", fId).order("created_at"),
      (supabase.from("fichas_tecnicas_medidas" as any) as any)
        .select("*").eq("ficha_tecnica_id", fId).order("ordem"),
      (supabase.from("fichas_tecnicas_customizacoes" as any) as any)
        .select("*").eq("ficha_tecnica_id", fId).order("ordem"),
      (supabase.from("fichas_tecnicas_arquivos_cliente" as any) as any)
        .select("*").eq("ficha_tecnica_id", fId).order("created_at", { ascending: false }),
    ]);
    setTecidos(t.data || []);
    setAviamentos(a.data || []);
    setMedidas(m.data || []);
    setCustomizacoes(c.data || []);
    setArquivos(arq.data || []);
    onSummaryChange?.({ tecidos: (t.data || []).length, aviamentos: (a.data || []).length, status: "" });
  };

  const criarFicha = async () => {
    const { data, error } = await (supabase.from("fichas_tecnicas" as any) as any)
      .insert({ referencia_id: referenciaId }).select().single();
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Ficha Técnica criada" });
    setFicha(data as any);
    await loadChildren((data as any).id);
  };

  const salvarIdent = async () => {
    if (!ficha) return;
    const { error } = await (supabase.from("fichas_tecnicas" as any) as any)
      .update(identEdit).eq("id", ficha.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setFicha({ ...ficha, ...identEdit });
  };

  const salvarObs = async () => {
    if (!ficha) return;
    await (supabase.from("fichas_tecnicas" as any) as any)
      .update({ observacoes_gerais: observacoes }).eq("id", ficha.id);
  };

  // ----- TECIDO -----
  const saveTecido = async () => {
    if (!ficha || !tecidoModal) return;
    const { tecido_variacao_id, consumo_kg_por_peca, consumo_m_por_peca, fornecido_pelo_cliente, observacoes: obs, id } = tecidoModal;
    if (!tecido_variacao_id) return toast({ title: "Selecione um tecido", variant: "destructive" });
    if (!consumo_kg_por_peca && !consumo_m_por_peca) return toast({ title: "Informe consumo em kg ou m", variant: "destructive" });
    const payload: any = {
      ficha_tecnica_id: ficha.id,
      tecido_variacao_id,
      consumo_kg_por_peca: consumo_kg_por_peca ? Number(consumo_kg_por_peca) : null,
      consumo_m_por_peca: consumo_m_por_peca ? Number(consumo_m_por_peca) : null,
      fornecido_pelo_cliente: !!fornecido_pelo_cliente,
      observacoes: obs || null,
    };
    const q = id
      ? (supabase.from("fichas_tecnicas_tecidos" as any) as any).update(payload).eq("id", id)
      : (supabase.from("fichas_tecnicas_tecidos" as any) as any).insert(payload);
    const { error } = await q;
    if (error) {
      if (error.code === "23505") return toast({ title: "Tecido já adicionado", variant: "destructive" });
      return toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
    setTecidoModal(null);
    await loadChildren(ficha.id);
  };
  const delTecido = async (id: string) => {
    await (supabase.from("fichas_tecnicas_tecidos" as any) as any).delete().eq("id", id);
    if (ficha) await loadChildren(ficha.id);
  };

  // ----- AVIAMENTO -----
  const saveAviamento = async () => {
    if (!ficha || !aviamentoModal) return;
    const { aviamento_id, quantidade_por_peca, localizacao, observacoes: obs, id } = aviamentoModal;
    if (!aviamento_id) return toast({ title: "Selecione um aviamento", variant: "destructive" });
    if (!quantidade_por_peca || Number(quantidade_por_peca) <= 0) return toast({ title: "Quantidade obrigatória", variant: "destructive" });
    const payload: any = {
      ficha_tecnica_id: ficha.id,
      aviamento_id,
      quantidade_por_peca: Number(quantidade_por_peca),
      localizacao: localizacao || null,
      observacoes: obs || null,
    };
    const q = id
      ? (supabase.from("fichas_tecnicas_aviamentos" as any) as any).update(payload).eq("id", id)
      : (supabase.from("fichas_tecnicas_aviamentos" as any) as any).insert(payload);
    const { error } = await q;
    if (error) {
      if (error.code === "23505") return toast({ title: "Aviamento já adicionado", variant: "destructive" });
      return toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
    setAviamentoModal(null);
    await loadChildren(ficha.id);
  };
  const delAviamento = async (id: string) => {
    await (supabase.from("fichas_tecnicas_aviamentos" as any) as any).delete().eq("id", id);
    if (ficha) await loadChildren(ficha.id);
  };

  // ----- MEDIDA -----
  const saveMedida = async () => {
    if (!ficha || !medidaModal) return;
    const { id, nome_medida, tamanho_base, valor_cm, gradacao_obs } = medidaModal;
    if (!nome_medida || !tamanho_base || !valor_cm) return toast({ title: "Preencha nome, tamanho e valor", variant: "destructive" });
    const payload: any = {
      ficha_tecnica_id: ficha.id,
      nome_medida, tamanho_base,
      valor_cm: Number(valor_cm),
      gradacao_obs: gradacao_obs || null,
      ordem: id ? medidaModal.ordem : medidas.length,
    };
    const q = id
      ? (supabase.from("fichas_tecnicas_medidas" as any) as any).update(payload).eq("id", id)
      : (supabase.from("fichas_tecnicas_medidas" as any) as any).insert(payload);
    const { error } = await q;
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setMedidaModal(null);
    await loadChildren(ficha.id);
  };
  const delMedida = async (id: string) => {
    await (supabase.from("fichas_tecnicas_medidas" as any) as any).delete().eq("id", id);
    if (ficha) await loadChildren(ficha.id);
  };
  const moveMedida = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= medidas.length) return;
    const a = medidas[idx], b = medidas[j];
    await Promise.all([
      (supabase.from("fichas_tecnicas_medidas" as any) as any).update({ ordem: j }).eq("id", a.id),
      (supabase.from("fichas_tecnicas_medidas" as any) as any).update({ ordem: idx }).eq("id", b.id),
    ]);
    if (ficha) await loadChildren(ficha.id);
  };

  // ----- CUSTOMIZACAO -----
  const saveCustom = async () => {
    if (!ficha || !customModal) return;
    const { id, tipo, descricao, localizacao, observacoes: obs, arteFile } = customModal;
    if (!tipo || !descricao) return toast({ title: "Tipo e descrição obrigatórios", variant: "destructive" });
    let arte_url = customModal.arte_url || null;
    if (arteFile) {
      const path = `${ficha.id}/custom_${Date.now()}_${arteFile.name}`;
      const { error: upErr } = await supabase.storage.from("modelos-fotos").upload(path, arteFile);
      if (upErr) return toast({ title: "Erro upload", description: upErr.message, variant: "destructive" });
      const { data: pub } = supabase.storage.from("modelos-fotos").getPublicUrl(path);
      arte_url = pub.publicUrl;
    }
    const payload: any = {
      ficha_tecnica_id: ficha.id,
      tipo, descricao,
      localizacao: localizacao || null,
      observacoes: obs || null,
      arte_url,
      ordem: id ? customModal.ordem : customizacoes.length,
    };
    const q = id
      ? (supabase.from("fichas_tecnicas_customizacoes" as any) as any).update(payload).eq("id", id)
      : (supabase.from("fichas_tecnicas_customizacoes" as any) as any).insert(payload);
    const { error } = await q;
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setCustomModal(null);
    await loadChildren(ficha.id);
  };
  const delCustom = async (id: string) => {
    await (supabase.from("fichas_tecnicas_customizacoes" as any) as any).delete().eq("id", id);
    if (ficha) await loadChildren(ficha.id);
  };

  // ----- ARQUIVOS CLIENTE -----
  const uploadArquivo = async (file: File) => {
    if (!ficha) return;
    if (file.size > 20 * 1024 * 1024) return toast({ title: "Arquivo > 20MB", variant: "destructive" });
    const path = `${ficha.id}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from("fichas-tecnicas-cliente").upload(path, file);
    if (upErr) return toast({ title: "Erro upload", description: upErr.message, variant: "destructive" });
    await (supabase.from("fichas_tecnicas_arquivos_cliente" as any) as any).insert({
      ficha_tecnica_id: ficha.id, nome_arquivo: file.name, arquivo_url: path, tamanho_bytes: file.size,
    });
    await loadChildren(ficha.id);
  };
  const downloadArquivo = async (path: string, name: string) => {
    const { data } = await supabase.storage.from("fichas-tecnicas-cliente").createSignedUrl(path, 60);
    if (data?.signedUrl) {
      const a = document.createElement("a");
      a.href = data.signedUrl; a.download = name; a.click();
    }
  };
  const delArquivo = async (a: any) => {
    await supabase.storage.from("fichas-tecnicas-cliente").remove([a.arquivo_url]);
    await (supabase.from("fichas_tecnicas_arquivos_cliente" as any) as any).delete().eq("id", a.id);
    if (ficha) await loadChildren(ficha.id);
  };

  // ----- FINALIZAR -----
  const finalizar = async () => {
    if (!ficha) return;
    if (tecidos.length < 1 || aviamentos.length < 1) {
      return toast({ title: "É necessário ao menos 1 tecido e 1 aviamento", variant: "destructive" });
    }
    const { error } = await (supabase.from("fichas_tecnicas" as any) as any)
      .update({ status: "finalizada", finalizada_em: new Date().toISOString() }).eq("id", ficha.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setFinalizeOpen(false);
    toast({ title: "Ficha Técnica finalizada" });
    load();
  };
  const reabrir = async () => {
    if (!ficha) return;
    await (supabase.from("fichas_tecnicas" as any) as any)
      .update({ status: "rascunho", finalizada_em: null }).eq("id", ficha.id);
    toast({ title: "Ficha reaberta" });
    load();
  };

  // helper: kg -> m hint
  const onTecidoVariacaoChange = (variacao_id: string) => {
    const v = catVariacoes.find((x) => x.id === variacao_id);
    setTecidoModal((m: any) => ({ ...m, tecido_variacao_id: variacao_id, _rendimento: v?.tecidos?.rendimento_m_kg || null }));
  };
  const onKgChange = (kg: string) => {
    setTecidoModal((m: any) => {
      const next = { ...m, consumo_kg_por_peca: kg };
      if (kg && m._rendimento && !m._mManuallyEdited) {
        next.consumo_m_por_peca = (Number(kg) * Number(m._rendimento)).toFixed(3);
        next._autoM = true;
      }
      return next;
    });
  };

  if (loading) {
    return (
      <Card id="ficha-tecnica" className="scroll-mt-24">
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Ficha Técnica</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground text-sm">Carregando...</p></CardContent>
      </Card>
    );
  }

  if (!ficha) {
    return (
      <Card id="ficha-tecnica" className="scroll-mt-24">
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Ficha Técnica</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground">Esta referência ainda não tem Ficha Técnica.</p>
          <Button onClick={criarFicha}><Plus className="h-4 w-4 mr-1" /> Criar Ficha Técnica</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="ficha-tecnica" className="scroll-mt-24">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" /> Ficha Técnica JFR
        </CardTitle>
        {readOnly ? (
          <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30" variant="outline">
            Finalizada em {ficha.finalizada_em ? new Date(ficha.finalizada_em).toLocaleDateString("pt-BR") : "—"}
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30">Rascunho</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-8">
        {/* A — Identificação */}
        <section className="space-y-2">
          <h3 className="font-semibold">Identificação</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label className="text-xs text-muted-foreground">Código JFR</Label><p className="font-mono">{refInfo.codigo}</p></div>
            <div><Label className="text-xs text-muted-foreground">Cliente</Label><p>{refInfo.cliente}</p></div>
            <div><Label className="text-xs text-muted-foreground">Tipo de Peça</Label><p>{refInfo.tipoPeca}</p></div>
            <div><Label className="text-xs text-muted-foreground">Descrição</Label><p>{refInfo.descricao || "—"}</p></div>
            <div>
              <Label>Referência do cliente (SKU)</Label>
              <Input disabled={readOnly} value={identEdit.referencia_cliente}
                onChange={(e) => setIdentEdit({ ...identEdit, referencia_cliente: e.target.value })} onBlur={salvarIdent} />
            </div>
            <div>
              <Label>Coleção</Label>
              <Input disabled={readOnly} value={identEdit.colecao}
                onChange={(e) => setIdentEdit({ ...identEdit, colecao: e.target.value })} onBlur={salvarIdent} />
            </div>
          </div>
        </section>

        {/* B — Tecidos */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Tecidos</h3>
            {!readOnly && (
              <Button size="sm" onClick={() => setTecidoModal({})}><Plus className="h-4 w-4 mr-1" /> Adicionar Tecido</Button>
            )}
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Tecido</TableHead><TableHead>Cor</TableHead><TableHead>Composição</TableHead>
              <TableHead>kg/peça</TableHead><TableHead>m/peça</TableHead><TableHead>Cliente</TableHead>
              <TableHead>Obs.</TableHead>{!readOnly && <TableHead></TableHead>}
            </TableRow></TableHeader>
            <TableBody>
              {tecidos.length === 0 && <TableRow><TableCell colSpan={8} className="text-muted-foreground text-sm">Nenhum tecido adicionado.</TableCell></TableRow>}
              {tecidos.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.tecidos_variacoes?.tecidos?.nome}</TableCell>
                  <TableCell>{t.tecidos_variacoes?.cor}</TableCell>
                  <TableCell className="text-xs">{t.tecidos_variacoes?.tecidos?.composicao}</TableCell>
                  <TableCell>{t.consumo_kg_por_peca || "—"}</TableCell>
                  <TableCell>{t.consumo_m_por_peca || "—"}</TableCell>
                  <TableCell>{t.fornecido_pelo_cliente ? "Sim" : "Não"}</TableCell>
                  <TableCell className="text-xs max-w-[180px] truncate">{t.observacoes}</TableCell>
                  {!readOnly && (
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => setTecidoModal({
                        id: t.id, tecido_variacao_id: t.tecido_variacao_id, consumo_kg_por_peca: t.consumo_kg_por_peca || "",
                        consumo_m_por_peca: t.consumo_m_por_peca || "", fornecido_pelo_cliente: t.fornecido_pelo_cliente,
                        observacoes: t.observacoes || "",
                      })}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => delTecido(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        {/* C — Aviamentos */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Aviamentos</h3>
            {!readOnly && (
              <Button size="sm" onClick={() => setAviamentoModal({})}><Plus className="h-4 w-4 mr-1" /> Adicionar Aviamento</Button>
            )}
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Aviamento</TableHead><TableHead>Categoria</TableHead><TableHead>Qtd/peça</TableHead>
              <TableHead>Unidade</TableHead><TableHead>Localização</TableHead><TableHead>Obs.</TableHead>
              {!readOnly && <TableHead></TableHead>}
            </TableRow></TableHeader>
            <TableBody>
              {aviamentos.length === 0 && <TableRow><TableCell colSpan={7} className="text-muted-foreground text-sm">Nenhum aviamento.</TableCell></TableRow>}
              {aviamentos.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.aviamentos?.nome}</TableCell>
                  <TableCell>{a.aviamentos?.categoria}</TableCell>
                  <TableCell>{a.quantidade_por_peca}</TableCell>
                  <TableCell>{a.aviamentos?.unidade}</TableCell>
                  <TableCell className="text-xs">{a.localizacao}</TableCell>
                  <TableCell className="text-xs max-w-[180px] truncate">{a.observacoes}</TableCell>
                  {!readOnly && (
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => setAviamentoModal({
                        id: a.id, aviamento_id: a.aviamento_id, quantidade_por_peca: a.quantidade_por_peca,
                        localizacao: a.localizacao || "", observacoes: a.observacoes || "",
                      })}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => delAviamento(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        {/* D — Resumo Consumo */}
        <section className="space-y-2">
          <h3 className="font-semibold">Consumo de Tecido (resumo)</h3>
          <div className="rounded-md border p-3 space-y-1 text-sm">
            {tecidos.length === 0 && <p className="text-muted-foreground">Adicione tecidos para ver o resumo.</p>}
            {tecidos.map((t) => (
              <p key={t.id}>
                <strong>{t.tecidos_variacoes?.tecidos?.nome} — {t.tecidos_variacoes?.cor}:</strong>{" "}
                {t.consumo_kg_por_peca || "—"} kg/peça · {t.consumo_m_por_peca || "—"} m/peça
              </p>
            ))}
            <p className="text-xs text-muted-foreground pt-2">Consumo estimado. Confirme com o encaixe do Lectra após upload do DXF.</p>
            {hasDxf && <p className="text-xs text-green-700 dark:text-green-400">DXF disponível — processamento automático do consumo em breve.</p>}
          </div>
        </section>

        {/* E — Medidas */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Medidas de Referência</h3>
            {!readOnly && (
              <Button size="sm" onClick={() => setMedidaModal({})}><Plus className="h-4 w-4 mr-1" /> Adicionar Medida</Button>
            )}
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Medida</TableHead><TableHead>Tamanho base</TableHead><TableHead>Valor (cm)</TableHead>
              <TableHead>Gradação</TableHead>{!readOnly && <TableHead></TableHead>}
            </TableRow></TableHeader>
            <TableBody>
              {medidas.length === 0 && <TableRow><TableCell colSpan={5} className="text-muted-foreground text-sm">Nenhuma medida.</TableCell></TableRow>}
              {medidas.map((m, idx) => (
                <TableRow key={m.id}>
                  <TableCell>{m.nome_medida}</TableCell>
                  <TableCell>{m.tamanho_base}</TableCell>
                  <TableCell>{m.valor_cm}</TableCell>
                  <TableCell className="text-xs">{m.gradacao_obs}</TableCell>
                  {!readOnly && (
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => moveMedida(idx, -1)} disabled={idx === 0}><ArrowUp className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => moveMedida(idx, 1)} disabled={idx === medidas.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setMedidaModal(m)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => delMedida(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        {/* F — Customizações */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Customizações</h3>
            {!readOnly && (
              <Button size="sm" onClick={() => setCustomModal({ tipo: "bordado" })}><Plus className="h-4 w-4 mr-1" /> Adicionar Customização</Button>
            )}
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Tipo</TableHead><TableHead>Descrição</TableHead><TableHead>Localização</TableHead>
              <TableHead>Arte</TableHead><TableHead>Obs.</TableHead>{!readOnly && <TableHead></TableHead>}
            </TableRow></TableHeader>
            <TableBody>
              {customizacoes.length === 0 && <TableRow><TableCell colSpan={6} className="text-muted-foreground text-sm">Adicione se houver bordado, estampa ou customizações especiais.</TableCell></TableRow>}
              {customizacoes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="capitalize">{c.tipo}</TableCell>
                  <TableCell>{c.descricao}</TableCell>
                  <TableCell className="text-xs">{c.localizacao}</TableCell>
                  <TableCell>{c.arte_url ? <a href={c.arte_url} target="_blank" rel="noreferrer" className="text-primary underline text-xs">ver arte</a> : "—"}</TableCell>
                  <TableCell className="text-xs max-w-[160px] truncate">{c.observacoes}</TableCell>
                  {!readOnly && (
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => setCustomModal(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => delCustom(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        {/* G — Acabamentos */}
        <section className="space-y-2">
          <h3 className="font-semibold">Acabamentos e Instruções Gerais</h3>
          <Textarea rows={6} disabled={readOnly} value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)} onBlur={salvarObs}
            placeholder="Instruções de acabamento, lavanderia, embalagem, etc." />
        </section>

        {/* H — Arquivos do cliente */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Ficha do Cliente (arquivo original)</h3>
            {!readOnly && (
              <Label className="cursor-pointer">
                <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && uploadArquivo(e.target.files[0])} />
                <span className="inline-flex items-center gap-1 text-sm border rounded-md px-3 py-1.5 hover:bg-accent">
                  <Upload className="h-4 w-4" /> Adicionar Arquivo
                </span>
              </Label>
            )}
          </div>
          <div className="rounded-md border divide-y">
            {arquivos.length === 0 && <p className="p-3 text-sm text-muted-foreground">Nenhum arquivo enviado.</p>}
            {arquivos.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-2 text-sm">
                <div>
                  <div>{a.nome_arquivo}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.tamanho_bytes ? `${Math.round(a.tamanho_bytes / 1024)} KB · ` : ""}{new Date(a.created_at).toLocaleString("pt-BR")}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => downloadArquivo(a.arquivo_url, a.nome_arquivo)}><Download className="h-4 w-4" /></Button>
                  {!readOnly && <Button size="icon" variant="ghost" onClick={() => delArquivo(a)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* I — Status / Finalização */}
        <section className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {readOnly ? "Ficha finalizada — somente leitura." : "Mínimo: 1 tecido + 1 aviamento para finalizar."}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" disabled title="Disponível em breve">Gerar PDF</Button>
            {readOnly ? (
              <Button variant="outline" onClick={reabrir}><Unlock className="h-4 w-4 mr-1" /> Reabrir Ficha Técnica</Button>
            ) : (
              <Button onClick={() => setFinalizeOpen(true)}><Lock className="h-4 w-4 mr-1" /> Finalizar Ficha Técnica</Button>
            )}
          </div>
        </section>
      </CardContent>

      {/* ===== TECIDO MODAL ===== */}
      <Dialog open={!!tecidoModal} onOpenChange={(o) => !o && setTecidoModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{tecidoModal?.id ? "Editar Tecido" : "Adicionar Tecido"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tecido — Cor</Label>
              <Select value={tecidoModal?.tecido_variacao_id || ""} onValueChange={onTecidoVariacaoChange}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {catVariacoes.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.tecidos?.nome} — {v.cor}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Consumo (kg/peça)</Label>
                <Input type="number" step="0.001" value={tecidoModal?.consumo_kg_por_peca || ""} onChange={(e) => onKgChange(e.target.value)} />
              </div>
              <div>
                <Label>Consumo (m/peça)</Label>
                <Input type="number" step="0.001" value={tecidoModal?.consumo_m_por_peca || ""}
                  onChange={(e) => setTecidoModal((m: any) => ({ ...m, consumo_m_por_peca: e.target.value, _mManuallyEdited: true, _autoM: false }))} />
                {tecidoModal?._autoM && <p className="text-xs text-muted-foreground mt-1">Calculado pelo rendimento. Confirme com encaixe real.</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={!!tecidoModal?.fornecido_pelo_cliente}
                onCheckedChange={(c) => setTecidoModal((m: any) => ({ ...m, fornecido_pelo_cliente: !!c }))} />
              <Label>Fornecido pelo cliente</Label>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea rows={2} value={tecidoModal?.observacoes || ""} onChange={(e) => setTecidoModal((m: any) => ({ ...m, observacoes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTecidoModal(null)}>Cancelar</Button>
            <Button onClick={saveTecido}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== AVIAMENTO MODAL ===== */}
      <Dialog open={!!aviamentoModal} onOpenChange={(o) => !o && setAviamentoModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{aviamentoModal?.id ? "Editar Aviamento" : "Adicionar Aviamento"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Aviamento</Label>
              <Select value={aviamentoModal?.aviamento_id || ""} onValueChange={(v) => setAviamentoModal((m: any) => ({ ...m, aviamento_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {catAviamentos.map((a) => (<SelectItem key={a.id} value={a.id}>{a.nome} — {a.categoria}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantidade por peça</Label>
                <Input type="number" step="0.001" value={aviamentoModal?.quantidade_por_peca || ""}
                  onChange={(e) => setAviamentoModal((m: any) => ({ ...m, quantidade_por_peca: e.target.value }))} />
              </div>
              <div>
                <Label>Unidade</Label>
                <Input disabled value={catAviamentos.find((a) => a.id === aviamentoModal?.aviamento_id)?.unidade || ""} />
              </div>
            </div>
            <div><Label>Localização</Label><Input value={aviamentoModal?.localizacao || ""} onChange={(e) => setAviamentoModal((m: any) => ({ ...m, localizacao: e.target.value }))} /></div>
            <div><Label>Observações</Label><Textarea rows={2} value={aviamentoModal?.observacoes || ""} onChange={(e) => setAviamentoModal((m: any) => ({ ...m, observacoes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAviamentoModal(null)}>Cancelar</Button>
            <Button onClick={saveAviamento}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== MEDIDA MODAL ===== */}
      <Dialog open={!!medidaModal} onOpenChange={(o) => !o && setMedidaModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{medidaModal?.id ? "Editar Medida" : "Adicionar Medida"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome da medida</Label><Input value={medidaModal?.nome_medida || ""} onChange={(e) => setMedidaModal((m: any) => ({ ...m, nome_medida: e.target.value }))} placeholder="Ex: Busto" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tamanho base</Label><Input value={medidaModal?.tamanho_base || ""} onChange={(e) => setMedidaModal((m: any) => ({ ...m, tamanho_base: e.target.value }))} placeholder="Ex: M" /></div>
              <div><Label>Valor (cm)</Label><Input type="number" step="0.1" value={medidaModal?.valor_cm || ""} onChange={(e) => setMedidaModal((m: any) => ({ ...m, valor_cm: e.target.value }))} /></div>
            </div>
            <div><Label>Observações de gradação</Label><Textarea rows={2} value={medidaModal?.gradacao_obs || ""} onChange={(e) => setMedidaModal((m: any) => ({ ...m, gradacao_obs: e.target.value }))} placeholder="+4cm cintura por tamanho" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMedidaModal(null)}>Cancelar</Button>
            <Button onClick={saveMedida}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== CUSTOMIZACAO MODAL ===== */}
      <Dialog open={!!customModal} onOpenChange={(o) => !o && setCustomModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{customModal?.id ? "Editar Customização" : "Adicionar Customização"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tipo</Label>
              <Select value={customModal?.tipo || "bordado"} onValueChange={(v) => setCustomModal((m: any) => ({ ...m, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bordado">Bordado</SelectItem>
                  <SelectItem value="estampa">Estampa</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Descrição</Label><Input value={customModal?.descricao || ""} onChange={(e) => setCustomModal((m: any) => ({ ...m, descricao: e.target.value }))} /></div>
            <div><Label>Localização</Label><Input value={customModal?.localizacao || ""} onChange={(e) => setCustomModal((m: any) => ({ ...m, localizacao: e.target.value }))} placeholder="Ex: centro do cós" /></div>
            <div>
              <Label>Arte (imagem)</Label>
              <Input type="file" accept="image/png,image/jpeg" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && f.size > 10 * 1024 * 1024) return toast({ title: "Máx 10MB", variant: "destructive" });
                setCustomModal((m: any) => ({ ...m, arteFile: f }));
              }} />
              {customModal?.arte_url && <a href={customModal.arte_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">arte atual</a>}
            </div>
            <div><Label>Observações</Label><Textarea rows={2} value={customModal?.observacoes || ""} onChange={(e) => setCustomModal((m: any) => ({ ...m, observacoes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomModal(null)}>Cancelar</Button>
            <Button onClick={saveCustom}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Finalize confirm */}
      <Dialog open={finalizeOpen} onOpenChange={setFinalizeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Finalizar Ficha Técnica</DialogTitle></DialogHeader>
          <p className="text-sm">Ao finalizar, a Ficha Técnica não poderá ser editada sem reabertura. Confirmar?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinalizeOpen(false)}>Cancelar</Button>
            <Button onClick={finalizar}>Finalizar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
