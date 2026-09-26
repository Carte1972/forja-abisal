// Prepara la versión web del vídeo para el botón «Ver tráiler» del menú del juego:
// public/trailer/forja_abisal_trailer.mp4 (1080p a 30 fps, ~30 MB, para el repositorio y
// GitHub Pages) y su portada public/trailer/forja_abisal_trailer.jpg.
// Uso: npm run video:web (después de npm run video:render).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const videoDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(videoDir, 'out', 'forja_abisal_presentacion.mp4');
const outDir = join(videoDir, '..', 'public', 'trailer');
const remotion = join(videoDir, 'node_modules', '.bin', 'remotion');

if (!existsSync(source)) {
  console.error('Falta el vídeo final: npm run video:render');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

// Se ejecuta desde video/ para que Remotion encuentre sus propias dependencias.
const ffmpeg = (args: string[]) => {
  const result = spawnSync(
    remotion,
    ['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', ...args],
    {
      cwd: videoDir,
      stdio: 'inherit',
    },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
};

const video = join(outDir, 'forja_abisal_trailer.mp4');
ffmpeg([
  '-i',
  source,
  // El ffmpeg de Remotion no trae el filtro fps: -r 30 en la salida hace lo mismo.
  '-r',
  '30',
  '-c:v',
  'libx264',
  '-preset',
  'slow',
  '-crf',
  '28',
  '-tune',
  'film',
  '-profile:v',
  'high',
  '-pix_fmt',
  'yuv420p',
  '-color_range',
  'tv',
  '-colorspace',
  'bt709',
  '-color_primaries',
  'bt709',
  '-color_trc',
  'bt709',
  '-c:a',
  'aac',
  '-b:a',
  '160k',
  // Metadatos al principio: el navegador empieza a reproducir antes de tenerlo entero.
  '-movflags',
  '+faststart',
  video,
]);
// Portada: el título encendido (segundo 6,6).
const poster = join(outDir, 'forja_abisal_trailer.jpg');
ffmpeg([
  '-ss',
  '6.6',
  '-i',
  source,
  '-frames:v',
  '1',
  '-vf',
  'scale=1280:720',
  '-q:v',
  '4',
  poster,
]);

const megabytes = (statSync(video).size / 1024 / 1024).toFixed(1);
console.log(`✓ public/trailer/forja_abisal_trailer.mp4 (${megabytes} MB) y su portada`);
