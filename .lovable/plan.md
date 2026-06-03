## Dev-2 FINAL — Plano de implementação

Escopo grande. Vou entregar em uma única passada, mas dividido em blocos claros para revisão.

### 1. Migração SQL (single migration)

Adicionar em `referencias`:
- `prioridade_desenvolvimento int NOT NULL DEFAULT 0`
- `numero_rodada_piloto int NOT NULL DEFAULT 1`
- `alteracoes_fitting text NULL`
- `aprovada_com_alteracoes bool NOT NULL DEFAULT false`

Novos valores no enum `tipo_etapa`:
- `piloto_enviada_cliente`
- `aguardando_aprovacao_cliente`

Observação sobre regra 5 (fichas obrigatórias): as tabelas `fichas_tecnicas` e `fichas_costura` ainda não existem (vêm em Dev-3/Dev-4). O check vai usar try/catch — se a tabela não existir, retorna `false` e bloqueia o lacre, como pedido.

### 2. `src/lib/piloto-etapas.ts`

- Adicionar enum/labels para `piloto_enviada_cliente` e `aguardando_aprovacao_cliente`.
- Remover `lacre_piloto` da sequência (vira ação, não etapa).
- Etapas fixas: 1ª `desenvolvimento_modelagem`, últimas duas `piloto_enviada_cliente` → `aguardando_aprovacao_cliente`.
- `avancarEtapa()`: atualizar regra de status — última etapa concluída NÃO lacra automaticamente; lacre passa a ser função separada `lacrarPiloto()` + `solicitarFitting({ alteracoes, novaPiloto })`.
- `checkFichasFinalizadas(refId)` — retorna `{ tecnica: boolean, costura: boolean }`, com try/catch para tabelas inexistentes.

### 3. `src/pages/Desenvolvimento.tsx` — reescrita

Estrutura: 3 sub-tabs `Painel · Acompanhamento · Filas`, botão "+ Novo Desenvolvimento" sempre visível.

**Painel:**
- 4 KPIs (Em Desenvolvimento, Piloto em Produção, Piloto Pronta, Sem DXF — laranja se > 0).
- Grid "Pilotos por Etapa" — contagem de refs por `tipo_etapa` em `em_andamento`. Click filtra Acompanhamento.
- Alertas: paradas > 5 dias, sem DXF, em correção (destaque separado).

**Acompanhamento (default):**
- Cards por cliente (mesmo visual do Pedidos em Produção).
- Expande inline em lista de refs com badge de fitting quando `numero_rodada_piloto > 1`, indicador DXF, progresso, botão "Avançar Etapa".

**Filas:**
- Fila de Modelagem, Fila de Costura — com setas ↑↓ para reordenar (persiste em `prioridade_desenvolvimento`).
- Em Terceiros — read-only, agrupado por etapa, com nome do terceiro.

Mantém: imprimir PDF da fila, excluir referência (soft delete), upload inline de DXF.

### 4. Banner DXF — `src/components/desenvolvimento/DxfBanner.tsx`

Componente já existe. Garantir que aparece em `ReferenciaDetalhe` entre header e Seção A, para status `em_desenvolvimento | piloto_em_producao | em_correcao`. Laranja se sem DXF ativo, verde se com.

### 5. Seção F — `EtapasPilotoSection`

Reescrever configurador:
- Etapas configuráveis: `plotagem_risco, corte, costura, lavanderia, estamparia, estamparia_bordado, bordado, caseado, acabamento`.
- `desenvolvimento_modelagem` sempre 1ª (fixa, locked).
- `piloto_enviada_cliente` + `aguardando_aprovacao_cliente` sempre as duas últimas (auto-append, locked).
- Atribuição de terceiros nas etapas aplicáveis.
- Stepper horizontal com estado completo/atual/pendente.

Fluxo de avanço:
- Etapas normais: confirmação simples.
- `desenvolvimento_modelagem`: bloqueado sem DXF.
- `aguardando_aprovacao_cliente`: abre **modal de decisão**:
  - **A — Aprovada → Lacrar:** valida fichas; se OK seta `piloto_lacrada`; se falta, mostra mensagem com links âncora para `#ficha-tecnica` / `#ficha-costura`.
  - **B — Fitting:** textarea (obrigatório) + radio nova piloto SIM/NÃO.
    - SIM: incrementa `numero_rodada_piloto`, status `em_correcao`, conclui etapas atuais, cria nova rodada de `piloto_etapas` com mesma sequência começando em `desenvolvimento_modelagem`.
    - NÃO: salva notas, `aprovada_com_alteracoes = true`, valida fichas, lacra.

### 6. `ReferenciaDetalhe.tsx`

- Inserir `<DxfBanner>` abaixo do header.
- Inserir `<EtapasPilotoSection>` entre banner e Seção A.
- Colapsar "Modelagem Origem" dentro de "Opções avançadas ▼" (fechado por padrão) no formulário de novo desenvolvimento (no `Desenvolvimento.tsx`, modal de criação).
- Adicionar `id="ficha-tecnica"` e `id="ficha-costura"` em placeholders para que os links do modal de lacre rolem para lá (mesmo que as seções venham em Dev-3/4).

### Arquivos tocados

- `supabase/migrations/...` (nova)
- `src/lib/piloto-etapas.ts` (atualiza)
- `src/pages/Desenvolvimento.tsx` (reescrita ampla)
- `src/components/desenvolvimento/EtapasPilotoSection.tsx` (reescrita do configurador + modal de decisão)
- `src/pages/ReferenciaDetalhe.tsx` (insere banner + Seção F + âncoras)
- `src/components/desenvolvimento/DxfBanner.tsx` (ajustes pequenos se necessário)

### Pontos que quero confirmar antes de codar

1. **Stage editing lock** — uma vez que qualquer etapa esteja `concluido`, a sequência é trancada. Mas no fluxo de Fitting com nova piloto, eu **arquivo** as etapas antigas como `concluido` e crio uma nova rodada zerada, certo? Isso bate com a regra 6 ("histórico preservado") mas tecnicamente "reseta" o lock para a nova rodada. Confirmo essa leitura?

2. **"Pilotos por Etapa" filtra Acompanhamento** — clicar no contador de uma etapa filtra a lista de refs mostrando só as que têm aquela etapa em andamento. OK?

3. **Reordenar filas** — vou usar setas ↑↓ (não drag-and-drop) por ser bem mais robusto e rápido. OK?

Se concordar, executo tudo de uma vez.