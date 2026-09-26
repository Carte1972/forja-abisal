import { describe, expect, it } from 'vitest';
import { parseLevel } from '../engine/level/level_parser';
import { buildLevelGeometry } from '../engine/level/sector_geometry';
import { isEnemyKind } from '../game/enemies/enemy_defs';
import { isPickupId } from '../game/world/pickup_rules';
import testLevel from './test_level.json';

describe('niveles incluidos', () => {
  it('el nivel de pruebas es válido y genera geometría', () => {
    const level = parseLevel(testLevel);
    const geometry = buildLevelGeometry(level);
    expect(geometry.collision.indices.length).toBeGreaterThan(0);
    expect(geometry.movers.map((m) => m.kind).sort()).toEqual(['door', 'door', 'lift']);
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

  it('los objetos del nivel de pruebas existen y hay al menos una salida', () => {
    const level = parseLevel(testLevel);
    const pickups = level.things.filter((t) => t.type === 'pickup');
    expect(pickups.length).toBeGreaterThan(0);
    for (const pickup of pickups) expect(isPickupId(pickup.properties.item)).toBe(true);
    expect(level.things.some((t) => t.type === 'exit')).toBe(true);
  });

  it('cada puerta con llave tiene su llave en el nivel', () => {
    const level = parseLevel(testLevel);
    const keys = new Set(
      level.things
        .filter((t) => t.type === 'pickup' && String(t.properties.item).startsWith('key_'))
        .map((t) => String(t.properties.item).slice(4)),
    );
    for (const sector of level.sectors) {
      if (sector.special?.type === 'door' && sector.special.key) {
        expect(keys.has(sector.special.key)).toBe(true);
      }
    }
  });
});
