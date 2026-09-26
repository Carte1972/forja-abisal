// Renderiza el vídeo final en video/out/forja_abisal_presentacion.mp4 (H.264, 1920×1080,
// 60 fps, audio AAC). Uso: npm run video:render
// Antes comprueba que hay navegador local (para no descargar ninguno), clips y narración.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findBrowser } from './find_browser.ts';

const videoDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const output = join('out', 'forja_abisal_presentacion.mp4');

const problems: string[] = [];
if (!findBrowser()) {
  problems.push(
    'No hay ningún Chrome instalado para renderizar. Instala Google Chrome o indica uno con REMOTION_BROWSER.',
  );
}
const clips = join(videoDir, 'public', 'clips');
if (!existsSync(clips) || !readdirSync(clips).some((file) => file.endsWith('.mp4'))) {
  problems.push('Faltan los clips del juego: npm run video:clips');
}
const narration = join(videoDir, 'public', 'narracion');
if (!existsSync(narration) || !readdirSync(narration).some((file) => file.endsWith('.wav'))) {
  problems.push('Falta la narración: npm run video:voz');
}
if (!existsSync(join(videoDir, 'public', 'musica', 'fondo.wav'))) {
  problems.push('Falta la música: npm run video:musica');
}
if (problems.length > 0) {
  console.error(problems.map((problem) => `✖ ${problem}`).join('\n'));
  process.exit(1);
}

const run = (args: string[]) =>
  spawnSync(join(videoDir, 'node_modules', '.bin', 'remotion'), args, {
    cwd: videoDir,
    stdio: 'inherit',
  });

spawnSync('node', ['scripts/copy_plans.ts'], { cwd: videoDir, stdio: 'inherit' });
const result = run(['render', 'presentacion', output]);
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`✓ video/${output}`);
