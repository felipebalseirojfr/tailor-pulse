import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCapacidadeOcupacao, OcupacaoMensal } from "./useCapacidadeOcupacao";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

export const useOcupacaoAlerts = () => {
  const { toast } = useToast();
  const { ocupacoes, alertas, refetch } = useCapacidadeOcupacao();
  const alertasExibidos = useRef<Set<string>>(new Set());

  const formatarMes = (mes: string): string => {
    try {
      const data = parse(mes, "yyyy-MM", new Date());
      return format(data, "MMM/yyyy", { locale: ptBR });
    } catch {
      return mes;
    }
  };

  const getTipoAlerta = (nivel: OcupacaoMensal["nivel"]): string => {
    switch (nivel) {
      case "amarelo":
        return "amarelo";
      case "laranja":
        return "laranja";
      case "vermelho":
        return "vermelho";
      default:
        return "amarelo";
    }
  };

  const registrarAlerta = async (alerta: OcupacaoMensal) => {
    if (!alerta.capacidade || alerta.ocupacao === null) return;

    try {
      // Verificar se já existe alerta recente para este mês
      const { data: alertaExistente } = await supabase
        .from("alertas_ocupacao")
        .select("id")
        .eq("mes", alerta.mes)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .single();

      if (!alertaExistente) {
        await supabase.from("alertas_ocupacao").insert({
          mes: alerta.mes,
          ocupacao_percentual: alerta.ocupacao,
          capacidade_pecas: alerta.capacidade,
          demanda_pecas: alerta.demanda,
          tipo_alerta: getTipoAlerta(alerta.nivel),
        });
      }
    } catch (error) {
      console.error("Erro ao registrar alerta:", error);
    }
  };

  useEffect(() => {
    // Exibir toasts para alertas de ocupação > 90%
    alertas
      .filter((a) => a.ocupacao !== null && a.ocupacao > 90)
      .forEach((alerta) => {
        const key = `${alerta.mes}-${Math.round(alerta.ocupacao || 0)}`;

        if (!alertasExibidos.current.has(key)) {
          alertasExibidos.current.add(key);

          const isVermelho = alerta.nivel === "vermelho";

          toast({
            title: isVermelho
              ? `⚠️ Capacidade excedida - ${formatarMes(alerta.mes)}`
              : `🔶 Capacidade em risco - ${formatarMes(alerta.mes)}`,
            description: `Ocupação: ${alerta.ocupacao?.toFixed(1)}% (${alerta.demanda.toLocaleString()} / ${alerta.capacidade?.toLocaleString()} peças)`,
            variant: isVermelho ? "destructive" : "default",
            duration: 8000,
          });

          // Registrar no banco
          registrarAlerta(alerta);
        }
      });
  }, [alertas, toast]);

  // Escutar mudanças em tempo real em pedidos
  useEffect(() => {
    const channel = supabase
      .channel("ocupacao-changes-hook")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pedidos",
        },
        () => {
          // Recalcular ocupação quando pedidos mudam
          refetch();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "referencias",
        },
        () => {
          // Recalcular ocupação quando referências mudam
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return { ocupacoes, alertas, refetch };
};
