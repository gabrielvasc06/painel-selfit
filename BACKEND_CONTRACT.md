# Backend integration contract

Este front ainda usa `localStorage`, mas os contratos para troca por API ficam em:

- `src/services/inventory/inventoryTypes.ts`
- `src/services/inventory/inventoryGateway.ts`

## Variavel de ambiente

Use `VITE_SELFIT_API_URL` para apontar o frontend para a API quando o backend existir.


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

