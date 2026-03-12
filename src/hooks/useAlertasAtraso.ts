import { useMemo } from "react";

export type NivelAlerta = "atrasado" | "risco" | "ok" | "pendente";

export interface EtapaComAlerta {
  id: string;
  pedido_id: string;
  pedido_modelo: string;
  pedido_codigo?: string;
  cliente_nome: string;
  tipo_etapa: string;
  ordem: number;
  status: string;
  data_termino_prevista: string | null;
  data_inicio_prevista: string | null;
  data_inicio: string | null;
  data_termino: string | null;
  responsavel_nome?: string;
  nivel_alerta: NivelAlerta;
  dias_restantes: number | null;
}

export function calcularNivelAlerta(
  status: string,
  dataTerminoPrevista: string | null
): { nivel: NivelAlerta; diasRestantes: number | null } {
  if (status === "concluido") return { nivel: "ok", diasRestantes: null };
  if (!dataTerminoPrevista) return { nivel: "pendente", diasRestantes: null };

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const prazo = new Date(dataTerminoPrevista);
  prazo.setHours(0, 0, 0, 0);

  const diffMs = prazo.getTime() - hoje.getTime();
  const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diasRestantes < 0) return { nivel: "atrasado", diasRestantes };
  if (diasRestantes <= 2) return { nivel: "risco", diasRestantes };
  return { nivel: "ok", diasRestantes };
}

export function useAlertasAtraso(etapasComPedidos: any[]): EtapaComAlerta[] {
  return useMemo(() => {
    return etapasComPedidos
      .filter((e) => e.status !== "concluido")
      .map((etapa) => {
        const { nivel, diasRestantes } = calcularNivelAlerta(
          etapa.status,
          etapa.data_termino_prevista
        );
        return {
          ...etapa,
          nivel_alerta: nivel,
          dias_restantes: diasRestantes,
        };
      })
      .sort((a, b) => {
        const ordem = { atrasado: 0, risco: 1, ok: 2, pendente: 3 };
        return ordem[a.nivel_alerta] - ordem[b.nivel_alerta];
      });
  }, [etapasComPedidos]);
}
