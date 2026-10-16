import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'deploy-artifact');
if (fs.existsSync(target)) {
  throw new Error('deploy-artifact ja existe. Mova/remova a pasta anterior antes de gerar outro pacote.');
}
if (!fs.existsSync(path.join(root, 'dist/index.html'))) throw new Error('Execute npm run build primeiro.');
// Lista explicita: nenhum .env real, Git, cache ou script de manutencao e copiado.
for (const relative of [
  'dist', 'api-selfit/package.json', 'api-selfit/package-lock.json', 'api-selfit/knexfile.js',
  'api-selfit/src', 'api-selfit/scripts/create-user.js', 'api-selfit/.env.example',
  'scripts/start-production.mjs', 'docs/DEPLOY.md', 'docs/SEGURANCA.md',
  'deploy/nginx.conf.example', 'deploy/painel-selfit.service.example',
]) {
  fs.cpSync(path.join(root, relative), path.join(target, relative), {
    recursive: true,
    filter: (source) => !source.startsWith(path.join(root, 'api-selfit/src/docs')) &&
      !source.startsWith(path.join(root, 'api-selfit/src/database/seeds')),
  });
}
fs.writeFileSync(path.join(target, 'package.json'), JSON.stringify({
  name: 'painel-selfit-runtime', private: true, type: 'module', engines: { node: '>=22.12.0 <25' },
  scripts: {
    start: 'node scripts/start-production.mjs',
    'api:migrate': 'npm --prefix api-selfit run migrate',
    'user:create': 'npm --prefix api-selfit run user:create',
  },
}, null, 2) + '\n');
console.log('Pacote criado em deploy-artifact/. Instale somente as dependencias de producao da API no servidor.');
