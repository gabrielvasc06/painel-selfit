# Deploy em servidor da empresa ou nuvem

## Antes de instalar

O mesmo pacote executa em servidor com Node.js 22.12+/24 e MySQL 8.0+, ou em containers Linux. Producao serve o frontend compilado e `/api` no mesmo processo/host. Nao use o servidor Vite ou `vite preview` como servico de producao.

Os testes locais validaram build, regras reais do frontend, barreiras HTTP, migrations em schema vazio e o fluxo completo com MySQL 8.0.46. O daemon Docker nao estava ativo nesta maquina; a imagem e a inicializacao do Compose ainda precisam ser executadas no host de destino. Nao foi realizado deploy remoto.

## Configuracao de acesso

Preencha as variaveis do exemplo antes de liberar acesso:

| Variavel | Funcao |
| --- | --- |
| `FRONT` | Origem HTTPS real do painel, sem barra final |
| `JWT_SECRET` | Chave aleatoria exclusiva, pelo menos 32 caracteres |
| `DB_HOST`, `DB_PORT`, `DB_DATABASE` | Banco privado e schema do ambiente |
| `DB_USER`, `DB_PASSWORD` | Conta exclusiva do painel, sem usar root |
| `DB_SSL=true` | TLS validado para MySQL remoto/gerenciado |
| `DB_SSL_CA_FILE` | CA adicional, se exigida pelo provedor |
| `ACCESS_ALLOWED_CIDRS` | IPs/CIDRs reais da TI/VPN que podem acessar toda a aplicacao |
| `ACCESS_ALLOWED_USERS` | Logins existentes autorizados a autenticar, separados por virgula |
| `USER_ADMIN_USERS` | Subconjunto desses logins autorizado a criar usuarios pela API |
| `TRUST_PROXY` | IPs/CIDRs dos proxies administrados pela empresa; vazio no acesso direto |

O exemplo permite somente loopback e o usuario ADMIN. A rede da empresa ainda nao foi informada. Antes de usar outro computador, inclua a rede real da TI/VPN. Nao use `0.0.0.0/0` ou uma faixa arbitraria apenas para contornar um 403.

A API usa `req.ip`. Cabecalhos como `X-Forwarded-For` sao ignorados quando o remetente nao e um proxy configurado. Se houver proxy, mantenha o backend inacessivel diretamente e configure apenas o IP real dele. Em Docker, o endereco visto pelo Node pode ser o gateway da rede Docker; descubra-o com `docker network inspect` e configure esse IP exato como proxy confiavel. O proxy deve substituir o X-Forwarded-For recebido pelo IP real do cliente. Veja `deploy/nginx.conf.example`.

IP/rede identifica a origem da conexao, nao um equipamento individual. Para acesso por maquina gerenciada, o TI deve usar VPN, firewall e/ou certificados de dispositivo. CORS e uma protecao do navegador e nao substitui JWT ou restricao de rede.

Gere uma chave local com `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`. Guarde senhas e chaves no gerenciador de segredos do servidor. Nenhuma variavel `VITE_*` deve conter segredo: ela entra no JavaScript do navegador.

## Docker com banco existente ou gerenciado

```powershell
Copy-Item api-selfit/.env.example api-selfit/.env.production
```

Edite `api-selfit/.env.production`: defina NODE_ENV=production, FRONT com o dominio HTTPS real, DB_HOST para o banco existente, senha, chave, redes e usuarios. Nao sobrescreva um ambiente real ja configurado.

```powershell
docker compose --env-file api-selfit/.env.production -f deploy/compose.yaml config --quiet
docker compose --env-file api-selfit/.env.production -f deploy/compose.yaml build
docker compose --env-file api-selfit/.env.production -f deploy/compose.yaml run --rm migrate
docker compose --env-file api-selfit/.env.production -f deploy/compose.yaml up -d app
docker compose --env-file api-selfit/.env.production -f deploy/compose.yaml ps
docker compose --env-file api-selfit/.env.production -f deploy/compose.yaml logs --tail 100 app
```

A porta publicada e `127.0.0.1:8080`; exponha o painel pelo proxy HTTPS. O banco e a API nao precisam de portas publicas. A imagem roda como usuario sem privilegios, com filesystem de runtime somente leitura no Compose e logs limitados. A senha root do MySQL nao e enviada ao container da aplicacao.

Para CA do MySQL, monte o certificado somente leitura em `app` e `migrate` e configure DB_SSL_CA_FILE no caminho interno do container. Libere a conexao somente entre o backend e o banco.

## Docker com MySQL incluido

Use DB_HOST=db, DB_USER=selfit_app, senha exclusiva da aplicacao e MYSQL_ROOT_PASSWORD diferente. O MySQL usa volume persistente e nao publica a porta 3306.

```powershell
docker compose --env-file api-selfit/.env.production -f deploy/compose.yaml --profile database config --quiet
docker compose --env-file api-selfit/.env.production -f deploy/compose.yaml --profile database build
docker compose --env-file api-selfit/.env.production -f deploy/compose.yaml --profile database up -d --wait db
docker compose --env-file api-selfit/.env.production -f deploy/compose.yaml --profile database run --rm migrate
docker compose --env-file api-selfit/.env.production -f deploy/compose.yaml --profile database up -d app
```

O MySQL e opcional e pertence ao perfil database. Defina MYSQL_ROOT_PASSWORD antes de inicia-lo: sem senha o MySQL recusa iniciar. O comando --wait confirma o healthcheck autenticado antes do passo de migrations. Migrations rodam uma vez antes da aplicacao. Alterar MYSQL_PASSWORD em um volume ja inicializado nao altera a senha gravada no MySQL: a rotacao precisa ser feita tambem no servidor de banco.

