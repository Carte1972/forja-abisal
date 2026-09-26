/** Utilidades para construir niveles pequeños en los tests. */

export interface RawSector {
  vertices: number[];
  holes?: number[][];
  floor?: Record<string, unknown>;
  ceiling?: Record<string, unknown>;
  walls?: unknown;
  light?: number;
  special?: Record<string, unknown>;
  secret?: boolean;
}

export function rawSector(vertices: number[], overrides: Partial<RawSector> = {}): RawSector {
  return {
    vertices,
    floor: { height: 0, texture: 'stone' },
    ceiling: { height: 4, texture: 'metal' },
    walls: 'brick',
    ...overrides,
  };
}

export function rawLevel(
  vertices: [number, number][],
  sectors: RawSector[],
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    version: 1,
    name: 'test',
    vertices,
    sectors,
    things: [{ type: 'player_start', x: vertices[0]![0] + 0.5, z: vertices[0]![1] + 0.5 }],
    ...extra,
  };
}

/** Dos salas cuadradas de 4×4 contiguas por la arista x=4 (vértices 1-2). */
export const TWO_ROOMS_VERTICES: [number, number][] = [
  [0, 0],
  [4, 0],
  [4, 4],
  [0, 4],
  [8, 0],
  [8, 4],
];
