# Homologacao

Homologacao usa banco separado (`selfit_homolog`), API em 3001 e frontend de preview em 4173. Copie os exemplos apenas se os arquivos reais ainda nao existirem:

```powershell
Copy-Item .env.homolog.example .env.homolog
Copy-Item api-selfit/.env.homolog.example api-selfit/.env.homolog
```

Crie `selfit_homolog` no MySQL e ajuste credenciais, `JWT_SECRET`, `HOMOLOG_USER` e `HOMOLOG_PASSWORD` no arquivo real da API. Os ambientes desta maquina ja receberam a conta ADMIN; sua senha esta no arquivo local de acesso.

```powershell
npm run api:migrate:homologacao
npm run db:seed:homologacao
npm run api:start:homologacao
```

Em outro terminal:

```powershell
npm run build:homologacao
npm run preview:homologacao
```

O preview local usa `VITE_SELFIT_API_URL=http://localhost:3001`; esse modo serve para teste nesta maquina. Para homologacao em servidor, use o mesmo processo de producao do [DEPLOY.md](DEPLOY.md), com schema, porta, chaves e dominio separados; compile com a API relativa `/api`.

Com a API de homologacao ativa, execute `npm run homologacao`. A bateria usa login real, valida CORS, consultas, cadastros, atualizacoes, manutencoes e exclusao logica nos tres modulos. Ela cria registros com prefixo unico e limpa apenas esses dados. E bloqueada em NODE_ENV=production ou em schema sem `homolog`/`_deploy_test_` no nome. Nao redefine sequencias globais de IDs.

`npm run test:integration` cria um schema temporario aleatorio, valida migrations e o fluxo completo e remove somente esse schema ao terminar. Nao usa o banco principal ou o de homologacao para os testes de escrita.
