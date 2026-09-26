// Sintetiza la música del vídeo por código (sin muestras ni archivos de terceros), como los
// sonidos del juego, y la guarda en video/public/musica/:
//   fondo.wav  bucle de 32 s sin costuras: dron grave, latido de forja, golpes metálicos
//              lejanos y rumor de fondo.
//   golpe.wav  golpe metálico grave para los títulos y el corte final.
// Uso: npm run video:musica
// Es determinista: el ruido sale de un generador con semilla.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 48_000;
const LOOP_SECONDS = 32;
/** Negras por minuto: un latido por segundo. */
const BPM = 60;

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'musica');

type Stereo = [Float32Array, Float32Array];

/** Generador pseudoaleatorio con semilla (mulberry32). */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stereo(samples: number): Stereo {
  return [new Float32Array(samples), new Float32Array(samples)];
}

/** Paso bajo de un polo: suaviza un valor hacia la entrada. */
function onePole(cutoff: number): (x: number) => number {
  const k = 1 - Math.exp((-2 * Math.PI * cutoff) / RATE);
  let y = 0;
  return (x) => (y += k * (x - y));
}

/**
 * Parcial metálico: suma de senos con relaciones no armónicas y caída exponencial, mezclado en
 * `out` a partir de la muestra `start` (con vuelta al principio si `wrap`, para los bucles).
 */
function metalHit(
  out: Stereo,
  start: number,
  base: number,
  gain: number,
  decay: number,
  pan: number,
  wrap: boolean,
): void {
  const partials: [number, number][] = [
    [1, 1],
    [2.76, 0.6],
    [5.4, 0.35],
    [8.93, 0.2],
    [13.3, 0.1],
  ];
  const length = Math.floor(decay * 6 * RATE);
  const left = gain * Math.cos(((pan + 1) * Math.PI) / 4);
  const right = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < length; i++) {
    const t = i / RATE;
    let v = 0;
    for (const [ratio, amp] of partials) {
      v += amp * Math.sin(2 * Math.PI * base * ratio * t) * Math.exp((-t * ratio ** 0.5) / decay);
    }
    const attack = Math.min(1, i / (0.002 * RATE));
    let index = start + i;
    if (index >= out[0].length) {
      if (!wrap) break;
      index %= out[0].length;
    }
    out[0][index]! += v * attack * left;
    out[1][index]! += v * attack * right;
  }
}

/** Latido grave de forja: seno que cae de tono, con un golpe de ruido filtrado. */
function thump(out: Stereo, start: number, gain: number, rand: () => number, wrap: boolean): void {
  const length = Math.floor(0.9 * RATE);
  const lowpass = onePole(180);
  let phase = 0;
  for (let i = 0; i < length; i++) {
    const t = i / RATE;
    const freq = 38 + 40 * Math.exp(-t * 14);
    phase += (2 * Math.PI * freq) / RATE;
    const body = Math.sin(phase) * Math.exp(-t * 4.5);
    const noise = lowpass(rand() * 2 - 1) * Math.exp(-t * 18) * 3;
    const v = (body + noise) * gain * Math.min(1, i / (0.003 * RATE));
    let index = start + i;
    if (index >= out[0].length) {
      if (!wrap) break;
      index %= out[0].length;
    }
    out[0][index]! += v;
    out[1][index]! += v;
  }
}

/** Reverberación sencilla (filtros peine con realimentación) aplicada sobre sí misma. */
function reverb(buffer: Stereo, mix: number, passes: number): void {
  const combs = [
    [1557, 0.78],
    [1617, 0.77],
    [1491, 0.79],
    [1422, 0.8],
  ] as const;
  for (let channel = 0; channel < 2; channel++) {
    const dry = buffer[channel]!;
    const n = dry.length;
    const wet = new Float32Array(n);
    for (const [baseDelay, feedback] of combs) {
      const delay = Math.floor(baseDelay * (RATE / 44_100) * (channel === 0 ? 1 : 1.037) * 2.2);
      const line = new Float32Array(n);
      // Varias pasadas sobre el búfer circular: la cola del final entra por el principio.
      for (let pass = 0; pass < passes; pass++) {
        for (let i = 0; i < n; i++) {
          const from = (i - delay + n) % n;
          line[i] = dry[i]! + line[from]! * feedback;
        }
      }
      for (let i = 0; i < n; i++) wet[i]! += line[i]! * 0.25;
    }
    for (let i = 0; i < n; i++) dry[i] = dry[i]! * (1 - mix) + wet[i]! * mix;
  }
}

