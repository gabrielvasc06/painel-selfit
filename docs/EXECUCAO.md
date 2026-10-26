# Execução em servidor local

## Estrutura de execução

O Node.js executa `Backend/src/server.js` e serve o frontend compilado em `Frontend/dist/`, junto com a API em `/api`. Não há Docker nem pasta de exemplos `deploy/`.

Os requisitos declarados são Node.js `>=22.12.0 <25` e MySQL 8.0. Esta revisão utilizou Node.js 24.14.1. DNS, certificado HTTPS, firewall, supervisão do processo e permissões da conta do serviço devem ser configurados pela TI no servidor de destino.

## Instalação com os fontes

A partir da raiz:

```sh
npm --prefix Frontend ci
npm --prefix Backend ci
npm run check
```

Os arquivos de configuração são somente:

- `Backend/.env`: ambiente principal, carregado por padrão.
- `Backend/.env.homolog`: homologação, carregada explicitamente pelos comandos `:homologacao`.

Nesta máquina, os dois foram preservados com seus valores e receberam comentários. Em outro servidor, crie `Backend/.env` com o bloco abaixo e preencha os valores privados. Não copie senhas de testes para uso oficial.

```dotenv
# PRINCIPAL: configuração privada do backend. Não versionar.
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
FRONT=https://painel.sua-empresa.com.br
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=selfit_db
DB_USER=selfit_app
DB_PASSWORD=
JWT_SECRET=
DB_POOL_SIZE=10
DB_SSL=false
# Se o MySQL exigir CA adicional: DB_SSL_CA_FILE=/caminho/mysql-ca.pem
# Substitua/inclua os CIDRs reais da TI/VPN para acesso por outros computadores.
ACCESS_ALLOWED_CIDRS=127.0.0.1/32,::1/128
ACCESS_ALLOWED_USERS=ADMIN
USER_ADMIN_USERS=ADMIN
# Configure apenas IPs de proxies administrados pela empresa, quando houver.
TRUST_PROXY=
```

Para `Backend/.env.homolog`, use outro schema (`selfit_homolog`), porta 3001, outra chave JWT e `NODE_ENV=development`. Os testes autenticados podem receber `HOMOLOG_USER` e `HOMOLOG_PASSWORD` nesse arquivo. O frontend não precisa de `.env`: usa `/api` na mesma origem. O Vite atende o principal em 5174 e encaminha para a API 3000; em `dev:homologacao`, atende em 4173 e encaminha para a API 3001. As portas s?o fixas, permitindo rodar os dois ambientes juntos. Para acesso pela rede, inclua em `FRONT` a origem exata (protocolo, IP e porta), sem barra final, e reinicie a API.

Gere uma chave aleatória para cada ambiente:

```sh
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

`npm start` força o modo de produção e lê `Backend/.env`. `api:start` respeita o modo configurado nesse arquivo. `SELFIT_ENV_FILE` seleciona outro arquivo explicitamente. Restrinja o acesso aos arquivos de ambiente à conta do serviço.

## Banco e inicialização

Em base existente, faça backup antes de atualizar. Disponibilize `mysqldump` no PATH ou configure `MYSQLDUMP_PATH` com o caminho do executável.

Os comandos mantêm uma cópia local por banco: `backups/backup-principal.sql` e `backups/backup-homologacao.sql`. Uma execução bem-sucedida substitui a cópia anterior do mesmo ambiente; falhas mantêm o arquivo anterior. O script usa um arquivo temporário durante a geração e não acumula versões com datas. Histórico de retenção no servidor deve ser mantido pelo processo de backup da empresa, fora dessa pasta local.

```sh
npm run db:backup:production
npm run api:migrate:production
npm start
```

Para uma instalação nova, crie um schema MySQL vazio com `utf8mb4`, configure uma conta exclusiva e execute as migrations. Não importe os snapshots de referência antes das migrations e não rode o seed local em produção.

Migrations não criam senhas. Para provisionar o primeiro usuário no PowerShell:

```powershell
$env:BOOTSTRAP_USER = 'ADMIN'
$selfitPassword = Read-Host 'Senha inicial (12 caracteres ou mais)' -AsSecureString
$env:BOOTSTRAP_PASSWORD = [System.Net.NetworkCredential]::new('', $selfitPassword).Password
npm.cmd run user:create:production
Remove-Item Env:\BOOTSTRAP_USER
Remove-Item Env:\BOOTSTRAP_PASSWORD
Remove-Variable selfitPassword
```

No Linux, forneça as mesmas variáveis por entrada protegida/gerenciador de segredos e execute `npm run user:create:production`. Contas existentes não são sobrescritas.

A conta de migração precisa de DDL somente no schema da aplicação. Para operação diária, use uma conta com SELECT, INSERT, UPDATE e DELETE, sem privilégios globais. Os testes que criam schemas devem usar outra credencial.

## Distribuição

Após o build aprovado:

```sh
npm run package:deploy
```

O pacote é gerado em `artifacts/deploy/`, sem fontes do frontend, testes, `.env` real, backups, credenciais ou `node_modules`. Ele inclui `Frontend/dist/`, o backend e os scripts necessários. Confira `SHA256SUMS` antes de instalar dependências no destino.

No destino, crie `Backend/.env`, execute `npm --prefix Backend ci --omit=dev`, as migrations e `npm start`. Não copie módulos nativos instalados no Windows para Linux. Arquive o pacote anterior antes de gerar outra versão; o empacotador não sobrescreve uma saída existente.

## Operação

Configure o gerenciador de serviços adotado pela empresa para executar `node scripts/start-production.mjs` na raiz do projeto, com conta dedicada e reinício automático. Configure HTTPS e firewall no host. Se houver proxy, mantenha o backend acessível somente a ele e informe somente seus IPs em `TRUST_PROXY`. O proxy deve substituir o IP encaminhado pelo IP real do cliente.

O exemplo de redes permite somente loopback. Antes de usar outro computador, preencha os CIDRs reais da TI/VPN. CORS e restrição de rede não substituem JWT.

Após instalar, verifique `/api/health` e `/api/ready` (200), login, consulta de unidades e os três módulos. Dados sem JWT devem retornar 401; origem de rede não autorizada deve receber 403. Reinicie o serviço e o sistema operacional para conferir persistência e inicialização automática.

A consulta opcional de CEP usa ViaCEP; sem internet, preencha o endereço manualmente. As fontes têm fallbacks locais.

## Recuperação

Mantenha os backups fora do diretório substituído e, em operação oficial, fora do host da aplicação. DDL MySQL não tem reversão transacional completa. Não execute rollback automático: migrations históricas podem remover dados. Restaure primeiro em outra base, valide-a e retorne à versão compatível da aplicação. O MySQL Workbench pode ser usado na restauração no Windows; no Linux, use o cliente MySQL com credenciais protegidas.
