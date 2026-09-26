import { describe, expect, it } from 'vitest';
import { parseLevel } from '../engine/level/level_parser';
import { rawLevel, rawSector } from '../engine/level/test_helpers';
import { buildGraph, playthrough, reachable } from './level_checks';
import testLevel from './test_level.json';

// Tres salas en fila: A (0..4), B (4..8, una puerta roja) y C (8..12).
const V: [number, number][] = [
  [0, 0],
  [4, 0],
  [4, 4],
  [0, 4],
  [8, 0],
  [8, 4],
  [12, 0],
  [12, 4],
];

function level(sectors: ReturnType<typeof rawSector>[], things: Record<string, unknown>[]) {
  return parseLevel(
    rawLevel(V, sectors, { things: [{ type: 'player_start', x: 1, z: 1 }, ...things] }),
  );
}

describe('level_checks', () => {
  it('no se puede subir un escalón de más de 1,2 m pero sí bajarlo', () => {
    const lvl = level(
      [
        rawSector([0, 1, 2, 3]),
        rawSector([1, 4, 5, 2], {
          floor: { height: 2, texture: 'x' },
          ceiling: { height: 6, texture: 'x' },
        }),
      ],
      [],
    );
    const graph = buildGraph(lvl);
    expect(reachable(lvl, graph, new Set()).has(1)).toBe(false);
    expect(graph.neighbours.get(1)!.has(0)).toBe(true);
  });

  it('un ascensor une sus dos alturas', () => {
    const lvl = level(
      [
        rawSector([0, 1, 2, 3]),
        rawSector([1, 4, 5, 2], {
          floor: { height: 3, texture: 'x' },
          ceiling: { height: 8, texture: 'x' },
          special: { type: 'lift', lowHeight: 0 },
        }),
        rawSector([4, 6, 7, 5], {
          floor: { height: 3, texture: 'x' },
          ceiling: { height: 8, texture: 'x' },
        }),
      ],
      [],
    );
    expect(reachable(lvl, buildGraph(lvl), new Set()).has(2)).toBe(true);
  });

  it('la puerta con llave bloquea hasta tener la llave, y la simulación la recoge', () => {
    const lvl = level(
      [
        rawSector([0, 1, 2, 3]),
        rawSector([1, 4, 5, 2], { special: { type: 'door', key: 'red' } }),
        rawSector([4, 6, 7, 5]),
      ],
      [
        { type: 'pickup', item: 'key_red', x: 2, z: 2 },
        { type: 'exit', x: 10, z: 2 },
      ],
    );
    const result = playthrough(lvl);
    expect(result.keyOrder).toEqual(['red']);
    expect(result.exitReachable).toBe(true);
    expect(result.exitReachableWithoutKeys).toBe(false);
  });

  it('el nivel de pruebas se puede completar con la llave roja', () => {
    const result = playthrough(parseLevel(testLevel));
    expect(result.keyOrder).toEqual(['red']);
    expect(result.exitReachable).toBe(true);
    expect(result.exitReachableWithoutKeys).toBe(false);
  });
});