## Primeiro administrador em banco novo

Migrations nao criam usuario ou senha. Em PowerShell, obtenha a senha sem deixa-la literal no historico:

```powershell
$env:BOOTSTRAP_USER = 'ADMIN'
$securePassword = Read-Host 'Senha inicial (12 caracteres ou mais)' -AsSecureString
$env:BOOTSTRAP_PASSWORD = [System.Net.NetworkCredential]::new('', $securePassword).Password
docker compose --env-file api-selfit/.env.production -f deploy/compose.yaml run --rm -e BOOTSTRAP_USER -e BOOTSTRAP_PASSWORD migrate node api-selfit/scripts/create-user.js
Remove-Item Env:\BOOTSTRAP_USER
Remove-Item Env:\BOOTSTRAP_PASSWORD
Remove-Variable securePassword
```

Se usar o MySQL incluido, acrescente `--profile database` ao comando Compose. O script nao altera contas existentes. Em banco ja preparado nesta maquina, ADMIN existe; consulte `.admin-test-access.txt`. Esse arquivo e local e nao e enviado no deploy. Troque a credencial de testes antes do uso oficial.

Para novos usuarios, ADMIN pode chamar POST `/api/register`, com JWT, `{usuario, senha}` e senha de pelo menos 12 caracteres. Acrescente o login em ACCESS_ALLOWED_USERS no ambiente e reinicie o servico. Somente os logins em USER_ADMIN_USERS administram usuarios; contas operacionais autorizadas possuem acesso aos modulos de inventario. A interface atual nao tem tela de gestao de usuarios.

## Deploy sem Docker

Na maquina de build:

```powershell
npm ci
npm --prefix api-selfit ci
npm run check
npm run package:deploy
```

Copie o conteudo de `deploy-artifact/` para a pasta da aplicacao no servidor. Nao copie node_modules do Windows para Linux: instale no destino para obter o bcrypt nativo correto.

No servidor:

```powershell
npm --prefix api-selfit ci --omit=dev
Copy-Item api-selfit/.env.example api-selfit/.env.production
$env:SELFIT_ENV_FILE = 'api-selfit/.env.production'
$env:NODE_ENV = 'production'
# Edite o arquivo: NODE_ENV=production, FRONT, banco, chave e controles de acesso.
npm run api:migrate
npm start
```

Se o banco for novo, defina BOOTSTRAP_USER e BOOTSTRAP_PASSWORD e execute `npm run user:create` antes do primeiro login. Para rodar com fontes completos no servidor, `npm ci` e o build devem ocorrer antes de omitir dependencias de desenvolvimento.

Configure reinicio automatico por servico do sistema, com conta sem privilegios. Em Linux, adapte `deploy/painel-selfit.service.example`; o Node precisa estar no caminho informado. No Windows, use o gerenciador de servicos adotado pela empresa para executar `node scripts/start-production.mjs` na pasta do projeto e injete as variaveis do ambiente. Configure proxy HTTPS e firewall no host em ambos os casos.

O pacote nao sobrescreve uma pasta deploy-artifact existente. Mova o pacote anterior antes de gerar uma nova versao.

## Banco, atualizacao e recuperacao

A conta usada para migrations precisa criar/alterar tabelas e indices no schema da aplicacao. Para operacao continua, prefira outra credencial com SELECT, INSERT, UPDATE e DELETE apenas nesse schema. Nunca conceda privilegios globais para a API.

Antes de atualizar uma base existente, faca backup e teste a restauracao em homologacao. Use o backup do provedor ou `mysqldump --single-transaction` com credenciais fornecidas por mecanismo seguro. Mantenha backups fora do host da aplicacao e defina retencao com a TI. O volume Docker preserva dados entre reinicios e nao substitui backup. Nao use `docker compose down -v` numa instalacao com dados reais.

Migrations antigas incluem transformacoes de tabelas de inventario e nao devem ser apagadas/renomeadas. DDL do MySQL nao oferece rollback transacional completo; um backup restauravel e necessario para recuperar uma atualizacao interrompida. Nao execute migrate:rollback automaticamente em producao: migrations historicas podem remover tabelas/dados. Em caso de falha, pare a nova versao, restaure backup se o schema mudou e volte a imagem anterior compativel.

Homologacao remota usa outro schema, outra chave JWT e outro dominio. Nao execute a bateria que escreve dados de teste contra producao. `npm run test:integration` exige CREATE/DROP DATABASE e usa somente um schema temporario com nome aleatorio; essa permissao nao deve ser dada ao usuario de runtime.

## Verificacao apos instalar

Dentro do servidor/rede autorizada, confira `/api/health` (200), `/api/ready` (200), login ADMIN e consulta de unidades. Sem token, as rotas de dados devem retornar 401; fora da rede permitida, toda a aplicacao deve retornar 403. Reinicie o processo e confirme persistencia e reconexao. O healthcheck serve para monitoramento; um status unhealthy, sozinho, nao reinicia containers Docker sem um supervisor adicional.

O limite de login usa memoria do processo. Para multiplas replicas, adicione limite compartilhado no proxy/WAF ou store compartilhado. Nao configure numero de replicas maior que um supondo que o limite local sera global.

Referencias oficiais: [Compose e healthchecks](https://docs.docker.com/compose/how-tos/startup-order/), [Express atras de proxies](https://expressjs.com/en/guide/behind-proxies/), [encerramento seguro](https://expressjs.com/en/advanced/healthcheck-graceful-shutdown/) e [migrations Knex](https://knexjs.org/guide/migrations.html).
