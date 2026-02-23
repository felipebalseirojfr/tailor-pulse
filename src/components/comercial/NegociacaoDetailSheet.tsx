import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Edit, MessageSquarePlus, CheckCircle } from "lucide-react";
import { useNegociacaoInteracoes } from "@/hooks/useComercialData";
import {
  STATUS_PIPELINE_LABELS,
  PRIORIDADE_LABELS,
  SEGMENTO_LABELS,
  ORIGEM_LABELS,
  TEMPERATURA_LABELS,
  BLOQUEADO_POR_LABELS,
  type Negociacao,
} from "@/types/comercial";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import NegociacaoFormDialog from "./NegociacaoFormDialog";
import RegistrarInteracaoDialog from "./RegistrarInteracaoDialog";
import ConcluirAcaoDialog from "./ConcluirAcaoDialog";

interface Props {
  open: boolean;
  onClose: () => void;
  negociacao: Negociacao;
}

export default function NegociacaoDetailSheet({ open, onClose, negociacao }: Props) {
  const { data: interacoes = [] } = useNegociacaoInteracoes(negociacao.id);
  const [showEdit, setShowEdit] = useState(false);
  const [showInteracao, setShowInteracao] = useState(false);
  const [showConcluir, setShowConcluir] = useState(false);

  const InfoRow = ({ label, value }: { label: string; value?: string | number | null }) => (
    value ? (
      <div className="flex justify-between py-1.5">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm text-foreground font-medium">{value}</span>
      </div>
    ) : null
  );

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-xl">{negociacao.marca_nome}</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 mt-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{STATUS_PIPELINE_LABELS[negociacao.status_pipeline]}</Badge>
              <Badge variant={negociacao.prioridade === "alta" ? "destructive" : negociacao.prioridade === "media" ? "default" : "secondary"}>
                {PRIORIDADE_LABELS[negociacao.prioridade]}
              </Badge>
              {negociacao.temperatura && (
                <Badge variant="outline">{TEMPERATURA_LABELS[negociacao.temperatura]}</Badge>
              )}
              {negociacao.bloqueado_por && (
                <Badge variant="secondary">{BLOQUEADO_POR_LABELS[negociacao.bloqueado_por]}</Badge>
              )}
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowEdit(true)}>
                <Edit className="h-3.5 w-3.5 mr-1" /> Editar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowInteracao(true)}>
                <MessageSquarePlus className="h-3.5 w-3.5 mr-1" /> Interação
              </Button>
              <Button size="sm" onClick={() => setShowConcluir(true)}>
                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Concluir Ação
              </Button>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Próxima Ação</h3>
              <p className="text-sm text-foreground bg-muted/50 rounded-lg p-3">{negociacao.proxima_acao}</p>
              <p className="text-xs text-muted-foreground mt-1">
                📅 {negociacao.data_proxima_acao.split("-").reverse().join("/")}
              </p>
            </div>

            <Separator />

            <div className="space-y-0">
              <InfoRow label="Responsável" value={negociacao.responsavel?.nome} />
              <InfoRow label="Segmento" value={negociacao.segmento ? SEGMENTO_LABELS[negociacao.segmento] : null} />
              <InfoRow label="Origem" value={negociacao.origem ? ORIGEM_LABELS[negociacao.origem] : null} />
              <InfoRow label="Volume Estimado/Mês" value={negociacao.volume_estimado_mes ? `${negociacao.volume_estimado_mes} peças` : null} />
              <InfoRow label="Ticket Estimado/Mês" value={negociacao.ticket_estimado_mes ? `R$ ${Number(negociacao.ticket_estimado_mes).toLocaleString("pt-BR")}` : null} />
              <InfoRow label="Previsão Fechamento" value={negociacao.previsao_fechamento?.split("-").reverse().join("/")} />
              <InfoRow label="Última Interação" value={negociacao.data_ultima_interacao?.split("-").reverse().join("/")} />
            </div>

            {negociacao.observacoes && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">Observações</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{negociacao.observacoes}</p>
                </div>
              </>
            )}

            <Separator />

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Histórico de Interações</h3>
              {interacoes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma interação registrada.</p>
              ) : (
                <div className="space-y-3">
                  {interacoes.map((int) => (
                    <div key={int.id} className="border border-border rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs capitalize">{int.tipo}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(int.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{int.resumo}</p>
                      {int.usuario?.nome && (
                        <p className="text-xs text-muted-foreground">por {int.usuario.nome}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {showEdit && (
        <NegociacaoFormDialog open={showEdit} onClose={() => setShowEdit(false)} negociacao={negociacao} />
      )}
      {showInteracao && (
        <RegistrarInteracaoDialog
          open={showInteracao}
          onClose={() => setShowInteracao(false)}
          item={{ type: "negociacao", id: negociacao.id, nome: negociacao.marca_nome }}
        />
      )}
      {showConcluir && (
        <ConcluirAcaoDialog
          open={showConcluir}
          onClose={() => setShowConcluir(false)}
          item={{ type: "negociacao", id: negociacao.id, nome: negociacao.marca_nome, proxima_acao: negociacao.proxima_acao }}
        />
      )}
    </>
  );
}
