// Lógica común de los lanzadores (jugar.command, jugar.sh, jugar.bat).
// Instala dependencias y compila solo cuando hace falta, sirve dist/ en un puerto libre
// y abre el navegador. Uso: node scripts/launcher.mjs [--no-open]
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(ROOT);

const OPEN_BROWSER = !process.argv.includes('--no-open') && process.env.FORJA_NO_OPEN !== '1';
const HOST = 'localhost';
const FIRST_PORT = 4173;
const INSTALL_STAMP = path.join('node_modules', '.forja_install_stamp');
const BUILD_STAMP = path.join('dist', '.forja_build_hash');
/** Todo lo que influye en el build: si cambia su contenido, se recompila. */
const BUILD_INPUTS = [
  'index.html',
  'package.json',
  'package-lock.json',
  'vite.config.ts',
  'tsconfig.json',
  'src',
  'public',
];

const color = (code) => (text) => (process.stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : text);
const bold = color('1');
const orange = color('38;5;208');
const green = color('32');

function log(message) {
  console.log(`${orange('▸')} ${message}`);
}

function mtime(file) {
  return statSync(file).mtimeMs;
}

function needsInstall() {
  if (!existsSync('node_modules') || !existsSync(INSTALL_STAMP)) return true;
  return mtime('package-lock.json') > mtime(INSTALL_STAMP);
}

function runNpmInstall() {
  const isWindows = process.platform === 'win32';
  const result = spawnSync(isWindows ? 'npm.cmd' : 'npm', ['install'], {
    stdio: 'inherit',
    // En Windows los .cmd solo se pueden lanzar a través de la shell.
    shell: isWindows,
  });
  if (result.status !== 0) {
    throw new Error('npm install ha fallado. Revisa tu conexión a internet y vuelve a intentarlo.');
  }
  writeFileSync(INSTALL_STAMP, new Date().toISOString());
}

function listFiles(entry) {
  if (!existsSync(entry)) return [];
  if (!statSync(entry).isDirectory()) return [entry];
  return readdirSync(entry)
    .sort()
    .flatMap((name) => listFiles(path.join(entry, name)));
}

function sourceHash() {
  const hash = createHash('sha256');
  for (const file of BUILD_INPUTS.flatMap(listFiles)) {
    hash.update(file.split(path.sep).join('/'));
    hash.update('\0');
    hash.update(readFileSync(file));
    hash.update('\0');
  }
  return hash.digest('hex');
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, HOST);
  });
}

async function findFreePort() {
  for (let port = FIRST_PORT; port < FIRST_PORT + 100; port++) {
    if (await isPortFree(port)) return port;
  }
  throw new Error(`No hay ningún puerto libre entre ${FIRST_PORT} y ${FIRST_PORT + 99}.`);
}

async function main() {
  console.log(bold(orange('\n  FORJA ABISAL\n')));

  if (needsInstall()) {
    log('Instalando dependencias (solo la primera vez o si han cambiado)…');
    runNpmInstall();
  } else {
    log('Dependencias al día.');
  }

  // Vite se importa después de instalar las dependencias.
  const { build, preview } = await import('vite');

  // En local el juego se sirve desde la raíz, aunque haya un VITE_BASE en el entorno.
  process.env.VITE_BASE = '/';
  const hash = sourceHash();
  const current = existsSync(BUILD_STAMP) ? readFileSync(BUILD_STAMP, 'utf8') : null;
  if (!existsSync(path.join('dist', 'index.html')) || current !== hash) {
    log('Compilando el juego (solo si el código ha cambiado)…');
    await build({ root: ROOT, logLevel: 'warn' });
    writeFileSync(BUILD_STAMP, hash);
  } else {
    log('Build al día.');
  }

  const port = await findFreePort();
  const server = await preview({
    root: ROOT,
    logLevel: 'warn',
    preview: { host: HOST, port, strictPort: true, open: OPEN_BROWSER },
  });

  const url = `http://${HOST}:${port}/`;
  console.log(`\n  ${green('●')} Juego disponible en ${bold(url)}`);
  if (OPEN_BROWSER) console.log('    Se ha abierto en tu navegador por defecto.');
  console.log('    Para cerrar el juego pulsa Ctrl+C o cierra esta ventana.\n');

  const shutdown = () => {
    server.httpServer.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error(`\n✖ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
