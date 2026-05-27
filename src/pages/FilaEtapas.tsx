import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Clock, Package as PackageIcon, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const TIPOS_ETAPA = [
  { value: "pilotagem", label: "Pilotagem" },
  { value: "compra_de_insumos", label: "Compra de Insumos" },
  { value: "liberacao_corte", label: "Liberação de Corte" },
  { value: "corte", label: "Corte" },
  { value: "lavanderia", label: "Lavanderia" },
  { value: "costura", label: "Costura" },
  { value: "caseado", label: "Caseado" },
  { value: "estamparia", label: "Estamparia" },
  { value: "bordado", label: "Bordado" },
  { value: "acabamento", label: "Acabamento" },
  { value: "aplicacao_travete", label: "Aplicação de Travete" },
  { value: "entrega", label: "Entrega" },
];

interface EtapaItem {
  id: string;
  pedido_id: string;
  tipo_etapa: string;
  status: string;
  data_termino_prevista: string | null;
  terceiro_id: string | null;
  pedido: {
    codigo_pedido: string | null;
    produto_modelo: string;
    grade_tamanhos: Record<string, number> | null;
    cliente: { nome: string } | null;
  } | null;
}

interface Terceiro {
  id: string;
  nome: string;
  tipo_etapa: string;
}

function diasAteDate(d: string | null): number | null {
  if (!d) return null;
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const prazo = new Date(d + "T00:00:00");
  return Math.ceil((prazo.getTime() - hoje.getTime()) / 86400000);
}

