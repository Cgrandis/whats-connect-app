const { spawn } = require('child_process');
const path = require('path');

console.log('--- Lançador de Automação WhatsApp ---');
console.log('Iniciando processos de backend e frontend...');

function startProcess(command, args, name) {
  const proc = spawn(command, args, { stdio: 'inherit', shell: true });

  proc.on('close', (code) => {
    console.log(`Processo ${name} encerrado com código ${code}`);
  });

  proc.on('error', (err) => {
    console.error(`Erro ao iniciar processo ${name}:`, err);
  });

  return proc;
}

const backend = startProcess('node', [path.join(__dirname, 'src/server/index.js')], 'Backend');

const frontend = startProcess('npm', ['run', 'dev:next'], 'Frontend');

function cleanup() {
  console.log('\nEncerrando processos...');
  backend.kill();
  frontend.kill();
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
