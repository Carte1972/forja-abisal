import { describe, expect, it } from 'vitest';
import { parseLevel } from '../engine/level/level_parser';
import { rawLevel, rawSector, TWO_ROOMS_VERTICES } from '../engine/level/test_helpers';
import { buildAutomapLines } from './automap_lines';

const V = TWO_ROOMS_VERTICES;

function lines(second: ReturnType<typeof rawSector>) {
  return buildAutomapLines(parseLevel(rawLevel(V, [rawSector([0, 1, 2, 3]), second])));
}

const shared = (l: ReturnType<typeof buildAutomapLines>) =>
  l.filter((line) => line.sectors.length === 2);

describe('buildAutomapLines', () => {
  it('las paredes exteriores son muros y la arista entre salas iguales no se dibuja', () => {
    const result = lines(rawSector([1, 4, 5, 2]));
    expect(result.filter((l) => l.kind === 'wall')).toHaveLength(6);
    expect(shared(result)).toHaveLength(0);
  });

  it('un escalón se marca como step', () => {
    const result = lines(rawSector([1, 4, 5, 2], { floor: { height: 0.5, texture: 'x' } }));
    expect(shared(result).map((l) => l.kind)).toEqual(['step']);
  });

  it('las puertas llevan el color de su llave y las secretas parecen paredes', () => {
    const keyed = lines(rawSector([1, 4, 5, 2], { special: { type: 'door', key: 'blue' } }));
    expect(shared(keyed)).toMatchObject([{ kind: 'door', key: 'blue' }]);
    const hidden = lines(rawSector([1, 4, 5, 2], { special: { type: 'door', hidden: true } }));
    expect(shared(hidden)).toMatchObject([{ kind: 'wall' }]);
  });

  it('el borde de un suelo dañino y el de un ascensor se distinguen', () => {
    expect(
      shared(
        lines(rawSector([1, 4, 5, 2], { special: { type: 'damage', damagePerSecond: 5 } })),
      )[0]!.kind,
    ).toBe('hazard');
    expect(
      shared(
        lines(
          rawSector([1, 4, 5, 2], {
            floor: { height: 2, texture: 'x' },
            ceiling: { height: 6, texture: 'x' },
            special: { type: 'lift', lowHeight: 0 },
          }),
        ),
      )[0]!.kind,
    ).toBe('lift');
  });
});
