import { describe, expect, it } from 'vitest';
import { DamageRegistry, explosionFalloff, type Damageable } from './damage';

function target(x: number, alive = true): Damageable {
  return { alive, bloodColor: 0x00ff00, center: () => ({ x, y: 0, z: 0 }), applyDamage: () => {} };
}

describe('DamageRegistry', () => {
  it('encuentra el objetivo por collider y lo olvida al darlo de baja', () => {
    const registry = new DamageRegistry();
    const t = target(0);
    registry.register(5, t);
    expect(registry.lookup(5)).toBe(t);
    registry.unregister(5);
    expect(registry.lookup(5)).toBeUndefined();
  });

  it('within devuelve cada objetivo vivo una sola vez aunque tenga varios colliders', () => {
    const registry = new DamageRegistry();
    const near = target(1);
    registry.register(1, near);
    registry.register(2, near);
    registry.register(3, target(10));
    registry.register(4, target(0.5, false));
    expect(registry.within({ x: 0, y: 0, z: 0 }, 3)).toEqual([near]);
  });
});

describe('DamageRegistry con jugador', () => {
  it('lookup encuentra al jugador por su collider, pero within no lo incluye', () => {
    const registry = new DamageRegistry();
    const player = target(0);
    registry.registerPlayer(7, player);
    expect(registry.lookup(7)).toBe(player);
    expect(registry.playerTarget).toBe(player);
    expect(registry.within({ x: 0, y: 0, z: 0 }, 5)).toEqual([]);
  });
});

describe('explosionFalloff', () => {
  it('es 1 en el centro, 0 en el borde y decrece', () => {
    expect(explosionFalloff(0, 4)).toBe(1);
    expect(explosionFalloff(4, 4)).toBe(0);
    expect(explosionFalloff(1, 4)).toBeGreaterThan(explosionFalloff(3, 4));
  });
});
