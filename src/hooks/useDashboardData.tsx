import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardStats {
  totalPedidos: number;
  pedidosAtivos: number;
  pedidosConcluidos: number;
  pedidosAtrasados: number;
  pedidosProximosPrazo: number;
  taxaConclusao: number;
  tempoMedioProducao: number;
  capacidadeAtual: number;
  capacidadeTotal: number;
}

export interface PedidoDetalhado {
  id: string;
  produto_modelo: string;
  progresso_percentual: number;
  prazo_final: string;
  status_geral: string;
  quantidade_total: number;
  data_inicio: string;
  prioridade: string;
  cliente: {
    nome: string;
  };
  etapas_producao: Array<{
    tipo_etapa: string;
    status: string;
    ordem: number;
  }>;
}

export interface AtividadeRecente {
  id: string;
  pedido_id: string;
  produto_modelo: string;
  tipo_etapa: string;
  status: string;
  updated_at: string;
}

export const useDashboardData = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalPedidos: 0,
    pedidosAtivos: 0,
    pedidosConcluidos: 0,
    pedidosAtrasados: 0,
    pedidosProximosPrazo: 0,
    taxaConclusao: 0,
    tempoMedioProducao: 0,
    capacidadeAtual: 0,
    capacidadeTotal: 200000, // Capacidade mensal padrão
  });

  const [pedidos, setPedidos] = useState<PedidoDetalhado[]>([]);
  const [atividades, setAtividades] = useState<AtividadeRecente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Buscar pedidos com relacionamentos
      const { data: pedidosData, error: pedidosError } = await supabase
        .from("pedidos")
        .select(`
          *,
          clientes(nome),
          etapas_producao(tipo_etapa, status, ordem)
        `)
        .order("created_at", { ascending: false });

      if (pedidosError) throw pedidosError;

      // Buscar atividades recentes das etapas
      const { data: atividadesData, error: atividadesError } = await supabase
        .from("etapas_producao")
        .select(`
          id,
          pedido_id,
          tipo_etapa,
          status,
          updated_at,
          pedidos(produto_modelo)
        `)
        .order("updated_at", { ascending: false })
        .limit(10);

      if (atividadesError) throw atividadesError;

      const hoje = new Date();
      const tresDiasDepois = new Date();
      tresDiasDepois.setDate(hoje.getDate() + 3);

      const atrasados = pedidosData?.filter(
        (p: any) =>
          new Date(p.prazo_final) < hoje && p.status_geral !== "concluido"
      ).length || 0;

      const proximosPrazo = pedidosData?.filter((p: any) => {
        const prazo = new Date(p.prazo_final);
        return (
          prazo >= hoje &&
          prazo <= tresDiasDepois &&
          p.status_geral !== "concluido"
        );
      }).length || 0;

      const concluidos =
        pedidosData?.filter((p: any) => p.status_geral === "concluido")
          .length || 0;

      const taxaConclusao =
        pedidosData && pedidosData.length > 0
          ? (concluidos / pedidosData.length) * 100
          : 0;

      // Calcular tempo médio de produção
      const pedidosConcluidos = pedidosData?.filter(
        (p: any) => p.status_geral === "concluido"
      ) || [];
      
      let tempoMedio = 0;
      if (pedidosConcluidos.length > 0) {
        const tempoTotal = pedidosConcluidos.reduce((acc: number, p: any) => {
          const inicio = new Date(p.data_inicio);
          const fim = new Date(p.updated_at);
          const dias = Math.floor((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
          return acc + dias;
        }, 0);
        tempoMedio = Math.round(tempoTotal / pedidosConcluidos.length);
      }

      // Calcular capacidade atual
      const capacidadeAtual = pedidosData
        ?.filter((p: any) => p.status_geral === "em_producao")
        .reduce((acc: number, p: any) => acc + (p.quantidade_total || 0), 0) || 0;

      setStats({
        totalPedidos: pedidosData?.length || 0,
        pedidosAtivos:
          pedidosData?.filter((p: any) => p.status_geral === "em_producao")
            .length || 0,
        pedidosConcluidos: concluidos,
        pedidosAtrasados: atrasados,
        pedidosProximosPrazo: proximosPrazo,
        taxaConclusao,
        tempoMedioProducao: tempoMedio,
        capacidadeAtual,
        capacidadeTotal: 200000,
      });

      // Mapear pedidos para o formato correto
      const pedidosMapeados: PedidoDetalhado[] = pedidosData?.map((p: any) => ({
        id: p.id,
        produto_modelo: p.produto_modelo,
        progresso_percentual: p.progresso_percentual,
        prazo_final: p.prazo_final,
        status_geral: p.status_geral,
        quantidade_total: p.quantidade_total,
        data_inicio: p.data_inicio,
        prioridade: p.prioridade,
        cliente: {
          nome: p.clientes?.nome || "Cliente não identificado",
        },
        etapas_producao: p.etapas_producao || [],
      })) || [];

      setPedidos(pedidosMapeados);

      // Processar atividades
      const atividadesProcessadas = atividadesData?.map((a: any) => ({
        id: a.id,
        pedido_id: a.pedido_id,
        produto_modelo: a.pedidos?.produto_modelo || "Pedido",
        tipo_etapa: a.tipo_etapa,
        status: a.status,
        updated_at: a.updated_at,
      })) || [];

      setAtividades(atividadesProcessadas);
    } catch (error) {
      console.error("Erro ao buscar dados do dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  return { stats, pedidos, atividades, loading, refetch: fetchDashboardData };
};
