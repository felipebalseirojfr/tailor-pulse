import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ETAPAS_NOMES: Record<string, string> = {
  pilotagem: "Pilotagem",
  liberacao_corte: "Liberação de Corte",
  corte: "Corte",
  lavanderia: "Lavanderia",
  costura: "Costura",
  caseado: "Caseado",
  estamparia_bordado: "Estamparia/Bordado",
  acabamento: "Acabamento",
  entrega: "Entrega",
};

export function useQRScanNotifications() {
  const navigate = useNavigate();

  useEffect(() => {
    const channel = supabase
      .channel('global-qr-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'escaneamentos_qr'
        },
        async (payload) => {
          const newScan = payload.new as {
            pedido_id: string;
            etapa_atualizada: string;
            fornecedor_nome?: string;
          };

          // Buscar dados do pedido
          const { data: pedido } = await supabase
            .from('pedidos')
            .select('codigo_pedido, produto_modelo, clientes(nome)')
            .eq('id', newScan.pedido_id)
            .single();

          if (!pedido) return;

          const etapaNome = ETAPAS_NOMES[newScan.etapa_atualizada] || newScan.etapa_atualizada;
          const clienteNome = (pedido.clientes as { nome: string } | null)?.nome || '';

          toast.info(`📦 ${pedido.codigo_pedido || 'Pedido'}`, {
            description: `Etapa "${etapaNome}" concluída - ${pedido.produto_modelo}${clienteNome ? ` (${clienteNome})` : ''}`,
            duration: 8000,
            action: {
              label: "Ver detalhes",
              onClick: () => navigate(`/pedidos/${newScan.pedido_id}`)
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate]);
}
