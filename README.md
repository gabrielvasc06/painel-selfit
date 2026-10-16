# Painel Selfit

Aplicacao de inventario de unidades, TVs, equipamentos, cameras, garantias e manutencoes. Frontend React/TypeScript, API Express e MySQL 8.

## Deploy

Siga [docs/DEPLOY.md](docs/DEPLOY.md) para servidor da empresa ou nuvem, com Docker ou Node.js. A aplicacao compilada e a API compartilham o mesmo endereco; o frontend usa `/api`.

```powershell
npm ci
npm --prefix api-selfit ci
npm run check
npm run package:deploy
```

`deploy-artifact/` contem somente o frontend compilado e os arquivos de execucao da API. As dependencias de producao sao instaladas no servidor com `npm --prefix api-selfit ci --omit=dev`. Configuracoes reais, caches, scripts de limpeza de banco e testes ficam fora desse pacote.

`npm start` inicia producao. `npm run dev` inicia desenvolvimento; `vite preview` serve apenas para validacao local.

## Documentacao

- [Arquitetura](docs/ARQUITETURA.md)
- [Deploy e operacao](docs/DEPLOY.md)
- [Rotas e protecoes](docs/SEGURANCA.md)
- [Setup local](docs/SETUP_LOCAL.md)
- [Homologacao](docs/HOMOLOGACAO_PRODUCAO.md)
- [Contrato HTTP atual](BACKEND_CONTRACT.md)

## Conta de testes

A conta local `ADMIN` foi provisionada nos bancos principal e homologacao. As credenciais estao em `.admin-test-access.txt`, ignorado pelo Git e excluido do deploy. Novas instalacoes nao criam usuario ou senha automaticamente: use `npm run user:create` com credenciais explicitas.
