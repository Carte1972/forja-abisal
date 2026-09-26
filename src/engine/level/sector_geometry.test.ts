import { describe, expect, it } from 'vitest';
import { parseLevel } from './level_parser';
import { buildLevelGeometry, type GeometryBatch, type LevelGeometry } from './sector_geometry';
import { rawLevel, rawSector, TWO_ROOMS_VERTICES, type RawSector } from './test_helpers';

type V3 = [number, number, number];

interface Tri {
  texture: string;
  points: [V3, V3, V3];
  normal: V3;
  color: number;
}

const SQUARE: [number, number][] = [
  [0, 0],
  [4, 0],
  [4, 4],
  [0, 4],
];

function trianglesOf(batches: Map<string, GeometryBatch>): Tri[] {
  const out: Tri[] = [];
  for (const [texture, b] of batches) {
    const vertex = (i: number): V3 => [
      b.positions[i * 3]!,
      b.positions[i * 3 + 1]!,
      b.positions[i * 3 + 2]!,
    ];
    for (let t = 0; t < b.indices.length; t += 3) {
      const [i, j, k] = [b.indices[t]!, b.indices[t + 1]!, b.indices[t + 2]!];
      out.push({
        texture,
        points: [vertex(i), vertex(j), vertex(k)],
        normal: [b.normals[i * 3]!, b.normals[i * 3 + 1]!, b.normals[i * 3 + 2]!],
        color: b.colors[i * 3]!,
      });
    }
  }
  return out;
}

function cross(a: V3, b: V3, c: V3): V3 {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  return [
    u[1]! * v[2]! - u[2]! * v[1]!,
    u[2]! * v[0]! - u[0]! * v[2]!,
    u[0]! * v[1]! - u[1]! * v[0]!,
  ];
}

function area(tri: Tri): number {
  const c = cross(...tri.points);
  return Math.hypot(...c) / 2;
}

function sumArea(tris: Tri[]): number {
  return tris.reduce((sum, tri) => sum + area(tri), 0);
}

