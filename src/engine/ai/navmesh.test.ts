import { beforeAll, describe, expect, it } from 'vitest';
import { parseLevel } from '../level/level_parser';
import { buildLevelGeometry } from '../level/sector_geometry';
import testLevel from '../../levels/test_level.json';
import { initNavigation, Navigation } from './navmesh';

describe('Navigation (nivel de pruebas)', () => {
  let nav: Navigation;

  beforeAll(async () => {
    await initNavigation();
    const geometry = buildLevelGeometry(parseLevel(testLevel));
    nav = Navigation.build(geometry.collision.positions, geometry.collision.indices);
  });

  it('encuentra un camino de la sala de inicio a la sala superior subiendo la escalera', () => {
    const path = nav.findPath({ x: 8, y: 0, z: 13 }, { x: 2, y: 2, z: -12 });
    expect(path).not.toBeNull();
    // El camino pasa por la escalera (x entre 6 y 10, z entre -4 y 0).
    expect(path!.some((p) => p.x > 5.5 && p.x < 10.5 && p.z < 0.2 && p.z > -4.2)).toBe(true);
    expect(path!.at(-1)!.y).toBeCloseTo(2, 0);
  });

  it('rodea las columnas en lugar de atravesarlas', () => {
    const length = nav.pathLength({ x: 2, y: 0, z: 3.5 }, { x: 5, y: 0, z: 3.5 });
    expect(length).toBeGreaterThan(3);
    expect(length).toBeLessThan(8);
  });

  it('no hay camino desde la sala superior al fondo del foso (3 m de desnivel)', () => {
    expect(nav.findPath({ x: 2, y: 2, z: -12 }, { x: 5, y: -1, z: -10 })).toBeNull();
  });

  it('closestPoint devuelve un punto sobre el suelo', () => {
    const point = nav.closestPoint({ x: 8, y: 1, z: 10 });
    expect(point).not.toBeNull();
    expect(point!.y).toBeCloseTo(0, 0);
  });
});
