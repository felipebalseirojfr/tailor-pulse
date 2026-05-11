import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertCircle,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Calendar as CalendarIcon,
} from "lucide-react";
import { format, isSameDay, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { calcularNivelAlerta, NivelAlerta } from "@/hooks/useAlertasAtraso";

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

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface EtapaComPedido {
  id: string;
  pedido_id: string;
  tipo_etapa: string;
  status: string;
  data_inicio: string | null;
  data_inicio_prevista: string | null;
  data_termino_prevista: string | null;
  nivel_alerta: NivelAlerta;
  dias_restantes: number | null;
  pedidos: {
    id: string;
    produto_modelo: string;
    codigo_pedido?: string;
    clientes: { nome: string };
  };
}

type MarcoTipo = "inicio" | "fim" | "prazo_pedido";
interface MarcoCalendario {
  key: string;
  etapa?: EtapaComPedido;
  pedido?: PedidoPrazo;
  tipo: MarcoTipo;
  data: string;
  nivel_alerta: NivelAlerta;
}

interface PedidoPrazo {
  id: string;
  produto_modelo: string;
  codigo_pedido?: string;
  prazo_final: string;
  status_geral: string;
  clientes: { nome: string };
}

function getNivelConfig(nivel: NivelAlerta) {
  const configs = {
    atrasado: {
      bg: "bg-red-50 border-red-200",
      badge: "bg-red-100 text-red-700 border-red-300",
      dot: "bg-red-500",
      calBg: "bg-red-100 border-l-2 border-red-500",
      calText: "text-red-800",
      label: "Atrasado",
    },
    risco: {
      bg: "bg-amber-50 border-amber-200",
      badge: "bg-amber-100 text-amber-700 border-amber-300",
      dot: "bg-amber-400",
      calBg: "bg-amber-100 border-l-2 border-amber-500",
      calText: "text-amber-800",
      label: "Risco",
    },
    ok: {
      bg: "bg-green-50 border-green-200",
      badge: "bg-green-100 text-green-700 border-green-300",
      dot: "bg-green-500",
      calBg: "bg-green-100 border-l-2 border-green-500",
      calText: "text-green-800",
      label: "No prazo",
    },
    pendente: {
      bg: "bg-gray-50 border-gray-200",
      badge: "bg-gray-100 text-gray-600 border-gray-300",
      dot: "bg-gray-300",
      calBg: "bg-gray-100 border-l-2 border-gray-400",
      calText: "text-gray-700",
      label: "Sem prazo",
    },
  };
  return configs[nivel];
}

export default function Calendario() {
  const navigate = useNavigate();
  const [etapas, setEtapas] = useState<EtapaComPedido[]>([]);
  const [pedidos, setPedidos] = useState<PedidoPrazo[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesAtual, setMesAtual] = useState(new Date());
  const [filtroNivel, setFiltroNivel] = useState<NivelAlerta | "todos">("todos");
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(null);

  useEffect(() => {
    fetchEtapas();
  }, []);

  const fetchEtapas = async () => {
    try {
      const [etapasRes, pedidosRes] = await Promise.all([
        supabase
          .from("etapas_producao")
          .select(`
            id,
            pedido_id,
            tipo_etapa,
            status,
            data_inicio,
            data_inicio_prevista,
            data_termino_prevista,
            pedidos (
              id,
              produto_modelo,
              codigo_pedido,
              clientes ( nome )
            )
          `)
          .neq("status", "concluido")
          .order("data_termino_prevista"),
        supabase
          .from("pedidos")
          .select(`id, produto_modelo, codigo_pedido, prazo_final, status_geral, clientes ( nome )`)
          .neq("status_geral", "concluido"),
      ]);

      if (etapasRes.error) throw etapasRes.error;
      if (pedidosRes.error) throw pedidosRes.error;

      const comAlertas = (etapasRes.data || []).map((e) => {
        const { nivel, diasRestantes } = calcularNivelAlerta(
          e.status,
          e.data_termino_prevista
        );
        return { ...e, nivel_alerta: nivel, dias_restantes: diasRestantes };
      });

      setEtapas(comAlertas);
      setPedidos((pedidosRes.data || []) as PedidoPrazo[]);
    } catch (error) {
      console.error("Erro ao buscar etapas:", error);
    } finally {
      setLoading(false);
    }
  };

  // Gerar dias do mês
  const getDiasDoMes = () => {
    const ano = mesAtual.getFullYear();
    const mes = mesAtual.getMonth();
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);
    const dias: (Date | null)[] = [];

    for (let i = 0; i < primeiroDia.getDay(); i++) dias.push(null);
    for (let d = 1; d <= ultimoDia.getDate(); d++) dias.push(new Date(ano, mes, d));
    return dias;
  };

  const toLocalISO = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const toLocalDateFromDb = (value: string | null) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value.slice(0, 10);
    return toLocalISO(parsed);
  };

  const getMarcosDoDia = (dia: Date): MarcoCalendario[] => {
    const diaStr = toLocalISO(dia);
    const marcos: MarcoCalendario[] = [];
    etapas.forEach((e) => {
      if (filtroNivel !== "todos" && e.nivel_alerta !== filtroNivel) return;
      const dataInicio = toLocalDateFromDb(e.data_inicio) || e.data_inicio_prevista;
      if (dataInicio === diaStr) {
        marcos.push({ key: `${e.id}-inicio`, etapa: e, tipo: "inicio", data: diaStr, nivel_alerta: e.nivel_alerta });
      }
      if (e.data_termino_prevista === diaStr) {
        marcos.push({ key: `${e.id}-fim`, etapa: e, tipo: "fim", data: diaStr, nivel_alerta: e.nivel_alerta });
      }
    });
    pedidos.forEach((p) => {
      if (p.prazo_final !== diaStr) return;
      const { nivel } = calcularNivelAlerta(p.status_geral, p.prazo_final);
      if (filtroNivel !== "todos" && nivel !== filtroNivel) return;
      marcos.push({ key: `pedido-${p.id}`, pedido: p, tipo: "prazo_pedido", data: diaStr, nivel_alerta: nivel });
    });
    return marcos;
  };

  const contadores = {
    atrasado: etapas.filter((e) => e.nivel_alerta === "atrasado").length,
    risco: etapas.filter((e) => e.nivel_alerta === "risco").length,
    ok: etapas.filter((e) => e.nivel_alerta === "ok").length,
  };

  const etapasFiltradas = filtroNivel === "todos"
    ? etapas
    : etapas.filter((e) => e.nivel_alerta === filtroNivel);

  const dias = getDiasDoMes();
  const hoje = toLocalISO(new Date());

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <CalendarIcon className="h-8 w-8 text-primary" />
          Calendário de Produção
        </h1>
        <p className="text-muted-foreground mt-1">
          Acompanhe os prazos das etapas e identifique riscos de atraso
        </p>
      </div>

      {/* Cards de resumo clicáveis */}
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => setFiltroNivel(filtroNivel === "atrasado" ? "todos" : "atrasado")}
          className={`rounded-xl border-2 p-4 text-left transition-all ${
            filtroNivel === "atrasado"
              ? "border-red-500 bg-red-50"
              : "border-red-200 bg-red-50/50 hover:border-red-400"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span className="text-sm font-medium text-red-700">Atrasadas</span>
          </div>
          <p className="text-3xl font-bold text-red-700">{contadores.atrasado}</p>
          <p className="text-xs text-red-500 mt-1">etapas em atraso</p>
        </button>

        <button
          onClick={() => setFiltroNivel(filtroNivel === "risco" ? "todos" : "risco")}
          className={`rounded-xl border-2 p-4 text-left transition-all ${
            filtroNivel === "risco"
              ? "border-amber-500 bg-amber-50"
              : "border-amber-200 bg-amber-50/50 hover:border-amber-400"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="text-sm font-medium text-amber-700">Em Risco</span>
          </div>
          <p className="text-3xl font-bold text-amber-700">{contadores.risco}</p>
          <p className="text-xs text-amber-500 mt-1">vencem em 1-2 dias</p>
        </button>

        <button
          onClick={() => setFiltroNivel(filtroNivel === "ok" ? "todos" : "ok")}
          className={`rounded-xl border-2 p-4 text-left transition-all ${
            filtroNivel === "ok"
              ? "border-green-500 bg-green-50"
              : "border-green-200 bg-green-50/50 hover:border-green-400"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span className="text-sm font-medium text-green-700">No Prazo</span>
          </div>
          <p className="text-3xl font-bold text-green-700">{contadores.ok}</p>
          <p className="text-xs text-green-500 mt-1">etapas dentro do prazo</p>
        </button>
      </div>

      {/* Calendário */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {MESES[mesAtual.getMonth()]} {mesAtual.getFullYear()}
            </CardTitle>
            <div className="flex items-center gap-3">
              {/* Legenda */}
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" />
                  Atrasado
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" />
                  Risco
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500 inline-block" />
                  No prazo
                </span>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMesAtual(new Date())}
                >
                  Hoje
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">
                {d}
              </div>
            ))}
            {dias.map((dia, idx) => {
              if (!dia) return <div key={`empty-${idx}`} />;
              const diaStr = toLocalISO(dia);
              const marcosDia = getMarcosDoDia(dia);
              const isHoje = diaStr === hoje;

              return (
                <div
                  key={diaStr}
                  onClick={() => setDiaSelecionado(dia)}
                  className={`min-h-[90px] rounded-lg p-1.5 border transition-colors cursor-pointer ${
                    isHoje ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                  }`}
                >
                  <div className={`text-xs font-medium mb-1 ${isHoje ? "text-primary font-bold" : "text-muted-foreground"}`}>
                    {dia.getDate()}
                    {isHoje && <span className="ml-1 text-[10px] text-primary">hoje</span>}
                  </div>
                  <div className="space-y-0.5">
                    {marcosDia.slice(0, 3).map((marco) => {
                      const baseConfig = getNivelConfig(marco.nivel_alerta);
                      const isPrazo = marco.tipo === "prazo_pedido";
                      const config = isPrazo
                        ? {
                            ...baseConfig,
                            calBg: "bg-purple-100 border-l-2 border-purple-500",
                            calText: "text-purple-800",
                            bg: "bg-purple-50 border-purple-300",
                            dot: "bg-purple-500",
                          }
                        : baseConfig;
                      const etapaNome = isPrazo
                        ? "Prazo de Entrega"
                        : ETAPAS_NOMES[marco.etapa!.tipo_etapa] || marco.etapa!.tipo_etapa;
                      const prefixo = isPrazo ? "★" : marco.tipo === "inicio" ? "▶" : "■";
                      const tipoLabel = isPrazo ? "Prazo do pedido" : marco.tipo === "inicio" ? "Início" : "Fim";
                      const modelo = isPrazo
                        ? marco.pedido!.produto_modelo
                        : marco.etapa!.pedidos?.produto_modelo;
                      const cliente = isPrazo
                        ? marco.pedido!.clientes?.nome
                        : marco.etapa!.pedidos?.clientes?.nome;
                      const pedidoId = isPrazo ? marco.pedido!.id : marco.etapa!.pedido_id;
                      const extraClass = isPrazo ? "ring-1 ring-offset-0 ring-current/40 font-bold" : "";
                      return (
                        <button
                          key={marco.key}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/pedidos/${pedidoId}`);
                          }}
                          className={`w-full text-left text-[10px] rounded px-1 py-0.5 truncate font-medium transition-opacity hover:opacity-80 ${config.calBg} ${config.calText} ${extraClass}`}
                          title={`${tipoLabel} — ${etapaNome} · ${modelo} (${cliente || ""})`}
                        >
                          <span className="mr-1">{prefixo}</span>
                          {etapaNome}: {modelo}
                        </button>
                      );
                    })}
                    {marcosDia.length > 3 && (
                      <div className="text-[10px] text-muted-foreground pl-1">
                        +{marcosDia.length - 3} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Dialog do dia selecionado */}
      <Dialog open={!!diaSelecionado} onOpenChange={(open) => !open && setDiaSelecionado(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              {diaSelecionado && format(diaSelecionado, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </DialogTitle>
            <DialogDescription>
              Todos os prazos (inícios e fins de etapas) deste dia
            </DialogDescription>
          </DialogHeader>
          {diaSelecionado && (() => {
            const marcos = getMarcosDoDia(diaSelecionado);
            if (marcos.length === 0) {
              return (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-400" />
                  <p className="font-medium">Nenhum prazo neste dia</p>
                </div>
              );
            }
            const inicios = marcos.filter((m) => m.tipo === "inicio");
            const fins = marcos.filter((m) => m.tipo === "fim");
            const prazos = marcos.filter((m) => m.tipo === "prazo_pedido");
            const renderMarco = (marco: MarcoCalendario) => {
              const baseConfig = getNivelConfig(marco.nivel_alerta);
              const isPrazo = marco.tipo === "prazo_pedido";
              const config = isPrazo
                ? {
                    ...baseConfig,
                    calBg: "bg-purple-100 border-l-2 border-purple-500",
                    calText: "text-purple-800",
                    bg: "bg-purple-50 border-purple-300",
                    dot: "bg-purple-500",
                    badge: "bg-purple-100 text-purple-800 border-purple-300",
                  }
                : baseConfig;
              const titulo = isPrazo
                ? "Prazo de Entrega do Pedido"
                : ETAPAS_NOMES[marco.etapa!.tipo_etapa] || marco.etapa!.tipo_etapa;
              const modelo = isPrazo ? marco.pedido!.produto_modelo : marco.etapa!.pedidos?.produto_modelo;
              const cliente = isPrazo ? marco.pedido!.clientes?.nome : marco.etapa!.pedidos?.clientes?.nome;
              const pedidoId = isPrazo ? marco.pedido!.id : marco.etapa!.pedido_id;
              return (
                <button
                  key={marco.key}
                  onClick={() => {
                    setDiaSelecionado(null);
                    navigate(`/pedidos/${pedidoId}`);
                  }}
                  className={`w-full flex items-center justify-between rounded-lg border p-3 text-left transition-all hover:scale-[1.01] hover:shadow-sm ${config.bg}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-3 w-3 rounded-full flex-shrink-0 ${config.dot}`} />
                  <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold text-sm ${config.calText}`}>{titulo}</span>
                        <Badge className={`text-[10px] border ${config.badge}`}>
                          {config.label}
                        </Badge>
                      </div>
                      <div className={`text-xs mt-0.5 truncate ${config.calText} opacity-90`}>
                        {modelo} — {cliente || "Sem cliente"}
                      </div>
                    </div>
                  </div>
                  <ExternalLink className={`h-4 w-4 flex-shrink-0 ${config.calText} opacity-70`} />
                </button>
              );
            };
            return (
              <div className="max-h-[calc(85vh-7.5rem)] overflow-y-auto px-6 pb-6 pr-4">
                <div className="space-y-4 pr-2">
                  {prazos.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <span>★</span> Prazos de entrega de pedidos ({prazos.length})
                      </h3>
                      <div className="space-y-2">{prazos.map(renderMarco)}</div>
                    </div>
                  )}
                  {inicios.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <span>▶</span> Inícios previstos ({inicios.length})
                      </h3>
                      <div className="space-y-2">{inicios.map(renderMarco)}</div>
                    </div>
                  )}
                  {fins.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <span>■</span> Fins previstos ({fins.length})
                      </h3>
                      <div className="space-y-2">{fins.map(renderMarco)}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Lista detalhada */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Lista de Etapas
              {filtroNivel !== "todos" && (
                <Badge variant="outline" className="ml-2 text-xs font-normal">
                  {getNivelConfig(filtroNivel as NivelAlerta).label}
                </Badge>
              )}
            </CardTitle>
            {filtroNivel !== "todos" && (
              <Button variant="ghost" size="sm" onClick={() => setFiltroNivel("todos")}>
                Ver todas
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {etapasFiltradas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-400" />
              <p className="font-medium">Tudo sob controle!</p>
              <p className="text-sm">Nenhuma etapa em atraso ou risco.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {etapasFiltradas.map((etapa) => {
                const config = getNivelConfig(etapa.nivel_alerta);
                return (
                  <div
                    key={etapa.id}
                    className={`flex items-center justify-between rounded-lg border p-3 ${config.bg}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full flex-shrink-0 ${config.dot}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {etapa.pedidos?.produto_modelo}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            — {etapa.pedidos?.clientes?.nome}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {ETAPAS_NOMES[etapa.tipo_etapa] || etapa.tipo_etapa}
                          </span>
                          {etapa.data_termino_prevista && (
                            <span className="text-xs text-muted-foreground">
                              · Previsto:{" "}
                              {new Date(etapa.data_termino_prevista + "T12:00:00").toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${config.badge}`}>
                        {etapa.nivel_alerta === "atrasado"
                          ? `${Math.abs(etapa.dias_restantes!)}d atraso`
                          : etapa.nivel_alerta === "risco"
                          ? etapa.dias_restantes === 0 ? "Hoje"
                          : etapa.dias_restantes === 1 ? "Amanhã"
                          : `${etapa.dias_restantes}d`
                          : etapa.dias_restantes !== null
                          ? `${etapa.dias_restantes}d`
                          : "No prazo"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/pedidos/${etapa.pedido_id}`)}
                        className="h-7 w-7 p-0"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
