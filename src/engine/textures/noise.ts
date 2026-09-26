import { hash2 } from '../core/rng';

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * Ruido de valor 2D periódico: la retícula se envuelve cada `periodX`×`periodY` celdas, así
 * la textura resultante se repite sin costuras. `x` e `y` van en unidades de celda.
 */
export function valueNoise(
  x: number,
  y: number,
  periodX: number,
  periodY: number,
  seed: number,
): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smooth(x - x0);
  const fy = smooth(y - y0);
  const wx = (n: number) => ((n % periodX) + periodX) % periodX;
  const wy = (n: number) => ((n % periodY) + periodY) % periodY;
  const h = (ix: number, iy: number) => hash2(wx(ix), wy(iy), seed);
  const top = h(x0, y0) + (h(x0 + 1, y0) - h(x0, y0)) * fx;
  const bottom = h(x0, y0 + 1) + (h(x0 + 1, y0 + 1) - h(x0, y0 + 1)) * fx;
  return top + (bottom - top) * fy;
}

/**
 * Ruido fractal periódico y anisótropo para una textura de `size` píxeles: `cellsX`×`cellsY`
 * celdas en la primera octava, que se duplican en cada octava. Con más celdas en un eje que
 * en otro salen vetas. Devuelve un valor en [0, 1].
 */
export function fbmAniso(
  px: number,
  py: number,
  size: number,
  cellsX: number,
  cellsY: number,
  octaves: number,
  seed: number,
): number {
  let amplitude = 1;
  let total = 0;
  let norm = 0;
  let periodX = cellsX;
  let periodY = cellsY;
  for (let o = 0; o < octaves; o++) {
    total +=
      amplitude *
      valueNoise((px / size) * periodX, (py / size) * periodY, periodX, periodY, seed + o * 101);
    norm += amplitude;
    amplitude *= 0.5;
    periodX *= 2;
    periodY *= 2;
  }
  return total / norm;
}

/** Ruido fractal periódico con celdas cuadradas. */
export function fbm(
  px: number,
  py: number,
  size: number,
  cells: number,
  octaves: number,
  seed: number,
): number {
  return fbmAniso(px, py, size, cells, cells, octaves, seed);
}

/** Celdas de Voronoi periódicas: distancia al punto más cercano, al segundo e id de celda. */
export function voronoi(
  px: number,
  py: number,
  size: number,
  cells: number,
  seed: number,
): { d1: number; d2: number; id: number } {
  const cellSize = size / cells;
  const cx = Math.floor(px / cellSize);
  const cy = Math.floor(py / cellSize);
  let d1 = Infinity;
  let d2 = Infinity;
  let id = 0;
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      const gx = cx + ox;
      const gy = cy + oy;
      const wx = ((gx % cells) + cells) % cells;
      const wy = ((gy % cells) + cells) % cells;
      const fx = (gx + 0.15 + 0.7 * hash2(wx, wy, seed)) * cellSize;
      const fy = (gy + 0.15 + 0.7 * hash2(wx, wy, seed + 7)) * cellSize;
      const d = Math.hypot(px - fx, py - fy);
      if (d < d1) {
        d2 = d1;
        d1 = d;
        id = wy * cells + wx;
      } else if (d < d2) {
        d2 = d;
      }
    }
  }
  return { d1, d2, id };
}
