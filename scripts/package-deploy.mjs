import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'artifacts/deploy');
if (fs.existsSync(target)) {
  throw new Error('artifacts/deploy ja existe. Arquive a versao anterior antes de gerar outro pacote.');
}
if (!fs.existsSync(path.join(root, 'Frontend/dist/index.html'))) throw new Error('Execute npm run build primeiro.');
// Lista explicita: nenhum .env real, Git, cache ou script de manutencao e copiado.
for (const relative of [
  'Frontend/dist', 'Backend/package.json', 'Backend/package-lock.json', 'Backend/knexfile.js',
  'Backend/src', 'Backend/database/migrations', 'Backend/scripts/create-user.js',
  'scripts/start-production.mjs', 'scripts/run-with-api-env.mjs',
  'Backend/scripts/database', 'database', 'docs', 'README.md',
]) {
  fs.cpSync(path.join(root, relative), path.join(target, relative), {
    recursive: true,
    filter: (source) => source !== path.join(root, 'Backend/src/config/swagger.js') &&
      !source.startsWith(path.join(root, 'Backend/database/seeds')),
  });
}
fs.writeFileSync(path.join(target, 'package.json'), JSON.stringify({
  name: 'painel-selfit-runtime', version: '1.0.0', private: true, type: 'module', engines: { node: '>=22.12.0 <25' },
  scripts: {
    start: 'node scripts/start-production.mjs',
    'api:migrate': 'npm --prefix Backend run migrate',
    'api:migrate:production': 'node scripts/run-with-api-env.mjs Backend/.env npm --prefix Backend run migrate -- --env production',
    'user:create': 'npm --prefix Backend run user:create',
    'user:create:production': 'node scripts/run-with-api-env.mjs Backend/.env npm --prefix Backend run user:create',
    'db:backup': 'node Backend/scripts/database/backup.mjs',
    'db:audit': 'node Backend/scripts/database/audit.mjs',
    'db:backup:production': 'node scripts/run-with-api-env.mjs Backend/.env node Backend/scripts/database/backup.mjs',
    'db:audit:production': 'node scripts/run-with-api-env.mjs Backend/.env node Backend/scripts/database/audit.mjs',
  },
}, null, 2) + '\n');
// Manifesto permite conferir se os arquivos copiados para o servidor estao integros.
function manifest(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((entry) => {
    const source = path.join(directory, entry.name);
    if (entry.isDirectory()) return manifest(source);
    const hash = crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
    return [`${hash}  ${path.relative(target, source).replaceAll('\\', '/')}`];
  });
}
fs.writeFileSync(path.join(target, 'SHA256SUMS'), manifest(target).join('\n') + '\n');
console.log('Pacote criado em artifacts/deploy/. Instale as dependencias de producao da API no servidor.');
