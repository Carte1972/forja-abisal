import type { KeyColor } from '../../engine/level/level_types';
import type { AmmoType, WeaponId } from '../weapons/weapon_defs';

/** Objetos que se recogen. Nombres y diseños originales. */
export type PickupId =
  | 'health_small'
  | 'health'
  | 'health_large'
  | 'armor_small'
  | 'armor'
  | 'ammo_bullets'
  | 'ammo_shells'
  | 'ammo_charges'
  | 'weapon_shotgun'
  | 'weapon_riveter'
  | 'weapon_launcher'
  | 'key_red'
  | 'key_blue'
  | 'key_yellow';

export type PickupEffect =
  | { kind: 'health'; amount: number; max: number }
  | { kind: 'armor'; amount: number; max: number }
  | { kind: 'ammo'; ammo: AmmoType; amount: number }
  | { kind: 'weapon'; weapon: WeaponId; ammo: AmmoType; amount: number }
  | { kind: 'key'; key: KeyColor };

export interface PickupDef {
  id: PickupId;
  name: string;
  effect: PickupEffect;
  /** Color del destello al recogerlo. */
  flash: number;
}

export const PICKUPS: Readonly<Record<PickupId, PickupDef>> = {
  health_small: {
    id: 'health_small',
    name: 'Vial de suero',
    effect: { kind: 'health', amount: 5, max: 200 },
    flash: 0x40c8ff,
  },
  health: {
    id: 'health',
    name: 'Botiquín',
    effect: { kind: 'health', amount: 25, max: 100 },
    flash: 0x40c8ff,
  },
  health_large: {
    id: 'health_large',
    name: 'Botiquín de campaña',
    effect: { kind: 'health', amount: 50, max: 100 },
    flash: 0x40c8ff,
  },
  armor_small: {
    id: 'armor_small',
    name: 'Placa de blindaje',
    effect: { kind: 'armor', amount: 5, max: 200 },
    flash: 0x60ff90,
  },
  armor: {
    id: 'armor',
    name: 'Blindaje de forja',
    effect: { kind: 'armor', amount: 100, max: 100 },
    flash: 0x60ff90,
  },
  ammo_bullets: {
    id: 'ammo_bullets',
    name: 'Caja de munición',
    effect: { kind: 'ammo', ammo: 'bullets', amount: 20 },
    flash: 0xffd070,
  },
  ammo_shells: {
    id: 'ammo_shells',
    name: 'Cartuchos',
    effect: { kind: 'ammo', ammo: 'shells', amount: 6 },
    flash: 0xffd070,
  },
  ammo_charges: {
    id: 'ammo_charges',
    name: 'Cargas explosivas',
    effect: { kind: 'ammo', ammo: 'charges', amount: 2 },
    flash: 0xffd070,
  },
  weapon_shotgun: {
    id: 'weapon_shotgun',
    name: 'Escopeta de dispersión',
    effect: { kind: 'weapon', weapon: 'shotgun', ammo: 'shells', amount: 8 },
    flash: 0xffb040,
  },
  weapon_riveter: {
    id: 'weapon_riveter',
    name: 'Remachadora',
    effect: { kind: 'weapon', weapon: 'riveter', ammo: 'bullets', amount: 40 },
    flash: 0xffb040,
  },
  weapon_launcher: {
    id: 'weapon_launcher',
    name: 'Lanzacargas',
    effect: { kind: 'weapon', weapon: 'launcher', ammo: 'charges', amount: 4 },
    flash: 0xffb040,
  },
  key_red: {
    id: 'key_red',
    name: 'Llave roja',
    effect: { kind: 'key', key: 'red' },
    flash: 0xff4030,
  },
  key_blue: {
    id: 'key_blue',
    name: 'Llave azul',
    effect: { kind: 'key', key: 'blue' },
    flash: 0x3080ff,
  },
  key_yellow: {
    id: 'key_yellow',
    name: 'Llave amarilla',
    effect: { kind: 'key', key: 'yellow' },
    flash: 0xffd020,
  },
};

export const PICKUP_IDS = Object.keys(PICKUPS) as PickupId[];

export function isPickupId(value: unknown): value is PickupId {
  return typeof value === 'string' && Object.hasOwn(PICKUPS, value);
}

/** Lo que el jugador lleva y que los objetos pueden cambiar. */
export interface Inventory {
  health: number;
  armor: number;
  keys: Set<KeyColor>;
  hasWeapon(weapon: WeaponId): boolean;
  /** Añade munición y devuelve cuánta se ha aceptado. */
  addAmmo(ammo: AmmoType, amount: number): number;
  giveWeapon(weapon: WeaponId): boolean;
}

/**
 * Aplica un objeto. Devuelve si se ha recogido: los objetos que no sirven de nada (salud llena,
 * munición al máximo, llave repetida) se quedan en el suelo para más tarde.
 */
export function applyPickup(inventory: Inventory, id: PickupId): boolean {
  const effect = PICKUPS[id].effect;
  switch (effect.kind) {
    case 'health':
      if (inventory.health >= effect.max) return false;
      inventory.health = Math.min(effect.max, inventory.health + effect.amount);
      return true;
    case 'armor':
      if (inventory.armor >= effect.max) return false;
      inventory.armor = Math.min(effect.max, inventory.armor + effect.amount);
      return true;
    case 'ammo':
      return inventory.addAmmo(effect.ammo, effect.amount) > 0;
    case 'weapon': {
      // Un arma nueva siempre se recoge; una repetida solo si aporta munición.
      const isNew = !inventory.hasWeapon(effect.weapon);
      if (isNew) inventory.giveWeapon(effect.weapon);
      const added = inventory.addAmmo(effect.ammo, effect.amount);
      return isNew || added > 0;
    }
    case 'key':
      if (inventory.keys.has(effect.key)) return false;
      inventory.keys.add(effect.key);
      return true;
  }
}
