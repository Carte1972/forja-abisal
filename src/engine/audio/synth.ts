import { Rng } from '../core/rng';

/**
 * Síntesis de efectos de sonido por código (sin archivos de audio). Cada receta devuelve las
 * muestras de un canal mono entre -1 y 1. Todo es determinista: la misma receta suena igual en
 * cada arranque.
 */

export type SoundId =
  | 'pistol'
  | 'shotgun'
  | 'riveter'
  | 'launcher'
  | 'explosion'
  | 'hammer_swing'
  | 'hammer_hit'
  | 'dry_fire'
  | 'reload'
  | 'weapon_switch'
  | 'impact'
  | 'sentinel_alert'
  | 'crawler_alert'
  | 'spitter_alert'
  | 'watcher_alert'
  | 'enemy_shot'
  | 'claw'
  | 'spit'
  | 'bolt'
  | 'splash'
  | 'enemy_pain'
  | 'enemy_death'
  | 'player_pain'
  | 'player_death'
  | 'pickup'
  | 'pickup_weapon'
  | 'pickup_key'
  | 'door_open'
  | 'door_close'
  | 'lift'
  | 'secret'
  | 'denied'
  | 'exit'
  | 'ambient';

/** Generador de muestras: crea un búfer de la duración indicada y lo rellena. */
class Voice {
  readonly data: Float32Array;

  constructor(
    readonly rate: number,
    duration: number,
  ) {
    this.data = new Float32Array(Math.ceil(rate * duration));
  }

  get length(): number {
    return this.data.length;
  }

  /** Suma una señal: `fn` recibe el tiempo (s) y el índice de muestra. */
  add(fn: (t: number, i: number) => number, from = 0, to = this.length / this.rate): this {
    const start = Math.floor(from * this.rate);
    const end = Math.min(this.length, Math.floor(to * this.rate));
    for (let i = start; i < end; i++) this.data[i]! += fn((i - start) / this.rate, i);
    return this;
  }

  /** Normaliza al pico indicado y suaviza los extremos para evitar chasquidos. */
  finish(peak = 0.9, fadeIn = 0.002, fadeOut = 0.01): Float32Array {
    let max = 0;
    for (const v of this.data) max = Math.max(max, Math.abs(v));
    const gain = max > 0 ? peak / max : 0;
    const inSamples = Math.max(1, Math.floor(fadeIn * this.rate));
    const outSamples = Math.max(1, Math.floor(fadeOut * this.rate));
    for (let i = 0; i < this.length; i++) {
      let v = this.data[i]! * gain;
      if (i < inSamples) v *= i / inSamples;
      if (i > this.length - outSamples) v *= (this.length - i) / outSamples;
      this.data[i] = v;
    }
    return this.data;
  }
}

// --- Bloques básicos ---

const TAU = Math.PI * 2;
const decay = (t: number, rate: number) => Math.exp(-t * rate);
const attackDecay = (t: number, attack: number, rate: number) =>
  t < attack ? t / attack : Math.exp(-(t - attack) * rate);

/** Oscilador con frecuencia variable (la fase se integra para que el barrido sea limpio). */
function oscillator(
  kind: 'sine' | 'square' | 'saw' | 'triangle',
  freq: (t: number) => number,
  _rate: number,
) {
  let phase = 0;
  let last = -1;
  return (t: number) => {
    const dt = last < 0 ? 0 : t - last;
    last = t;
    phase += freq(t) * dt;
    const p = phase - Math.floor(phase);
    switch (kind) {
      case 'sine':
        return Math.sin(p * TAU);
      case 'square':
        return p < 0.5 ? 1 : -1;
      case 'saw':
        return p * 2 - 1;
      case 'triangle':
        return 1 - 4 * Math.abs(p - 0.5);
    }
  };
}

/** Ruido blanco y ruido "marrón" (más grave). */
function noise(seed: number) {
  const rng = new Rng(seed);
  return () => rng.next() * 2 - 1;
}

function brownNoise(seed: number) {
  const white = noise(seed);
  let last = 0;
  return () => {
    last = (last + 0.02 * white()) / 1.02;
    return last * 3.5;
  };
}

