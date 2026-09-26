import { describe, expect, it } from 'vitest';
import { parseLevel } from '../engine/level/level_parser';
import { buildLevelGeometry } from '../engine/level/sector_geometry';
import { isEnemyKind } from '../game/enemies/enemy_defs';
import testLevel from './test_level.json';

describe('niveles incluidos', () => {
  it('el nivel de pruebas es válido y genera geometría', () => {
    const level = parseLevel(testLevel);
    const geometry = buildLevelGeometry(level);
    expect(geometry.collision.indices.length).toBeGreaterThan(0);
    expect(geometry.movers.map((m) => m.kind).sort()).toEqual(['door', 'lift']);
  });

  it('los enemigos del nivel de pruebas son de tipos conocidos y tienen patrullas válidas', () => {
    const level = parseLevel(testLevel);
    const enemies = level.things.filter((t) => t.type === 'enemy');
    expect(enemies.length).toBeGreaterThan(0);
    for (const enemy of enemies) {
      expect(isEnemyKind(enemy.properties.kind)).toBe(true);
      const patrol = enemy.properties.patrol;
      if (patrol !== undefined) {
        expect(Array.isArray(patrol)).toBe(true);
        for (const point of patrol as unknown[]) expect(point).toHaveLength(2);
      }
    }
  });
});
