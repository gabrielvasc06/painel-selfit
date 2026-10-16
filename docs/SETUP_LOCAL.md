# Setup local

Requisitos: Node.js 22.12+ ou 24, npm e MySQL 8.0+.

```powershell
npm ci
npm --prefix api-selfit ci
Copy-Item .env.example .env
Copy-Item api-selfit/.env.example api-selfit/.env
```

Ajuste conexao MySQL e JWT no arquivo da API. Crie o schema com o administrador do MySQL:

```sql
CREATE DATABASE selfit_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

```powershell
npm run api:migrate
$env:BOOTSTRAP_USER = 'ADMIN'
$env:BOOTSTRAP_PASSWORD = '<senha-exclusiva-com-pelo-menos-12-caracteres>'
npm run user:create
Remove-Item Env:\BOOTSTRAP_PASSWORD
Remove-Item Env:\BOOTSTRAP_USER
npm run db:seed
npm run api:start
```

O seed importa unidades base e nao cria usuarios. Em bases ja configuradas, nao e necessario repetir a criacao de ADMIN; consulte as credenciais locais entregues separadamente. O comando `user:create` recusa sobrescrever contas existentes.

Em outro terminal:

```powershell
npm run dev
```

Frontend: `http://localhost:5174`; API: `http://localhost:3000`. O frontend usa `/api`, encaminhado pelo Vite. Caso o PowerShell bloqueie `npm.ps1`, use `npm.cmd`.

`npm start` agora executa producao e requer build, ambiente de producao valido e redes/usuarios explicitamente autorizados. Consulte [DEPLOY.md](DEPLOY.md).

Validacao: `npm run check`. Integracao real em schema temporario: `npm run test:integration`; precisa de permissao local para CREATE/DROP DATABASE e nao altera as bases existentes.
