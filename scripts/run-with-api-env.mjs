// Arquivo: scripts/run-with-api-env.mjs
// Serve para: executar comandos da API apontando para um arquivo .env especifico, sem contaminar outro ambiente.

import { spawn } from 'node:child_process';

const [, , envFile, command, ...args] = process.argv;

if (!envFile || !command) {
  console.error('Uso: node scripts/run-with-api-env.mjs <env-file> <comando> [...args]');
  process.exit(1);
}

const executable = process.platform === 'win32' && command === 'npm' ? 'cmd.exe' : command;
const executableArgs = process.platform === 'win32' && command === 'npm' ? ['/c', 'npm', ...args] : args;
const child = spawn(executable, executableArgs, {
  stdio: 'inherit',
  shell: false,
  windowsHide: true,
  env: {
    ...process.env,
    SELFIT_ENV_FILE: envFile,
  },
});

child.on('error', (error) => {
  console.error('Nao foi possivel iniciar o comando:', error.code || error.message);
  process.exitCode = 1;
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
