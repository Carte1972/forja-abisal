import { describe, expect, it } from 'vitest';
import { ENEMIES, ENEMY_KINDS, isEnemyKind } from './enemy_defs';

describe('definiciones de enemigos', () => {
  it('hay al menos cuatro tipos, con uno de cada estilo de ataque y un volador', () => {
    expect(ENEMY_KINDS.length).toBeGreaterThanOrEqual(4);
    const attacks = new Set(ENEMY_KINDS.map((k) => ENEMIES[k].attack.kind));
    expect(attacks).toEqual(new Set(['hitscan', 'melee', 'projectile']));
    expect(ENEMY_KINDS.some((k) => ENEMIES[k].flying)).toBe(true);
  });

  it.each(ENEMY_KINDS)('%s tiene valores coherentes', (kind) => {
    const def = ENEMIES[kind];
    expect(def.kind).toBe(kind);
    expect(def.health).toBeGreaterThan(0);
    expect(def.painChance).toBeGreaterThanOrEqual(0);
    expect(def.painChance).toBeLessThanOrEqual(1);
    expect(def.ai.attackWindup).toBeLessThan(def.ai.attackDuration);
    expect(def.ai.attackRange).toBeLessThanOrEqual(def.sightRange);
    // La sangre no es roja: el componente rojo nunca domina.
    const r = (def.bloodColor >> 16) & 0xff;
    const g = (def.bloodColor >> 8) & 0xff;
    const b = def.bloodColor & 0xff;
    expect(r).toBeLessThan(Math.max(g, b));
  });

  it('isEnemyKind valida los nombres', () => {
    expect(isEnemyKind('crawler')).toBe(true);
    expect(isEnemyKind('demonio')).toBe(false);
    expect(isEnemyKind(3)).toBe(false);
  });
});
