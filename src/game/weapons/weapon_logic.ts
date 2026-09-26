import type { Rng } from '../../engine/core/rng';
import {
  MAX_AMMO,
  WEAPON_ORDER,
  WEAPONS,
  type AmmoType,
  type FireMode,
  type FireModeDef,
  type WeaponId,
} from './weapon_defs';

/**
 * Lógica pura de las armas: cadencia, munición, cargadores, recarga, ráfagas y cambio de arma.
 * No sabe nada de Three.js ni de física; devuelve eventos que el sistema de armas convierte
 * en disparos, sonidos y animaciones.
 */

export type WeaponPhase = 'ready' | 'reloading' | 'lowering' | 'raising';

export interface WeaponState {
  owned: Set<WeaponId>;
  current: WeaponId;
  /** Arma que se sacará al terminar de bajar la actual. */
  pending: WeaponId | null;
  phase: WeaponPhase;
  /** Tiempo restante de la fase actual (recarga o cambio). */
  timer: number;
  /** Tiempo hasta poder volver a disparar. */
  cooldown: number;
  magazines: Record<WeaponId, number>;
  /** Munición en reserva (fuera de los cargadores). */
  ammo: Record<AmmoType, number>;
  burst: { mode: FireMode; remaining: number; timer: number } | null;
}

export interface WeaponInput {
  /** Botón principal pulsado (se mantiene para disparo continuo). */
  fire: boolean;
  alt: boolean;
  reload: boolean;
  /** Selección directa (teclas 1-5). */
  select: WeaponId | null;
  /** Rueda del ratón: -1 anterior, 1 siguiente. */
  cycle: number;
}

/** Desviación de un disparo respecto a la mirilla, en radianes. */
export interface Shot {
  yaw: number;
  pitch: number;
}

export type WeaponEvent =
  | { type: 'fire'; weapon: WeaponId; mode: FireMode; def: FireModeDef; shots: Shot[] }
  | { type: 'dryFire'; weapon: WeaponId }
  | { type: 'reloadStart'; weapon: WeaponId; duration: number }
  | { type: 'reloadEnd'; weapon: WeaponId }
  | { type: 'lower'; from: WeaponId; to: WeaponId; duration: number }
  | { type: 'raise'; weapon: WeaponId; duration: number };

export interface Loadout {
  weapons: WeaponId[];
  ammo: Partial<Record<AmmoType, number>>;
}

const DRY_FIRE_COOLDOWN = 0.35;
/** Preferencia al cambiar solo de arma al quedarse sin munición (nunca a la explosiva). */
const AUTO_SWITCH_ORDER: readonly WeaponId[] = ['riveter', 'shotgun', 'pistol', 'hammer'];

export function createWeaponState(loadout: Loadout): WeaponState {
  const owned = new Set<WeaponId>(['hammer', ...loadout.weapons]);
  const ammo: Record<AmmoType, number> = { bullets: 0, shells: 0, charges: 0 };
  for (const type of Object.keys(ammo) as AmmoType[]) {
    ammo[type] = Math.min(loadout.ammo[type] ?? 0, MAX_AMMO[type]);
  }
  const magazines = Object.fromEntries(WEAPON_ORDER.map((id) => [id, 0])) as Record<
    WeaponId,
    number
  >;
  const state: WeaponState = {
    owned,
    current: 'hammer',
    pending: null,
    phase: 'ready',
    timer: 0,
    cooldown: 0,
    magazines,
    ammo,
    burst: null,
  };
  // Las armas empiezan con el cargador lleno si hay munición.
  for (const id of owned) fillMagazine(state, id);
  state.current = bestWeapon(
    state,
    [...WEAPON_ORDER].reverse().filter((id) => id !== 'launcher'),
  );
  return state;
}

/** Munición total disponible para un arma (cargador + reserva). */
export function totalAmmo(state: WeaponState, weapon: WeaponId): number {
  const type = WEAPONS[weapon].ammo;
  return type ? state.magazines[weapon] + state.ammo[type] : Infinity;
}

