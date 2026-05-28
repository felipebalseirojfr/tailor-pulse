import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Scissors, ArrowUp, ArrowLeft, Loader2, Clock, Calendar as CalendarIcon, ChevronDown, History, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseLocalDate } from "@/lib/date-utils";

const ORDEM_TAMANHOS = ["1","2","4","6","8","10","12","14","PP","P","M","G","GG","XGG","XGG1","XGG2","XGG3"];

const sortTamanhos = (sizes: string[]) =>
  [...sizes].sort((a, b) => {
    const ia = ORDEM_TAMANHOS.indexOf(a);
    const ib = ORDEM_TAMANHOS.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

interface PedidoCorte {
  id: string;
  codigo_pedido: string | null;
  produto_modelo: string;
  cor_tecido: string | null;
  prazo_final: string;
  quantidade_total: number;
  grade_tamanhos: Record<string, number> | null;
  grade_corte_real: Record<string, number> | null;
  comentario_corte: string | null;
  corte_prioritario: boolean;
  cliente: { nome: string } | null;
  etapa_corte_inicio: string | null;
}

function diffDias(fromIso: string | null): number {
  if (!fromIso) return 0;
  const ms = Date.now() - new Date(fromIso).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

function formatBR(d: string | null) {
  if (!d) return "—";
  return parseLocalDate(d.slice(0, 10)).toLocaleDateString("pt-BR");
}

export default function AreaCorte() {
  const { pedidoId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasRole, hasAnyRole, loading: rolesLoading } = useUserRoles();

  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState<PedidoCorte[]>([]);

  const isAdmin = hasRole("admin");
  const allowed = hasAnyRole(["admin", "corte"]);

  useEffect(() => {
    if (!rolesLoading && !allowed) {
      toast({ title: "Acesso negado", variant: "destructive" });
      navigate("/");
    }
  }, [rolesLoading, allowed, navigate, toast]);

  const fetchData = async () => {
    setLoading(true);
    // 1. Buscar etapas em corte ativas (status pendente ou em_andamento)
    const { data: etapas, error: etapasErr } = await supabase
      .from("etapas_producao")
      .select("pedido_id, status, data_inicio, created_at")
      .eq("tipo_etapa", "corte")
      .eq("status", "em_andamento");

    if (etapasErr) {
      console.error(etapasErr);
      setLoading(false);
      return;
    }

    const pedidoIds = Array.from(new Set((etapas || []).map((e: any) => e.pedido_id)));
    if (pedidoIds.length === 0) {
      setPedidos([]);
      setLoading(false);
      return;
    }

    const { data: peds, error: pedErr } = await supabase
      .from("pedidos")
      .select("id, codigo_pedido, produto_modelo, cor_tecido, prazo_final, quantidade_total, grade_tamanhos, grade_corte_real, comentario_corte, corte_prioritario, cliente:clientes(nome)")
      .in("id", pedidoIds);

    if (pedErr) {
      console.error(pedErr);
      setLoading(false);
      return;
    }

    const etapaByPedido: Record<string, any> = {};
    for (const e of etapas || []) etapaByPedido[(e as any).pedido_id] = e;

    const list: PedidoCorte[] = (peds || []).map((p: any) => ({
      ...p,
      etapa_corte_inicio: etapaByPedido[p.id]?.data_inicio || etapaByPedido[p.id]?.created_at || null,
    }));

    // Ordenação: prioritários primeiro, depois por data de entrada (mais antigo primeiro)
    list.sort((a, b) => {
      if (a.corte_prioritario !== b.corte_prioritario) return a.corte_prioritario ? -1 : 1;
      const ta = a.etapa_corte_inicio ? new Date(a.etapa_corte_inicio).getTime() : Infinity;
      const tb = b.etapa_corte_inicio ? new Date(b.etapa_corte_inicio).getTime() : Infinity;
      return ta - tb;
    });

    setPedidos(list);
    setLoading(false);
  };

  useEffect(() => {
    if (rolesLoading || !allowed) return;
    fetchData();
    const ch = supabase
      .channel("area-corte-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "etapas_producao" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolesLoading, allowed]);

  const togglePrioridade = async (p: PedidoCorte) => {
    const { error } = await supabase
      .from("pedidos")
      .update({ corte_prioritario: !p.corte_prioritario })
      .eq("id", p.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  // Se a URL traz um pedidoId, renderiza tela de execução
  if (pedidoId) {
    return <ExecucaoCorte pedidoId={pedidoId} onDone={() => navigate("/area-corte")} />;
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <Scissors className="h-7 w-7 text-primary" /> Área de Corte
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie a fila de corte e consulte o histórico
          </p>
        </div>
      </div>

      <Tabs defaultValue="fila" className="w-full">
        <TabsList>
          <TabsTrigger value="fila" className="gap-2">
            <Scissors className="h-4 w-4" /> Fila de Corte
            <Badge variant="secondary" className="ml-1 h-5 px-2 text-xs">{pedidos.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2">
            <History className="h-4 w-4" /> Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fila" className="mt-4">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72" />)}
            </div>
          ) : pedidos.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Nenhum pedido na fila de corte no momento.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pedidos.map((p) => {
                const dias = diffDias(p.etapa_corte_inicio);
                const grade = p.grade_tamanhos || {};
                const tamanhos = sortTamanhos(Object.keys(grade).filter((k) => Number(grade[k]) > 0));
                return (
                  <Card
                    key={p.id}
                    className={cn(
                      "transition-all flex flex-col",
                      p.corte_prioritario && "border-orange-500 border-2 bg-orange-500/5"
                    )}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate">{p.produto_modelo}</CardTitle>
                          {p.codigo_pedido && (
                            <p className="text-xs text-muted-foreground mt-0.5">Ref: {p.codigo_pedido}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {p.corte_prioritario && (
                            <Badge className="bg-orange-500 text-white hover:bg-orange-500">PRIORITÁRIO</Badge>
                          )}
                          {isAdmin && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className={cn("h-7 w-7", p.corte_prioritario && "text-orange-500")}
                              onClick={() => togglePrioridade(p)}
                              title={p.corte_prioritario ? "Remover prioridade" : "Marcar como prioritário"}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-3 text-sm">
                      <div className="space-y-1">
                        <p><span className="text-muted-foreground">Cliente:</span> {p.cliente?.nome || "—"}</p>
                        {p.cor_tecido && (
                          <p><span className="text-muted-foreground">Cor:</span> {p.cor_tecido}</p>
                        )}
                        <p className="flex items-center gap-1.5 text-muted-foreground">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          Entrou em corte: <span className="text-foreground">{formatBR(p.etapa_corte_inicio)}</span>
                          <span className="inline-flex items-center gap-1 ml-2">
                            <Clock className="h-3.5 w-3.5" />
                            {dias === 0 ? "hoje" : `há ${dias} dia${dias > 1 ? "s" : ""}`}
                          </span>
                        </p>
                      </div>

                      {tamanhos.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Grade esperada</p>
                          <div className="flex flex-wrap gap-1">
                            {tamanhos.map((t) => (
                              <span key={t} className="px-2 py-0.5 rounded-md border border-border bg-muted/40 text-xs">
                                <span className="font-medium">{t}</span>: {grade[t]}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="text-sm">
                        <span className="text-muted-foreground">Total:</span>{" "}
                        <span className="font-semibold">{p.quantidade_total} peças</span>
                      </p>

                      <Button
                        className="mt-auto w-full"
                        onClick={() => navigate(`/area-corte/${p.id}`)}
                      >
                        <Scissors className="h-4 w-4 mr-2" />
                        Abrir para Cortar
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <HistoricoCorte />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =================== EXECUÇÃO ===================

function ExecucaoCorte({ pedidoId, onDone }: { pedidoId: string; onDone: () => void }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pedido, setPedido] = useState<PedidoCorte | null>(null);
  const [grid, setGrid] = useState<Record<string, string>>({});
  const [comentario, setComentario] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pedidos")
      .select("id, codigo_pedido, produto_modelo, cor_tecido, prazo_final, quantidade_total, grade_tamanhos, grade_corte_real, comentario_corte, corte_prioritario, cliente:clientes(nome)")
      .eq("id", pedidoId)
      .single();
    if (error || !data) {
      toast({ title: "Erro ao carregar pedido", variant: "destructive" });
      onDone();
      return;
    }
    const p: PedidoCorte = { ...(data as any), etapa_corte_inicio: null };
    setPedido(p);
    const real = (p.grade_corte_real || {}) as Record<string, number>;
    const esperada = (p.grade_tamanhos || {}) as Record<string, number>;
    const tamanhos = sortTamanhos(Object.keys(esperada).filter((k) => Number(esperada[k]) > 0));
    const initial: Record<string, string> = {};
    for (const t of tamanhos) {
      initial[t] = real[t] !== undefined && real[t] !== null ? String(real[t]) : "";
    }
    setGrid(initial);
    setComentario(p.comentario_corte || "");
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pedidoId]);

  const tamanhos = useMemo(() => {
    if (!pedido) return [];
    const esperada = (pedido.grade_tamanhos || {}) as Record<string, number>;
    return sortTamanhos(Object.keys(esperada).filter((k) => Number(esperada[k]) > 0));
  }, [pedido]);

  const totals = useMemo(() => {
    let esperado = 0, real = 0;
    if (!pedido) return { esperado, real, diff: 0 };
    const e = (pedido.grade_tamanhos || {}) as Record<string, number>;
    for (const t of tamanhos) {
      esperado += Number(e[t] || 0);
      const v = grid[t];
      if (v !== "" && v !== undefined) real += Number(v) || 0;
    }
    return { esperado, real, diff: real - esperado };
  }, [grid, tamanhos, pedido]);

  const allFilled = tamanhos.length > 0 && tamanhos.every((t) => grid[t] !== "" && grid[t] !== undefined);

  const buildPayload = () => {
    const real: Record<string, number> = {};
    for (const t of tamanhos) {
      if (grid[t] !== "" && grid[t] !== undefined) real[t] = Number(grid[t]) || 0;
    }
    return real;
  };

  const handleSalvar = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("pedidos")
      .update({ grade_corte_real: buildPayload(), comentario_corte: comentario || null })
      .eq("id", pedidoId);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Progresso salvo" });
  };

  const handleConcluir = async () => {
    if (!allFilled || !pedido) return;
    setSaving(true);
    try {
      // 1. Salvar grade real + comentário
      const { error: pedErr } = await supabase
        .from("pedidos")
        .update({ grade_corte_real: buildPayload(), comentario_corte: comentario || null })
        .eq("id", pedidoId);
      if (pedErr) throw pedErr;

      // 2. Buscar etapas para avançar
      const { data: etapas, error: etErr } = await supabase
        .from("etapas_producao")
        .select("id, ordem, tipo_etapa, status")
        .eq("pedido_id", pedidoId)
        .order("ordem", { ascending: true });
      if (etErr) throw etErr;

      const ordenadas = etapas || [];
      const corteEtapa = ordenadas.find((e: any) => e.tipo_etapa === "corte" && e.status !== "concluido");
      if (!corteEtapa) {
        toast({ title: "Etapa de corte não encontrada", variant: "destructive" });
        setSaving(false);
        return;
      }

      // Concluir a etapa de corte (a próxima etapa permanece "pendente"
      // — aguardando o PCP definir prazo/oficina antes de iniciar)
      const { error: concErr } = await supabase
        .from("etapas_producao")
        .update({ status: "concluido", data_termino: new Date().toISOString() })
        .eq("id", corteEtapa.id);
      if (concErr) throw concErr;

      toast({
        title: "Corte concluído!",
        description: "Pedido enviado para a fila aguardando liberação do PCP.",
      });
      onDone();
    } catch (err: any) {
      toast({ title: "Erro ao concluir", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !pedido) {
    return (
      <div className="p-4 lg:p-8 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/area-corte")} className="mb-2 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <h1 className="text-2xl font-bold">{pedido.produto_modelo}</h1>
          <p className="text-sm text-muted-foreground">
            {pedido.codigo_pedido && <>Ref: {pedido.codigo_pedido} · </>}
            Cliente: {pedido.cliente?.nome || "—"}
            {pedido.cor_tecido && <> · Cor: {pedido.cor_tecido}</>}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Prazo de entrega: <span className="text-foreground font-medium">{formatBR(pedido.prazo_final)}</span>
          </p>
        </div>
        {pedido.corte_prioritario && (
          <Badge className="bg-orange-500 text-white hover:bg-orange-500">PRIORITÁRIO</Badge>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Grade do Corte</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 px-2 font-medium">Tamanho</th>
                  <th className="text-right py-2 px-2 font-medium">Grade Esperada</th>
                  <th className="text-right py-2 px-2 font-medium">Grade Real</th>
                  <th className="text-right py-2 px-2 font-medium">Diferença</th>
                </tr>
              </thead>
              <tbody>
                {tamanhos.map((t) => {
                  const esperada = Number((pedido.grade_tamanhos || {})[t] || 0);
                  const realStr = grid[t];
                  const realFilled = realStr !== "" && realStr !== undefined;
                  const realNum = realFilled ? Number(realStr) || 0 : null;
                  const diff = realNum === null ? null : realNum - esperada;
                  return (
                    <tr key={t} className="border-b border-border/60">
                      <td className="py-2 px-2 font-medium">{t}</td>
                      <td className="py-2 px-2 text-right">{esperada}</td>
                      <td className="py-2 px-2 text-right">
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={realStr ?? ""}
                          onChange={(e) => setGrid((g) => ({ ...g, [t]: e.target.value }))}
                          className="h-8 w-24 ml-auto text-right"
                        />
                      </td>
                      <td className={cn(
                        "py-2 px-2 text-right font-medium",
                        diff === null ? "text-muted-foreground" :
                        diff === 0 ? "text-muted-foreground" :
                        diff > 0 ? "text-blue-500" : "text-destructive"
                      )}>
                        {diff === null ? "—" : diff === 0 ? "0" : diff > 0 ? `+${diff}` : `${diff}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-semibold">
                  <td className="py-2 px-2">Total</td>
                  <td className="py-2 px-2 text-right">{totals.esperado}</td>
                  <td className="py-2 px-2 text-right">{totals.real}</td>
                  <td className={cn(
                    "py-2 px-2 text-right",
                    totals.diff === 0 ? "text-muted-foreground" :
                    totals.diff > 0 ? "text-blue-500" : "text-destructive"
                  )}>
                    {totals.diff === 0 ? "0" : totals.diff > 0 ? `+${totals.diff}` : `${totals.diff}`}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <label className="text-sm font-medium">Comentários</label>
        <Textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Observações sobre o corte — ocorrências, divergências, informações relevantes"
          rows={4}
        />
      </div>

      <div className="flex flex-wrap gap-3 justify-end sticky bottom-0 bg-background/95 backdrop-blur py-3 -mx-4 px-4 lg:-mx-8 lg:px-8 border-t border-border">
        <Button variant="outline" onClick={handleSalvar} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Salvar Progresso
        </Button>
        <Button onClick={handleConcluir} disabled={!allFilled || saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Scissors className="h-4 w-4 mr-2" />}
          Concluir Corte
        </Button>
      </div>
    </div>
  );
}

// =================== HISTÓRICO ===================

interface HistoricoItem {
  id: string;
  codigo_pedido: string | null;
  codigo_produto_cliente: string | null;
  produto_modelo: string;
  cliente_nome: string;
  grade_tamanhos: Record<string, number> | null;
  grade_corte_real: Record<string, number> | null;
  comentario_corte: string | null;
  data_inicio: string | null;
  data_termino: string;
}

function gradeToString(grade: Record<string, number> | null | undefined): string {
  if (!grade) return "—";
  const tamanhos = sortTamanhos(Object.keys(grade).filter((k) => Number(grade[k]) > 0));
  if (tamanhos.length === 0) return "—";
  return tamanhos.map((t) => `${t}:${grade[t]}`).join(" ");
}

function sumGrade(grade: Record<string, number> | null | undefined): number {
  if (!grade) return 0;
  return Object.values(grade).reduce((a, b) => a + (Number(b) || 0), 0);
}

function diasEntre(inicio: string | null, fim: string): number {
  if (!inicio) return 0;
  const ms = new Date(fim).getTime() - new Date(inicio).getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

function HistoricoCorte() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<HistoricoItem[]>([]);
  const [clienteFiltro, setClienteFiltro] = useState<string>("__all__");
  const [mesFiltro, setMesFiltro] = useState<string>("__all__");
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    const { data: etapas, error: etErr } = await supabase
      .from("etapas_producao")
      .select("pedido_id, data_inicio, data_termino, created_at")
      .eq("tipo_etapa", "corte")
      .eq("status", "concluido")
      .not("data_termino", "is", null)
      .order("data_termino", { ascending: false });
    if (etErr) { console.error(etErr); setLoading(false); return; }

    const pedidoIds = Array.from(new Set((etapas || []).map((e: any) => e.pedido_id)));
    if (pedidoIds.length === 0) { setItems([]); setLoading(false); return; }

    const { data: peds, error: pErr } = await supabase
      .from("pedidos")
      .select("id, codigo_pedido, codigo_produto_cliente, produto_modelo, grade_tamanhos, grade_corte_real, comentario_corte, cliente:clientes(nome)")
      .in("id", pedidoIds)
      .not("grade_corte_real", "is", null);
    if (pErr) { console.error(pErr); setLoading(false); return; }

    const pedMap: Record<string, any> = {};
    for (const p of peds || []) pedMap[(p as any).id] = p;

    const list: HistoricoItem[] = [];
    for (const e of etapas || []) {
      const p = pedMap[(e as any).pedido_id];
      if (!p) continue;
      list.push({
        id: p.id,
        codigo_pedido: p.codigo_pedido,
        codigo_produto_cliente: p.codigo_produto_cliente,
        produto_modelo: p.produto_modelo,
        cliente_nome: p.cliente?.nome || "—",
        grade_tamanhos: p.grade_tamanhos,
        grade_corte_real: p.grade_corte_real,
        comentario_corte: p.comentario_corte,
        data_inicio: (e as any).data_inicio || (e as any).created_at,
        data_termino: (e as any).data_termino,
      });
    }
    setItems(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("area-corte-historico")
      .on("postgres_changes", { event: "*", schema: "public", table: "etapas_producao" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const clientes = useMemo(() => {
    const set = new Set(items.map((i) => i.cliente_nome));
    return Array.from(set).sort();
  }, [items]);

  const meses = useMemo(() => {
    const set = new Set(items.map((i) => i.data_termino.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [items]);

  const filtrados = useMemo(() => {
    return items.filter((i) => {
      if (clienteFiltro !== "__all__" && i.cliente_nome !== clienteFiltro) return false;
      if (mesFiltro !== "__all__" && i.data_termino.slice(0, 7) !== mesFiltro) return false;
      return true;
    });
  }, [items, clienteFiltro, mesFiltro]);

  const grupos = useMemo(() => {
    const map: Record<string, HistoricoItem[]> = {};
    for (const i of filtrados) {
      const key = i.data_termino.slice(0, 7);
      if (!map[key]) map[key] = [];
      map[key].push(i);
    }
    const keys = Object.keys(map).sort().reverse();
    return keys.map((k) => ({ key: k, items: map[k] }));
  }, [filtrados]);

  const mesAtual = new Date().toISOString().slice(0, 7);

  const isExpanded = (key: string) => {
    if (expandidos[key] !== undefined) return expandidos[key];
    return key === mesAtual;
  };

  const toggle = (key: string) => setExpandidos((s) => ({ ...s, [key]: !isExpanded(key) }));

  const formatMes = (yyyymm: string) => {
    const [y, m] = yyyymm.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    const nome = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return nome.charAt(0).toUpperCase() + nome.slice(1);
  };

  if (loading) {
    return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={clienteFiltro} onValueChange={setClienteFiltro}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Todos os clientes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os clientes</SelectItem>
              {clientes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={mesFiltro} onValueChange={setMesFiltro}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Todos os meses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os meses</SelectItem>
              {meses.map((m) => <SelectItem key={m} value={m}>{formatMes(m)}</SelectItem>)}
            </SelectContent>
          </Select>
          {(clienteFiltro !== "__all__" || mesFiltro !== "__all__") && (
            <Button variant="ghost" size="sm" onClick={() => { setClienteFiltro("__all__"); setMesFiltro("__all__"); }}>
              Limpar filtros
            </Button>
          )}
          <span className="text-sm text-muted-foreground ml-auto">{filtrados.length} cortes</span>
        </div>

        {grupos.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Nenhum corte registrado ainda.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {grupos.map(({ key, items: grupoItems }) => {
              const totalEsperado = grupoItems.reduce((acc, i) => acc + sumGrade(i.grade_tamanhos), 0);
              const totalReal = grupoItems.reduce((acc, i) => acc + sumGrade(i.grade_corte_real), 0);
              const diffMes = totalReal - totalEsperado;
              const open = isExpanded(key);
              return (
                <Collapsible key={key} open={open} onOpenChange={() => toggle(key)}>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left">
                        <div className="flex items-center gap-2">
                          <ChevronDown className={cn("h-4 w-4 transition-transform", !open && "-rotate-90")} />
                          <span className="font-semibold">{formatMes(key)}</span>
                          <Badge variant="secondary">{grupoItems.length} corte{grupoItems.length > 1 ? "s" : ""}</Badge>
                        </div>
                        <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
                          <span>Esperado: <span className="text-foreground font-medium">{totalEsperado}</span></span>
                          <span>Real: <span className="text-foreground font-medium">{totalReal}</span></span>
                          <span className={cn(
                            "font-medium",
                            diffMes === 0 ? "text-muted-foreground" : diffMes > 0 ? "text-blue-500" : "text-destructive"
                          )}>
                            {diffMes === 0 ? "0" : diffMes > 0 ? `+${diffMes}` : `${diffMes}`}
                          </span>
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="overflow-x-auto border-t-2 border-blue-500/40">
                        <table className="w-full text-xs border-separate border-spacing-0">
                          <thead className="bg-blue-500/10 text-muted-foreground">
                            <tr>
                              <th className="text-left px-3 py-2 font-semibold border-b-2 border-blue-500/40">Produto</th>
                              <th className="text-left px-3 py-2 font-semibold border-b-2 border-blue-500/40 whitespace-nowrap">Nº OP</th>
                              <th className="text-left px-3 py-2 font-semibold border-b-2 border-blue-500/40">Cliente</th>
                              <th className="text-left px-3 py-2 font-semibold border-b-2 border-blue-500/40">Referência</th>
                              <th className="text-left px-3 py-2 font-semibold border-b-2 border-blue-500/40 whitespace-nowrap">Início</th>
                              <th className="text-left px-3 py-2 font-semibold border-b-2 border-blue-500/40 whitespace-nowrap">Conclusão</th>
                              
                              <th className="text-left px-3 py-2 font-semibold border-b-2 border-blue-500/40">Grade Esperada / Cortada</th>
                              <th className="text-left px-3 py-2 font-semibold border-b-2 border-blue-500/40">Diferença por Tamanho</th>
                              <th className="text-right px-3 py-2 font-semibold border-b-2 border-blue-500/40 whitespace-nowrap">Total Dif.</th>
                              <th className="text-center px-3 py-2 font-semibold border-b-2 border-blue-500/40">Coment.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {grupoItems.map((i, idx) => {
                              const esp = sumGrade(i.grade_tamanhos);
                              const real = sumGrade(i.grade_corte_real);
                              const diff = real - esp;
                              const dias = diasEntre(i.data_inicio, i.data_termino);
                              const com = i.comentario_corte || "";
                              const espGrade = i.grade_tamanhos || {};
                              const realGrade = i.grade_corte_real || {};
                              const tamanhos = sortTamanhos(
                                Array.from(new Set([
                                  ...Object.keys(espGrade).filter((k) => Number(espGrade[k]) > 0),
                                  ...Object.keys(realGrade).filter((k) => Number(realGrade[k]) > 0),
                                ]))
                              );
                              return (
                                <tr
                                  key={i.id + i.data_termino}
                                  className={cn(idx % 2 === 1 && "bg-muted/30")}
                                >
                                  <td className="px-3 py-3 font-medium border-b-2 border-blue-500/20">{i.produto_modelo}</td>
                                  <td className="px-3 py-3 font-mono whitespace-nowrap border-b-2 border-blue-500/20">{i.codigo_pedido || "—"}</td>
                                  <td className="px-3 py-3 border-b-2 border-blue-500/20">{i.cliente_nome}</td>
                                  <td className="px-3 py-3 border-b-2 border-blue-500/20">{i.codigo_produto_cliente || "—"}</td>
                                  <td className="px-3 py-3 whitespace-nowrap border-b-2 border-blue-500/20">{formatBR(i.data_inicio)}</td>
                                  <td className="px-3 py-3 whitespace-nowrap border-b-2 border-blue-500/20">{formatBR(i.data_termino)}</td>
                                  <td className="px-3 py-3 border-b-2 border-blue-500/20">
                                    {tamanhos.length === 0 ? (
                                      <span className="text-muted-foreground">—</span>
                                    ) : (
                                      <div
                                        className="inline-grid gap-x-2 gap-y-0.5 font-mono text-[11px] items-center"
                                        style={{ gridTemplateColumns: `auto repeat(${tamanhos.length}, minmax(1.75rem, auto))` }}
                                      >
                                        <div className="border-b border-blue-500/30 pb-0.5" />
                                        {tamanhos.map((t) => (
                                          <div key={`h-${t}`} className="text-center font-semibold text-muted-foreground border-b border-blue-500/30 pb-0.5">{t}</div>
                                        ))}
                                        <div className="text-right pr-2 text-muted-foreground uppercase text-[10px] tracking-wide">Esperada</div>
                                        {tamanhos.map((t) => (
                                          <div key={`e-${t}`} className="text-center text-muted-foreground">{Number(espGrade[t] || 0)}</div>
                                        ))}
                                        <div className="text-right pr-2 font-semibold uppercase text-[10px] tracking-wide">Cortada</div>
                                        {tamanhos.map((t) => (
                                          <div key={`r-${t}`} className="text-center font-semibold">{Number(realGrade[t] || 0)}</div>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-3 py-3 border-b-2 border-blue-500/20">
                                    {tamanhos.length === 0 ? (
                                      <span className="text-muted-foreground">—</span>
                                    ) : (
                                      <div
                                        className="inline-grid gap-x-2 gap-y-0.5 font-mono text-[11px]"
                                        style={{ gridTemplateColumns: `repeat(${tamanhos.length}, minmax(2rem, auto))` }}
                                      >
                                        {tamanhos.map((t) => (
                                          <div key={`dh-${t}`} className="text-center font-semibold text-muted-foreground border-b border-blue-500/30 pb-0.5">{t}</div>
                                        ))}
                                        {tamanhos.map((t) => {
                                          const d = Number(realGrade[t] || 0) - Number(espGrade[t] || 0);
                                          return (
                                            <div
                                              key={`d-${t}`}
                                              className={cn(
                                                "text-center font-semibold",
                                                d === 0 ? "text-muted-foreground" : d > 0 ? "text-blue-500" : "text-destructive"
                                              )}
                                            >
                                              {d === 0 ? "0" : d > 0 ? `+${d}` : `${d}`}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </td>
                                  <td className={cn(
                                    "px-3 py-3 text-right font-bold whitespace-nowrap border-b-2 border-blue-500/20",
                                    diff === 0 ? "text-muted-foreground" : diff > 0 ? "text-blue-500" : "text-destructive"
                                  )}>
                                    {diff === 0 ? "0" : diff > 0 ? `+${diff}` : `${diff}`}
                                  </td>
                                  <td className="px-3 py-3 text-center border-b-2 border-blue-500/20">
                                    {com ? (
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button size="sm" variant="outline" className="h-7 px-2 gap-1">
                                            <MessageSquare className="h-3.5 w-3.5" />
                                            <span className="text-xs">Ver</span>
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                          <DialogHeader>
                                            <DialogTitle>Comentário do corte</DialogTitle>
                                          </DialogHeader>
                                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{com}</p>
                                          <div className="text-xs text-muted-foreground border-t border-border pt-2 mt-2">
                                            {i.produto_modelo} · {i.codigo_pedido || "—"} · {i.cliente_nome}
                                          </div>
                                        </DialogContent>
                                      </Dialog>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-blue-500/10 font-semibold">
                            <tr>
                              <td className="px-3 py-2 border-t-2 border-blue-500/40" colSpan={6}>
                                Totais do mês — {grupoItems.length} OPs
                              </td>
                              <td className="px-3 py-2 border-t-2 border-blue-500/40 text-muted-foreground">
                                Esperado: <span className="text-foreground">{totalEsperado}</span> · Cortado: <span className="text-foreground">{totalReal}</span>
                              </td>
                              <td className="px-3 py-2 border-t-2 border-blue-500/40"></td>
                              <td className={cn(
                                "px-3 py-2 text-right border-t-2 border-blue-500/40",
                                diffMes === 0 ? "text-muted-foreground" : diffMes > 0 ? "text-blue-500" : "text-destructive"
                              )}>
                                {diffMes === 0 ? "0" : diffMes > 0 ? `+${diffMes}` : `${diffMes}`}
                              </td>
                              <td className="px-3 py-2 border-t-2 border-blue-500/40"></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
