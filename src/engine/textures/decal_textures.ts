import { hash2 } from '../core/rng';

/**
 * Texturas RGBA con transparencia para las marcas de impacto. Funciones puras: devuelven
 * los píxeles de una imagen cuadrada de `size`×`size`.
 */

/** Agujero de bala: centro oscuro, anillo de metal/piedra desconchado y bordes irregulares. */
export function bulletHolePixels(size: number, seed: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(size * size * 4);
  const c = (size - 1) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - c;
      const dy = y - c;
      const angle = Math.atan2(dy, dx);
      // Borde irregular: el radio varía con el ángulo.
      const jag = 0.8 + 0.35 * hash2(Math.floor(((angle + Math.PI) / (Math.PI * 2)) * 10), 0, seed);
      const r = Math.hypot(dx, dy) / (c * jag);
      const i = (y * size + x) * 4;
      if (r < 0.28) {
        data.set([8, 7, 6, 255], i);
      } else if (r < 0.55) {
        const shade = 40 + 30 * hash2(x, y, seed);
        data.set([shade, shade * 0.95, shade * 0.9, 235], i);
      } else if (r < 1) {
        const alpha = (1 - (r - 0.55) / 0.45) * 150 * (0.6 + 0.4 * hash2(x, y, seed + 1));
        data.set([28, 26, 24, alpha], i);
      } else {
        data.set([0, 0, 0, 0], i);
      }
    }
  }
  return data;
}

/** Marca de quemadura de una explosión: mancha negra difusa con radios. */
export function scorchPixels(size: number, seed: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(size * size * 4);
  const c = (size - 1) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - c;
      const dy = y - c;
      const angle = Math.atan2(dy, dx);
      const rays =
        0.75 + 0.35 * hash2(Math.floor(((angle + Math.PI) / (Math.PI * 2)) * 24), 1, seed);
      const r = Math.hypot(dx, dy) / (c * rays);
      // Centro casi opaco y bordes que se funden con la pared.
      const alpha =
        r >= 1
          ? 0
          : Math.min(1, Math.pow(1 - r, 0.45) * 1.25) * 250 * (0.8 + 0.2 * hash2(x, y, seed));
      data.set([4, 3, 3, alpha], (y * size + x) * 4);
    }
  }
  return data;
}
