import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, addMonths, startOfMonth } from "date-fns";

export interface OcupacaoMensal {
  mes: string; // YYYY-MM
  demanda: number;
  capacidade: number | null;
  ocupacao: number | null; // percentual
  disponivel: number | null;
  nivel: "verde" | "amarelo" | "laranja" | "vermelho" | "cinza";
}

export const useCapacidadeOcupacao = (mesesFuturos: number = 6) => {
  const [ocupacoes, setOcupacoes] = useState<OcupacaoMensal[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertas, setAlertas] = useState<OcupacaoMensal[]>([]);

  const calcularNivel = (ocupacao: number | null): OcupacaoMensal["nivel"] => {
    if (ocupacao === null) return "cinza";
    if (ocupacao <= 80) return "verde";
    if (ocupacao <= 90) return "amarelo";
    if (ocupacao <= 100) return "laranja";
    return "vermelho";
  };

  const fetchOcupacao = useCallback(async () => {
    try {
      setLoading(true);
      const hoje = new Date();
      const meses: string[] = [];

      // Gerar lista de meses (atual + próximos N meses)
      for (let i = 0; i <= mesesFuturos; i++) {
        const data = addMonths(startOfMonth(hoje), i);
        meses.push(format(data, "yyyy-MM"));
      }

      // Buscar capacidades cadastradas
      const { data: capacidades, error: capError } = await supabase
        .from("capacidade_mensal")
        .select("mes, capacidade_pecas")
        .in("mes", meses);

      if (capError) throw capError;

      // Criar mapa de capacidades
      const capacidadeMap = new Map<string, number>();
      capacidades?.forEach((c) => {
        capacidadeMap.set(c.mes, c.capacidade_pecas);
      });

      // Buscar demanda por mês (soma de peças dos pedidos não cancelados)
      const ocupacoesCalculadas: OcupacaoMensal[] = [];

      for (const mes of meses) {
        const inicioMes = `${mes}-01`;
        const proximoMes = format(addMonths(new Date(inicioMes), 1), "yyyy-MM-dd");

        // Buscar pedidos com prazo_final no mês
        const { data: pedidos, error: pedError } = await supabase
          .from("pedidos")
          .select(`
            id,
            status_geral,
            referencias(quantidade)
          `)
          .gte("prazo_final", inicioMes)
          .lt("prazo_final", proximoMes)
          .neq("status_geral", "cancelado");

        if (pedError) throw pedError;

        // Calcular demanda total
        let demanda = 0;
        pedidos?.forEach((p) => {
          if (p.referencias && Array.isArray(p.referencias)) {
            p.referencias.forEach((r: any) => {
              demanda += r.quantidade || 0;
            });
          }
        });

        const capacidade = capacidadeMap.get(mes) || null;
        const ocupacao = capacidade ? (demanda / capacidade) * 100 : null;
        const disponivel = capacidade ? capacidade - demanda : null;
        const nivel = calcularNivel(ocupacao);

        ocupacoesCalculadas.push({
          mes,
          demanda,
          capacidade,
          ocupacao: ocupacao ? Math.round(ocupacao * 10) / 10 : null,
          disponivel,
          nivel,
        });
      }

      setOcupacoes(ocupacoesCalculadas);

      // Filtrar alertas (ocupação > 80%)
      const alertasFiltrados = ocupacoesCalculadas.filter(
        (o) => o.ocupacao !== null && o.ocupacao > 80
      );
      setAlertas(alertasFiltrados);
    } catch (error) {
      console.error("Erro ao calcular ocupação:", error);
    } finally {
      setLoading(false);
    }
  }, [mesesFuturos]);

  useEffect(() => {
    fetchOcupacao();
  }, [fetchOcupacao]);

  return { ocupacoes, alertas, loading, refetch: fetchOcupacao };
};
