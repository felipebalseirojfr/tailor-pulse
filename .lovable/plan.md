

## Plano: Separar "Estamparia/Bordado" em dois botões independentes

### O que muda

No array `tiposEtapaDisponiveis` em `src/components/pedidos/EtapasManager.tsx`, a entrada única `estamparia_bordado` será substituída por duas entradas separadas:

- `estamparia` → "Estamparia"
- `bordado` → "Bordado"

### Arquivo alterado

**`src/components/pedidos/EtapasManager.tsx`** — linha 32: substituir a entrada combinada por duas linhas separadas.

Nenhuma outra alteração necessária, pois o restante do componente já funciona dinamicamente com base no array.

