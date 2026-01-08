import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, addMonths, subMonths, startOfMonth } from "date-fns";
import { FiltrosCarteira } from "@/components/carteira/CarteiraFilters";

export interface OcupacaoMensal {
  mes: string;
  totalPedidos: number;
  totalPecas: number;
  totalPecasPonderadas: number;
  receitaPrevista: number;
  capacidade: number | null;
  disponivel: number | null;
  ocupacao: number | null;
  nivel: "verde" | "amarelo" | "laranja" | "vermelho" | "cinza";
}

export interface PedidoCarteira {
  id: string;
  codigo_pedido: string | null;
  cliente_nome: string;
  status_geral: string;
  prazo_final: string;
  data_faturamento_prevista: string | null;
  mes_faturamento_previsto: string | null;
  prioridade: string | null;
  valor_total_pedido: number;
  total_pecas: number;
  total_pecas_ponderadas: number;
  responsavel_comercial_id: string | null;
}

export const useCarteiraDados = (
  tipoVisao: "entrega" | "faturamento",
  filtros: FiltrosCarteira,
  usarPonderado: boolean
) => {
  const [pedidos, setPedidos] = useState<PedidoCarteira[]>([]);
  const [capacidades, setCapacidades] = useState<Map<string, number>>(new Map());
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDados = useCallback(async () => {
    try {
      setLoading(true);

      // Buscar pedidos com referências
      const { data: pedidosData, error: pedidosError } = await supabase
        .from("pedidos")
        .select(`
          id,
          codigo_pedido,
          status_geral,
          prazo_final,
          prioridade,
          valor_total_pedido,
          responsavel_comercial_id,
          clientes(id, nome),
          referencias(quantidade, peso_producao, valor_total)
        `)
        .neq("status_geral", "cancelado")
        .order("prazo_final", { ascending: true });

      if (pedidosError) throw pedidosError;

      // Mapear pedidos com cálculos
      const pedidosMapeados: PedidoCarteira[] = pedidosData?.map((p: any) => {
        let totalPecas = 0;
        let totalPecasPonderadas = 0;
        let receitaItens = 0;

        p.referencias?.forEach((r: any) => {
          const qtd = r.quantidade || 0;
          const peso = r.peso_producao || 1;
          totalPecas += qtd;
          totalPecasPonderadas += qtd * peso;
          receitaItens += r.valor_total || 0;
        });

        return {
          id: p.id,
          codigo_pedido: p.codigo_pedido,
          cliente_nome: p.clientes?.nome || "Cliente não identificado",
          status_geral: p.status_geral,
          prazo_final: p.prazo_final,
          data_faturamento_prevista: null, // Campo será adicionado futuramente
          mes_faturamento_previsto: null,
          prioridade: p.prioridade,
          valor_total_pedido: p.valor_total_pedido || receitaItens,
          total_pecas: totalPecas,
          total_pecas_ponderadas: totalPecasPonderadas,
          responsavel_comercial_id: p.responsavel_comercial_id,
        };
      }) || [];

      setPedidos(pedidosMapeados);

      // Buscar capacidades
      const { data: capacidadesData } = await supabase
        .from("capacidade_mensal")
        .select("mes, capacidade_pecas");

      const capMap = new Map<string, number>();
      capacidadesData?.forEach((c) => {
        capMap.set(c.mes, c.capacidade_pecas);
      });
      setCapacidades(capMap);

      // Buscar clientes para filtro
      const { data: clientesData } = await supabase
        .from("clientes")
        .select("id, nome")
        .order("nome");

      setClientes(clientesData || []);
    } catch (error) {
      console.error("Erro ao buscar dados da carteira:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDados();
  }, [fetchDados]);

  // Filtrar pedidos
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      // Filtro de status
      if (filtros.status.length > 0 && !filtros.status.includes(p.status_geral)) {
        return false;
      }

      // Filtro de cliente
      if (filtros.cliente && !p.cliente_nome.toLowerCase().includes(filtros.cliente.toLowerCase())) {
        return false;
      }

      // Filtro de prioridade
      if (filtros.prioridade && p.prioridade !== filtros.prioridade) {
        return false;
      }

      return true;
    });
  }, [pedidos, filtros]);

  // Calcular ocupações mensais
  const ocupacoesMensais = useMemo(() => {
    const hoje = new Date();
    const meses: string[] = [];

    // 6 meses anteriores + mês atual + 6 meses futuros
    for (let i = -6; i <= 6; i++) {
      const data = i < 0 
        ? subMonths(startOfMonth(hoje), Math.abs(i))
        : addMonths(startOfMonth(hoje), i);
      meses.push(format(data, "yyyy-MM"));
    }

    const calcularNivel = (ocupacao: number | null): OcupacaoMensal["nivel"] => {
      if (ocupacao === null) return "cinza";
      if (ocupacao <= 80) return "verde";
      if (ocupacao <= 90) return "amarelo";
      if (ocupacao <= 100) return "laranja";
      return "vermelho";
    };

    return meses.map((mes) => {
      // Filtrar pedidos do mês
      const pedidosDoMes = pedidosFiltrados.filter((p) => {
        const dataPedido = tipoVisao === "entrega"
          ? p.prazo_final
          : (p.data_faturamento_prevista || p.mes_faturamento_previsto || p.prazo_final);

        if (!dataPedido) return false;

        // Se for formato YYYY-MM
        if (dataPedido.length === 7) {
          return dataPedido === mes;
        }

        // Se for data completa
        return format(new Date(dataPedido), "yyyy-MM") === mes;
      });

      const totalPedidos = pedidosDoMes.length;
      const totalPecas = pedidosDoMes.reduce((acc, p) => acc + p.total_pecas, 0);
      const totalPecasPonderadas = pedidosDoMes.reduce((acc, p) => acc + p.total_pecas_ponderadas, 0);
      const receitaPrevista = pedidosDoMes.reduce((acc, p) => acc + (p.valor_total_pedido || 0), 0);

      const capacidade = capacidades.get(mes) || null;
      const demanda = usarPonderado ? totalPecasPonderadas : totalPecas;
      const ocupacao = capacidade ? (demanda / capacidade) * 100 : null;
      const disponivel = capacidade ? capacidade - demanda : null;
      const nivel = calcularNivel(ocupacao);

      return {
        mes,
        totalPedidos,
        totalPecas,
        totalPecasPonderadas,
        receitaPrevista,
        capacidade,
        disponivel,
        ocupacao: ocupacao ? Math.round(ocupacao * 10) / 10 : null,
        nivel,
      };
    });
  }, [pedidosFiltrados, capacidades, tipoVisao, usarPonderado]);

  return {
    ocupacoesMensais,
    pedidosFiltrados,
    clientes,
    loading,
    refetch: fetchDados,
  };
};