export function hasAmmoFor(state: WeaponState, weapon: WeaponId): boolean {
  return totalAmmo(state, weapon) >= WEAPONS[weapon].primary.ammoPerShot;
}

/** Añade munición a la reserva respetando el máximo. Devuelve cuánta se ha aceptado. */
export function addAmmo(state: WeaponState, type: AmmoType, amount: number): number {
  const accepted = Math.max(0, Math.min(amount, MAX_AMMO[type] - state.ammo[type]));
  state.ammo[type] += accepted;
  return accepted;
}

export function giveWeapon(state: WeaponState, weapon: WeaponId): boolean {
  if (state.owned.has(weapon)) return false;
  state.owned.add(weapon);
  fillMagazine(state, weapon);
  return true;
}

export function updateWeapons(
  state: WeaponState,
  input: WeaponInput,
  dt: number,
  rng: Rng,
): WeaponEvent[] {
  const events: WeaponEvent[] = [];
  state.cooldown = Math.max(0, state.cooldown - dt);
  advancePhase(state, dt, events);
  advanceBurst(state, dt, rng, events);

  const target = requestedWeapon(state, input);
  if (target && !state.burst && state.phase !== 'raising') {
    if (state.phase === 'lowering') {
      state.pending = target;
    } else if (target !== state.current) {
      startSwitch(state, target, events);
    }
  }

  if (state.phase !== 'ready' || state.burst) return events;

  const def = WEAPONS[state.current];
  if (input.reload && canReload(state, state.current)) {
    startReload(state, events);
    return events;
  }
  if ((input.fire || input.alt) && state.cooldown <= 0) {
    tryFire(state, input.fire ? 'primary' : 'alt', rng, events);
  } else if (
    def.magazine > 0 &&
    state.magazines[state.current] === 0 &&
    canReload(state, state.current)
  ) {
    // Cargador vacío y reserva disponible: recarga sola aunque no se esté disparando.
    startReload(state, events);
  }
  return events;
}

function advancePhase(state: WeaponState, dt: number, events: WeaponEvent[]): void {
  if (state.phase === 'ready') return;
  state.timer -= dt;
  if (state.timer > 0) return;
  switch (state.phase) {
    case 'lowering': {
      state.current = state.pending ?? state.current;
      state.pending = null;
      state.phase = 'raising';
      state.timer = WEAPONS[state.current].switchTime / 2;
      events.push({ type: 'raise', weapon: state.current, duration: state.timer });
      break;
    }
    case 'raising':
      state.phase = 'ready';
      state.timer = 0;
      break;
    case 'reloading': {
      fillMagazine(state, state.current);
      state.phase = 'ready';
      state.timer = 0;
      events.push({ type: 'reloadEnd', weapon: state.current });
      break;
    }
  }
}

function advanceBurst(state: WeaponState, dt: number, rng: Rng, events: WeaponEvent[]): void {
  const burst = state.burst;
  if (!burst) return;
  const def = WEAPONS[state.current][burst.mode];
  burst.timer -= dt;
  while (burst.timer <= 0 && burst.remaining > 0) {
    if (!consumeAmmo(state, def.ammoPerShot)) {
      burst.remaining = 0;
      break;
    }
    events.push(makeFireEvent(state, burst.mode, def, rng));
    burst.remaining--;
    burst.timer += def.burst?.interval ?? 0;
  }
  if (burst.remaining <= 0) state.burst = null;
}

function requestedWeapon(state: WeaponState, input: WeaponInput): WeaponId | null {
  if (input.select && state.owned.has(input.select)) return input.select;
  if (input.cycle !== 0) return cycleWeapon(state, input.cycle);
  return null;
}

