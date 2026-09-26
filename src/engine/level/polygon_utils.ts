import type { Point2 } from './level_types';

const EPSILON = 1e-9;

/** Área con signo (fórmula del lazo) en el plano XZ. Positiva = antihoraria en ejes matemáticos. */
export function signedArea(points: readonly Point2[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, z1] = points[i]!;
    const [x2, z2] = points[(i + 1) % points.length]!;
    area += x1 * z2 - x2 * z1;
  }
  return area / 2;
}

export function pointInPolygon(x: number, z: number, points: readonly Point2[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, zi] = points[i]!;
    const [xj, zj] = points[j]!;
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function cross(o: Point2, a: Point2, b: Point2): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

/** ¿Está `p` en el interior del segmento `ab` (sin contar los extremos)? */
export function pointOnSegmentInterior(p: Point2, a: Point2, b: Point2, eps = 1e-6): boolean {
  const lengthSq = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2;
  if (lengthSq < EPSILON) return false;
  const distance = Math.abs(cross(a, b, p)) / Math.sqrt(lengthSq);
  if (distance > eps) return false;
  const t = ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / lengthSq;
  const tEps = eps / Math.sqrt(lengthSq);
  return t > tEps && t < 1 - tEps;
}

/** ¿Se cortan o solapan los segmentos `ab` y `cd`? (incluye tocarse en un punto) */
export function segmentsIntersect(a: Point2, b: Point2, c: Point2, d: Point2): boolean {
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  if (
    ((d1 > EPSILON && d2 < -EPSILON) || (d1 < -EPSILON && d2 > EPSILON)) &&
    ((d3 > EPSILON && d4 < -EPSILON) || (d3 < -EPSILON && d4 > EPSILON))
  ) {
    return true;
  }
  const onSegment = (p: Point2, q: Point2, r: Point2) =>
    Math.min(p[0], q[0]) - EPSILON <= r[0] &&
    r[0] <= Math.max(p[0], q[0]) + EPSILON &&
    Math.min(p[1], q[1]) - EPSILON <= r[1] &&
    r[1] <= Math.max(p[1], q[1]) + EPSILON;
  if (Math.abs(d1) <= EPSILON && onSegment(c, d, a)) return true;
  if (Math.abs(d2) <= EPSILON && onSegment(c, d, b)) return true;
  if (Math.abs(d3) <= EPSILON && onSegment(a, b, c)) return true;
  if (Math.abs(d4) <= EPSILON && onSegment(a, b, d)) return true;
  return false;
}

/** Un polígono es simple si ningún par de aristas no contiguas se toca. */
export function isSimplePolygon(points: readonly Point2[]): boolean {
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % n]!;
    for (let j = i + 1; j < n; j++) {
      // Aristas contiguas: comparten un vértice por construcción.
      if (j === i + 1 || (i === 0 && j === n - 1)) continue;
      const c = points[j]!;
      const d = points[(j + 1) % n]!;
      if (segmentsIntersect(a, b, c, d)) return false;
    }
  }
  return true;
}

export function isConvex(points: readonly Point2[]): boolean {
  let sign = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const c = cross(points[i]!, points[(i + 1) % n]!, points[(i + 2) % n]!);
    if (Math.abs(c) < EPSILON) continue;
    if (sign === 0) sign = Math.sign(c);
    else if (Math.sign(c) !== sign) return false;
  }
  return true;
}

export function centroid(points: readonly Point2[]): Point2 {
  let x = 0;
  let z = 0;
  for (const [px, pz] of points) {
    x += px;
    z += pz;
  }
  return [x / points.length, z / points.length];
}
