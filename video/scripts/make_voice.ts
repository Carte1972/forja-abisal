// Genera la narración del vídeo a partir de video/guion.md y la deja en video/public/narracion/.
// Uso: npm run video:voz
//
// - Voz provisional: el comando `say` de macOS con la voz y la velocidad de video/voz.config.json
//   (por defecto, Reed de español de España a su velocidad normal). Si la voz no está instalada,
//   se detiene y avisa: no instala nada ni la sustituye por otra.
// - Grabaciones reales: si existe video/narracion_real/<archivo>.wav, se copia esa en lugar de
//   generar la provisional. Esa carpeta nunca se toca, así que una grabación propia no se pierde.
// - public/narracion/origen.json indica qué archivos son provisionales y cuáles reales.
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseScript } from './script_parser.ts';

interface VoiceConfig {
  /** Nombre exacto de la voz, como lo lista `say -v '?'`. */
  voz: string;
  /** Palabras por minuto (`say -r`); null para la velocidad normal de la voz. */
  velocidad: number | null;
  /** Frecuencia de muestreo del WAV. */
  frecuencia: number;
}

const videoDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(videoDir, 'public', 'narracion');
const realDir = join(videoDir, 'narracion_real');
const config = JSON.parse(readFileSync(join(videoDir, 'voz.config.json'), 'utf8')) as VoiceConfig;
const scenes = parseScript(readFileSync(join(videoDir, 'guion.md'), 'utf8'));

function voiceAvailable(voice: string): boolean {
  const result = spawnSync('say', ['-v', '?'], { encoding: 'utf8' });
  if (result.error || result.status !== 0) return false;
  return result.stdout.split('\n').some((line) => line.startsWith(`${voice} `));
}

/** Segundos de un WAV PCM (a partir de la cabecera). */
function wavSeconds(path: string): number {
  const data = readFileSync(path);
  const byteRate = data.readUInt32LE(28);
  let offset = 12;
  while (offset + 8 <= data.length) {
    const id = data.toString('ascii', offset, offset + 4);
    const size = data.readUInt32LE(offset + 4);
    if (id === 'data') return size / byteRate;
    offset += 8 + size + (size % 2);
  }
  return 0;
}

const missingReal = scenes.filter((scene) => !existsSync(join(realDir, scene.file)));
if (missingReal.length > 0) {
  if (process.platform !== 'darwin') {
    console.error('La voz provisional usa el comando `say` de macOS y este equipo no es un Mac.');
    console.error(
      `Deja las grabaciones en video/narracion_real/: ${missingReal.map((s) => s.file).join(', ')}`,
    );
    process.exit(1);
  }
  if (!voiceAvailable(config.voz)) {
    console.error(`La voz «${config.voz}» no está disponible en este Mac.`);
    console.error(
      'No se instala ninguna voz ni se usa otra en su lugar. Revisa video/voz.config.json.',
    );
    process.exit(1);
  }
}

mkdirSync(outDir, { recursive: true });
// Los audios de escenas que ya no están en el guion sobran.
const wanted = new Set(scenes.map((scene) => scene.file));
for (const file of readdirSync(outDir)) {
  if (file.endsWith('.wav') && !wanted.has(file)) rmSync(join(outDir, file));
}

const origin: Record<string, 'provisional' | 'real'> = {};
let total = 0;
for (const scene of scenes) {
  const target = join(outDir, scene.file);
  const real = join(realDir, scene.file);
  if (existsSync(real)) {
    copyFileSync(real, target);
    origin[scene.file] = 'real';
  } else {
    const args = [
      '-v',
      config.voz,
      ...(config.velocidad === null ? [] : ['-r', String(config.velocidad)]),
      '--file-format=WAVE',
      `--data-format=LEI16@${config.frecuencia}`,
      '-o',
      target,
      scene.text,
    ];
    const result = spawnSync('say', args, { encoding: 'utf8' });
    if (result.status !== 0 || !existsSync(target)) {
      console.error(`No se pudo generar ${scene.file}: ${result.stderr || result.error?.message}`);
      process.exit(1);
    }
    origin[scene.file] = 'provisional';
  }
  const seconds = wavSeconds(target);
  total += seconds;
  console.log(`✓ ${scene.file} (${origin[scene.file]}, ${seconds.toFixed(1)} s)`);
}
writeFileSync(join(outDir, 'origen.json'), `${JSON.stringify(origin, null, 2)}\n`);
console.log(`Narración total: ${Math.floor(total / 60)} min ${Math.round(total % 60)} s`);
