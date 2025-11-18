import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Clock, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HistoricoAuditoriaProps {
  pedidoId: string;
}

interface LogAuditoria {
  id: string;
  usuario_nome: string;
  acao: string;
  campos_alterados: any;
  created_at: string;
}

const CAMPO_LABELS: Record<string, string> = {
  cliente_id: "Cliente",
  produto_modelo: "Produto/Modelo",
  tipo_peca: "Tipo de Peça",
  tecido: "Tecido",
  aviamentos: "Aviamentos",
  quantidade_total: "Quantidade Total",
  data_inicio: "Data de Início",
  prazo_final: "Prazo Final",
  grade_tamanhos: "Grade de Tamanhos",
  observacoes_pedido: "Observações",
  arquivos_adicionados: "Arquivos Adicionados",
  arquivos_removidos: "Arquivos Removidos",
  etapas_alteradas: "Datas Previstas das Etapas",
};

export function HistoricoAuditoria({ pedidoId }: HistoricoAuditoriaProps) {
  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [pedidoId]);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("pedidos_auditoria")
        .select("*")
        .eq("pedido_id", pedidoId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Alterações</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhuma alteração registrada ainda.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Histórico de Alterações</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {logs.map((log) => (
              <div
                key={log.id}
                className="border-l-2 border-primary pl-4 pb-4 relative"
              >
                <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-primary" />
                
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">
                      {log.usuario_nome}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(log.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </div>
                </div>

                <p className="text-sm font-medium mb-2">{log.acao}</p>

                {log.campos_alterados && log.campos_alterados.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {log.campos_alterados.map((campo) => (
                      <Badge key={campo} variant="secondary" className="text-xs">
                        {CAMPO_LABELS[campo] || campo}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