function formatData(d: string | null): string {
  if (!d) return "Sem prazo";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

export default function FilaEtapas() {
  const [etapas, setEtapas] = useState<EtapaItem[]>([]);
  const [terceiros, setTerceiros] = useState<Terceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecionados, setSelecionados] = useState<Record<string, string | null>>({});
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

  const fetchData = async () => {
    setLoading(true);
    const [etapasRes, terceirosRes] = await Promise.all([
      supabase
        .from("etapas_producao")
        .select("id, pedido_id, tipo_etapa, status, data_termino_prevista, terceiro_id, pedido:pedidos(codigo_pedido, produto_modelo, grade_tamanhos, cliente:clientes(nome))")
        .neq("status", "concluido")
        .order("data_termino_prevista", { ascending: true, nullsFirst: false }),
      supabase.from("terceiros").select("id, nome, tipo_etapa").eq("ativo", true).order("nome"),
    ]);
    if (etapasRes.data) setEtapas(etapasRes.data as any);
    if (terceirosRes.data) setTerceiros(terceirosRes.data as Terceiro[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("fila-etapas-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "etapas_producao" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const etapasPorTipo = useMemo(() => {
    const map: Record<string, EtapaItem[]> = {};
    for (const e of etapas) {
      (map[e.tipo_etapa] ||= []).push(e);
    }
    return map;
  }, [etapas]);

  const terceirosPorTipo = useMemo(() => {
    const map: Record<string, Terceiro[]> = {};
    for (const t of terceiros) {
      (map[t.tipo_etapa] ||= []).push(t);
    }
    return map;
  }, [terceiros]);

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Fila das Etapas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visualize as referências em cada etapa da produção, agrupadas por oficina/fornecedor.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {TIPOS_ETAPA.map((tipo) => {
            const itens = etapasPorTipo[tipo.value] || [];
            const opcoesTerceiros = terceirosPorTipo[tipo.value] || [];
            const terceiroSel = selecionados[tipo.value] ?? "todos";

            // group itens by terceiro
            const itensFiltrados = itens.filter((it) => {
              if (terceiroSel === "todos") return true;
              if (terceiroSel === "sem") return !it.terceiro_id;
              return it.terceiro_id === terceiroSel;
            });

            const atrasadas = itens.filter((i) => {
              const d = diasAteDate(i.data_termino_prevista);
              return d !== null && d < 0;
            }).length;

            const expandido = !!expandidos[tipo.value];

            return (
              <Card key={tipo.value} className="flex flex-col hover:scale-100">
                <CardHeader
                  className="pb-3 cursor-pointer select-none"
                  onClick={() => setExpandidos((s) => ({ ...s, [tipo.value]: !s[tipo.value] }))}
                >
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {expandido ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                      {tipo.label}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {atrasadas > 0 && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {atrasadas}
                        </Badge>
                      )}
                      <Badge variant="secondary">{itens.length}</Badge>
                    </div>
                  </div>
                </CardHeader>
                {expandido && (
                <CardContent className="flex-1 flex flex-col gap-3">
                  {opcoesTerceiros.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setSelecionados((s) => ({ ...s, [tipo.value]: "todos" }))}
                        className={cn(
                          "text-xs px-2 py-1 rounded-md border transition-colors",
                          terceiroSel === "todos" ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent"
                        )}
                      >
                        Todos ({itens.length})
                      </button>
                      {opcoesTerceiros.map((t) => {
                        const count = itens.filter((i) => i.terceiro_id === t.id).length;
                        return (
                          <button
                            key={t.id}
                            onClick={() => setSelecionados((s) => ({ ...s, [tipo.value]: t.id }))}
                            className={cn(
                              "text-xs px-2 py-1 rounded-md border transition-colors flex items-center gap-1",
                              terceiroSel === t.id ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent"
                            )}
                          >
                            <Building2 className="h-3 w-3" />
                            {t.nome} ({count})
                          </button>
                        );
                      })}
                      {itens.some((i) => !i.terceiro_id) && (
                        <button
                          onClick={() => setSelecionados((s) => ({ ...s, [tipo.value]: "sem" }))}
                          className={cn(
                            "text-xs px-2 py-1 rounded-md border transition-colors",
                            terceiroSel === "sem" ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent"
                          )}
                        >
                          Sem oficina ({itens.filter((i) => !i.terceiro_id).length})
                        </button>
                      )}
                    </div>
                  )}

                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {itensFiltrados.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        {itens.length === 0 ? "Nenhuma referência nesta etapa" : "Nenhuma referência neste filtro"}
                      </p>
                    ) : (
                      itensFiltrados.map((item) => {
                        const dias = diasAteDate(item.data_termino_prevista);
                        const corPrazo =
                          dias === null ? "text-muted-foreground"
                          : dias < 0 ? "text-red-600"
                          : dias <= 2 ? "text-yellow-600"
                          : "text-green-600";
                        return (
                          <Link
                            key={item.id}
                            to={`/pedidos/${item.pedido_id}`}
                            className="block p-2.5 rounded-md border bg-card hover:bg-accent transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold truncate">
                                  {item.pedido?.produto_modelo}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate mt-0.5">
                                  <PackageIcon className="h-3 w-3 shrink-0" />
                                  {item.pedido?.codigo_pedido || "—"}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {item.pedido?.cliente?.nome}
                                </div>
                                {(() => {
                                  const ordem = ["1","2","4","6","8","10","12","14","PP","P","M","G","GG","XGG","XGG1","XGG2","XGG3"];
                                  const entradas = Object.entries(item.pedido?.grade_tamanhos || {})
                                    .filter(([_, q]) => typeof q === "number" && (q as number) > 0)
                                    .sort((a, b) => {
                                      const ia = ordem.indexOf(a[0]); const ib = ordem.indexOf(b[0]);
                                      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
                                    });
                                  if (entradas.length === 0) return null;
                                  return (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      {entradas.map(([tam, qtd]) => (
                                        <span key={tam} className="px-1.5 py-0.5 rounded border border-border bg-muted/40 text-[10px] leading-none">
                                          <span className="font-semibold">{tam}</span>
                                          <span className="text-muted-foreground">·</span>
                                          <span>{qtd as number}</span>
                                        </span>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </div>
                              <div className={cn("text-xs flex flex-col items-end gap-0.5", corPrazo)}>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatData(item.data_termino_prevista)}
                                </div>
                                {dias !== null && (
                                  <span className="font-semibold">
                                    {dias < 0 ? `${Math.abs(dias)}d atrasado` : dias === 0 ? "hoje" : `${dias}d`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </Link>
                        );
                      })
                    )}
                  </div>
                </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
