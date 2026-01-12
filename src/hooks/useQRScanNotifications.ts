import { useEffect, useRef, useCallback } from "react";
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
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 5;

  const setupChannel = useCallback(() => {
    // Limpar channel anterior se existir
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

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
          try {
            console.log('🔔 Mudança detectada em etapa:', payload);
            
            const newData = payload.new as { status: string; pedido_id: string; tipo_etapa: string };
            const oldData = payload.old as { status: string };
            
            // Só notificar se a etapa foi concluída agora
            if (newData.status === 'concluido' && oldData.status !== 'concluido') {
              console.log('🔔 Etapa concluída! Buscando dados do pedido...');
              
              const { data: pedido, error } = await supabase
                .from('pedidos')
                .select('codigo_pedido, produto_modelo, clientes(nome)')
                .eq('id', newData.pedido_id)
                .single();

              if (error || !pedido) {
                console.log('🔔 Pedido não encontrado ou erro:', error);
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
          } catch (err) {
            console.error('🔔 Erro ao processar notificação:', err);
          }
        }
      )
      .subscribe((status, err) => {
        console.log('🔔 Status da subscription de notificações:', status);
        
        if (status === 'SUBSCRIBED') {
          retryCountRef.current = 0; // Reset retry count on success
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('🔔 Erro na subscription, tentando reconectar...', err);
          
          // Retry com backoff exponencial
          if (retryCountRef.current < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
            retryCountRef.current++;
            
            if (retryTimeoutRef.current) {
              clearTimeout(retryTimeoutRef.current);
            }
            
            retryTimeoutRef.current = setTimeout(() => {
              console.log(`🔔 Tentativa de reconexão ${retryCountRef.current}/${maxRetries}`);
              setupChannel();
            }, delay);
          } else {
            console.error('🔔 Máximo de tentativas atingido para notificações');
          }
        }
      });

    channelRef.current = channel;
  }, [navigate]);

  useEffect(() => {
    setupChannel();

    return () => {
      console.log('🔔 Removendo listener de notificações');
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [setupChannel]);
}
