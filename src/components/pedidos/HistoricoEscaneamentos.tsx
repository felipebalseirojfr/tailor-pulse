import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Escaneamento {
  id: string;
  etapa_atualizada: string;
  fornecedor_nome: string | null;
  escaneado_em: string;
}

interface HistoricoEscaneamentosProps {
  pedidoId: string;
}

const ETAPAS_NOMES: Record<string, string> = {
  pilotagem: "Pilotagem",
  compra_de_insumos: "Compra de Insumos",
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

export function HistoricoEscaneamentos({ pedidoId }: HistoricoEscaneamentosProps) {
  const [escaneamentos, setEscaneamentos] = useState<Escaneamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEscaneamentos();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`escaneamentos-changes-${pedidoId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'escaneamentos_qr',
          filter: `pedido_id=eq.${pedidoId}`
        },
        () => {
          fetchEscaneamentos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pedidoId]);

  const fetchEscaneamentos = async () => {
    try {
      const { data, error } = await supabase
        .from('escaneamentos_qr')
        .select('id, etapa_atualizada, fornecedor_nome, escaneado_em')
        .eq('pedido_id', pedidoId)
        .order('escaneado_em', { ascending: false });

      if (error) throw error;
      setEscaneamentos(data || []);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Histórico de Escaneamentos
        </CardTitle>
        <CardDescription>
          Registro de todos os escaneamentos do QR Code desta produção
        </CardDescription>
      </CardHeader>
      <CardContent>
        {escaneamentos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum escaneamento registrado ainda</p>
            <p className="text-sm mt-1">O histórico aparecerá aqui quando o QR Code for escaneado</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-4">
              {escaneamentos.map((esc, index) => (
                <div
                  key={esc.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-shrink-0 mt-1">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        {ETAPAS_NOMES[esc.etapa_atualizada] || esc.etapa_atualizada}
                      </Badge>
                      {index === 0 && (
                        <Badge className="text-xs bg-primary">Mais recente</Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium">
                      {esc.fornecedor_nome || 'Fornecedor não identificado'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(esc.escaneado_em), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