function centroid(tri: Tri): V3 {
  const [a, b, c] = tri.points;
  return [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
}

const isUp = (t: Tri) => t.normal[1] > 0.99;
const isDown = (t: Tri) => t.normal[1] < -0.99;
const isWall = (t: Tri) => Math.abs(t.normal[1]) < 1e-6;

function build(vertices: [number, number][], sectors: RawSector[], extra = {}): LevelGeometry {
  return buildLevelGeometry(parseLevel(rawLevel(vertices, sectors, extra)));
}

function expectConsistentWinding(tris: Tri[]): void {
  for (const tri of tris) {
    const face = cross(...tri.points);
    const length = Math.hypot(...face);
    const d =
      (face[0] * tri.normal[0] + face[1] * tri.normal[1] + face[2] * tri.normal[2]) / length;
    // La cara frontal (antihoraria) debe mirar hacia la normal guardada.
    expect(d).toBeGreaterThan(0.999);
  }
}

describe('buildLevelGeometry', () => {
  it('una sala cuadrada genera suelo, techo y cuatro paredes hacia dentro', () => {
    const geometry = build(SQUARE, [rawSector([0, 1, 2, 3], { light: 0.5 })]);
    const tris = trianglesOf(geometry.batches);
    expectConsistentWinding(tris);

    expect(sumArea(tris.filter(isUp))).toBeCloseTo(16);
    expect(sumArea(tris.filter(isDown))).toBeCloseTo(16);
    const walls = tris.filter(isWall);
    expect(sumArea(walls)).toBeCloseTo(4 * 4 * 4);
    for (const wall of walls) {
      const c = centroid(wall);
      const toCenter = [2 - c[0], 2 - c[2]];
      expect(wall.normal[0] * toCenter[0]! + wall.normal[2] * toCenter[1]!).toBeGreaterThan(0);
    }
    expect(new Set(tris.map((t) => t.texture))).toEqual(new Set(['stone', 'metal', 'brick']));
    expect(tris.every((t) => t.color === 0.5)).toBe(true);
  });

  it('la colisión contiene exactamente los triángulos visibles', () => {
    const geometry = build(SQUARE, [rawSector([0, 1, 2, 3])]);
    const visible = trianglesOf(geometry.batches).length;
    expect(geometry.collision.indices.length / 3).toBe(visible);
  });

  it('entre dos salas al mismo nivel no hay pared en la arista compartida', () => {
    const geometry = build(TWO_ROOMS_VERTICES, [rawSector([0, 1, 2, 3]), rawSector([1, 4, 5, 2])]);
    const walls = trianglesOf(geometry.batches).filter(isWall);
    // Perímetro exterior de 8×4 metros, sin la arista interior x=4.
    expect(sumArea(walls)).toBeCloseTo((8 + 4 + 8 + 4) * 4);
    expect(walls.some((w) => Math.abs(centroid(w)[0] - 4) < 1e-6)).toBe(false);
  });

  it('un escalón genera la tabica mirando al lado bajo y el dintel mirando al techo alto', () => {
    const geometry = build(TWO_ROOMS_VERTICES, [
      rawSector([0, 1, 2, 3], { light: 0.9 }),
      rawSector([1, 4, 5, 2], {
        floor: { height: 1, texture: 'stone' },
        ceiling: { height: 3, texture: 'metal' },
        walls: { middle: 'brick', lower: 'step', upper: 'lintel' },
      }),
    ]);
    const tris = trianglesOf(geometry.batches);
    expectConsistentWinding(tris);
    const shared = tris.filter((t) => isWall(t) && Math.abs(centroid(t)[0] - 4) < 1e-6);
    const riser = shared.filter((t) => t.texture === 'step');
    const lintel = shared.filter((t) => t.texture === 'lintel');
    expect(sumArea(riser)).toBeCloseTo(4 * 1);
    expect(sumArea(lintel)).toBeCloseTo(4 * 1);
    // Ambas se ven desde la sala izquierda (x < 4) y llevan su luz.
    for (const t of [...riser, ...lintel]) {
      expect(t.normal[0]).toBeCloseTo(-1);
      expect(t.color).toBe(0.9);
    }
    expect(Math.max(...riser.flatMap((t) => t.points.map((p) => p[1])))).toBeCloseTo(1);
    expect(Math.min(...lintel.flatMap((t) => t.points.map((p) => p[1])))).toBeCloseTo(3);
  });

  it('una rampa eleva los vértices del suelo según la pendiente', () => {
    const geometry = build(TWO_ROOMS_VERTICES, [
      rawSector([0, 1, 2, 3]),
      rawSector([1, 4, 5, 2], {
        floor: { height: 0, texture: 'ramp', slope: { from: [4, 0], to: [8, 0], toHeight: 2 } },
      }),
    ]);
    const tris = trianglesOf(geometry.batches);
    expectConsistentWinding(tris);
    const rampPoints = tris.filter((t) => t.texture === 'ramp').flatMap((t) => t.points);
    for (const [x, y] of rampPoints) expect(y).toBeCloseTo((x - 4) / 2);
    // Sin escalón en x=4 (ambos suelos a 0) y paredes laterales trapezoidales.
    expect(tris.some((t) => isWall(t) && Math.abs(centroid(t)[0] - 4) < 1e-6)).toBe(false);
    expect(sumArea(tris.filter((t) => isWall(t) && t.texture === 'brick'))).toBeGreaterThan(0);
  });

  it('si dos suelos inclinados se cruzan, la pared se parte y cada tramo mira a su lado bajo', () => {
    const geometry = build(TWO_ROOMS_VERTICES, [
      rawSector([0, 1, 2, 3], {
        floor: { height: 0, texture: 'stone', slope: { from: [0, 0], to: [0, 4], toHeight: 2 } },
      }),
      rawSector([1, 4, 5, 2], { floor: { height: 1, texture: 'stone' } }),
    ]);
    const tris = trianglesOf(geometry.batches);
    expectConsistentWinding(tris);
    const shared = tris.filter((t) => isWall(t) && Math.abs(centroid(t)[0] - 4) < 1e-6);
    const facingLeft = shared.filter((t) => t.normal[0] < 0);
    const facingRight = shared.filter((t) => t.normal[0] > 0);
    expect(sumArea(facingLeft)).toBeCloseTo(1);
    expect(sumArea(facingRight)).toBeCloseTo(1);
    expect(facingLeft.every((t) => centroid(t)[2] < 2)).toBe(true);
    expect(facingRight.every((t) => centroid(t)[2] > 2)).toBe(true);
  });

  it('dos sectores con cielo no generan dintel y tienen techo solo de colisión', () => {
    const sky = { height: 10, sky: true };
    const geometry = build(TWO_ROOMS_VERTICES, [
      rawSector([0, 1, 2, 3], { ceiling: { ...sky } }),
      rawSector([1, 4, 5, 2], { ceiling: { ...sky, height: 12 } }),
    ]);
    const tris = trianglesOf(geometry.batches);
    expect(tris.some(isDown)).toBe(false);
    expect(tris.some((t) => isWall(t) && Math.abs(centroid(t)[0] - 4) < 1e-6)).toBe(false);
    // 4 triángulos de suelo + 4 de tapa invisible de más en la colisión.
    expect(geometry.collision.indices.length / 3).toBe(tris.length + 4);
  });

  it('una sala interior junto a un patio con cielo genera la fachada hasta el cielo', () => {
    const geometry = build(TWO_ROOMS_VERTICES, [
      rawSector([0, 1, 2, 3]),
      rawSector([1, 4, 5, 2], { ceiling: { height: 10, sky: true } }),
    ]);
    const facade = trianglesOf(geometry.batches).filter(
      (t) => isWall(t) && Math.abs(centroid(t)[0] - 4) < 1e-6,
    );
    expect(sumArea(facade)).toBeCloseTo(4 * 6);
    expect(facade.every((t) => t.normal[0] > 0)).toBe(true);
  });

  it('un hueco genera una columna con las paredes mirando hacia fuera del hueco', () => {
    const vertices: [number, number][] = [...SQUARE, [1, 1], [2, 1], [2, 2], [1, 2]];
    const geometry = build(vertices, [rawSector([0, 1, 2, 3], { holes: [[4, 5, 6, 7]] })]);
    const tris = trianglesOf(geometry.batches);
    expectConsistentWinding(tris);
    expect(sumArea(tris.filter(isUp))).toBeCloseTo(16 - 1);
    const pillar = tris.filter((t) => {
      const [x, , z] = centroid(t);
      return isWall(t) && x > 0.5 && x < 2.5 && z > 0.5 && z < 2.5;
    });
    expect(sumArea(pillar)).toBeCloseTo(4 * 1 * 4);
    for (const wall of pillar) {
      const c = centroid(wall);
      expect(wall.normal[0] * (c[0] - 1.5) + wall.normal[2] * (c[2] - 1.5)).toBeGreaterThan(0);
    }
  });

  it('una puerta genera un prisma móvil y no deja techo estático', () => {
    const geometry = build(TWO_ROOMS_VERTICES, [
      rawSector([0, 1, 2, 3], { ceiling: { height: 5, texture: 'metal' } }),
      rawSector([1, 4, 5, 2], {
        ceiling: { height: 3, texture: 'metal' },
        special: { type: 'door', texture: 'door_panel' },
      }),
    ]);
    const statics = trianglesOf(geometry.batches);
    expect(statics.filter((t) => isDown(t) && centroid(t)[0] > 4)).toHaveLength(0);
    // El dintel estático por encima de la puerta abierta (de 3 a 5) mira a la sala alta.
    const lintel = statics.filter((t) => isWall(t) && Math.abs(centroid(t)[0] - 4) < 1e-6);
    expect(sumArea(lintel)).toBeCloseTo(4 * 2);

    expect(geometry.movers).toHaveLength(1);
    const door = geometry.movers[0]!;
    expect(door.kind).toBe('door');
    expect(door.travel).toBeCloseTo(3);
    expect(door.hullPoints).toHaveLength(4 * 2 * 3);
    const doorTris = trianglesOf(door.batches);
    expectConsistentWinding(doorTris);
    // Cara inferior + una única cara lateral hacia el vecino (x=4, mirando a -X).
    expect(sumArea(doorTris.filter(isDown))).toBeCloseTo(16);
    const sides = doorTris.filter(isWall);
    expect(sumArea(sides)).toBeCloseTo(4 * 3);
    expect(sides.every((t) => t.normal[0] < -0.99 && t.texture === 'door_panel')).toBe(true);
  });

  it('un ascensor genera un prisma que baja y paredes estáticas desde su altura baja', () => {
    const geometry = build(TWO_ROOMS_VERTICES, [
      rawSector([0, 1, 2, 3], {
        floor: { height: 2, texture: 'stone' },
        ceiling: { height: 6, texture: 'metal' },
      }),
      rawSector([1, 4, 5, 2], {
        floor: { height: 2, texture: 'lift_top' },
        ceiling: { height: 6, texture: 'metal' },
        special: { type: 'lift', lowHeight: 0 },
      }),
    ]);
    const statics = trianglesOf(geometry.batches);
    expect(statics.some((t) => t.texture === 'lift_top')).toBe(false);
    const shared = statics.filter((t) => isWall(t) && Math.abs(centroid(t)[0] - 4) < 1e-6);
    // Pared de 0 a 2 que mira hacia dentro del hueco del ascensor.
    expect(sumArea(shared)).toBeCloseTo(4 * 2);
    expect(shared.every((t) => t.normal[0] > 0.99)).toBe(true);

    const lift = geometry.movers[0]!;
    expect(lift.kind).toBe('lift');
    expect(lift.travel).toBeCloseTo(-2);
    const top = trianglesOf(lift.batches).filter(isUp);
    expect(sumArea(top)).toBeCloseTo(16);
    expect(top.every((t) => t.points.every((p) => Math.abs(p[1] - 2) < 1e-9))).toBe(true);
  });

  it('una losa genera tapas, laterales hacia fuera y colisión', () => {
    const vertices: [number, number][] = [...SQUARE, [1, 1], [3, 1], [3, 3], [1, 3]];
    const withSlab = build(vertices, [rawSector([0, 1, 2, 3], { light: 0.4 })], {
      slabs: [{ vertices: [4, 5, 6, 7], bottom: 1.5, top: 2, texture: 'metal_grate' }],
    });
    const withoutSlab = build(vertices, [rawSector([0, 1, 2, 3])]);
    const slab = trianglesOf(withSlab.batches).filter((t) => t.texture === 'metal_grate');
    expectConsistentWinding(slab);
    expect(sumArea(slab.filter(isUp))).toBeCloseTo(4);
    expect(sumArea(slab.filter(isDown))).toBeCloseTo(4);
    const sides = slab.filter(isWall);
    expect(sumArea(sides)).toBeCloseTo(4 * 2 * 0.5);
    for (const side of sides) {
      const c = centroid(side);
      expect(side.normal[0] * (c[0] - 2) + side.normal[2] * (c[2] - 2)).toBeGreaterThan(0);
    }
    expect(slab.every((t) => t.color === 0.4)).toBe(true);
    expect(withSlab.collision.indices.length - withoutSlab.collision.indices.length).toBe(
      slab.length * 3,
    );
  });
});