/** Siguiente arma que se posee en el orden de las ranuras, en la dirección indicada. */
export function cycleWeapon(state: WeaponState, direction: number): WeaponId {
  const from = state.pending ?? state.current;
  const start = WEAPON_ORDER.indexOf(from);
  const step = direction > 0 ? 1 : -1;
  for (let i = 1; i <= WEAPON_ORDER.length; i++) {
    const index = (start + step * i + WEAPON_ORDER.length * 2) % WEAPON_ORDER.length;
    const candidate = WEAPON_ORDER[index]!;
    if (state.owned.has(candidate)) return candidate;
  }
  return from;
}

function startSwitch(state: WeaponState, target: WeaponId, events: WeaponEvent[]): void {
  state.pending = target;
  state.phase = 'lowering';
  state.timer = WEAPONS[state.current].switchTime / 2;
  events.push({ type: 'lower', from: state.current, to: target, duration: state.timer });
}

function canReload(state: WeaponState, weapon: WeaponId): boolean {
  const def = WEAPONS[weapon];
  if (!def.ammo || def.magazine === 0) return false;
  return state.magazines[weapon] < def.magazine && state.ammo[def.ammo] > 0;
}

function startReload(state: WeaponState, events: WeaponEvent[]): void {
  const def = WEAPONS[state.current];
  state.phase = 'reloading';
  state.timer = def.reloadTime;
  events.push({ type: 'reloadStart', weapon: state.current, duration: def.reloadTime });
}

function fillMagazine(state: WeaponState, weapon: WeaponId): void {
  const def = WEAPONS[weapon];
  if (!def.ammo || def.magazine === 0) return;
  const take = Math.min(def.magazine - state.magazines[weapon], state.ammo[def.ammo]);
  state.magazines[weapon] += take;
  state.ammo[def.ammo] -= take;
}

function consumeAmmo(state: WeaponState, amount: number): boolean {
  const def = WEAPONS[state.current];
  if (!def.ammo || amount === 0) return true;
  if (state.magazines[state.current] < amount) return false;
  state.magazines[state.current] -= amount;
  return true;
}

function tryFire(state: WeaponState, requested: FireMode, rng: Rng, events: WeaponEvent[]): void {
  const weapon = WEAPONS[state.current];
  let mode = requested;
  // Si no hay munición para el modo alternativo (p. ej. un solo cartucho), dispara el principal.
  if (
    mode === 'alt' &&
    weapon.ammo &&
    state.magazines[state.current] < weapon.alt.ammoPerShot &&
    state.magazines[state.current] >= weapon.primary.ammoPerShot
  ) {
    mode = 'primary';
  }
  const def = weapon[mode];

  if (!consumeAmmo(state, def.ammoPerShot)) {
    if (canReload(state, state.current)) {
      startReload(state, events);
      return;
    }
    events.push({ type: 'dryFire', weapon: state.current });
    state.cooldown = DRY_FIRE_COOLDOWN;
    const fallback = bestWeapon(state, AUTO_SWITCH_ORDER);
    if (fallback !== state.current) startSwitch(state, fallback, events);
    return;
  }

  events.push(makeFireEvent(state, mode, def, rng));
  state.cooldown = def.cooldown;
  if (def.burst && def.burst.count > 1) {
    state.burst = { mode, remaining: def.burst.count - 1, timer: def.burst.interval };
    state.cooldown = Math.max(def.cooldown, def.burst.interval * def.burst.count);
  }
}

function makeFireEvent(
  state: WeaponState,
  mode: FireMode,
  def: FireModeDef,
  rng: Rng,
): WeaponEvent {
  const shots: Shot[] = [];
  for (let i = 0; i < def.pellets; i++) {
    // Reparto uniforme dentro de un círculo de radio `spread`.
    const radius = def.spread * Math.sqrt(rng.next());
    const angle = rng.next() * Math.PI * 2;
    shots.push({ yaw: radius * Math.cos(angle), pitch: radius * Math.sin(angle) });
  }
  return { type: 'fire', weapon: state.current, mode, def, shots };
}

function bestWeapon(state: WeaponState, order: readonly WeaponId[]): WeaponId {
  return order.find((id) => state.owned.has(id) && hasAmmoFor(state, id)) ?? 'hammer';
}
