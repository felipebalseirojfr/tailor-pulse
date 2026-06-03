import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, ArrowUp, ArrowDown,
  PlayCircle, ListChecks, Upload, Printer, Trash2,
} from "lucide-react";
import {
  PILOTO_ETAPAS_DISPONIVEIS, labelEtapa, avancarEtapa, ETAPAS_COM_TERCEIRO,
} from "@/lib/piloto-etapas";

interface Referencia {
  id: string; codigo: string; cliente_id: string; tipo_peca_id: string;
  descricao: string | null; status: string; ativo: boolean;
  created_at: string; updated_at: string;
  prioridade_desenvolvimento?: number | null;
  prazo_termino?: string | null;
}
interface Cliente { id: string; nome: string; abreviacao_2_letras: string | null; }
interface TipoPeca { id: string; nome: string; abreviacao_2_letras: string; ativo: boolean; }
interface PilotoEtapa {
  id: string; referencia_id: string; tipo_etapa: string; ordem: number;
  status: string; terceiro_id: string | null; data_inicio: string | null;
}
interface Terceiro { id: string; nome: string; }

const STATUSES_ATIVOS = ["aguardando","em_desenvolvimento","piloto_em_producao","piloto_pronta","em_correcao"];

const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

export default function Desenvolvimento() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [refs, setRefs] = useState<Referencia[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tipos, setTipos] = useState<TipoPeca[]>([]);
  const [pilotoEtapas, setPilotoEtapas] = useState<PilotoEtapa[]>([]);
  const [terceiros, setTerceiros] = useState<Terceiro[]>([]);
  const [dxfByRef, setDxfByRef] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "acompanhamento";
  const setTab = (v: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", v);
    setSearchParams(next, { replace: false });
  };
  const [filtroEtapa, setFiltroEtapa] = useState<string | null>(null);
  const [clientesExpandidos, setClientesExpandidos] = useState<Set<string>>(new Set());

  // modal nova
  const [dialogOpen, setDialogOpen] = useState(false);
  const [novoCli, setNovoCli] = useState("");
  const [novoTipo, setNovoTipo] = useState("");
  const [modoAcomp, setModoAcomp] = useState<"marca" | "ref">("marca");
  const [novoDesc, setNovoDesc] = useState("");
  const [novoOrigem, setNovoOrigem] = useState("__none__");
  const [opcoesAvancadas, setOpcoesAvancadas] = useState(false);
  const [proximoSeq, setProximoSeq] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);

  const fetchAll = async () => {
    const [refRes, cliRes, tipoRes, dxfRes, etRes, tRes] = await Promise.all([
      (supabase.from("referencias") as any).select("*").order("prioridade_desenvolvimento", { ascending: true }).order("created_at", { ascending: true }),
      supabase.from("clientes").select("id, nome, abreviacao_2_letras").order("nome"),
      (supabase.from("tipos_peca") as any).select("*").eq("ativo", true).order("nome"),
      (supabase.from("modelagens_dxf") as any).select("referencia_id").eq("ativo", true),
      (supabase.from("piloto_etapas") as any).select("*").order("ordem", { ascending: true }),
      supabase.from("terceiros").select("id, nome"),
    ]);
    setRefs((refRes.data || []) as Referencia[]);
    setClientes((cliRes.data || []) as any);
    setTipos((tipoRes.data || []) as any);
    setDxfByRef(new Set(((dxfRes.data as any[]) || []).map((d) => d.referencia_id)));
    setPilotoEtapas((etRes.data || []) as PilotoEtapa[]);
    setTerceiros((tRes.data || []) as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const ch = supabase
      .channel("desenvolvimento-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "referencias" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "piloto_etapas" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "modelagens_dxf" }, () => fetchAll())
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

  const cliById = useMemo(() => new Map(clientes.map((c) => [c.id, c])), [clientes]);
  const tipoById = useMemo(() => new Map(tipos.map((t) => [t.id, t])), [tipos]);
  const tercById = useMemo(() => new Map(terceiros.map((t) => [t.id, t])), [terceiros]);

  const cliSel = clientes.find((c) => c.id === novoCli);
  const tipoSel = tipos.find((t) => t.id === novoTipo);
  const cliSemAbrev = cliSel && !cliSel.abreviacao_2_letras;
  const codigoPreview = cliSel?.abreviacao_2_letras && tipoSel && proximoSeq
    ? `${tipoSel.abreviacao_2_letras}.${cliSel.abreviacao_2_letras}.${String(proximoSeq).padStart(4, "0")}`
    : "—";

  const resetNovo = () => {
    setNovoCli(""); setNovoTipo(""); setNovoDesc(""); setNovoOrigem("__none__"); setOpcoesAvancadas(false); setProximoSeq(null);
  };

  const refsAtivasDev = refs.filter((r) => r.ativo && STATUSES_ATIVOS.includes(r.status));
  const etapasPorRef = useMemo(() => {
    const m = new Map<string, PilotoEtapa[]>();
    pilotoEtapas.forEach((e) => {
      const arr = m.get(e.referencia_id) || [];
      arr.push(e);
      m.set(e.referencia_id, arr);
    });
    return m;
  }, [pilotoEtapas]);

  const etapaAtualDe = (refId: string) =>
    (etapasPorRef.get(refId) || []).find((e) => e.status === "em_andamento") || null;

  // KPIs
  const kpiDev = refs.filter((r) => r.ativo && r.status === "em_desenvolvimento").length;
  const kpiPilProd = refs.filter((r) => r.ativo && r.status === "piloto_em_producao").length;
  const kpiPilPronta = refs.filter((r) => r.ativo && r.status === "piloto_pronta").length;
  const kpiSemDxf = refsAtivasDev.filter((r) => !dxfByRef.has(r.id)).length;

  // Pilotos por etapa: count refs whose current em_andamento stage = X
  const pilotosPorEtapa = useMemo(() => {
    const m: Record<string, number> = {};
    refsAtivasDev.forEach((r) => {
      const a = etapaAtualDe(r.id);
      if (a) m[a.tipo_etapa] = (m[a.tipo_etapa] || 0) + 1;
    });
    return m;
  }, [refsAtivasDev, etapasPorRef]);

  // Alerts
  const refsParadas = refsAtivasDev.filter((r) => daysSince(r.updated_at || r.created_at) > 5);
  const refsSemDxf = refsAtivasDev.filter((r) =>
    (r.status === "em_desenvolvimento" || r.status === "piloto_em_producao") && !dxfByRef.has(r.id)
  );

  // Acompanhamento filtered by current stage filter
  const refsAcomp = filtroEtapa
    ? refsAtivasDev.filter((r) => etapaAtualDe(r.id)?.tipo_etapa === filtroEtapa)
    : refsAtivasDev;

  const clientesComRefs = useMemo(() => {
    const map = new Map<string, Referencia[]>();
    refsAcomp.forEach((r) => {
      const arr = map.get(r.cliente_id) || [];
      arr.push(r);
      map.set(r.cliente_id, arr);
    });
    return Array.from(map.entries())
      .map(([cliId, rs]) => ({ cliente: cliById.get(cliId), refs: rs }))
      .filter((x) => x.cliente)
      .sort((a, b) => (a.cliente!.nome || "").localeCompare(b.cliente!.nome || ""));
  }, [refsAcomp, cliById]);

  const toggleCliente = (id: string) => {
    setClientesExpandidos((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const salvar = async () => {
    if (!novoCli || !novoTipo) return;
    if (cliSemAbrev) { toast({ title: "Cliente sem abreviação", variant: "destructive" }); return; }
    setSalvando(true);
    const { data: userData } = await supabase.auth.getUser();
    const payload = {
      cliente_id: novoCli, tipo_peca_id: novoTipo,
      descricao: novoDesc.trim() || null,
      modelagem_origem_id: novoOrigem === "__none__" ? null : novoOrigem,
      criado_por: userData?.user?.id || null,
      status: "rascunho", codigo: "XX.XX.0000", sequencial: 0,
    };
    const { data, error } = await (supabase.from("referencias") as any).insert([payload]).select().single();
    setSalvando(false);
    if (error) { toast({ title: "Erro ao criar", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Rascunho criado!", description: "Configure as etapas e clique em Salvar para publicar." });
    setDialogOpen(false);
    resetNovo();
    navigate(`/cadastros/referencias/${(data as any).id}`);
  };

  const avancar = async (refId: string) => {
    const r = await avancarEtapa(refId);
    if (!r.ok) { toast({ title: "Não foi possível avançar", description: r.error, variant: "destructive" }); return; }
    toast({ title: r.lacrou ? "Piloto lacrada!" : "Etapa avançada" });
    fetchAll();
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const excluirRef = async (refId: string) => {
    setDeleting(true);
    const { error } = await (supabase.from("referencias") as any).update({ ativo: false }).eq("id", refId);
    setDeleting(false);
    setConfirmDeleteId(null);
    if (error) {
      toast({ title: "Erro ao excluir referência", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Referência excluída" });
    fetchAll();
  };

  // Filas helpers
  const refsEmEtapa = (etapa: string | string[]) => {
    const set = new Set(Array.isArray(etapa) ? etapa : [etapa]);
    return refsAtivasDev
      .map((r) => ({ r, a: etapaAtualDe(r.id) }))
      .filter((x) => x.a && set.has(x.a.tipo_etapa))
      .sort((a, b) => {
        const pa = a.r.prioridade_desenvolvimento ?? 0;
        const pb = b.r.prioridade_desenvolvimento ?? 0;
        if (pa !== pb) return pa - pb;
        return new Date(a.r.created_at).getTime() - new Date(b.r.created_at).getTime();
      });
  };

  const reordenar = async (refId: string, direcao: -1 | 1, filaEtapa: string) => {
    const fila = refsEmEtapa(filaEtapa);
    const idx = fila.findIndex((x) => x.r.id === refId);
    const novoIdx = idx + direcao;
    if (idx < 0 || novoIdx < 0 || novoIdx >= fila.length) return;
    const novaOrdem = [...fila];
    const [moved] = novaOrdem.splice(idx, 1);
    novaOrdem.splice(novoIdx, 0, moved);
    // optimistic
    setRefs((prev) => prev.map((r) => {
      const pos = novaOrdem.findIndex((x) => x.r.id === r.id);
      return pos >= 0 ? { ...r, prioridade_desenvolvimento: pos } : r;
    }));
    await Promise.all(novaOrdem.map((x, i) =>
      (supabase.from("referencias") as any).update({ prioridade_desenvolvimento: i }).eq("id", x.r.id)
    ));
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

      <Tabs value={tab} onValueChange={(v) => { setTab(v); if (v !== "acompanhamento") setFiltroEtapa(null); }}>
        <TabsList>
          <TabsTrigger value="painel">Painel</TabsTrigger>
          <TabsTrigger value="acompanhamento">Acompanhamento</TabsTrigger>
          <TabsTrigger value="filas">Filas</TabsTrigger>
        </TabsList>

        {/* PAINEL */}
        <TabsContent value="painel" className="space-y-6 mt-4">
          {loading ? <Spinner /> : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard label="Em Desenvolvimento" value={kpiDev} />
                <KpiCard label="Piloto em Produção" value={kpiPilProd} />
                <KpiCard label="Piloto Pronta" value={kpiPilPronta} />
                <KpiCard label="Sem DXF" value={kpiSemDxf} alerta={kpiSemDxf > 0} />
              </div>

              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ListChecks className="h-5 w-5" /> Pilotos por Etapa</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {PILOTO_ETAPAS_DISPONIVEIS.map((et) => (
                      <button
                        key={et}
                        onClick={() => { setFiltroEtapa(et); setTab("acompanhamento"); }}
                        className="text-left p-3 rounded-md border bg-card hover:border-primary/40 transition-all"
                      >
                        <div className="text-xs text-muted-foreground">{labelEtapa(et)}</div>
                        <div className="text-2xl font-bold">{pilotosPorEtapa[et] || 0}</div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-orange-500" /> Alertas</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Sem alteração há mais de 5 dias ({refsParadas.length})</h3>
                    {refsParadas.length === 0 ? <p className="text-xs text-muted-foreground">Nenhuma referência parada.</p> : (
                      <div className="space-y-1">
                        {refsParadas.map((r) => (
                          <div key={r.id} className="flex items-center justify-between text-sm border rounded p-2 cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/cadastros/referencias/${r.id}`)}>
                            <span><Badge variant="secondary" className="font-mono mr-2">{r.codigo}</Badge>{r.descricao || cliById.get(r.cliente_id)?.nome}</span>
                            <span className="text-xs text-muted-foreground">{daysSince(r.updated_at || r.created_at)} dias</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-2">Sem DXF ativo em desenvolvimento ({refsSemDxf.length})</h3>
                    {refsSemDxf.length === 0 ? <p className="text-xs text-muted-foreground">Todas com DXF.</p> : (
                      <div className="space-y-1">
                        {refsSemDxf.map((r) => (
                          <div key={r.id} className="flex items-center justify-between text-sm border border-orange-500/30 bg-orange-500/5 rounded p-2 cursor-pointer hover:bg-orange-500/10" onClick={() => navigate(`/cadastros/referencias/${r.id}`)}>
                            <span><Badge variant="secondary" className="font-mono mr-2">{r.codigo}</Badge>{r.descricao || cliById.get(r.cliente_id)?.nome}</span>
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ACOMPANHAMENTO */}
        <TabsContent value="acompanhamento" className="space-y-4 mt-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-semibold">
                Acompanhando {refsAcomp.length} {refsAcomp.length === 1 ? "referência" : "referências"}
              </h2>
              {filtroEtapa && (
                <Badge variant="outline" className="gap-2">
                  Filtro: {labelEtapa(filtroEtapa)}
                  <button onClick={() => setFiltroEtapa(null)} className="ml-1 hover:text-foreground">×</button>
                </Badge>
              )}
            </div>
            <div className="inline-flex rounded-md border bg-muted/30 p-0.5">
              <button
                onClick={() => setModoAcomp("marca")}
                className={`px-3 py-1 text-xs rounded-sm transition-colors ${modoAcomp === "marca" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
              >
                Por marca
              </button>
              <button
                onClick={() => setModoAcomp("ref")}
                className={`px-3 py-1 text-xs rounded-sm transition-colors ${modoAcomp === "ref" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
              >
                Por referência
              </button>
            </div>
          </div>

          {loading ? <Spinner /> : refsAcomp.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma referência em desenvolvimento.</p>
          ) : modoAcomp === "marca" ? (
            <div className="grid grid-cols-1 gap-3">
              {clientesComRefs.map(({ cliente, refs: clientRefs }) => {
                const expanded = clientesExpandidos.has(cliente!.id);
                const algumSemDxf = clientRefs.some((r) => !dxfByRef.has(r.id));
                const algumParado = clientRefs.some((r) => daysSince(r.updated_at) > 5);
                const alerta = algumSemDxf || algumParado;
                return (
                  <Card key={cliente!.id}>
                    <CardContent className="p-0">
                      <button onClick={() => toggleCliente(cliente!.id)} className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <div className="text-left">
                            <div className="font-bold uppercase">{cliente!.nome}</div>
                            <div className="text-xs text-muted-foreground">{clientRefs.length} refs em andamento</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {alerta && (
                            <Badge variant="outline" className="bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30 gap-1">
                              <AlertTriangle className="h-3 w-3" /> Atenção
                            </Badge>
                          )}
                          <span className="text-xs text-primary">Ver referências ›</span>
                        </div>
                      </button>
                      {expanded && (
                        <div className="border-t divide-y">
                          {clientRefs.map((r) => (
                            <RefRow
                              key={r.id} r={r}
                              etapas={etapasPorRef.get(r.id) || []}
                              dxfOk={dxfByRef.has(r.id)}
                              tercById={tercById}
                              onAvancar={() => avancar(r.id)}
                              onDetalhes={() => navigate(`/cadastros/referencias/${r.id}`)}
                              onExcluir={() => setConfirmDeleteId(r.id)}
                            />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0 divide-y">
                {refsAcomp
                  .slice()
                  .sort((a, b) => {
                    const ca = cliById.get(a.cliente_id)?.nome || "";
                    const cb = cliById.get(b.cliente_id)?.nome || "";
                    return ca.localeCompare(cb) || a.codigo.localeCompare(b.codigo);
                  })
                  .map((r) => (
                    <RefRow
                      key={r.id} r={r}
                      etapas={etapasPorRef.get(r.id) || []}
                      dxfOk={dxfByRef.has(r.id)}
                      tercById={tercById}
                      clienteNome={cliById.get(r.cliente_id)?.nome}
                      onAvancar={() => avancar(r.id)}
                      onDetalhes={() => navigate(`/cadastros/referencias/${r.id}`)}
                    />
                  ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>


        {/* FILAS */}
        <TabsContent value="filas" className="space-y-6 mt-4">
          {loading ? <Spinner /> : (
            <div className="space-y-6">
              {PILOTO_ETAPAS_DISPONIVEIS.map((etapa) => {
                const items = refsEmEtapa(etapa);
                const reordenavel = !ETAPAS_COM_TERCEIRO.has(etapa);
                return (
                  <FilaSection
                    key={etapa}
                    titulo={`Fila — ${labelEtapa(etapa)}`}
                    etapa={etapa}
                    items={items}
                    onReorder={(id, dir) => reordenar(id, dir, etapa)}
                    cliById={cliById}
                    dxfByRef={dxfByRef}
                    navigate={navigate}
                    tercById={tercById}
                    reordenavel={reordenavel}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

      </Tabs>

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

            <Collapsible open={opcoesAvancadas} onOpenChange={setOpcoesAvancadas}>
              <CollapsibleTrigger asChild>
                <button type="button" className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground">
                  {opcoesAvancadas ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  Opções avançadas
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-2">
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
              </CollapsibleContent>
            </Collapsible>

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
    </div>
  );
}

function Spinner() {
  return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
}

function KpiCard({ label, value, alerta }: { label: string; value: number; alerta?: boolean }) {
  return (
    <Card className={alerta ? "border-orange-500/40 bg-orange-500/5" : ""}>
      <CardContent className="p-4">
        <div className={`text-xs ${alerta ? "text-orange-700 dark:text-orange-400" : "text-muted-foreground"}`}>{label}</div>
        <div className={`text-3xl font-bold mt-1 ${alerta ? "text-orange-700 dark:text-orange-400" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function FilaSection({
  titulo, items, onReorder, cliById, dxfByRef, navigate, reordenavel, tercById,
}: {
  titulo: string; etapa: string;
  items: { r: Referencia; a: PilotoEtapa | null }[];
  onReorder: (id: string, dir: -1 | 1) => void;
  cliById: Map<string, Cliente | undefined>;
  dxfByRef: Set<string>;
  navigate: (p: string) => void;
  reordenavel?: boolean;
  tercById?: Map<string, Terceiro | undefined>;
}) {
  const handlePrint = () => {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    const rows = items.map(({ r, a }, idx) => {
      const dias = a?.data_inicio ? daysSince(a.data_inicio) : 0;
      const terc = tercById && a?.terceiro_id ? tercById.get(a.terceiro_id) : null;
      const cli = cliById.get(r.cliente_id)?.nome || "—";
      const dxf = dxfByRef.has(r.id) ? "OK" : "Sem DXF";
      const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
      return `<tr>
        <td>${idx + 1}</td>
        <td style="font-family:monospace">${esc(r.codigo)}</td>
        <td>${esc(cli)}</td>
        <td>${esc(r.descricao || "—")}</td>
        ${tercById ? `<td>${esc(terc?.nome || "—")}</td>` : ""}
        <td>${dias}d</td>
        <td>${dxf}</td>
        <td style="width:120px;border-bottom:1px solid #999">&nbsp;</td>
      </tr>`;
    }).join("");
    const data = new Date().toLocaleString("pt-BR");
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${titulo}</title>
      <style>
        @page { size: A4; margin: 14mm; }
        body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #111; font-size: 12px; }
        h1 { font-size: 16px; margin: 0 0 4px; }
        .meta { color: #666; font-size: 11px; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: left; vertical-align: top; }
        th { background: #f3f4f6; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
        tr { page-break-inside: avoid; }
        .empty { padding: 24px; text-align: center; color: #666; }
      </style></head><body>
      <h1>${titulo}</h1>
      <div class="meta">${items.length} ${items.length === 1 ? "referência" : "referências"} · Gerado em ${data}</div>
      ${items.length === 0 ? `<div class="empty">Nenhuma referência nesta fila.</div>` : `
      <table>
        <thead><tr>
          <th>#</th><th>Código</th><th>Cliente</th><th>Descrição</th>
          ${tercById ? "<th>Terceiro</th>" : ""}
          <th>Dias</th><th>DXF</th><th>Observação</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`}
      <script>window.onload=()=>{setTimeout(()=>window.print(),200)};</script>
      </body></html>`);
    win.document.close();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-lg">{titulo} ({items.length})</CardTitle>
        <Button size="sm" variant="outline" onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" /> Imprimir / PDF
        </Button>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma referência nesta fila.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr className="text-left">
                  <th className="p-2 w-10">#</th>
                  <th className="p-2">Código</th>
                  <th className="p-2">Cliente</th>
                  <th className="p-2">Descrição</th>
                  {tercById && <th className="p-2">Terceiro</th>}
                  <th className="p-2">Dias na etapa</th>
                  <th className="p-2">DXF</th>
                  {reordenavel && <th className="p-2 text-right">Reordenar</th>}
                </tr>
              </thead>
              <tbody>
                {items.map(({ r, a }, idx) => {
                  const dias = a?.data_inicio ? daysSince(a.data_inicio) : 0;
                  const terc = tercById && a?.terceiro_id ? tercById.get(a.terceiro_id) : null;
                  return (
                    <tr key={r.id} className="border-b hover:bg-muted/20 cursor-pointer" onClick={() => navigate(`/cadastros/referencias/${r.id}`)}>
                      <td className="p-2 text-muted-foreground">{idx + 1}</td>
                      <td className="p-2 font-mono text-xs">{r.codigo}</td>
                      <td className="p-2">{cliById.get(r.cliente_id)?.nome || "—"}</td>
                      <td className="p-2">{r.descricao || "—"}</td>
                      {tercById && <td className="p-2">{terc?.nome || <span className="text-muted-foreground">—</span>}</td>}
                      <td className="p-2 text-xs">{dias} {dias === 1 ? "dia" : "dias"}</td>
                      <td className="p-2">
                        {dxfByRef.has(r.id)
                          ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                          : <AlertTriangle className="h-4 w-4 text-orange-500" />}
                      </td>
                      {reordenavel && (
                        <td className="p-2 text-right">
                          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button size="icon" variant="ghost" className="h-7 w-7" disabled={idx === 0} onClick={() => onReorder(r.id, -1)}>
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" disabled={idx === items.length - 1} onClick={() => onReorder(r.id, 1)}>
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EtapasStepper({ etapas }: { etapas: PilotoEtapa[] }) {
  if (!etapas.length) {
    return <div className="text-xs text-muted-foreground italic">Etapas não configuradas</div>;
  }
  const ordenadas = etapas.slice().sort((a, b) => a.ordem - b.ordem);
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {ordenadas.map((e, idx) => {
        const isLast = idx === ordenadas.length - 1;
        const cls =
          e.status === "concluido"
            ? "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30"
            : e.status === "em_andamento"
            ? "bg-primary/15 text-primary border-primary/40 ring-1 ring-primary/30"
            : "bg-muted text-muted-foreground border-border";
        return (
          <div key={e.id} className="flex items-center gap-1">
            <span
              title={`${labelEtapa(e.tipo_etapa)} · ${e.status}`}
              className={`px-2 py-0.5 rounded-md border text-[10px] font-medium whitespace-nowrap ${cls}`}
            >
              {e.status === "concluido" && <CheckCircle2 className="inline h-2.5 w-2.5 mr-1" />}
              {labelEtapa(e.tipo_etapa)}
            </span>
            {!isLast && <span className="text-muted-foreground/50 text-[10px]">›</span>}
          </div>
        );
      })}
    </div>
  );
}

interface RefRowProps {
  r: Referencia;
  etapas: PilotoEtapa[];
  dxfOk: boolean;
  tercById: Map<string, Terceiro>;
  clienteNome?: string;
  onAvancar: () => void;
  onDetalhes: () => void;
  onExcluir?: () => void;
}

const CHECK_LABEL_POR_ETAPA: Record<string, string> = {
  desenvolvimento_modelagem: "DXF enviado?",
  plotagem_risco: "Risco plotado?",
  corte: "Peças cortadas?",
  costura: "Piloto costurada?",
  lavanderia: "Lavanderia concluída?",
  estamparia: "Estampa aplicada?",
  estamparia_bordado: "Estampa + bordado concluídos?",
  bordado: "Bordado aplicado?",
  caseado: "Caseado / botão feito?",
  acabamento: "Acabamento concluído?",
  lacre_piloto: "Piloto lacrada?",
};

function prazoInfo(r: Referencia): { dias: number; label: string; cls: string } | null {
  const base = r.prazo_termino || null;
  if (!base) return null;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const fim = new Date(base + "T00:00:00");
  const dias = Math.round((fim.getTime() - hoje.getTime()) / 86400000);
  if (dias < 0) {
    return { dias, label: `${Math.abs(dias)}d em atraso`, cls: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30" };
  }
  if (dias <= 5) {
    return { dias, label: `${dias}d restantes`, cls: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30" };
  }
  return { dias, label: `${dias}d restantes`, cls: "bg-muted text-muted-foreground border-border" };
}

function RefRow({ r, etapas, dxfOk, tercById, clienteNome, onAvancar, onDetalhes }: RefRowProps) {
  const { toast } = useToast();
  const atual = etapas.find((e) => e.status === "em_andamento");
  const concluidas = etapas.filter((e) => e.status === "concluido").length;
  const total = etapas.length;
  const progresso = total ? Math.round((concluidas / total) * 100) : 0;
  const bloqueado = atual?.tipo_etapa === "desenvolvimento_modelagem" && !dxfOk;
  const terc = atual?.terceiro_id ? tercById.get(atual.terceiro_id) : null;
  const checkLabel = atual ? (CHECK_LABEL_POR_ETAPA[atual.tipo_etapa] || `${labelEtapa(atual.tipo_etapa)} concluído?`) : null;
  const prazo = prazoInfo(r);
  const [uploading, setUploading] = useState(false);

  const handleUploadDxf = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".dxf")) {
      toast({ title: "Apenas arquivos .dxf", variant: "destructive" }); return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "Máximo 50MB", variant: "destructive" }); return;
    }
    setUploading(true);
    try {
      const path = `${r.id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("modelagens-dxf").upload(path, file);
      if (upErr) throw upErr;
      const { data: u } = await supabase.auth.getUser();
      const { error } = await (supabase.from("modelagens_dxf") as any).insert([{
        referencia_id: r.id,
        nome_arquivo: file.name,
        arquivo_url: path,
        tamanho_bytes: file.size,
        enviado_por: u?.user?.id || null,
      }]);
      if (error) throw error;
      toast({ title: "DXF enviado! Etapa avançada." });
      onAvancar();
    } catch (e: any) {
      toast({ title: "Erro ao enviar DXF", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-3 space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-3 items-start">
        <Badge variant="secondary" className="font-mono text-xs tracking-widest h-fit">{r.codigo}</Badge>
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{r.descricao || "—"}</span>
            {clienteNome && <span className="text-xs text-muted-foreground uppercase">· {clienteNome}</span>}
            {dxfOk
              ? <span className="text-green-600 flex items-center gap-1 text-xs"><CheckCircle2 className="h-3 w-3" /> DXF</span>
              : <span className="text-orange-600 flex items-center gap-1 text-xs"><AlertTriangle className="h-3 w-3" /> Sem DXF</span>}
            {prazo && (
              <span className={`px-2 py-0.5 rounded-md border text-[10px] font-medium ${prazo.cls}`}>
                {prazo.label}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {atual ? `Etapa atual: ${labelEtapa(atual.tipo_etapa)}${terc ? ` · ${terc.nome}` : ""}` : "Etapas não configuradas"}
            <span className="ml-2">· {concluidas}/{total} ({progresso}%)</span>
          </div>
          <Progress value={progresso} className="h-1.5" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {bloqueado ? (
            <label
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md border border-primary/40 bg-primary/5 text-xs cursor-pointer hover:bg-primary/10 transition-colors ${uploading ? "opacity-60 cursor-wait" : ""}`}
              title="Envie o .dxf — a etapa avança automaticamente"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>{uploading ? "Enviando..." : "Enviar DXF e avançar"}</span>
              <input
                type="file"
                accept=".dxf"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUploadDxf(f);
                  e.target.value = "";
                }}
              />
            </label>
          ) : atual && checkLabel ? (
            <label
              className="flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs cursor-pointer transition-colors hover:bg-muted/50"
              title="Marcar como concluído avança para a próxima etapa"
            >
              <input
                type="checkbox"
                checked={false}
                onChange={() => onAvancar()}
                className="h-4 w-4 rounded border-border cursor-pointer accent-primary"
              />
              <span>{checkLabel}</span>
            </label>
          ) : (
            <span className="text-xs text-muted-foreground italic">—</span>
          )}
          <Button size="sm" variant="outline" onClick={onDetalhes}>Detalhes ›</Button>
        </div>
      </div>
      <EtapasStepper etapas={etapas} />
    </div>
  );
}

