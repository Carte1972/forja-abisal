import { describe, expect, it } from 'vitest';
import { parseLevel } from '../engine/level/level_parser';
import { buildLevelGeometry } from '../engine/level/sector_geometry';
import testLevel from './test_level.json';

describe('niveles incluidos', () => {
  it('el nivel de pruebas es válido y genera geometría', () => {
    const level = parseLevel(testLevel);
    const geometry = buildLevelGeometry(level);
    expect(geometry.collision.indices.length).toBeGreaterThan(0);
    expect(geometry.movers.map((m) => m.kind).sort()).toEqual(['door', 'lift']);
  });
});
