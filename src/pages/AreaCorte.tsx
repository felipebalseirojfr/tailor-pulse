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
import { Scissors, ArrowUp, ArrowLeft, Loader2, Clock, Calendar as CalendarIcon, ChevronDown, History } from "lucide-react";
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
            <Scissors className="h-7 w-7 text-primary" /> Fila de Corte
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pedidos liberados para corte — do mais antigo para o mais recente
          </p>
        </div>
        <Badge variant="secondary" className="text-sm h-8 px-3">
          {pedidos.length} aguardando
        </Badge>
      </div>

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
