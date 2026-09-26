import { describe, expect, it } from 'vitest';
import type { KeyColor } from '../../engine/level/level_types';
import { MAX_AMMO, type AmmoType, type WeaponId } from '../weapons/weapon_defs';
import { applyPickup, isPickupId, PICKUP_IDS, PICKUPS, type Inventory } from './pickup_rules';

function inventory(
  overrides: Partial<Inventory> = {},
): Inventory & { ammo: Record<AmmoType, number>; weapons: Set<WeaponId> } {
  const ammo: Record<AmmoType, number> = { bullets: 0, shells: 0, charges: 0 };
  const weapons = new Set<WeaponId>(['hammer', 'pistol']);
  return {
    health: 100,
    armor: 0,
    keys: new Set<KeyColor>(),
    ammo,
    weapons,
    hasWeapon: (w) => weapons.has(w),
    giveWeapon: (w) => {
      if (weapons.has(w)) return false;
      weapons.add(w);
      return true;
    },
    addAmmo: (type, amount) => {
      const accepted = Math.max(0, Math.min(amount, MAX_AMMO[type] - ammo[type]));
      ammo[type] += accepted;
      return accepted;
    },
    ...overrides,
  };
}

describe('pickup_rules', () => {
  it('la salud no se recoge con la salud llena y no pasa del máximo', () => {
    const inv = inventory();
    expect(applyPickup(inv, 'health')).toBe(false);
    inv.health = 90;
    expect(applyPickup(inv, 'health')).toBe(true);
    expect(inv.health).toBe(100);
  });

  it('el vial de suero permite superar 100 hasta 200', () => {
    const inv = inventory();
    expect(applyPickup(inv, 'health_small')).toBe(true);
    expect(inv.health).toBe(105);
    inv.health = 199;
    applyPickup(inv, 'health_small');
    expect(inv.health).toBe(200);
    expect(applyPickup(inv, 'health_small')).toBe(false);
  });

  it('el blindaje respeta su máximo', () => {
    const inv = inventory();
    expect(applyPickup(inv, 'armor')).toBe(true);
    expect(inv.armor).toBe(100);
    expect(applyPickup(inv, 'armor')).toBe(false);
    expect(applyPickup(inv, 'armor_small')).toBe(true);
    expect(inv.armor).toBe(105);
  });

  it('la munición no se recoge si está al máximo', () => {
    const inv = inventory();
    expect(applyPickup(inv, 'ammo_shells')).toBe(true);
    expect(inv.ammo.shells).toBe(6);
    inv.ammo.shells = MAX_AMMO.shells;
    expect(applyPickup(inv, 'ammo_shells')).toBe(false);
  });

  it('un arma nueva siempre se recoge y trae munición; repetida, solo si aporta munición', () => {
    const inv = inventory();
    expect(applyPickup(inv, 'weapon_shotgun')).toBe(true);
    expect(inv.weapons.has('shotgun')).toBe(true);
    expect(inv.ammo.shells).toBe(8);
    expect(applyPickup(inv, 'weapon_shotgun')).toBe(true);
    inv.ammo.shells = MAX_AMMO.shells;
    expect(applyPickup(inv, 'weapon_shotgun')).toBe(false);
  });

  it('las llaves se recogen una vez', () => {
    const inv = inventory();
    expect(applyPickup(inv, 'key_blue')).toBe(true);
    expect(inv.keys.has('blue')).toBe(true);
    expect(applyPickup(inv, 'key_blue')).toBe(false);
  });

  it('todos los objetos tienen nombre y se reconocen por su id', () => {
    for (const id of PICKUP_IDS) {
      expect(PICKUPS[id].name.length).toBeGreaterThan(0);
      expect(isPickupId(id)).toBe(true);
    }
    expect(isPickupId('pizza')).toBe(false);
  });
});