/** Filtro paso bajo de un polo con frecuencia de corte variable. */
function lowpass(source: (t: number) => number, cutoff: (t: number) => number, rate: number) {
  let y = 0;
  return (t: number) => {
    const a = 1 - Math.exp((-TAU * cutoff(t)) / rate);
    y += a * (source(t) - y);
    return y;
  };
}

function highpass(source: (t: number) => number, cutoff: number, rate: number) {
  const low = lowpass(source, () => cutoff, rate);
  return (t: number) => source(t) - low(t);
}

/** Paso banda aproximado (paso alto seguido de paso bajo). */
function bandpass(
  source: (t: number) => number,
  low: number,
  high: (t: number) => number,
  rate: number,
) {
  return lowpass(highpass(source, low, rate), high, rate);
}

const drive = (x: number, amount: number) => Math.tanh(x * amount);

// --- Recetas ---

function gunshot(
  rate: number,
  seed: number,
  length: number,
  body: number,
  thump: number,
  bright: number,
) {
  const v = new Voice(rate, length);
  const n = lowpass(noise(seed), (t) => bright * decay(t, 18) + 400, rate);
  v.add((t) => n(t) * decay(t, 14 / length) * 1.2);
  const boom = oscillator('sine', (t) => body * Math.exp(-t * 10) + thump, rate);
  v.add((t) => boom(t) * decay(t, 9 / length) * 0.9);
  return v.finish(0.95, 0.001, 0.05);
}

function metallic(rate: number, length: number, partials: number[], decayRate: number) {
  const v = new Voice(rate, length);
  partials.forEach((f, i) => {
    const osc = oscillator('sine', () => f, rate);
    v.add((t) => (osc(t) * decay(t, decayRate * (1 + i * 0.4))) / (i + 1));
  });
  return v;
}

function whoosh(rate: number, seed: number, length: number, from: number, to: number) {
  const v = new Voice(rate, length);
  const n = bandpass(noise(seed), 200, (t) => from + (to - from) * (t / length), rate);
  v.add((t) => n(t) * Math.sin((Math.PI * t) / length));
  return v;
}

function tones(
  rate: number,
  notes: [number, number, number][],
  kind: 'sine' | 'triangle' | 'square' = 'sine',
) {
  const length = Math.max(...notes.map(([, start, dur]) => start + dur)) + 0.05;
  const v = new Voice(rate, length);
  for (const [freq, start, dur] of notes) {
    const osc = oscillator(kind, () => freq, rate);
    v.add(
      (t) => osc(t) * attackDecay(t, 0.008, 5 / dur) * (kind === 'square' ? 0.35 : 1),
      start,
      start + dur,
    );
  }
  return v;
}

function motor(
  rate: number,
  seed: number,
  length: number,
  from: number,
  to: number,
  clunk: boolean,
) {
  const v = new Voice(rate, length);
  const hum = oscillator('saw', (t) => from + (to - from) * (t / length), rate);
  const hum2 = oscillator('square', (t) => (from + (to - from) * (t / length)) * 1.5, rate);
  const grit = lowpass(noise(seed), () => 900, rate);
  const env = (t: number) => Math.min(1, t * 8) * Math.min(1, (length - t) * 5);
  const filtered = lowpass(
    (t) => hum(t) * 0.6 + hum2(t) * 0.2 + grit(t) * 0.5,
    () => 700,
    rate,
  );
  v.add((t) => filtered(t) * env(t));
  if (clunk) {
    const n = lowpass(noise(seed + 1), () => 600, rate);
    const thud = oscillator('sine', () => 55, rate);
    v.add((t) => (n(t) * 0.8 + thud(t)) * decay(t, 18), length - 0.18, length);
  }
  return v;
}

function creature(
  rate: number,
  seed: number,
  length: number,
  base: number,
  slide: number,
  rough: number,
) {
  const v = new Voice(rate, length);
  const vib = oscillator('sine', () => 7, rate);
  const voice = oscillator(
    'saw',
    (t) => base * (1 + slide * (t / length)) * (1 + 0.04 * vib(t)),
    rate,
  );
  const n = noise(seed);
  const shaped = lowpass(
    (t) => voice(t) + n() * rough,
    (t) => 2200 - t * 1200,
    rate,
  );
  v.add((t) => drive(shaped(t), 2) * attackDecay(t, 0.03, 3 / length));
  return v;
}

