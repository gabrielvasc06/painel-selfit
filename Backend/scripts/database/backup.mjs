import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { randomUUID } from 'node:crypto';
import { connectionOptions, root } from './context.mjs';

const options = connectionOptions();
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'selfit-backup-'));
const credentials = path.join(directory, 'mysql.cnf');
const backupDir = path.join(root, 'backups');
fs.mkdirSync(backupDir, { recursive: true });
const database = options.database;
if (!/^[a-zA-Z0-9_]+$/.test(database)) throw new Error('Nome de banco invalido para backup.');
// Uma copia local por banco evita acumular arquivos a cada ajuste do sistema.
// O arquivo anterior so e substituido depois que o dump termina com sucesso.
const backupNames = { selfit_db: 'backup-principal.sql', selfit_homolog: 'backup-homologacao.sql' };
const target = path.join(backupDir, backupNames[database] ?? `backup-${database}.sql`);
const temporaryTarget = path.join(backupDir, `.${database}-${randomUUID()}.tmp`);
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
    child.once('error', (error) => {
      child.stdout.destroy(error);
      reject(error);
    });
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`mysqldump encerrou com codigo ${code}. Verifique permissoes e configuracao.`)));
  });
  // Aguarda tambem o fechamento do arquivo antes de tratar uma falha: sem isso,
  // a abertura assincrona do stream poderia deixar um .tmp depois da limpeza.
  const results = await Promise.allSettled([finished,
    pipeline(child.stdout, fs.createWriteStream(temporaryTarget, { flags: 'wx', mode: 0o600 }))]);
  const failure = results.find((result) => result.status === 'rejected');
  if (failure) throw failure.reason;
  if (fs.statSync(temporaryTarget).size === 0) throw new Error('mysqldump gerou um arquivo vazio.');
  fs.renameSync(temporaryTarget, target);
  console.log(`Backup atualizado: backups/${path.basename(target)}. Mantida uma copia local por banco, fora do Git e do deploy.`);
} catch (error) {
  // Uma falha nunca remove o ultimo backup concluido.
  if (fs.existsSync(temporaryTarget)) fs.unlinkSync(temporaryTarget);
  console.error('Backup falhou:', error.code || error.message);
  process.exitCode = 1;
} finally {
  if (fs.existsSync(credentials)) fs.unlinkSync(credentials);
  fs.rmdirSync(directory);
}
