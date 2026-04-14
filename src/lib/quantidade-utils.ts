/**
 * Calcula a quantidade total de peças a partir da grade de tamanhos.
 * Se a grade não existir ou estiver vazia, retorna o campo quantidade_total.
 */
export function calcularQuantidadeReal(
  gradeTamanhos: Record<string, number> | null | undefined,
  quantidadeTotalFallback: number
): number {
  if (gradeTamanhos && typeof gradeTamanhos === 'object') {
    const valores = Object.values(gradeTamanhos).filter(
      (v): v is number => typeof v === 'number'
    );
    if (valores.length > 0) {
      return valores.reduce((acc, val) => acc + val, 0);
    }
  }
  return quantidadeTotalFallback;
}
