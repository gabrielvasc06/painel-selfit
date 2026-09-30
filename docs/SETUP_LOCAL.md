# Setup Local

Este guia prepara uma maquina nova para rodar a branch `feature/integracao-backend` com frontend, backend e banco MySQL.

## 0. Pre-Requisitos

- Node.js 18 ou superior.
- MySQL 8 local rodando.
- MySQL Workbench para criar/validar o banco.

Se o PowerShell mostrar erro de `npm.ps1` bloqueado por politica de execucao, use `npm.cmd` no lugar de `npm` nos comandos abaixo.

## 1. Baixar A Branch

```powershell
git fetch origin
git checkout feature/integracao-backend
git pull origin feature/integracao-backend
```

## 2. Instalar Dependencias

Rode na pasta raiz do projeto:

```powershell
npm install
npm --prefix api-selfit install
```

## 3. Criar Arquivos .env

```powershell
Copy-Item .env.example .env
Copy-Item api-selfit/.env.example api-selfit/.env
```

Depois abra `api-selfit/.env` e ajuste principalmente:

```ini
DB_USER=root
DB_PASSWORD=sua_senha_do_mysql
DB_DATABASE=selfit_db
JWT_SECRET=uma_chave_local_qualquer
```

O front ja fica apontado para `http://localhost:3000` e a API ja libera o front em `http://localhost:5174`.

## 4. Criar Banco No MySQL Workbench

Abra uma query no Workbench e execute:

```sql
CREATE DATABASE IF NOT EXISTS selfit_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

## 5. Criar Tabelas E Dados Base

Na raiz do projeto, execute:

```powershell
npm run api:migrate
npm run db:seed
```

O comando `api:migrate` cria as tabelas e usuario padrao. O comando `db:seed` garante as unidades proprias no banco e pode ser rodado de novo sem duplicar.

Login local padrao:

```text
Usuario: VANDERSON.GABRIEL
Senha: Selfit@2026
```

Para conferir no Workbench:

```sql
SELECT COUNT(*) AS unidades_proprias
FROM selfit_db.unidades
WHERE tipo_unidade = 'PROPRIA';

SELECT id, nome, uf, cnpj, cep
FROM selfit_db.unidades
ORDER BY nome
LIMIT 20;

SELECT id, usuario, senha_provisoria
FROM selfit_db.usuarios
ORDER BY id;
```

## 6. Subir Backend E Frontend

Terminal 1:

```powershell
npm run api:start
```

Terminal 2:

```powershell
npm start
```

Enderecos:

- Frontend: `http://localhost:5174`
- Backend: `http://localhost:3000`
- Swagger: `http://localhost:3000/api-docs`

## 7. Validar Tudo

Com API e frontend rodando, execute:

```powershell
npm run db:seed:check
npm run homologacao
npm run test
npm run typecheck
npm run build
```

Se aparecer `Failed to fetch`, verifique se:

- API esta rodando em `http://localhost:3000`.
- Front esta aberto em `http://localhost:5174`.
- `api-selfit/.env` existe e tem a senha correta do MySQL.
- O banco `selfit_db` existe e recebeu migrations.