function normalize(buffer: Stereo, peak: number): void {
  let max = 0;
  for (const channel of buffer) for (const v of channel) max = Math.max(max, Math.abs(v));
  const gain = max > 0 ? peak / max : 1;
  for (const channel of buffer) for (let i = 0; i < channel.length; i++) channel[i]! *= gain;
}

/** Bucle de fondo. Todo es periódico con el bucle, así que el final enlaza con el principio. */
function backgroundLoop(): Stereo {
  const n = LOOP_SECONDS * RATE;
  const out = stereo(n);
  const rand = random(20260926);
  const beat = (60 / BPM) * RATE;

  // Ruido periódico: se genera una vez y se recorre en círculo.
  const noise = new Float32Array(n);
  for (let i = 0; i < n; i++) noise[i] = rand() * 2 - 1;

  // Dron: la y su quinta, con sierras ligeramente desafinadas (batidos de 4 s, divisor de 32 s).
  const saw = (phase: number) => 2 * (phase - Math.floor(phase + 0.5));
  const lowL = onePole(140);
  const lowR = onePole(150);
  const rumbleL = onePole(60);
  const rumbleR = onePole(60);
  // Dos vueltas para que los filtros lleguen a régimen y la segunda sea periódica.
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < n; i++) {
      const t = i / RATE;
      const swell = 0.75 + 0.25 * Math.sin((2 * Math.PI * t) / 16);
      const d1 = saw(55 * t) + saw(55.25 * t) * 0.8;
      const d2 = saw(82.5 * t) * 0.45 + Math.sin(2 * Math.PI * 110 * t) * 0.3;
      const hiss = noise[i]!;
      const l = lowL((d1 + d2) * 0.35 * swell) + rumbleL(hiss) * 0.9;
      const r =
        lowR((d1 * 0.95 + d2 * 1.05) * 0.35 * swell) + rumbleR(noise[(i + 7919) % n]!) * 0.9;
      if (pass === 1) {
        out[0][i] = l;
        out[1][i] = r;
      }
    }
  }

  // Latido de forja cada dos tiempos, más fuerte al empezar cada compás de cuatro.
  for (let b = 0; b < LOOP_SECONDS; b += 2) {
    thump(out, Math.round(b * beat), b % 4 === 0 ? 0.55 : 0.35, rand, true);
  }
  // Golpes metálicos lejanos en contratiempo, alternando de lado.
  const clanks = [3.5, 7.5, 11, 15.5, 19.5, 23, 27.5, 31];
  clanks.forEach((beatTime, i) => {
    metalHit(
      out,
      Math.round(beatTime * beat),
      140 + (i % 3) * 23,
      0.05,
      0.9,
      i % 2 ? 0.7 : -0.7,
      true,
    );
  });

  reverb(out, 0.35, 3);
  normalize(out, 0.7);
  return out;
}

/** Golpe metálico grave (4 s), con cola de reverberación. */
function impact(): Stereo {
  const n = 4 * RATE;
  const out = stereo(n);
  const rand = random(1972);
  thump(out, 0, 1.1, rand, false);
  metalHit(out, 0, 62, 0.35, 1.4, -0.2, false);
  metalHit(out, Math.round(0.004 * RATE), 97, 0.22, 1.1, 0.25, false);
  // Chasquido de ruido al principio.
  const bright = onePole(2500);
  for (let i = 0; i < 0.15 * RATE; i++) {
    const v = bright(rand() * 2 - 1) * Math.exp((-i / RATE) * 30) * 0.9;
    out[0][i]! += v;
    out[1][i]! += v;
  }
  reverb(out, 0.3, 1);
  normalize(out, 0.9);
  // Fundido final para que termine en silencio.
  const fade = Math.floor(0.5 * RATE);
  for (let i = 0; i < fade; i++) {
    const g = 1 - i / fade;
    out[0][n - fade + i]! *= g;
    out[1][n - fade + i]! *= g;
  }
  return out;
}

/** WAV PCM de 16 bits, estéreo. */
function wav([left, right]: Stereo): Buffer {
  const samples = left.length;
  const data = Buffer.alloc(samples * 4);
  for (let i = 0; i < samples; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i]!)) * 32767), i * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[i]!)) * 32767), i * 4 + 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(2, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 4, 28);
  header.writeUInt16LE(4, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'fondo.wav'), wav(backgroundLoop()));
console.log(`✓ video/public/musica/fondo.wav (${LOOP_SECONDS} s, en bucle)`);
writeFileSync(join(outDir, 'golpe.wav'), wav(impact()));
console.log('✓ video/public/musica/golpe.wav');
