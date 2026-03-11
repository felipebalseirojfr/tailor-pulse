import { useEffect, useRef, useCallback } from "react";
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
  estamparia: "Estamparia",
  bordado: "Bordado",
  acabamento: "Acabamento",
  entrega: "Entrega",
};

type NavigateToPedido = (pedidoId: string) => void;

export function useQRScanNotifications(options?: { navigateToPedido?: NavigateToPedido }) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const mountedRef = useRef(true);
  const navigateToPedido = options?.navigateToPedido;

  const handleNotification = useCallback(async (payload: {
    new: { status: string; pedido_id: string; tipo_etapa: string };
    old: { status: string };
  }) => {
    if (!mountedRef.current) return;

    try {
      const newData = payload.new;
      const oldData = payload.old;

      // Só notificar se a etapa foi concluída agora
      if (newData.status === 'concluido' && oldData.status !== 'concluido') {
        const { data: pedido, error } = await supabase
          .from('pedidos')
          .select('codigo_pedido, produto_modelo, clientes(nome)')
          .eq('id', newData.pedido_id)
          .single();

        if (error || !pedido || !mountedRef.current) {
          return;
        }

        const etapaNome = ETAPAS_NOMES[newData.tipo_etapa] || newData.tipo_etapa;
        const clienteNome = (pedido.clientes as { nome: string } | null)?.nome || '';

        toast.info(`📦 ${pedido.codigo_pedido || 'Pedido'}`, {
          description: `Etapa "${etapaNome}" concluída - ${pedido.produto_modelo}${clienteNome ? ` (${clienteNome})` : ''}`,
          duration: 8000,
          action: {
            label: "Ver detalhes",
            onClick: () => {
              // Preferir navegação SPA (evita reload/tela branca); fallback para location.
              if (navigateToPedido) {
                navigateToPedido(newData.pedido_id);
              } else {
                window.location.assign(`/pedidos/${newData.pedido_id}`);
              }
            }
          }
        });
      }
    } catch (err) {
      console.error('🔔 Erro ao processar notificação:', err);
    }
  }, [navigateToPedido]);

  useEffect(() => {
    mountedRef.current = true;

    // Pequeno delay para garantir que o componente está estável
    const initTimeout = setTimeout(() => {
      if (!mountedRef.current) return;

      console.log('🔔 Iniciando listener de notificações de produção...');

      const channel = supabase
        .channel('global-production-notifications-v2')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'etapas_producao'
          },
          (payload) => {
            const data = payload as unknown as {
              new: { status: string; pedido_id: string; tipo_etapa: string };
              old: { status: string };
            };
            handleNotification(data);
          }
        )
        .subscribe((status) => {
          if (!mountedRef.current) return;
          console.log('🔔 Status da subscription de notificações:', status);
        });

      channelRef.current = channel;
    }, 500);

    return () => {
      mountedRef.current = false;
      clearTimeout(initTimeout);

      if (channelRef.current) {
        console.log('🔔 Removendo listener de notificações');
        supabase.removeChannel(channelRef.current).catch(() => {
          // Ignorar erros de cleanup
        });
        channelRef.current = null;
      }
    };
  }, [handleNotification]);
}
