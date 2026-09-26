import { describe, expect, it } from 'vitest';
import { LevelValidationError, parseLevel } from './level_parser';
import { signedArea } from './polygon_utils';
import { ringPoints } from './level_queries';
import { rawLevel, rawSector, TWO_ROOMS_VERTICES } from './test_helpers';

const SQUARE: [number, number][] = [
  [0, 0],
  [4, 0],
  [4, 4],
  [0, 4],
];

function issuesOf(json: unknown): string[] {
  try {
    parseLevel(json);
  } catch (error) {
    if (error instanceof LevelValidationError) return error.issues;
    throw error;
  }
  return [];
}

describe('parseLevel', () => {
  it('acepta un nivel mínimo y rellena los valores por defecto', () => {
    const level = parseLevel(rawLevel(SQUARE, [rawSector([0, 1, 2, 3])]));
    const sector = level.sectors[0]!;
    expect(sector.walls).toEqual({ middle: 'brick', upper: 'brick', lower: 'brick' });
    expect(sector.light).toBe(0.8);
    expect(sector.sky).toBe(false);
    expect(sector.secret).toBe(false);
    expect(level.slabs).toEqual([]);
  });

  it('normaliza el anillo exterior a antihorario y los huecos a horario', () => {
    const vertices: [number, number][] = [...SQUARE, [1, 1], [2, 1], [2, 2], [1, 2]];
    // Ambos anillos se escriben en el mismo sentido a propósito.
    const level = parseLevel(
      rawLevel(vertices, [rawSector([3, 2, 1, 0], { holes: [[4, 5, 6, 7]] })]),
    );
    const sector = level.sectors[0]!;
    expect(signedArea(ringPoints(level, sector.outer))).toBeGreaterThan(0);
    expect(signedArea(ringPoints(level, sector.holes[0]!))).toBeLessThan(0);
  });

  it('convierte el ángulo de las cosas de grados a radianes y conserva las propiedades', () => {
    const level = parseLevel(
      rawLevel(SQUARE, [rawSector([0, 1, 2, 3])], {
        things: [{ type: 'player_start', x: 1, z: 1, angle: 90, skill: 2 }],
      }),
    );
    expect(level.things[0]!.angle).toBeCloseTo(Math.PI / 2);
    expect(level.things[0]!.properties).toEqual({ skill: 2 });
  });

  it('lee especiales con sus valores por defecto', () => {
    const level = parseLevel(
      rawLevel(TWO_ROOMS_VERTICES, [
        rawSector([0, 1, 2, 3]),
        rawSector([1, 4, 5, 2], { special: { type: 'door', key: 'red' } }),
      ]),
    );
    expect(level.sectors[1]!.special).toMatchObject({ type: 'door', key: 'red', hidden: false });
  });

  it('informa de todos los errores estructurales a la vez', () => {
    const issues = issuesOf({
      version: 2,
      name: '',
      vertices: [[0, 0], [1]],
      sectors: [{ vertices: [0, 1] }],
      things: [],
    });
    expect(issues.length).toBeGreaterThanOrEqual(4);
    expect(issues.join('\n')).toContain('version');
    expect(issues.join('\n')).toContain('vertices[1]');
  });

  it('rechaza índices de vértice inexistentes y polígonos que se cortan', () => {
    expect(issuesOf(rawLevel(SQUARE, [rawSector([0, 1, 9])])).join()).toContain('índice');
    expect(issuesOf(rawLevel(SQUARE, [rawSector([0, 2, 1, 3])])).join()).toContain('se corta');
  });

  it('rechaza uniones en T', () => {
    // La sala de la derecha usa el vértice (4,2), que queda en mitad de la arista de la izquierda.
    const vertices: [number, number][] = [...SQUARE, [8, 0], [8, 4], [4, 2]];
    const issues = issuesOf(
      rawLevel(vertices, [rawSector([0, 1, 2, 3]), rawSector([1, 4, 5, 2, 6])]),
    );
    expect(issues.join()).toContain('está sobre la arista');
  });

  it('rechaza sectores solapados con la misma arista en el mismo sentido', () => {
    const issues = issuesOf(rawLevel(SQUARE, [rawSector([0, 1, 2, 3]), rawSector([0, 1, 2, 3])]));
    expect(issues.join()).toContain('solapados');
  });

  it('rechaza techos por debajo del suelo, también con rampas', () => {
    expect(
      issuesOf(
        rawLevel(SQUARE, [rawSector([0, 1, 2, 3], { ceiling: { height: -1, texture: 'x' } })]),
      ).join(),
    ).toContain('techo');
    const ramp = rawSector([0, 1, 2, 3], {
      floor: { height: 0, texture: 'x', slope: { from: [0, 0], to: [4, 0], toHeight: 5 } },
    });
    expect(issuesOf(rawLevel(SQUARE, [ramp])).join()).toContain('techo');
  });

  it('exige puertas y ascensores convexos y ascensores con altura baja menor', () => {
    const concave: [number, number][] = [
      [0, 0],
      [4, 0],
      [2, 1],
      [4, 4],
      [0, 4],
    ];
    expect(
      issuesOf(
        rawLevel(concave, [rawSector([0, 1, 2, 3, 4], { special: { type: 'door' } })]),
      ).join(),
    ).toContain('convexos');
    expect(
      issuesOf(
        rawLevel(SQUARE, [rawSector([0, 1, 2, 3], { special: { type: 'lift', lowHeight: 1 } })]),
      ).join(),
    ).toContain('lowHeight');
  });

  it('exige un único inicio de jugador dentro de un sector', () => {
    expect(issuesOf(rawLevel(SQUARE, [rawSector([0, 1, 2, 3])], { things: [] })).join()).toContain(
      'player_start',
    );
    expect(
      issuesOf(
        rawLevel(SQUARE, [rawSector([0, 1, 2, 3])], {
          things: [{ type: 'player_start', x: 10, z: 10 }],
        }),
      ).join(),
    ).toContain('fuera');
  });

  it('valida las losas', () => {
    const vertices: [number, number][] = [...SQUARE, [1, 1], [2, 1], [2, 2], [1, 2]];
    const slab = { vertices: [4, 5, 6, 7], bottom: 2, top: 1, texture: 'metal' };
    expect(
      issuesOf(rawLevel(vertices, [rawSector([0, 1, 2, 3])], { slabs: [slab] })).join(),
    ).toContain('top');
  });
});
