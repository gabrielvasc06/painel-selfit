# API Selfit

Express e MySQL para autenticacao, unidades, inventario, garantias e manutencoes.

Na raiz do repositorio: `npm --prefix api-selfit ci`, `npm run api:migrate` e `npm run api:start`. O processo de producao e `npm start` na raiz, apos compilar o frontend. A API verifica banco/schema antes de abrir a porta e encerra conexoes ao receber SIGTERM/SIGINT.

- [Configuracao local](../docs/SETUP_LOCAL.md)
- [Deploy](../docs/DEPLOY.md)
- [Seguranca e rotas privadas](../docs/SEGURANCA.md)
- [Contrato HTTP](../BACKEND_CONTRACT.md)

`npm --prefix api-selfit test` verifica autenticacao, redes, CORS, administracao, exposicao de arquivos, headers e limite de login. Os testes HTTP nao conectam ao banco real.
