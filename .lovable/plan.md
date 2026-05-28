## Objetivo
Separar a página `/pcp/fechamentos` em **3 fases sequenciais** que refletem o fluxo real da fábrica, em vez do modelo atual de "Em contagem / Emissão de NF". Cada peça caminha automaticamente de uma aba para a seguinte conforme a funcionária salva cada etapa.

## Novo fluxo

```text
Acabamento (em_andamento)  →  cria fechamento (já existe)
            │
            ▼
[1] Aba "Revisão / Entrada"
   funcionária conta a grade que CHEGOU pra revisão
   salva → registra quantidade_entrada + grade_entrada
            │
            ▼
[2] Aba "Fechamento"
   mostra entrada (read-only) + nova contagem PÓS-revisão
   salva → registra quantidade_saida + grade_saida + caixas + obs perda
            │
            ▼
[3] Aba "Emissão de NF"
   emite NF (número, data, arquivo)
   ao confirmar → avança etapa do pedido para "Entrega"
```

## Mudanças

### `src/pages/Fechamentos.tsx`
- Trocar as 2 abas atuais por **3 abas**:
  - **Revisão** — `quantidade_entrada == null` (ícone PackageCheck)
  - **Fechamento** — `quantidade_entrada != null && quantidade_saida == null` (ícone ClipboardList)
  - **Emissão de NF** — `quantidade_saida != null && status_nf === "pendente"` (ícone FileCheck2)
- Cada aba mostra um badge com a contagem.
- Passar a "fase atual" para o `FechamentoSheet` para ele renderizar apenas o que faz sentido naquela aba.

### `src/components/fechamentos/FechamentoSheet.tsx`
Adicionar prop `fase: "revisao" | "fechamento" | "nf"` e renderizar condicionalmente:

- **fase = "revisao"**
  - Mostra só o bloco de Entrada (grade + data + responsável).
  - Botão único: **"Confirmar entrada na revisão"** — salva `grade_entrada`, `quantidade_entrada`, `data_entrada`, `responsavel_entrada`. Não exige caixas nem obs.
  - Saída/NF ficam ocultos.

- **fase = "fechamento"**
  - Bloco de Entrada exibido **read-only** (resumo da grade + total + quem contou).
  - Bloco de Saída editável (grade + data + responsável + caixas + diferença + obs perda).
  - Botão: **"Salvar fechamento e enviar para emissão de NF"** — salva saída e marca pronto para NF.
  - NF oculto.

- **fase = "nf"**
  - Entrada e Saída mostradas read-only (resumo enxuto: totais e diferença).
  - Bloco de NF editável (já existe). Ao emitir, `advanceStage` para Entrega como hoje.

### Regras mantidas
- Tabela, filtros, summary cards, edge cases de diferença negativa, validação de obs obrigatória quando há diferença.
- `sync_fechamento_acabamento` trigger continua criando o registro quando acabamento vira `em_andamento` — nada muda no banco.
- Sem alteração de schema.

## Detalhes técnicos
- A "fase" é derivada do estado do registro (não há coluna nova) — calculada tanto no filtro da página quanto no Sheet.
- O `handleSalvarContagem` atual será dividido internamente em `salvarEntrada()` e `salvarSaida()` para validações específicas por fase.
- Realtime já recarrega a lista; ao salvar, o registro migra naturalmente para a próxima aba.

## Fora do escopo
- Nenhuma mudança em corte, ficha, ou outras páginas.
- Sem mudança em permissões/roles.
