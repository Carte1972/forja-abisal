import Constrainautor from '@kninnug/constrainautor';
import Delaunator from 'delaunator';
import type { Point2 } from './level_types';
import { pointInPolygon } from './polygon_utils';

/**
 * Triangulación de calidad para suelos, techos y losas.
 *
 * earcut genera triángulos muy largos y finos al conectar huecos con el contorno, y algunas GPU
 * (ANGLE sobre Metal, al menos) no los dibujan cuando cruzan el plano de la cámara. Aquí se
 * trocean las aristas del contorno, se añade una rejilla de puntos interiores y se hace una
 * triangulación de Delaunay restringida a los contornos: triángulos pequeños y bien formados.
 *
 * Las aristas se trocean de forma canónica (desde el vértice de menor índice), así que dos
 * sectores que comparten una arista generan exactamente los mismos puntos sobre ella.
 */

/** Tamaño de la rejilla interior y longitud máxima de los tramos del contorno (metros). */
export const SURFACE_CELL = 2;
/** Distancia mínima de un punto interior al contorno, en celdas (evita triángulos finos). */
const EDGE_MARGIN = 0.35;

export interface SurfaceMesh {
  points: Point2[];
  triangles: number[];
}

function distanceToSegment(p: Point2, a: Point2, b: Point2): number {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const lengthSq = dx * dx + dz * dz;
  const t =
    lengthSq === 0
      ? 0
      : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / lengthSq));
  return Math.hypot(p[0] - (a[0] + dx * t), p[1] - (a[1] + dz * t));
}

/**
 * `rings[0]` es el contorno exterior y el resto son huecos, como índices sobre `vertices`.
 */
export function triangulateSurface(
  vertices: readonly Point2[],
  rings: readonly (readonly number[])[],
  cell = SURFACE_CELL,
): SurfaceMesh {
  const points: Point2[] = [];
  const indexByKey = new Map<string, number>();
  const addPoint = (p: Point2): number => {
    const key = `${p[0]},${p[1]}`;
    let index = indexByKey.get(key);
    if (index === undefined) {
      index = points.length;
      points.push(p);
      indexByKey.set(key, index);
    }
    return index;
  };

  const constraints: [number, number][] = [];
  const segments: [Point2, Point2][] = [];
  for (const ring of rings) {
    ring.forEach((i, n) => {
      const j = ring[(n + 1) % ring.length]!;
      const lo = Math.min(i, j);
      const hi = Math.max(i, j);
      const a = vertices[lo]!;
      const b = vertices[hi]!;
      segments.push([a, b]);
      const pieces = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / cell));
      let previous = addPoint(a);
      for (let m = 1; m <= pieces; m++) {
        const t = m / pieces;
        const current = addPoint(
          m === pieces ? b : [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
        );
        constraints.push([previous, current]);
        previous = current;
      }
    });
  }

  const polygons = rings.map((ring) => ring.map((i) => vertices[i]!));
  const inside = (x: number, z: number) =>
    pointInPolygon(x, z, polygons[0]!) &&
    !polygons.slice(1).some((hole) => pointInPolygon(x, z, hole));

  // Rejilla interior alineada con el mundo.
  const outer = polygons[0]!;
  const xs = outer.map((p) => p[0]);
  const zs = outer.map((p) => p[1]);
  for (let x = Math.ceil(Math.min(...xs) / cell) * cell; x <= Math.max(...xs); x += cell) {
    for (let z = Math.ceil(Math.min(...zs) / cell) * cell; z <= Math.max(...zs); z += cell) {
      if (!inside(x, z)) continue;
      const clearance = Math.min(...segments.map(([a, b]) => distanceToSegment([x, z], a, b)));
      if (clearance >= cell * EDGE_MARGIN) addPoint([x, z]);
    }
  }

  const coords = new Float64Array(points.length * 2);
  points.forEach((p, i) => {
    coords[i * 2] = p[0];
    coords[i * 2 + 1] = p[1];
  });
  const delaunay = new Delaunator(coords);
  new Constrainautor(delaunay, constraints);

  // Las aristas restringidas separan interior y exterior: basta mirar el centro de cada triángulo.
  const triangles: number[] = [];
  const t = delaunay.triangles;
  for (let k = 0; k < t.length; k += 3) {
    const a = points[t[k]!]!;
    const b = points[t[k + 1]!]!;
    const c = points[t[k + 2]!]!;
    if (inside((a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3)) {
      triangles.push(t[k]!, t[k + 1]!, t[k + 2]!);
    }
  }
  return { points, triangles };
}
