import { forwardRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PedidoChecklist {
  codigo_pedido?: string;
  produto_modelo: string;
  tipo_peca: string;
  quantidade_total: number;
  aviamentos?: string[] | null;
  tipos_personalizacao?: string[] | null;
  clientes?: {
    nome: string;
  };
}

interface ChecklistProducaoProps {
  pedido: PedidoChecklist;
}

const AVIAMENTOS_LABELS: Record<string, string> = {
  "Etiq de marca": "Etiqueta de marca separada",
  "Etiq de composição": "Etiqueta de composição separada",
  "Etiq de tamanho": "Etiqueta de tamanho separada",
  "Ziper": "Zíper separado",
  "Botão": "Botão separado",
  "Elástico": "Elástico separado",
  "Cordão": "Cordão separado",
  "Ilhós": "Ilhós separado",
  "Rebite": "Rebite separado",
  "Termocolante": "Termocolante separado",
  "Tag": "Tag separada",
};

export const ChecklistProducao = forwardRef<HTMLDivElement, ChecklistProducaoProps>(
  ({ pedido }, ref) => {
    const aviamentos = pedido.aviamentos || [];
    const personalizacoes = pedido.tipos_personalizacao || [];
    
    const temEstamparia = personalizacoes.some(p => 
      p.toLowerCase().includes("estamparia") || p.toLowerCase().includes("estampa")
    );
    const temBordado = personalizacoes.some(p => 
      p.toLowerCase().includes("bordado")
    );
    const temLavanderia = personalizacoes.some(p => 
      p.toLowerCase().includes("lavanderia")
    );

    // Gerar itens da Etapa 3 baseado nos aviamentos
    const itensAviamentos = aviamentos
      .filter(av => AVIAMENTOS_LABELS[av])
      .map(av => AVIAMENTOS_LABELS[av]);

    // Calcular numeração dinâmica das etapas
    let etapaNum = 1;
    const getNextEtapa = () => etapaNum++;

    return (
      <div ref={ref} className="checklist-print bg-white text-black p-8 max-w-2xl mx-auto">
        {/* Header */}
        <div className="border-b-2 border-black pb-4 mb-6">
          <h1 className="text-2xl font-bold text-center mb-2">
            📋 CHECKLIST DE PRODUÇÃO
          </h1>
          <div className="text-center space-y-1">
            <p className="font-semibold text-lg">{pedido.produto_modelo}</p>
            <p className="text-sm">
              {pedido.codigo_pedido && `Pedido: ${pedido.codigo_pedido} | `}
              Tipo: {pedido.tipo_peca} | Qtd: {pedido.quantidade_total} peças
            </p>
            {pedido.clientes?.nome && (
              <p className="text-sm">Cliente: {pedido.clientes.nome}</p>
            )}
            <p className="text-xs text-gray-600">
              Gerado em: {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>

        {/* Etapa 1 - Liberação de Corte */}
        <div className="mb-6">
          <h2 className="text-lg font-bold border-b border-gray-400 pb-1 mb-3">
            ▸ ETAPA {getNextEtapa()} – LIBERAÇÃO DE CORTE
          </h2>
          <div className="space-y-2 pl-4">
            <ChecklistItem label="Ficha de corte" />
            <ChecklistItem label="Ficha de costura" />
            <ChecklistItem label="Piloto lacrada" />
          </div>
        </div>

        {/* Etapa 2 - Pós-Corte */}
        <div className="mb-6">
          <h2 className="text-lg font-bold border-b border-gray-400 pb-1 mb-3">
            ▸ ETAPA {getNextEtapa()} – PÓS-CORTE
          </h2>
          <div className="space-y-2 pl-4">
            <ChecklistItem label="Contagem correta" />
            {temEstamparia && (
              <ChecklistItem label="Separação das partes para estamparia correta" />
            )}
            {temBordado && (
              <ChecklistItem label="Separação das partes para bordado correta" />
            )}
          </div>
        </div>

        {/* Etapa 3 - Pré-Oficina de Costura (condicional) */}
        {itensAviamentos.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold border-b border-gray-400 pb-1 mb-3">
              ▸ ETAPA {getNextEtapa()} – PRÉ-OFICINA DE COSTURA
            </h2>
            <div className="space-y-2 pl-4">
              {itensAviamentos.map((item, index) => (
                <ChecklistItem key={index} label={item} />
              ))}
            </div>
          </div>
        )}

        {/* Etapa - Pré-Lavanderia (condicional) */}
        {temLavanderia && (
          <div className="mb-6">
            <h2 className="text-lg font-bold border-b border-gray-400 pb-1 mb-3">
              ▸ ETAPA {getNextEtapa()} – PRÉ-LAVANDERIA
            </h2>
            <div className="space-y-2 pl-4">
              <ChecklistItem label="Piloto com lavagem lacrada" />
              <ChecklistItem label="Quantidade contada" />
            </div>
          </div>
        )}

        {/* Etapa - Pós-Lavanderia (condicional) */}
        {temLavanderia && (
          <div className="mb-6">
            <h2 className="text-lg font-bold border-b border-gray-400 pb-1 mb-3">
              ▸ ETAPA {getNextEtapa()} – PÓS-LAVANDERIA
            </h2>
            <div className="space-y-2 pl-4">
              <ChecklistItem label="Cores batem com a piloto?" />
              <ChecklistItem label="Contagem correta?" />
            </div>
          </div>
        )}

        {/* Etapa - Acabamento */}
        <div className="mb-6">
          <h2 className="text-lg font-bold border-b border-gray-400 pb-1 mb-3">
            ▸ ETAPA {getNextEtapa()} – ACABAMENTO
          </h2>
          <div className="space-y-2 pl-4">
            <ChecklistItem label="Contagem correta" />
            <ChecklistItem label="Fechamento realizado" />
            <ChecklistItem label="Caixas fechadas" />
            <ChecklistItem label="Tags aplicadas" />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-black pt-4 mt-8 space-y-4">
          <div className="flex gap-8">
            <div className="flex-1">
              <p className="text-sm font-medium mb-1">Data:</p>
              <div className="border-b border-gray-400 h-6"></div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium mb-1">Responsável:</p>
              <div className="border-b border-gray-400 h-6"></div>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-1">Observações:</p>
            <div className="border border-gray-400 h-20 rounded"></div>
          </div>
        </div>

        {/* Print styles */}
        <style>{`
          @media print {
            .checklist-print {
              margin: 0;
              padding: 20px;
              max-width: 100%;
            }
            body * {
              visibility: hidden;
            }
            .checklist-print, .checklist-print * {
              visibility: visible;
            }
            .checklist-print {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
          }
        `}</style>
      </div>
    );
  }
);

ChecklistProducao.displayName = "ChecklistProducao";

function ChecklistItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-5 h-5 border-2 border-black rounded-sm flex-shrink-0" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
