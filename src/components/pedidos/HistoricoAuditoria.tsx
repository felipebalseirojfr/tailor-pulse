import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Clock, User, Undo2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HistoricoAuditoriaProps {
  pedidoId: string;
  onUndo?: (logId: string, dadosAntes: any) => Promise<void>;
}

interface LogAuditoria {
  id: string;
  usuario_nome: string;
  acao: string;
  campos_alterados: any;
  dados_antes: any;
  dados_depois: any;
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
  reversão_completa: "Reversão Completa",
};

export function HistoricoAuditoria({ pedidoId, onUndo }: HistoricoAuditoriaProps) {
  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [undoingLogId, setUndoingLogId] = useState<string | null>(null);
  const [confirmUndoLog, setConfirmUndoLog] = useState<LogAuditoria | null>(null);

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

  const handleUndoClick = (log: LogAuditoria) => {
    if (!log.dados_antes) {
      return;
    }
    setConfirmUndoLog(log);
  };

  const handleConfirmUndo = async () => {
    if (!confirmUndoLog || !onUndo) return;

    setUndoingLogId(confirmUndoLog.id);
    try {
      await onUndo(confirmUndoLog.id, confirmUndoLog.dados_antes);
      await fetchLogs(); // Recarregar logs após o undo
    } catch (error) {
      console.error("Erro ao desfazer:", error);
    } finally {
      setUndoingLogId(null);
      setConfirmUndoLog(null);
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
    <>
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
                    <div className="flex flex-wrap gap-1 mb-2">
                      {log.campos_alterados.map((campo: string) => (
                        <Badge key={campo} variant="secondary" className="text-xs">
                          {CAMPO_LABELS[campo] || campo}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Botão de Desfazer */}
                  {onUndo && log.dados_antes && log.acao !== "Reversão manual" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUndoClick(log)}
                      disabled={undoingLogId === log.id}
                      className="mt-2"
                    >
                      {undoingLogId === log.id ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Desfazendo...
                        </>
                      ) : (
                        <>
                          <Undo2 className="mr-2 h-3 w-3" />
                          Desfazer
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Modal de Confirmação */}
      <AlertDialog open={!!confirmUndoLog} onOpenChange={() => setConfirmUndoLog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Reversão</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja reverter o pedido para o estado anterior a esta alteração?
              {confirmUndoLog && (
                <span className="block mt-2 font-medium text-foreground">
                  "{confirmUndoLog.acao}" por {confirmUndoLog.usuario_nome}
                </span>
              )}
              <span className="block mt-2 text-warning">
                Esta ação irá restaurar todos os dados do pedido e etapas para o estado anterior.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUndo}>
              <Undo2 className="mr-2 h-4 w-4" />
              Confirmar Reversão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
