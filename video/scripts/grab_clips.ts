// Graba los clips del vídeo con el propio juego, fotograma a fotograma, y los guarda en
// video/public/clips/<clip>.mp4 (1920×1080, 60 fps, H.264) con una vista previa en
// video/public/clips/vistas/<clip>.jpg.
//
// Uso:
//   npm run video:clips                         todos los clips
//   npm run video:clips -- gancho_salto_carga   solo los indicados
//   npm run video:clips -- --vista [clips…]     solo fotogramas sueltos (inicio, mitad, final)
//
// Arranca el servidor de desarrollo de Vite del juego, abre Chrome (el instalado en el equipo,
// sin descargar nada) con Playwright y, en cada fotograma, pide al juego que avance un paso
// (`window.__grabacion.step()`) y captura la página entera con el protocolo de DevTools. Los
// fotogramas van por una tubería al ffmpeg que trae Remotion.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type CDPSession, type Page } from 'playwright-core';
import { createServer } from 'vite';

const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 60;
/** Calidad de los JPEG intermedios (el vídeo final se comprime después en H.264). */
const JPEG_QUALITY = 92;

const videoDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(videoDir, '..');
const clipsDir = join(videoDir, 'clips');
const outDir = join(videoDir, 'public', 'clips');
const previewDir = join(outDir, 'vistas');
const remotionBin = join(videoDir, 'node_modules', '.bin', 'remotion');

interface RecordingWindow {
  __grabacion?: { clip: string; frames: number; step(): void; seek(frame: number): void };
  __grabacionError?: string;
}

if (!existsSync(remotionBin)) {
  console.error('Faltan las dependencias del vídeo. Instálalas con: npm install --prefix video');
  process.exit(1);
}

const args = process.argv.slice(2);
const previewOnly = args.includes('--vista');
const requested = args.filter((arg) => !arg.startsWith('--'));
const available = readdirSync(clipsDir)
  .filter((file) => file.endsWith('.ts') && !file.startsWith('_'))
  .map((file) => file.replace(/\.ts$/, ''))
  .sort();
const unknown = requested.filter((id) => !available.includes(id));
if (unknown.length > 0) {
  console.error(`Clips desconocidos: ${unknown.join(', ')}\nDisponibles: ${available.join(', ')}`);
  process.exit(1);
}
const clips = requested.length > 0 ? requested : available;

mkdirSync(previewDir, { recursive: true });
const server = await createServer({
  root: repoRoot,
  configFile: join(repoRoot, 'vite.config.ts'),
  logLevel: 'warn',
  server: { host: '127.0.0.1', port: 5199, strictPort: false },
});
await server.listen();
const baseUrl = server.resolvedUrls?.local[0] ?? 'http://127.0.0.1:5199/';

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--hide-scrollbars'],
});
const context = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
page.on('pageerror', (error) => console.error(`  ✖ error en la página: ${error.message}`));

try {
  // Primera carga: Vite optimiza las dependencias y podría recargar la página a mitad de un clip.
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  console.log(`GPU: ${await gpuName(page)}`);
  for (const clip of clips) {
    await (previewOnly ? previewClip(page, clip) : recordClip(page, clip));
  }
} finally {
  await browser.close();
  await server.close();
}

async function openClip(page: Page, clip: string): Promise<number> {
  await page.goto(`${baseUrl}?grabar=${clip}`);
  await page.waitForFunction(
    () => {
      const w = window as unknown as RecordingWindow;
      return w.__grabacion !== undefined || w.__grabacionError !== undefined;
    },
    undefined,
    { timeout: 180_000 },
  );
  const error = await page.evaluate(() => (window as unknown as RecordingWindow).__grabacionError);
  if (error) throw new Error(error);
  return page.evaluate(() => (window as unknown as RecordingWindow).__grabacion!.frames);
}

async function recordClip(page: Page, clip: string): Promise<void> {
  const started = performance.now();
  const frames = await openClip(page, clip);
  const cdp = await page.context().newCDPSession(page);
  const output = join(outDir, `${clip}.mp4`);
  const ffmpeg = spawn(
    remotionBin,
    [
      'ffmpeg',
      '-y',
      '-loglevel',
      'error',
      '-f',
      'image2pipe',
      '-framerate',
      String(FPS),
      '-c:v',
      'mjpeg',
      '-i',
      '-',
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '16',
      // Los JPEG vienen en rango completo; el vídeo, en el rango estándar (TV) y BT.709.
      '-vf',
      'scale=in_range=full:out_range=tv,format=yuv420p',
      '-color_range',
      'tv',
      '-colorspace',
      'bt709',
      '-color_primaries',
      'bt709',
      '-color_trc',
      'bt709',
      '-movflags',
      '+faststart',
      output,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  );
  const middle = Math.floor(frames / 2);
  for (let frame = 0; frame < frames; frame++) {
    await page.evaluate(() => (window as unknown as RecordingWindow).__grabacion!.step());
    const shot = await capture(cdp);
    if (frame === middle) writeFileSync(join(previewDir, `${clip}.jpg`), shot);
    if (!ffmpeg.stdin.write(shot)) await once(ffmpeg.stdin, 'drain');
    if (frame % 60 === 59) process.stdout.write(`\r  ${clip}: ${frame + 1}/${frames}`);
  }
  ffmpeg.stdin.end();
  const [code] = (await once(ffmpeg, 'exit')) as [number | null];
  await cdp.detach();
  if (code !== 0) throw new Error(`ffmpeg ha fallado al codificar ${clip} (código ${code}).`);
  const seconds = (performance.now() - started) / 1000;
  process.stdout.write(
    `\r✓ ${clip}: ${frames} fotogramas en ${seconds.toFixed(0)} s → ${relative(output)}\n`,
  );
}

/** Guarda tres fotogramas (inicio, mitad y final) sin codificar vídeo. */
async function previewClip(page: Page, clip: string): Promise<void> {
  const frames = await openClip(page, clip);
  const cdp = await page.context().newCDPSession(page);
  const marks = [
    ['inicio', 0],
    ['mitad', Math.floor(frames / 2)],
    ['final', frames - 1],
  ] as const;
  for (const [name, frame] of marks) {
    await page.evaluate(
      (target) => (window as unknown as RecordingWindow).__grabacion!.seek(target + 1),
      frame,
    );
    const file = join(previewDir, `${clip}_${name}.jpg`);
    writeFileSync(file, await capture(cdp));
  }
  await cdp.detach();
  console.log(`✓ ${clip}: vistas en ${relative(previewDir)}/${clip}_{inicio,mitad,final}.jpg`);
}

async function capture(cdp: CDPSession): Promise<Buffer> {
  const { data } = await cdp.send('Page.captureScreenshot', {
    format: 'jpeg',
    quality: JPEG_QUALITY,
    optimizeForSpeed: true,
  });
  return Buffer.from(data, 'base64');
}

async function gpuName(page: Page): Promise<string> {
  return page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return 'sin WebGL 2';
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    return info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'desconocida';
  });
}

function relative(path: string): string {
  return path.startsWith(repoRoot) ? path.slice(repoRoot.length + 1) : path;
}
