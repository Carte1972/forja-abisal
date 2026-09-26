import { hash2 } from '../core/rng';

export type FlickerMode = 'steady' | 'flicker' | 'pulse' | 'strobe' | 'broken';
export const FLICKER_MODES: readonly FlickerMode[] = [
  'steady',
  'flicker',
  'pulse',
  'strobe',
  'broken',
];

function smoothNoise1(t: number, seed: number): number {
  const i = Math.floor(t);
  const f = t - i;
  const s = f * f * (3 - 2 * f);
  const a = hash2(i, seed, 17);
  const b = hash2(i + 1, seed, 17);
  return a + (b - a) * s;
}

/** Multiplicador de intensidad (0..1) de una lámpara en el instante `time` (segundos). */
export function flickerFactor(mode: FlickerMode, time: number, seed: number): number {
  switch (mode) {
    case 'steady':
      return 1;
    case 'flicker':
      return 0.72 + 0.28 * smoothNoise1(time * 9 + seed, seed);
    case 'pulse':
      return 0.65 + 0.35 * (0.5 + 0.5 * Math.sin(time * 2.4 + seed));
    case 'strobe':
      return (time * 3 + (seed % 97) / 97) % 1 < 0.5 ? 1 : 0.08;
    case 'broken': {
      // Casi siempre encendida, con apagones breves e irregulares.
      const slot = Math.floor(time * 12);
      const h = hash2(slot, seed, 3);
      return h < 0.18 ? 0.05 : 0.88 + 0.12 * h;
    }
  }
}

/** Intensidad relativa de una luz breve (fogonazo, explosión) que se apaga con curva cuadrática. */
export function flashFalloff(elapsed: number, duration: number): number {
  if (elapsed >= duration) return 0;
  const t = 1 - elapsed / duration;
  return t * t;
}

export interface LampCandidate {
  x: number;
  y: number;
  z: number;
  radius: number;
  shadows: boolean;
}

/**
 * Elige qué lámparas ocupan el número fijo de luces reales. Primero se asignan los huecos con
 * sombra a las lámparas con sombra más cercanas, después el resto por cercanía (distancia menos
 * radio). Las lámparas cuya luz no llega a la cámara (más allá de radio + `margin`) se ignoran.
 */
export function selectLamps(
  lamps: readonly LampCandidate[],
  camera: { x: number; y: number; z: number },
  slots: number,
  shadowSlots: number,
  margin = 20,
): { shadowed: number[]; plain: number[] } {
  const scored = lamps
    .map((lamp, index) => ({
      index,
      lamp,
      score: Math.hypot(lamp.x - camera.x, lamp.y - camera.y, lamp.z - camera.z) - lamp.radius,
    }))
    .filter((entry) => entry.score < margin)
    .sort((a, b) => a.score - b.score);

  const shadowed = scored
    .filter((entry) => entry.lamp.shadows)
    .slice(0, shadowSlots)
    .map((entry) => entry.index);
  const taken = new Set(shadowed);
  const plain = scored
    .filter((entry) => !taken.has(entry.index))
    .slice(0, Math.max(slots - shadowed.length, 0))
    .map((entry) => entry.index);
  return { shadowed, plain };
}
