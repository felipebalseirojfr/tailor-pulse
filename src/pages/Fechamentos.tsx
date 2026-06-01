import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Search, ClipboardList, FileCheck2, PackageCheck } from "lucide-react";
import { FechamentoSheet, FechamentoRow, FechamentoFase, getFechamentoFase } from "@/components/fechamentos/FechamentoSheet";
import { parseLocalDate } from "@/lib/date-utils";

const monthOptions = (() => {
  const arr: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = -2; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    arr.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
    });
  }
  return arr;
})();

type Row = FechamentoRow & { created_at?: string };

export default function Fechamentos() {
  const [rows, setRows] = useState<FechamentoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState<string>(monthOptions[2].value);
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [clienteFilter, setClienteFilter] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [selected, setSelected] = useState<FechamentoRow | null>(null);
  const [selectedFase, setSelectedFase] = useState<FechamentoFase>("revisao");
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = async () => {
    setLoading(true);

    // Apenas pedidos atualmente em acabamento (em_andamento) devem aparecer
    const { data: etapasAtivas } = await supabase
      .from("etapas_producao")
      .select("pedido_id")
      .eq("tipo_etapa", "acabamento")
      .eq("status", "em_andamento");
    const pedidosAtivos = new Set((etapasAtivas ?? []).map((e: any) => e.pedido_id));

    const { data, error } = await supabase
      .from("fechamentos")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setLoading(false);
      return;
    }

    const fechamentoRows = ((data ?? []) as any[]).filter((r) => pedidosAtivos.has(r.pedido_id));
    const pedidoIds = [...new Set(fechamentoRows.map((r) => r.pedido_id).filter(Boolean))];
    const clienteIds = [...new Set(fechamentoRows.map((r) => r.cliente_id).filter(Boolean))];

    const pedidosRes = pedidoIds.length
      ? await supabase.from("pedidos").select("id, codigo_pedido, produto_modelo, tipo_peca, cliente_id").in("id", pedidoIds)
      : { data: [] as any[] };

    const pedidosMap = new Map((pedidosRes.data ?? []).map((p: any) => [p.id, p]));
    const clienteIdsAll = [...new Set([
      ...clienteIds,
      ...((pedidosRes.data ?? []).map((p: any) => p.cliente_id).filter(Boolean)),
    ])];
    const clientesRes = clienteIdsAll.length
      ? await supabase.from("clientes").select("id, nome").in("id", clienteIdsAll)
      : { data: [] as any[] };
    const clientesMap = new Map((clientesRes.data ?? []).map((c: any) => [c.id, c]));

    const mapped: FechamentoRow[] = fechamentoRows.map((r) => {
      const pedido = pedidosMap.get(r.pedido_id);
      const cliId = pedido?.cliente_id ?? r.cliente_id;
      return {
        ...r,
        cliente_id: cliId,
        cliente_nome: clientesMap.get(cliId)?.nome,
        pedido_codigo: pedido?.codigo_pedido,
        produto_modelo: pedido?.produto_modelo || pedido?.tipo_peca,
        referencia_codigo: undefined,
      };
    });
    setRows(mapped);
    setLoading(false);
  };

  useEffect(() => {
    load();
    supabase.from("clientes").select("id, nome").order("nome").then(({ data }) => {
      if (data) setClientes(data);
    });

    const ch = supabase
      .channel("fechamentos-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "fechamentos" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const ref = parseLocalDate(r.data_fechamento) ?? parseLocalDate((r as Row).created_at as any);
      if (ref) {
        const key = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`;
        if (key !== mes) return false;
      }
      if (statusFilter !== "todos" && r.status_nf !== statusFilter) return false;
      if (clienteFilter !== "todos" && r.cliente_id !== clienteFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!(r.pedido_codigo?.toLowerCase().includes(q) || r.referencia_codigo?.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [rows, mes, statusFilter, clienteFilter, search]);

  const summary = useMemo(() => {
    const totEnt = filtered.reduce((s, r) => s + (r.quantidade_entrada ?? 0), 0);
    const totSai = filtered.reduce((s, r) => s + (r.quantidade_saida ?? 0), 0);
    const totCaixas = filtered.reduce((s, r) => s + (r.quantidade_caixas ?? 0), 0);
    const perda = Math.max(0, totEnt - totSai);
    const pctPerda = totEnt > 0 ? (perda / totEnt) * 100 : 0;
    const emitidas = filtered.filter((r) => r.status_nf === "emitida").length;
    const pendentes = filtered.length - emitidas;
    return { totEnt, totSai, totCaixas, perda, pctPerda, emitidas, pendentes };
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fechamento de Pedidos</h1>
        <p className="text-sm text-muted-foreground">Controle de contagem e emissão de NF das referências em acabamento.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard label="Entradas" value={summary.totEnt} />
        <SummaryCard label="Saídas" value={summary.totSai} />
        <SummaryCard label="Perdas" value={summary.perda} className="text-destructive" />
        <SummaryCard label="% Perda" value={`${summary.pctPerda.toFixed(1)}%`} />
        <SummaryCard label="Caixas" value={summary.totCaixas} />
        <SummaryCard label="NFs" value={`${summary.emitidas} / ${summary.pendentes}`} sub="emitidas / pendentes" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>Mês</Label>
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {monthOptions.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status NF</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="emitida">Emitida</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cliente</Label>
            <Select value={clienteFilter} onValueChange={setClienteFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Buscar pedido/referência</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" placeholder="PED-... ou REF..." />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Revisão | Fechamento | Emissão de NF */}
      {(() => {
        const naoEmitidos = filtered.filter((r) => r.status_nf !== "emitida");
        const revisao = naoEmitidos.filter((r) => r.quantidade_entrada == null);
        const fechamento = naoEmitidos.filter((r) => r.quantidade_entrada != null && r.quantidade_saida == null);
        const prontoNf = naoEmitidos.filter((r) => r.quantidade_saida != null);

        const openRow = (r: FechamentoRow) => {
          setSelected(r);
          setSelectedFase(getFechamentoFase(r));
          setSheetOpen(true);
        };

        const renderTable = (list: FechamentoRow[], emptyMsg: string, fase: FechamentoFase) => (
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : list.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">{emptyMsg}</div>
              ) : (
                <TooltipProvider>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Referência</TableHead>
                        <TableHead className="text-right">Prevista</TableHead>
                        <TableHead className="text-right">Entrada</TableHead>
                        {fase !== "revisao" && <TableHead className="text-right">Saída</TableHead>}
                        {fase === "nf" && <TableHead className="text-right">Diferença</TableHead>}
                        {fase === "nf" && <TableHead className="text-right">Caixas</TableHead>}
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {list.map((r) => {
                        const dif = r.quantidade_entrada != null && r.quantidade_saida != null ? r.quantidade_entrada - r.quantidade_saida : null;
                        const ctaLabel = fase === "revisao" ? "Registrar entrada"
                          : fase === "fechamento" ? "Fazer fechamento"
                          : "Emitir NF";
                        return (
                          <TableRow
                            key={r.id}
                            onClick={() => openRow(r)}
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                          >
                            <TableCell>
                              <div className="font-medium">{r.cliente_nome}</div>
                              {r.produto_modelo && (
                                <div className="text-xs text-muted-foreground">{r.produto_modelo}</div>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{r.pedido_codigo}</TableCell>
                            <TableCell className="font-mono text-xs">{r.referencia_codigo}</TableCell>
                            <TableCell className="text-right">{r.quantidade_prevista}</TableCell>
                            <TableCell className="text-right">{r.quantidade_entrada ?? "—"}</TableCell>
                            {fase !== "revisao" && (
                              <TableCell className="text-right">{r.quantidade_saida ?? "—"}</TableCell>
                            )}
                            {fase === "nf" && (
                              <TableCell className="text-right">
                                {dif == null ? "—" : dif > 0 ? <span className="text-destructive font-medium">{dif}</span> :
                                  dif < 0 ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild><span className="text-orange-500 font-medium">{dif}</span></TooltipTrigger>
                                      <TooltipContent>Saída maior que entrada — verifique a contagem</TooltipContent>
                                    </Tooltip>
                                  ) : <span>{dif}</span>}
                              </TableCell>
                            )}
                            {fase === "nf" && (
                              <TableCell className="text-right">{r.quantidade_caixas ?? "—"}</TableCell>
                            )}
                            <TableCell>
                              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openRow(r); }}>{ctaLabel}</Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TooltipProvider>
              )}
            </CardContent>
          </Card>
        );

        return (
          <Tabs defaultValue="revisao" className="space-y-4">
            <TabsList>
              <TabsTrigger value="revisao" className="gap-2">
                <PackageCheck className="h-4 w-4" />
                Revisão
                <Badge variant="secondary" className="ml-1">{revisao.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="fechamento" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                Fechamento
                <Badge variant="secondary" className="ml-1">{fechamento.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="nf" className="gap-2">
                <FileCheck2 className="h-4 w-4" />
                Emissão de NF
                <Badge variant="secondary" className="ml-1">{prontoNf.length}</Badge>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="revisao">
              {renderTable(revisao, "Nenhuma referência aguardando contagem de entrada.", "revisao")}
            </TabsContent>
            <TabsContent value="fechamento">
              {renderTable(fechamento, "Nenhuma referência aguardando fechamento.", "fechamento")}
            </TabsContent>
            <TabsContent value="nf">
              {renderTable(prontoNf, "Nenhum pedido pronto para emissão de NF.", "nf")}
            </TabsContent>
          </Tabs>
        );
      })()}


      <FechamentoSheet open={sheetOpen} onOpenChange={setSheetOpen} fechamento={selected} fase={selectedFase} onSaved={() => { load(); }} />

    </div>
  );
}

function SummaryCard({ label, value, sub, className }: { label: string; value: any; sub?: string; className?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${className ?? ""}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
