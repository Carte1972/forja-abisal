import { describe, expect, it } from 'vitest';
import type { Point2 } from './level_types';
import { SURFACE_CELL, triangulateSurface, type SurfaceMesh } from './surface_triangulation';

function areaOf(mesh: SurfaceMesh): number {
  let area = 0;
  for (let t = 0; t < mesh.triangles.length; t += 3) {
    const [a, b, c] = [0, 1, 2].map((k) => mesh.points[mesh.triangles[t + k]!]!);
    area += Math.abs((b![0] - a![0]) * (c![1] - a![1]) - (c![0] - a![0]) * (b![1] - a![1])) / 2;
  }
  return area;
}

function minAngleDeg(mesh: SurfaceMesh): number {
  let min = 180;
  for (let t = 0; t < mesh.triangles.length; t += 3) {
    const p = [0, 1, 2].map((k) => mesh.points[mesh.triangles[t + k]!]!);
    for (let k = 0; k < 3; k++) {
      const a = p[k]!;
      const b = p[(k + 1) % 3]!;
      const c = p[(k + 2) % 3]!;
      const u = [b[0] - a[0], b[1] - a[1]];
      const v = [c[0] - a[0], c[1] - a[1]];
      const cos =
        (u[0]! * v[0]! + u[1]! * v[1]!) / (Math.hypot(u[0]!, u[1]!) * Math.hypot(v[0]!, v[1]!));
      min = Math.min(min, (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI);
    }
  }
  return min;
}

// Sala de 16×16 con dos columnas, como la sala de inicio del nivel de pruebas.
const VERTICES: Point2[] = [
  [0, 0],
  [16, 0],
  [16, 16],
  [0, 16],
  [3, 3],
  [4, 3],
  [4, 4],
  [3, 4],
  [12, 11],
  [13, 11],
  [13, 12],
  [12, 12],
];
const HALL = [
  [0, 1, 2, 3],
  [4, 7, 6, 5],
  [8, 11, 10, 9],
];

describe('triangulateSurface', () => {
  it('cubre exactamente el área del polígono sin los huecos', () => {
    expect(areaOf(triangulateSurface(VERTICES, HALL))).toBeCloseTo(256 - 2);
  });

  it('no deja triángulos largos ni muy finos', () => {
    const mesh = triangulateSurface(VERTICES, HALL);
    expect(minAngleDeg(mesh)).toBeGreaterThan(15);
    for (let t = 0; t < mesh.triangles.length; t += 3) {
      for (let k = 0; k < 3; k++) {
        const a = mesh.points[mesh.triangles[t + k]!]!;
        const b = mesh.points[mesh.triangles[t + ((k + 1) % 3)]!]!;
        expect(Math.hypot(b[0] - a[0], b[1] - a[1])).toBeLessThanOrEqual(SURFACE_CELL * 1.5);
      }
    }
  });

  it('dos polígonos vecinos parten la arista común en los mismos puntos', () => {
    const vertices: Point2[] = [
      [0, 0],
      [7.3, 0.4],
      [7.9, 9.7],
      [0.2, 9.1],
      [15.5, 1.1],
      [14.8, 10.3],
    ];
    const left = triangulateSurface(vertices, [[0, 1, 2, 3]]);
    // El vecino recorre la arista común (1-2) en sentido contrario.
    const right = triangulateSurface(vertices, [[4, 5, 2, 1]]);
    const onShared = (p: Point2) => {
      const [a, b] = [vertices[1]!, vertices[2]!];
      const cross = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
      return Math.abs(cross) < 1e-9;
    };
    const key = (p: Point2) => p.join(',');
    const leftKeys = new Set(left.points.filter(onShared).map(key));
    const rightKeys = new Set(right.points.filter(onShared).map(key));
    expect(leftKeys.size).toBeGreaterThan(2);
    expect(leftKeys).toEqual(rightKeys);
  });

  it('funciona con polígonos cóncavos y vértices alineados', () => {
    const vertices: Point2[] = [
      [0, 0],
      [5, 0],
      [10, 0],
      [10, 10],
      [5, 10],
      [5, 4],
      [0, 4],
    ];
    expect(areaOf(triangulateSurface(vertices, [[0, 1, 2, 3, 4, 5, 6]]))).toBeCloseTo(70);
  });
});
