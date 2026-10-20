import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { connectionOptions, root } from './context.mjs';

const options = connectionOptions();
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'selfit-backup-'));
const credentials = path.join(directory, 'mysql.cnf');
const backupDir = path.join(root, 'backups');
fs.mkdirSync(backupDir, { recursive: true });
const database = options.database;
if (!/^[a-zA-Z0-9_]+$/.test(database)) throw new Error('Nome de banco invalido para backup.');
const target = path.join(backupDir, `${database}-${new Date().toISOString().replace(/[:.]/g, '-')}.sql`);
function quote(value) {
  return '"' + String(value ?? '').replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n').replaceAll('\r', '\\r') + '"';
}
try {
  // Arquivo temporario evita senha nos argumentos/lista de processos e no historico.
  fs.writeFileSync(credentials, `[client]\nhost=${quote(options.host)}\nport=${options.port}\nuser=${quote(options.user)}\npassword=${quote(options.password)}\n`, { mode: 0o600 });
  const args = [`--defaults-extra-file=${credentials}`, '--single-transaction', '--no-tablespaces', '--set-gtid-purged=OFF', '--routines', '--triggers', '--events', '--hex-blob',
    ...(options.ssl ? ['--ssl-mode=VERIFY_IDENTITY', ...(process.env.DB_SSL_CA_FILE ? [`--ssl-ca=${process.env.DB_SSL_CA_FILE}`] : [])] : []), database];
  const child = spawn(process.env.MYSQLDUMP_PATH || 'mysqldump', args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stderr.resume();
  const finished = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`mysqldump encerrou com codigo ${code}. Verifique permissoes e configuracao.`)));
  });
  await Promise.all([finished, pipeline(child.stdout, fs.createWriteStream(target, { flags: 'wx', mode: 0o600 }))]);
  console.log(`Backup criado: backups/${path.basename(target)}. Contem dados privados; mantenha fora do Git e do deploy.`);
} catch (error) {
  if (fs.existsSync(target)) fs.unlinkSync(target);
  console.error('Backup falhou:', error.code || error.message);
  process.exitCode = 1;
} finally {
  if (fs.existsSync(credentials)) fs.unlinkSync(credentials);
  fs.rmdirSync(directory);
}
