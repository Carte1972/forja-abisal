import { beforeAll, describe, expect, it } from 'vitest';
import { initNavigation, Navigation } from '../engine/ai/navmesh';
import { parseLevel } from '../engine/level/level_parser';
import { findSectorAt } from '../engine/level/level_queries';
import { buildLevelGeometry } from '../engine/level/sector_geometry';
import { isEnemyKind } from '../game/enemies/enemy_defs';
import { isPickupId } from '../game/world/pickup_rules';
import { LEVELS } from './index';
import { playthrough } from './level_checks';

beforeAll(async () => {
  await initNavigation();
});

describe.each(LEVELS.map((entry) => [entry.id, entry] as const))('nivel %s', (_id, entry) => {
  const level = parseLevel(entry.data);

  it('tiene nombre, geometría y malla de navegación', () => {
    expect(level.name).toBe(entry.name);
    const geometry = buildLevelGeometry(level);
    expect(geometry.collision.indices.length).toBeGreaterThan(0);
    const nav = Navigation.build(geometry.collision.positions, geometry.collision.indices);
    nav.dispose();
  });

  it('sus enemigos y objetos son válidos y hay una salida', () => {
    for (const thing of level.things) {
      if (thing.type === 'enemy') expect(isEnemyKind(thing.properties.kind)).toBe(true);
      if (thing.type === 'pickup') expect(isPickupId(thing.properties.item)).toBe(true);
    }
    expect(level.things.some((t) => t.type === 'exit')).toBe(true);
  });

  it('usa las tres llaves: se consiguen todas y la salida exige tenerlas', () => {
    const doors = new Set(
      level.sectors.flatMap((s) =>
        s.special?.type === 'door' && s.special.key ? [s.special.key] : [],
      ),
    );
    expect(doors).toEqual(new Set(['red', 'blue', 'yellow']));
    const result = playthrough(level);
    expect(new Set(result.keyOrder)).toEqual(new Set(['red', 'blue', 'yellow']));
    expect(result.exitReachable).toBe(true);
    expect(result.exitReachableWithoutKeys).toBe(false);
  });

  it('tiene al menos dos secretos y todos son alcanzables', () => {
    const secrets = level.sectors.filter((s) => s.secret);
    expect(secrets.length).toBeGreaterThanOrEqual(2);
    const area = playthrough(level).reachableWithKeys;
    for (const secret of secrets) expect(area.has(secret.index)).toBe(true);
  });

  it('todos los objetos y enemigos están en sectores alcanzables', () => {
    const area = playthrough(level).reachableWithKeys;
    const unreachable = level.things
      .filter((t) => t.type === 'pickup' || t.type === 'enemy')
      .filter((t) => {
        const sector = findSectorAt(level, t.position[0], t.position[1]);
        return !sector || !area.has(sector.index);
      })
      .map(
        (t) =>
          `${t.type}:${String(t.properties.item ?? t.properties.kind)}@${t.position.join(',')}`,
      );
    expect(unreachable).toEqual([]);
  });
});