type Recipe = (rate: number) => Float32Array;

export const RECIPES: Readonly<Record<SoundId, Recipe>> = {
  pistol: (r) => gunshot(r, 1, 0.35, 160, 55, 5000),
  shotgun: (r) => gunshot(r, 2, 0.75, 120, 38, 3500),
  riveter: (r) => {
    const v = new Voice(r, 0.18);
    const click = oscillator('square', (t) => 1400 - t * 3000, r);
    const n = highpass(noise(3), 1500, r);
    v.add((t) => (click(t) * 0.5 + n(t)) * decay(t, 35));
    const thump = oscillator('sine', () => 90, r);
    v.add((t) => thump(t) * decay(t, 30));
    return v.finish(0.85);
  },
  launcher: (r) => {
    const v = whoosh(r, 4, 0.6, 300, 2400);
    const thump = oscillator('sine', (t) => 110 * Math.exp(-t * 6) + 40, r);
    v.add((t) => thump(t) * decay(t, 10) * 1.2);
    return v.finish(0.9);
  },
  explosion: (r) => {
    const v = new Voice(r, 1.8);
    const rumble = lowpass(brownNoise(5), (t) => 1800 * decay(t, 3) + 120, r);
    v.add((t) => drive(rumble(t) * 2.5, 1.8) * attackDecay(t, 0.01, 2.2));
    const boom = oscillator('sine', (t) => 70 * Math.exp(-t * 3) + 24, r);
    v.add((t) => boom(t) * attackDecay(t, 0.005, 2.5) * 1.1);
    const crack = highpass(noise(6), 2500, r);
    v.add((t) => crack(t) * decay(t, 25) * 0.6);
    return v.finish(0.98, 0.001, 0.2);
  },
  hammer_swing: (r) => whoosh(r, 7, 0.3, 400, 1600).finish(0.6),
  hammer_hit: (r) => {
    const v = metallic(r, 0.45, [520, 1340, 2110, 3150], 9);
    const n = lowpass(noise(8), () => 3000, r);
    v.add((t) => n(t) * decay(t, 40));
    return v.finish(0.9);
  },
  dry_fire: (r) => metallic(r, 0.08, [2400, 3700], 60).finish(0.5),
  reload: (r) => {
    const v = metallic(r, 0.5, [1800, 2900], 45);
    const second = metallic(r, 0.15, [1500, 2600, 4100], 40);
    v.add((t) => second.data[Math.floor(t * r)] ?? 0, 0.32, 0.47);
    return v.finish(0.55);
  },
  weapon_switch: (r) => whoosh(r, 9, 0.22, 800, 3000).finish(0.4),
  impact: (r) => {
    const v = new Voice(r, 0.14);
    const n = highpass(noise(10), 1200, r);
    const ping = oscillator('sine', (t) => 2400 - t * 6000, r);
    v.add((t) => (n(t) + ping(t) * 0.4) * decay(t, 45));
    return v.finish(0.5);
  },
  sentinel_alert: (r) =>
    tones(
      r,
      [
        [880, 0, 0.1],
        [660, 0.12, 0.1],
        [990, 0.24, 0.16],
      ],
      'square',
    ).finish(0.55),
  crawler_alert: (r) => creature(r, 11, 0.55, 380, 1.3, 0.6).finish(0.8),
  spitter_alert: (r) => creature(r, 12, 0.8, 85, -0.3, 0.9).finish(0.85),
  watcher_alert: (r) => {
    const v = new Voice(r, 0.6);
    const lfo = oscillator('sine', () => 14, r);
    const osc = oscillator('sine', (t) => 600 + lfo(t) * 220 + t * 400, r);
    v.add((t) => osc(t) * attackDecay(t, 0.02, 4));
    return v.finish(0.6);
  },
  enemy_shot: (r) => gunshot(r, 13, 0.3, 200, 70, 6000),
  claw: (r) => {
    const v = whoosh(r, 14, 0.25, 900, 4000);
    const n = highpass(noise(15), 2000, r);
    v.add((t) => n(t) * decay(t, 30) * 0.8, 0.12, 0.25);
    return v.finish(0.7);
  },
  spit: (r) => {
    const v = new Voice(r, 0.45);
    const n = bandpass(noise(16), 300, (t) => 1800 - t * 2500, r);
    const gurgle = oscillator('saw', (t) => 140 - t * 120, r);
    v.add((t) => (n(t) + gurgle(t) * 0.4) * attackDecay(t, 0.02, 7));
    return v.finish(0.75);
  },
  bolt: (r) => {
    const v = new Voice(r, 0.32);
    const zap = oscillator('square', (t) => 1800 * Math.exp(-t * 9) + 200, r);
    const filtered = lowpass(zap, () => 3500, r);
    v.add((t) => filtered(t) * decay(t, 10));
    return v.finish(0.55);
  },
  splash: (r) => {
    const v = new Voice(r, 0.35);
    const n = bandpass(noise(17), 400, () => 2500, r);
    v.add((t) => n(t) * decay(t, 12));
    return v.finish(0.6);
  },
  enemy_pain: (r) => creature(r, 18, 0.25, 260, -0.4, 0.8).finish(0.7),
  enemy_death: (r) => {
    const v = creature(r, 19, 0.9, 220, -0.7, 1);
    const thud = oscillator('sine', () => 60, r);
    v.add((t) => thud(t) * decay(t, 12) * 0.8, 0.7, 0.9);
    return v.finish(0.85);
  },
  player_pain: (r) => {
    const v = new Voice(r, 0.28);
    const grunt = oscillator('saw', (t) => 150 - t * 90, r);
    const shaped = lowpass(grunt, () => 900, r);
    v.add((t) => shaped(t) * attackDecay(t, 0.02, 10));
    return v.finish(0.7);
  },
  player_death: (r) => {
    const v = new Voice(r, 1.1);
    const grunt = oscillator('saw', (t) => 170 * Math.exp(-t * 1.2), r);
    const shaped = lowpass(grunt, (t) => 1200 - t * 900, r);
    v.add((t) => shaped(t) * attackDecay(t, 0.03, 2.5));
    return v.finish(0.8);
  },
  pickup: (r) =>
    tones(r, [
      [660, 0, 0.1],
      [990, 0.07, 0.14],
    ]).finish(0.5),
  pickup_weapon: (r) =>
    tones(
      r,
      [
        [440, 0, 0.12],
        [660, 0.1, 0.12],
        [880, 0.2, 0.25],
      ],
      'triangle',
    ).finish(0.6),
  pickup_key: (r) =>
    tones(
      r,
      [
        [523, 0, 0.15],
        [784, 0.12, 0.15],
        [1046, 0.24, 0.35],
      ],
      'triangle',
    ).finish(0.6),
  door_open: (r) => motor(r, 20, 1.1, 60, 95, false).finish(0.55),
  door_close: (r) => motor(r, 21, 1.1, 95, 60, true).finish(0.6),
  lift: (r) => motor(r, 22, 1.4, 45, 55, true).finish(0.55),
  secret: (r) =>
    tones(
      r,
      [
        [523, 0, 0.9],
        [659, 0.15, 0.9],
        [784, 0.3, 0.9],
        [1046, 0.45, 1.1],
      ],
      'triangle',
    ).finish(0.5),
  denied: (r) =>
    tones(
      r,
      [
        [110, 0, 0.18],
        [98, 0.2, 0.25],
      ],
      'square',
    ).finish(0.5),
  exit: (r) =>
    tones(
      r,
      [
        [392, 0, 0.2],
        [523, 0.15, 0.2],
        [659, 0.3, 0.2],
        [784, 0.45, 0.6],
      ],
      'triangle',
    ).finish(0.6),
  // Zumbido ambiental de 8 s que se repite sin cortes (todas las frecuencias completan ciclos).
  ambient: (r) => {
    const v = new Voice(r, 8);
    const low = oscillator('sine', () => 55, r);
    const fifth = oscillator('sine', () => 82.5, r);
    const lfo = oscillator('sine', () => 0.25, r);
    v.add((t) => (low(t) * 0.6 + fifth(t) * 0.3) * (0.7 + 0.3 * lfo(t)));
    return v.finish(0.35, 0, 0);
  },
};

export const SOUND_IDS = Object.keys(RECIPES) as SoundId[];

export function synthesize(id: SoundId, sampleRate: number): Float32Array {
  return RECIPES[id](sampleRate);
}
