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
    console.log('🔔 Iniciando listener de notificações de produção...');
    
    const channel = supabase
      .channel('global-production-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'etapas_producao'
        },
        async (payload) => {
          console.log('🔔 Mudança detectada em etapa:', payload);
          
          const newData = payload.new as { status: string; pedido_id: string; tipo_etapa: string };
          const oldData = payload.old as { status: string };
          
          // Só notificar se a etapa foi concluída agora (mudou de outro status para concluido)
          if (newData.status === 'concluido' && oldData.status !== 'concluido') {
            console.log('🔔 Etapa concluída! Buscando dados do pedido...');
            
            // Buscar dados do pedido
            const { data: pedido } = await supabase
              .from('pedidos')
              .select('codigo_pedido, produto_modelo, clientes(nome)')
              .eq('id', newData.pedido_id)
              .single();

            if (!pedido) {
              console.log('🔔 Pedido não encontrado');
              return;
            }

            const etapaNome = ETAPAS_NOMES[newData.tipo_etapa] || newData.tipo_etapa;
            const clienteNome = (pedido.clientes as { nome: string } | null)?.nome || '';

            console.log('🔔 Exibindo notificação para:', pedido.codigo_pedido, etapaNome);

            toast.info(`📦 ${pedido.codigo_pedido || 'Pedido'}`, {
              description: `Etapa "${etapaNome}" concluída - ${pedido.produto_modelo}${clienteNome ? ` (${clienteNome})` : ''}`,
              duration: 8000,
              action: {
                label: "Ver detalhes",
                onClick: () => navigate(`/pedidos/${newData.pedido_id}`)
              }
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('🔔 Status da subscription de notificações:', status);
      });

    return () => {
      console.log('🔔 Removendo listener de notificações');
      supabase.removeChannel(channel);
    };
  }, [navigate]);
}
