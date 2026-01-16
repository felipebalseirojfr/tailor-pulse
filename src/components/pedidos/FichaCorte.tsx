import { forwardRef } from "react";

interface GradeTamanhos {
  [tamanho: string]: number;
}

interface FichaCorteProps {
  produtoModelo: string;
  tipoPeca: string;
  tecido: string;
  codigoPedido: string;
  gradeTamanhos: GradeTamanhos;
  quantidadeTotal: number;
  observacoes?: string;
  clienteNome: string;
}

export const FichaCorte = forwardRef<HTMLDivElement, FichaCorteProps>(
  (
    {
      produtoModelo,
      tipoPeca,
      tecido,
      codigoPedido,
      gradeTamanhos,
      quantidadeTotal,
      observacoes,
      clienteNome,
    },
    ref
  ) => {
    // Filtrar apenas tamanhos com quantidade > 0
    const tamanhosComQuantidade = Object.entries(gradeTamanhos || {}).filter(
      ([_, qtd]) => qtd > 0
    );

    // Ordenar tamanhos
    const ordemTamanhos = [
      "1", "2", "4", "6", "8", "10", "12", "14",
      "PP", "P", "M", "G", "GG", "XGG", "XGG1", "XGG2", "XGG3"
    ];
    
    const tamanhosOrdenados = tamanhosComQuantidade.sort((a, b) => {
      const indexA = ordemTamanhos.indexOf(a[0]);
      const indexB = ordemTamanhos.indexOf(b[0]);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    // Calcular o total real baseado na grade de tamanhos
    const totalCalculado = tamanhosComQuantidade.reduce(
      (acc, [_, qtd]) => acc + qtd,
      0
    );

    return (
      <div
        ref={ref}
        className="bg-white text-black p-8 min-h-[210mm] w-[297mm]"
        style={{
          fontFamily: "Arial, sans-serif",
          fontSize: "12pt",
        }}
      >
        {/* Cabeçalho */}
        <div className="border-2 border-black mb-6">
          <div className="bg-black text-white text-center py-3">
            <h1 className="text-2xl font-bold tracking-wide">FICHA DE CORTE</h1>
          </div>
          <div className="grid grid-cols-2 divide-x divide-black">
            <div className="p-4 space-y-2">
              <div className="flex">
                <span className="font-bold w-24">OP:</span>
                <span className="flex-1 border-b border-black">{codigoPedido}</span>
              </div>
              <div className="flex">
                <span className="font-bold w-24">Cliente:</span>
                <span className="flex-1 border-b border-black">{clienteNome}</span>
              </div>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex">
                <span className="font-bold w-24">Referência:</span>
                <span className="flex-1 border-b border-black">{tipoPeca}</span>
              </div>
              <div className="flex">
                <span className="font-bold w-24">Data:</span>
                <span className="flex-1 border-b border-black">
                  {new Date().toLocaleDateString("pt-BR")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Informações do Produto */}
        <div className="border-2 border-black mb-6">
          <div className="bg-gray-200 px-4 py-2 border-b border-black">
            <h2 className="font-bold text-lg">INFORMAÇÕES DO PRODUTO</h2>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4">
            <div className="flex">
              <span className="font-bold w-32">Nome do Produto:</span>
              <span className="flex-1">{produtoModelo}</span>
            </div>
            <div className="flex">
              <span className="font-bold w-32">Qtd. Total:</span>
              <span className="flex-1 font-bold text-lg">{totalCalculado} peças</span>
            </div>
            <div className="flex col-span-2">
              <span className="font-bold w-32">Tecido(s):</span>
              <span className="flex-1">{tecido || "Não especificado"}</span>
            </div>
          </div>
        </div>

        {/* Grade de Tamanhos */}
        <div className="border-2 border-black mb-6">
          <div className="bg-gray-200 px-4 py-2 border-b border-black">
            <h2 className="font-bold text-lg">GRADE DE TAMANHOS</h2>
          </div>
          <div className="p-4">
            {tamanhosOrdenados.length > 0 ? (
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border-2 border-black bg-gray-100 px-4 py-2 text-left">
                      Tamanho
                    </th>
                    {tamanhosOrdenados.map(([tamanho]) => (
                      <th
                        key={tamanho}
                        className="border-2 border-black bg-gray-100 px-4 py-2 text-center min-w-[60px]"
                      >
                        {tamanho}
                      </th>
                    ))}
                    <th className="border-2 border-black bg-gray-300 px-4 py-2 text-center font-bold">
                      TOTAL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border-2 border-black px-4 py-3 font-medium">
                      Quantidade
                    </td>
                    {tamanhosOrdenados.map(([tamanho, qtd]) => (
                      <td
                        key={tamanho}
                        className="border-2 border-black px-4 py-3 text-center text-lg font-semibold"
                      >
                        {qtd}
                      </td>
                    ))}
                    <td className="border-2 border-black bg-gray-100 px-4 py-3 text-center text-xl font-bold">
                      {totalCalculado}
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="text-center text-gray-500 py-4">
                Grade de tamanhos não especificada
              </p>
            )}
          </div>
        </div>

        {/* Observações */}
        <div className="border-2 border-black">
          <div className="bg-gray-200 px-4 py-2 border-b border-black">
            <h2 className="font-bold text-lg">OBSERVAÇÕES</h2>
          </div>
          <div className="p-4 min-h-[80px]">
            {observacoes ? (
              <p className="whitespace-pre-wrap">{observacoes}</p>
            ) : (
              <p className="text-gray-400 italic">Nenhuma observação registrada.</p>
            )}
          </div>
        </div>

        {/* Rodapé com assinaturas */}
        <div className="mt-8 grid grid-cols-3 gap-8 pt-4">
          <div className="text-center">
            <div className="border-t-2 border-black pt-2">
              <p className="font-medium">Cortador</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t-2 border-black pt-2">
              <p className="font-medium">Conferente</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t-2 border-black pt-2">
              <p className="font-medium">Data/Hora</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

FichaCorte.displayName = "FichaCorte";
