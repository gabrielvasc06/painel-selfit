# Backend integration contract

Este front ainda usa `localStorage`, mas os contratos para troca por API ficam em:

- `src/services/inventory/inventoryTypes.ts`
- `src/services/inventory/inventoryGateway.ts`

## Variavel de ambiente

Use `VITE_SELFIT_API_URL` para apontar o frontend para a API quando o backend existir.

Exemplo:

```env
VITE_SELFIT_API_URL=http://localhost:3000/api
```

## Snapshot inicial

O frontend espera um snapshot com estas colecoes:

```ts
type InventorySnapshot = {
  unidades: Unidade[];
  equipamentos: Equipamento[];
  cameras: Camera[];
  manutencoes: Manutencao[];
  historicos: Historico[];
};
```

Endpoint sugerido:

```text
GET /inventory
```

## Mutacoes sugeridas

```text
POST   /unidades
POST   /unidades/bulk
POST   /equipamentos
PATCH  /equipamentos/:id
DELETE /equipamentos/:id
POST   /cameras
PATCH  /cameras/:id
DELETE /cameras/:id
POST   /manutencoes
PATCH  /manutencoes/:id
DELETE /manutencoes/:id
POST   /historicos
```

## Regras importantes

- Backend deve gerar `id`, `created_at` e `updated_at`.
- TVs nao pedem identificacao manual na UI. O campo `nome` hoje e montado como `Nome da Unidade - 01`; o numero aparece em um campo pequeno somente leitura no cadastro e usa uma sequencia global local apenas como fallback. No backend, prefira gerar esse numero por autoincremento/sequence global e devolver para a interface.
- Inputs de formulario nao devem receber `id`, `created_at`, `updated_at` ou objetos relacionados.
- Ao excluir equipamento ou camera, remova ou invalide manutencoes vinculadas.
- `unidade_id`, `equipamento_id` e `regiao_id` sao as chaves de relacionamento usadas pela UI.
- Datas trafegam como ISO string em `created_at`/`updated_at`; campos de formulario de garantia/manutencao usam `YYYY-MM-DD`.
- `categoria === "TV"` identifica itens do modulo de TVs.
