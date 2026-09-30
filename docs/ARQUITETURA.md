# Arquitetura Do Painel Selfit

Este documento resume onde cada parte do sistema fica e como front, backend e banco conversam.

## Visao Geral

- Frontend: React + Vite em `src/`.
- Backend: Express + MySQL em `api-selfit/src/`.
- Banco: MySQL, base `selfit_db`.
- Documentacao da API: Swagger em `http://localhost:3000/api-docs`.
- Homologacao automatica: `npm run homologacao`.

## Fluxo Principal

1. O usuario acessa o front, normalmente em `http://localhost:5174`.
2. O login chama `POST /auth` na API em `http://localhost:3000`.
3. A API valida usuario/senha no MySQL e devolve um JWT.
4. O front salva o JWT no `localStorage`.
5. Todas as consultas/cadastros seguintes enviam `Authorization: Bearer <token>`.
6. O backend grava ou consulta as tabelas do MySQL.

## Frontend

- `src/app/App.tsx`: controla login, modulo ativo e pagina atual.
- `src/services/api.ts`: ponto unico de comunicacao HTTP com a API.
- `src/providers/InventoryProvider.tsx`: carrega unidades e inventario para telas compartilhadas.
- `src/providers/ModuloProvider.tsx`: informa se o usuario esta no modulo TVs, equipamentos ou cameras.
- `src/pages/`: telas principais do sistema.
- `src/components/`: componentes reaproveitaveis.
- `src/services/inventory/`: regras de filtragem, normalizacao e tipos de inventario.

## Backend

- `api-selfit/src/server.js`: monta o Express, Swagger, CORS, autenticacao e rotas.
- `api-selfit/src/config/env.js`: carrega `.env` da API sempre pelo caminho correto.
- `api-selfit/src/config/db.js`: configura conexao MySQL.
- `api-selfit/src/config/cors.js`: centraliza origens liberadas do front, incluindo porta `5174`.
- `api-selfit/src/middleware/auth.js`: valida JWT nas rotas protegidas.
- `api-selfit/src/routes/cadastros/`: rotas de criacao e manutencao de dados.
- `api-selfit/src/routes/consultas/`: rotas de consulta para telas do front.
- `api-selfit/src/routes/atualizacao-exclusao/`: rotas de edicao e remocao de itens.
- `api-selfit/src/routes/helpers/inventory-items.js`: resolve a separacao entre TV, camera e equipamento.

## Banco De Dados

Tabelas principais:

- `unidades`: unidades proprias usadas em todos os modulos.
- `tvs`: ativos do modulo TVs.
- `equipamentos`: ativos de TI, como totem, catraca, switch, firewall e nobreak.
- `cameras`: ativos do modulo cameras.
- `manutencoes`: registros de manutencao usando `item_tipo` + `item_id`.
- `usuarios`: credenciais de acesso.

Regra importante: TV, equipamento e camera ficam em tabelas separadas. A API usa ids prefixados, como `TV:1` e `CAMERA:1`, para evitar conflito entre tabelas diferentes.

## Scripts De Manutencao

- `npm run homologacao`: testa login, CORS 5174, unidades, cadastro, edicao, manutencao, exclusao e limpeza.
- `node scripts/audit-inventory-integrity.mjs`: verifica separacao dos modulos e integridade geral.
- `node scripts/audit-backend-sql-contract.mjs`: valida contrato entre backend e SQL.
- `node scripts/audit-unidades-numeros.mjs`: lista numeros de unidades com zeros ou formato suspeito.
- `node scripts/fix-unidades-numeros.mjs`: corrige numeros auditados das unidades.

## Portas Locais

- Front deste projeto: `http://localhost:5174`.
- API: `http://localhost:3000`.
- Preview Vite: `http://localhost:4173`.

Se aparecer `Failed to fetch` ou erro de comunicacao, conferir:

- API esta rodando na porta `3000`.
- Front esta abrindo em `5174`.
- `api-selfit/src/config/cors.js` contem a origem usada pelo navegador.
- `.env` da API existe em `api-selfit/.env`.
